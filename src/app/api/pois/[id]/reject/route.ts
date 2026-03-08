import { z } from 'zod';
import { badRequest, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';
import { canTransitionPoi } from '@/lib/siena/workflows';
import type { Poi } from '@/types/siena-maps';

const schema = z.object({
  note: z.string().max(1000).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole('department_head');
  if (!profile) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest('Invalid rejection payload');

  const { db } = await createDbClient();
  const { data: current, error: readError } = await db
    .from('pois')
    .select('id, status')
    .eq('id', id)
    .maybeSingle();

  if (readError) return serverError(readError.message);
  if (!current) return badRequest('POI not found');

  if (!canTransitionPoi(current.status, 'rejected', profile.role)) {
    return badRequest('Invalid POI transition to rejected');
  }

  const now = new Date().toISOString();
  const { data, error } = await db
    .from('pois')
    .update({
      status: 'rejected',
      rejection_note: parsed.data.note ?? null,
      approved_at: null,
      approved_by: null,
      published_at: null,
      published_by: null,
      updated_by: profile.id,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return serverError(error.message);

  await db.from('poi_reviews').insert({
    poi_id: id,
    submitted_by: profile.id,
    reviewed_by: profile.id,
    status: 'rejected',
    note: parsed.data.note,
    created_at: now,
    reviewed_at: now,
  });

  return ok({ poi: data as Poi });
}
