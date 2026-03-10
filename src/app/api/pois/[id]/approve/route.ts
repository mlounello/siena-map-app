import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';
import { canTransitionPoi, shouldAutoPublishOnApproval } from '@/lib/siena/workflows';
import { canEditPoi } from '@/lib/auth/access';
import type { Poi } from '@/types/siena-maps';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole('department_head');
  if (!profile) return unauthorized();

  const { db } = await createDbClient();
  const { data: current, error: readError } = await db
    .from('pois')
    .select('id, map_id, owning_department_id, created_by, status, publish_on_approval, scheduled_publish_at')
    .eq('id', id)
    .maybeSingle();

  if (readError) return serverError(readError.message);
  if (!current) return badRequest('POI not found');
  if (!(await canEditPoi(profile, current))) return forbidden();

  if (!canTransitionPoi(current.status, 'approved', profile.role)) {
    return badRequest('Invalid POI transition to approved');
  }

  const now = new Date().toISOString();
  const autoPublish = shouldAutoPublishOnApproval(
    current.publish_on_approval,
    current.scheduled_publish_at,
    now
  );

  const updatePayload: Record<string, unknown> = {
    status: autoPublish ? 'published' : 'approved',
    approved_at: now,
    approved_by: profile.id,
    updated_by: profile.id,
  };

  if (autoPublish) {
    updatePayload.published_at = now;
    updatePayload.published_by = profile.id;
  }

  const { data, error } = await db.from('pois').update(updatePayload).eq('id', id).select('*').single();

  if (error) return serverError(error.message);

  const { error: reviewError } = await db.from('poi_reviews').insert({
    poi_id: id,
    submitted_by: profile.id,
    reviewed_by: profile.id,
    status: 'approved',
    created_at: now,
    reviewed_at: now,
    note: autoPublish ? 'Approved and auto-published by workflow rule.' : null,
  });
  if (reviewError) return serverError(reviewError.message);

  return ok({ poi: data as Poi, autoPublished: autoPublish });
}
