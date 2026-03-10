import { z } from 'zod';
import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';
import { canTransitionPoi } from '@/lib/siena/workflows';
import { hasMinRole } from '@/lib/siena/permissions';
import { canEditPoi } from '@/lib/auth/access';
import type { Poi } from '@/types/siena-maps';

const schema = z.object({
  status: z.enum(['published', 'approved', 'archived']).default('published'),
  scheduled_publish_at: z.string().datetime().nullable().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole('department_head');
  if (!profile) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest('Invalid publish payload');

  const { db } = await createDbClient();
  const { data: current, error: readError } = await db
    .from('pois')
    .select('id, map_id, owning_department_id, created_by, status')
    .eq('id', id)
    .maybeSingle();

  if (readError) return serverError(readError.message);
  if (!current) return badRequest('POI not found');
  if (!(await canEditPoi(profile, current))) return forbidden();

  const nextStatus = parsed.data.status;
  const isElevated = hasMinRole(profile.role, 'super_admin');
  if (nextStatus === 'published' && !isElevated && !canTransitionPoi(current.status, 'published', profile.role)) {
    return badRequest('Invalid POI transition to published');
  }
  if (nextStatus === 'approved' && !isElevated && !canTransitionPoi(current.status, 'approved', profile.role)) {
    return badRequest('Invalid POI transition to approved');
  }

  const now = new Date().toISOString();
  const publishAt = parsed.data.scheduled_publish_at ?? now;

  const { data, error } = await db
    .from('pois')
    .update({
      status: nextStatus,
      published_at: nextStatus === 'published' ? publishAt : null,
      published_by: nextStatus === 'published' ? profile.id : null,
      scheduled_publish_at: parsed.data.scheduled_publish_at ?? null,
      approved_at: nextStatus === 'published' || nextStatus === 'approved' ? now : null,
      approved_by: nextStatus === 'published' || nextStatus === 'approved' ? profile.id : null,
      updated_by: profile.id,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return serverError(error.message);
  return ok({ poi: data as Poi });
}
