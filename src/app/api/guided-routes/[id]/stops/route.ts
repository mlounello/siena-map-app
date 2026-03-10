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
  line_color: '#8b1f41',
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
  for (let index = 0; index < orderedPoiIds.length - 1; index += 1) {
    generatedConnections.push({
      map_id: guidedRoute.map_id,
      from_poi_id: orderedPoiIds[index],
      to_poi_id: orderedPoiIds[index + 1],
      order_index: index + 1,
      ...DEFAULT_CONNECTION_STYLE,
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
  });
}
