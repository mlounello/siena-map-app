import { z } from 'zod';
import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';
import { canEditPoi } from '@/lib/auth/access';
import { hasMinRole } from '@/lib/siena/permissions';
import type { Poi } from '@/types/siena-maps';

const updatePoiSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(4000).nullable().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  category_id: z.string().uuid().nullable().optional(),
  owning_department_id: z.string().uuid().optional(),
  pin_color: z.string().max(40).nullable().optional(),
  stop_number: z.number().int().min(1).nullable().optional(),
  scheduled_publish_at: z.string().datetime().nullable().optional(),
  publish_on_approval: z.boolean().optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await createDbClient();

  const { data, error } = await db.from('pois').select('*').eq('id', id).maybeSingle();
  if (error) return serverError(error.message);
  if (!data) return badRequest('POI not found');

  return ok({ poi: data as Poi });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole('editor');
  if (!profile) return unauthorized();

  const { db } = await createDbClient();
  const { data: current, error: readError } = await db
    .from('pois')
    .select('id, map_id, owning_department_id, created_by, status')
    .eq('id', id)
    .maybeSingle();

  if (readError) return serverError(readError.message);
  if (!current) return badRequest('POI not found');

  if (!(await canEditPoi(profile, current))) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = updatePoiSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const updatePayload: Record<string, unknown> = {
    ...parsed.data,
    updated_by: profile.id,
  };

  const isApprover = hasMinRole(profile.role, 'department_head');
  if (!isApprover && (current.status === 'approved' || current.status === 'published')) {
    updatePayload.status = 'submitted_for_review';
    updatePayload.published_at = null;
    updatePayload.published_by = null;
    updatePayload.approved_at = null;
    updatePayload.approved_by = null;
  }

  const { data, error } = await db.from('pois').update(updatePayload).eq('id', id).select('*').single();

  if (error) return serverError(error.message);
  return ok({ poi: data as Poi });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole('super_admin');
  if (!profile) return unauthorized();

  const { db } = await createDbClient();
  const { error } = await db.from('pois').delete().eq('id', id);
  if (error) return serverError(error.message);

  return ok({ deleted: true, id });
}
