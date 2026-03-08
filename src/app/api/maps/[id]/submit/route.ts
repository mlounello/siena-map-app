import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';
import { canEditMap } from '@/lib/auth/access';
import { canTransitionMapShell } from '@/lib/siena/workflows';
import type { MapRecord } from '@/types/siena-maps';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole('department_head');
  if (!profile) return unauthorized();

  if (!(await canEditMap(profile, id))) return forbidden();

  const { db } = await createDbClient();
  const { data: current, error: readError } = await db
    .from('maps')
    .select('id, shell_status')
    .eq('id', id)
    .maybeSingle();

  if (readError) return serverError(readError.message);
  if (!current) return badRequest('Map not found');

  if (!canTransitionMapShell(current.shell_status, 'submitted_for_review', profile.role)) {
    return badRequest('Invalid map shell transition to submitted_for_review');
  }

  const now = new Date().toISOString();
  const { data, error } = await db
    .from('maps')
    .update({ shell_status: 'submitted_for_review', submitted_at: now, updated_by: profile.id })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return serverError(error.message);

  const { error: reviewError } = await db.from('map_reviews').insert({
    map_id: id,
    submitted_by: profile.id,
    status: 'submitted',
    created_at: now,
  });
  if (reviewError) return serverError(reviewError.message);

  return ok({ map: data as MapRecord });
}
