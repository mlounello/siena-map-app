import { z } from 'zod';
import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/api/http';
import { canEditMap } from '@/lib/auth/access';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';

const updateStopsSchema = z.object({
  poi_ids: z.array(z.string().uuid()).max(300),
});

const DEFAULT_CONNECTION_STYLE = {
  line_style: 'solid',
  line_color: '#006b54',
  line_thickness: 4,
  is_directional: false,
};

function uniqueIds(ids: string[]) {
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole('editor');
  if (!profile) return unauthorized();

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateStopsSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(', '));

  const orderedPoiIds = uniqueIds(parsed.data.poi_ids);

  const { db } = await createDbClient();

  const { data: guidedRoute, error: routeError } = await db
    .from('guided_routes')
    .select('id, map_id')
    .eq('id', id)
    .maybeSingle();

  if (routeError) return serverError(routeError.message);
  if (!guidedRoute) return badRequest('Guided route not found');

  const permitted = await canEditMap(profile, guidedRoute.map_id);
  if (!permitted) return forbidden();

  if (orderedPoiIds.length > 0) {
    const { data: pois, error: poisError } = await db
      .from('pois')
      .select('id')
      .eq('map_id', guidedRoute.map_id)
      .in('id', orderedPoiIds);

    if (poisError) return serverError(poisError.message);

    const existing = new Set((pois ?? []).map((poi) => poi.id));
    const missing = orderedPoiIds.filter((poiId) => !existing.has(poiId));
    if (missing.length > 0) return badRequest('One or more POIs are not part of this map');
  }

  const poiStyleById = new Map<string, { line_color: string; line_thickness: number }>();
  const poiAnchorById = new Map<string, { lat: number | null; lng: number | null }>();
  if (orderedPoiIds.length > 0) {
    const { data: styleRows, error: styleError } = await db
      .from('pois')
      .select('id, pin_color, route_anchor_lat, route_anchor_lng, categories:category_id(color)')
      .eq('map_id', guidedRoute.map_id)
      .in('id', orderedPoiIds);

    if (styleError) return serverError(styleError.message);

    for (const row of styleRows ?? []) {
      const category = Array.isArray((row as any).categories)
        ? (row as any).categories[0]
        : (row as any).categories;
      const color =
        ((row as any).pin_color as string | null | undefined) ??
        (category?.color as string | null | undefined) ??
        DEFAULT_CONNECTION_STYLE.line_color;
      poiStyleById.set((row as any).id, { line_color: color, line_thickness: DEFAULT_CONNECTION_STYLE.line_thickness });
      poiAnchorById.set((row as any).id, {
        lat: (row as any).route_anchor_lat == null ? null : Number((row as any).route_anchor_lat),
        lng: (row as any).route_anchor_lng == null ? null : Number((row as any).route_anchor_lng),
      });
    }
  }

  const { error: deleteStopsError } = await db
    .from('guided_route_stops')
    .delete()
    .eq('guided_route_id', guidedRoute.id);

  if (deleteStopsError) return serverError(deleteStopsError.message);

  if (orderedPoiIds.length > 0) {
    const { error: insertStopsError } = await db.from('guided_route_stops').insert(
      orderedPoiIds.map((poiId, index) => ({
        guided_route_id: guidedRoute.id,
        poi_id: poiId,
        stop_number: index + 1,
        created_by: profile.id,
      }))
    );

    if (insertStopsError) return serverError(insertStopsError.message);
  }

  // Keep POI stop numbers aligned with guided-route stop order.
  const { error: clearStopNumbersError } = await db
    .from('pois')
    .update({ stop_number: null, updated_by: profile.id })
    .eq('map_id', guidedRoute.map_id);

  if (clearStopNumbersError) return serverError(clearStopNumbersError.message);

  for (let index = 0; index < orderedPoiIds.length; index += 1) {
    const poiId = orderedPoiIds[index];
    const { error: updatePoiError } = await db
      .from('pois')
      .update({ stop_number: index + 1, updated_by: profile.id })
      .eq('id', poiId)
      .eq('map_id', guidedRoute.map_id);

    if (updatePoiError) return serverError(updatePoiError.message);
  }

  // Regenerate explicit route connections from adjacent stops.
  const { error: deleteConnectionsError } = await db
    .from('route_connections')
    .delete()
    .eq('map_id', guidedRoute.map_id);

  if (deleteConnectionsError) return serverError(deleteConnectionsError.message);

  const generatedConnections = [];
  let internalTransferCount = 0;
  for (let index = 0; index < orderedPoiIds.length - 1; index += 1) {
    const fromPoiId = orderedPoiIds[index];
    const toPoiId = orderedPoiIds[index + 1];
    const style = poiStyleById.get(fromPoiId) ?? {
      line_color: DEFAULT_CONNECTION_STYLE.line_color,
      line_thickness: DEFAULT_CONNECTION_STYLE.line_thickness,
    };

    const fromAnchor = poiAnchorById.get(fromPoiId);
    const toAnchor = poiAnchorById.get(toPoiId);
    const hasBothAnchors =
      Number.isFinite(fromAnchor?.lat) &&
      Number.isFinite(fromAnchor?.lng) &&
      Number.isFinite(toAnchor?.lat) &&
      Number.isFinite(toAnchor?.lng);
    if (!hasBothAnchors) internalTransferCount += 1;

    generatedConnections.push({
      map_id: guidedRoute.map_id,
      from_poi_id: fromPoiId,
      to_poi_id: toPoiId,
      order_index: index + 1,
      line_style: DEFAULT_CONNECTION_STYLE.line_style,
      line_color: hasBothAnchors ? style.line_color : null,
      line_thickness: hasBothAnchors ? style.line_thickness : 0,
      is_directional: DEFAULT_CONNECTION_STYLE.is_directional,
      connection_type: hasBothAnchors ? 'outdoor_routed' : 'internal_transfer',
      transfer_note: hasBothAnchors
        ? null
        : 'Transfer indoors to the next stop (door anchor missing).',
      label: hasBothAnchors ? null : 'Internal transfer',
      status: 'published',
      created_by: profile.id,
    });
  }

  if (generatedConnections.length > 0) {
    const { error: insertConnectionsError } = await db
      .from('route_connections')
      .insert(generatedConnections);

    if (insertConnectionsError) return serverError(insertConnectionsError.message);
  }

  return ok({
    guidedRouteId: guidedRoute.id,
    mapId: guidedRoute.map_id,
    stopCount: orderedPoiIds.length,
    connectionCount: generatedConnections.length,
    internalTransferCount,
  });
}
