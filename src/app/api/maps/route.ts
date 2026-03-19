import { z } from 'zod';
import { created, forbidden, ok, serverError, unauthorized, badRequest } from '@/lib/api/http';
import { createDbClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/roles';
import { getViewableMapIds } from '@/lib/auth/access';
import type { MapRecord } from '@/types/siena-maps';

const createMapSchema = z.object({
  slug: z.string().min(2).max(120),
  title: z.string().min(2).max(200),
  intro_text: z.string().max(1000).nullable().optional(),
  primary_department_id: z.string().uuid(),
  visibility: z.enum(['public', 'unlisted', 'internal_only']).default('internal_only'),
  display_mode: z.enum(['explore_only', 'guided_only', 'both']).default('both'),
  route_mode: z.enum(['walking', 'driving']).default('walking'),
  default_center_lat: z.number().min(-90).max(90).nullable().optional(),
  default_center_lng: z.number().min(-180).max(180).nullable().optional(),
  default_zoom: z.number().int().min(1).max(22).default(16),
  require_anchors_for_publish: z.boolean().optional().default(false),
  theme_preset: z.string().max(80).optional(),
});

export async function GET(request: Request) {
  const profile = await requireRole('viewer');
  if (!profile) return unauthorized();

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get('departmentId');
  const shellStatus = searchParams.get('shellStatus');
  const visibility = searchParams.get('visibility');

  const { db } = await createDbClient();
  let query = db
    .from('maps')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(100);

  const viewableMapIds = await getViewableMapIds(profile);
  if (viewableMapIds !== null) {
    if (!viewableMapIds.length) return ok({ maps: [] as MapRecord[] });
    query = query.in('id', viewableMapIds);
  }

  if (departmentId) query = query.eq('primary_department_id', departmentId);
  if (shellStatus) query = query.eq('shell_status', shellStatus);
  if (visibility) query = query.eq('visibility', visibility);

  const { data, error } = await query;
  if (error) return serverError(error.message);

  return ok({ maps: (data ?? []) as MapRecord[] });
}

export async function POST(request: Request) {
  const profile = await requireRole('department_head');
  if (!profile) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createMapSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { db } = await createDbClient();

  if (profile.role === 'department_head') {
    const { data: membership, error: membershipError } = await db
      .from('department_memberships')
      .select('id')
      .eq('department_id', parsed.data.primary_department_id)
      .eq('user_id', profile.id)
      .eq('role', 'department_head')
      .maybeSingle();

    if (membershipError) return serverError(membershipError.message);
    if (!membership) return forbidden('Department Head can only create maps for their own department.');
  }

  const payload = {
    ...parsed.data,
    created_by: profile.id,
    updated_by: profile.id,
    shell_status: 'draft',
    publication_status: 'unpublished',
    map_type: 'geographic_osm',
  };

  const { data, error } = await db.from('maps').insert(payload).select('*').single();
  if (error) return serverError(error.message);

  return created({ map: data as MapRecord });
}
