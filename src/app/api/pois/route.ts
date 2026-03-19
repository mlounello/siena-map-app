import { z } from 'zod';
import { badRequest, created, forbidden, ok, serverError, unauthorized } from '@/lib/api/http';
import { createDbClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/roles';
import { canEditMap, canViewMap, getViewableMapIds } from '@/lib/auth/access';
import type { Poi } from '@/types/siena-maps';

const createPoiSchema = z.object({
  map_id: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().max(4000).nullable().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  route_anchor_lat: z.number().min(-90).max(90).nullable().optional(),
  route_anchor_lng: z.number().min(-180).max(180).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  owning_department_id: z.string().uuid(),
  pin_color: z.string().max(40).nullable().optional(),
  stop_number: z.number().int().min(1).nullable().optional(),
});

export async function GET(request: Request) {
  const profile = await requireRole('viewer');
  if (!profile) return unauthorized();

  const { searchParams } = new URL(request.url);
  const mapId = searchParams.get('mapId');

  const { db } = await createDbClient();
  let query = db.from('pois').select('*').order('updated_at', { ascending: false }).limit(250);
  if (mapId) {
    if (!(await canViewMap(profile, mapId))) return forbidden();
    query = query.eq('map_id', mapId);
  } else {
    const viewableMapIds = await getViewableMapIds(profile);
    if (viewableMapIds !== null) {
      if (!viewableMapIds.length) return ok({ pois: [] as Poi[] });
      query = query.in('map_id', viewableMapIds);
    }
  }

  const { data, error } = await query;
  if (error) return serverError(error.message);

  return ok({ pois: (data ?? []) as Poi[] });
}

export async function POST(request: Request) {
  const profile = await requireRole('editor');
  if (!profile) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createPoiSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { db } = await createDbClient();
  if (!(await canEditMap(profile, parsed.data.map_id))) {
    return forbidden();
  }

  const payload = {
    ...parsed.data,
    created_by: profile.id,
    updated_by: profile.id,
    status: 'draft',
    publish_on_approval: true,
  };

  const { data, error } = await db.from('pois').insert(payload).select('*').single();
  if (error) return serverError(error.message);

  return created({ poi: data as Poi });
}
