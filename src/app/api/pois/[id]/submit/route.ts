import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';
import { canEditPoi } from '@/lib/auth/access';
import { canTransitionPoi } from '@/lib/siena/workflows';
import type { Poi } from '@/types/siena-maps';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
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

  if (!canTransitionPoi(current.status, 'submitted_for_review', profile.role)) {
    return badRequest('Invalid POI transition to submitted_for_review');
  }

  const now = new Date().toISOString();
  const { data, error } = await db
    .from('pois')
    .update({ status: 'submitted_for_review', updated_by: profile.id })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return serverError(error.message);

  const { error: reviewError } = await db.from('poi_reviews').insert({
    poi_id: id,
    submitted_by: profile.id,
    status: 'submitted',
    created_at: now,
  });
  if (reviewError) return serverError(reviewError.message);

  return ok({ poi: data as Poi });
}
