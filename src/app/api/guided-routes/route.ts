import { z } from 'zod';
import { badRequest, created, forbidden, ok, serverError, unauthorized } from '@/lib/api/http';
import { canEditMap, canViewMap } from '@/lib/auth/access';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';
import type { GuidedRoute, GuidedRouteStop } from '@/types/siena-maps';

const createSchema = z.object({
  map_id: z.string().uuid(),
  title: z.string().min(2).max(160).optional(),
});

export async function GET(request: Request) {
  const profile = await requireRole('viewer');
  if (!profile) return unauthorized();

  const { searchParams } = new URL(request.url);
  const mapId = searchParams.get('mapId');
  if (!mapId) return badRequest('mapId is required');
  if (!(await canViewMap(profile, mapId))) return forbidden();

  const { db } = await createDbClient();

  const { data: guidedRoute, error: routeError } = await db
    .from('guided_routes')
    .select('*')
    .eq('map_id', mapId)
    .eq('is_primary', true)
    .maybeSingle();

  if (routeError) return serverError(routeError.message);
  if (!guidedRoute) return ok({ guidedRoute: null, stops: [] as GuidedRouteStop[] });

  const { data: stopRows, error: stopsError } = await db
    .from('guided_route_stops')
    .select('id, guided_route_id, poi_id, stop_number, created_by, created_at, pois:poi_id(id, title, stop_number)')
    .eq('guided_route_id', guidedRoute.id)
    .order('stop_number', { ascending: true });

  if (stopsError) return serverError(stopsError.message);

  const stops = (stopRows ?? []).map((row: any) => ({
    id: row.id,
    guided_route_id: row.guided_route_id,
    poi_id: row.poi_id,
    stop_number: row.stop_number,
    created_by: row.created_by,
    created_at: row.created_at,
    poi: row.pois
      ? {
          id: row.pois.id,
          title: row.pois.title,
          stop_number: row.pois.stop_number,
        }
      : null,
  }));

  return ok({ guidedRoute: guidedRoute as GuidedRoute, stops });
}

export async function POST(request: Request) {
  const profile = await requireRole('editor');
  if (!profile) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(', '));

  const permitted = await canEditMap(profile, parsed.data.map_id);
  if (!permitted) return forbidden();

  const { db } = await createDbClient();

  const { data: existing, error: existingError } = await db
    .from('guided_routes')
    .select('*')
    .eq('map_id', parsed.data.map_id)
    .eq('is_primary', true)
    .maybeSingle();

  if (existingError) return serverError(existingError.message);
  if (existing) return ok({ guidedRoute: existing as GuidedRoute });

  const { data, error } = await db
    .from('guided_routes')
    .insert({
      map_id: parsed.data.map_id,
      title: parsed.data.title ?? 'Primary Guided Route',
      is_primary: true,
      created_by: profile.id,
      updated_by: profile.id,
    })
    .select('*')
    .single();

  if (error) return serverError(error.message);
  return created({ guidedRoute: data as GuidedRoute });
}
