import { z } from 'zod';
import { badRequest, created, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';

const createSchema = z.object({
  map_id: z.string().uuid(),
  from_poi_id: z.string().uuid(),
  to_poi_id: z.string().uuid(),
  order_index: z.number().int().min(1),
  line_style: z.string().max(50).optional(),
  line_color: z.string().max(30).optional(),
  line_thickness: z.number().int().min(1).max(20).optional(),
  is_directional: z.boolean().optional(),
  label: z.string().max(120).nullable().optional(),
  status: z.enum(['unpublished', 'published', 'archived']).default('unpublished'),
});

export async function GET(request: Request) {
  const profile = await requireRole('viewer');
  if (!profile) return unauthorized();

  const { searchParams } = new URL(request.url);
  const mapId = searchParams.get('mapId');

  const { db } = await createDbClient();
  let query = db
    .from('route_connections')
    .select('*')
    .order('order_index', { ascending: true })
    .limit(500);

  if (mapId) query = query.eq('map_id', mapId);

  const { data, error } = await query;
  if (error) return serverError(error.message);
  return ok({ routeConnections: data ?? [] });
}

export async function POST(request: Request) {
  const profile = await requireRole('editor');
  if (!profile) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(', '));

  const { db } = await createDbClient();
  const { data, error } = await db
    .from('route_connections')
    .insert({ ...parsed.data, created_by: profile.id })
    .select('*')
    .single();

  if (error) return serverError(error.message);
  return created({ routeConnection: data });
}
