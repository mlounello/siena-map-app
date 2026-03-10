import { z } from 'zod';
import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';
import { canEditMap } from '@/lib/auth/access';
import { hasMinRole } from '@/lib/siena/permissions';
import type { MapRecord } from '@/types/siena-maps';

const updateMapSchema = z.object({
  slug: z.string().min(2).max(120).optional(),
  title: z.string().min(2).max(200).optional(),
  intro_text: z.string().max(1000).nullable().optional(),
  visibility: z.enum(['public', 'unlisted', 'internal_only']).optional(),
  display_mode: z.enum(['explore_only', 'guided_only', 'both']).optional(),
  route_mode: z.enum(['walking', 'driving']).optional(),
  default_center_lat: z.number().min(-90).max(90).nullable().optional(),
  default_center_lng: z.number().min(-180).max(180).nullable().optional(),
  default_zoom: z.number().int().min(1).max(22).optional(),
  show_sidebar: z.boolean().optional(),
  show_legend: z.boolean().optional(),
  show_search: z.boolean().optional(),
  show_tour_panel: z.boolean().optional(),
  show_branding: z.boolean().optional(),
  show_cta: z.boolean().optional(),
  require_anchors_for_publish: z.boolean().optional(),
  theme_preset: z.string().max(80).optional(),
  scheduled_publish_at: z.string().datetime().nullable().optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await createDbClient();

  const { data, error } = await db.from('maps').select('*').eq('id', id).maybeSingle();
  if (error) return serverError(error.message);
  if (!data) return badRequest('Map not found');

  return ok({ map: data as MapRecord });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole('editor');
  if (!profile) return unauthorized();

  const canEdit = await canEditMap(profile, id);
  if (!canEdit) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = updateMapSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  // Governance-sensitive setting: only department heads and above can modify publish gating.
  if (
    Object.prototype.hasOwnProperty.call(parsed.data, 'require_anchors_for_publish') &&
    !hasMinRole(profile.role, 'department_head')
  ) {
    return forbidden('Only Department Head and above can change anchor publish requirements.');
  }

  const { db } = await createDbClient();

  const { data, error } = await db
    .from('maps')
    .update({ ...parsed.data, updated_by: profile.id })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) return serverError(error.message);
  if (!data) return badRequest('Map not found');

  return ok({ map: data as MapRecord });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole('super_admin');
  if (!profile) return unauthorized();

  const { db } = await createDbClient();
  const { error } = await db.from('maps').delete().eq('id', id);
  if (error) return serverError(error.message);

  return ok({ deleted: true, id });
}
