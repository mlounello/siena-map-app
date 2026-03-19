import { z } from 'zod';
import { badRequest, created, forbidden, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';
import { canEditMap } from '@/lib/auth/access';

const createSchema = z.object({
  map_id: z.string().uuid(),
  name: z.string().min(2).max(120),
  width: z.string().min(1).max(30).default('100%'),
  height: z.string().min(1).max(30).default('600px'),
  theme: z.string().max(60).nullable().optional(),
  show_legend: z.boolean().optional(),
  show_search: z.boolean().optional(),
  show_sidebar: z.boolean().optional(),
  show_tour_panel: z.boolean().optional(),
  show_branding: z.boolean().optional(),
  show_cta: z.boolean().optional(),
  default_mode: z.enum(['explore_only', 'guided_only', 'both']).optional(),
  start_poi_id: z.string().uuid().nullable().optional(),
});

export async function GET(request: Request) {
  const profile = await requireRole('department_head');
  if (!profile) return unauthorized();

  const { searchParams } = new URL(request.url);
  const mapId = searchParams.get('mapId');

  const { db } = await createDbClient();
  let query = db.from('embed_configs').select('*').order('updated_at', { ascending: false }).limit(200);
  if (mapId) {
    if (!(await canEditMap(profile, mapId))) return forbidden();
    query = query.eq('map_id', mapId);
  }

  const { data, error } = await query;
  if (error) return serverError(error.message);

  if (!mapId && profile.role !== 'owner' && profile.role !== 'super_admin') {
    const embedConfigs = data ?? [];
    const uniqueMapIds = Array.from(new Set(embedConfigs.map((config) => config.map_id as string)));
    const editableMapEntries = await Promise.all(
      uniqueMapIds.map(async (candidateMapId) => [candidateMapId, await canEditMap(profile, candidateMapId)] as const)
    );
    const editableMapLookup = new Map(editableMapEntries);

    return ok({
      embedConfigs: embedConfigs.filter((config) => editableMapLookup.get(config.map_id as string)),
    });
  }

  return ok({ embedConfigs: data ?? [] });
}

export async function POST(request: Request) {
  const profile = await requireRole('department_head');
  if (!profile) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  if (!(await canEditMap(profile, parsed.data.map_id))) return forbidden();

  const { db } = await createDbClient();
  const { data, error } = await db
    .from('embed_configs')
    .insert({ ...parsed.data, created_by: profile.id })
    .select('*')
    .single();

  if (error) return serverError(error.message);
  return created({ embedConfig: data });
}
