import { z } from 'zod';
import { badRequest, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';
import { canTransitionMapShell } from '@/lib/siena/workflows';
import type { MapRecord } from '@/types/siena-maps';

const schema = z.object({
  note: z.string().max(1000).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole('super_admin');
  if (!profile) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest('Invalid rejection payload');

  const { db } = await createDbClient();
  const { data: current, error: readError } = await db
    .from('maps')
    .select('id, shell_status')
    .eq('id', id)
    .maybeSingle();

  if (readError) return serverError(readError.message);
  if (!current) return badRequest('Map not found');

  if (!canTransitionMapShell(current.shell_status, 'rejected', profile.role)) {
    return badRequest('Invalid map shell transition to rejected');
  }

  const now = new Date().toISOString();
  const { data, error } = await db
    .from('maps')
    .update({ shell_status: 'rejected', approved_at: now, approved_by: profile.id, updated_by: profile.id })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return serverError(error.message);

  if (parsed.data.note) {
    await db.from('map_reviews').insert({
      map_id: id,
      submitted_by: profile.id,
      reviewed_by: profile.id,
      status: 'rejected',
      note: parsed.data.note,
      reviewed_at: now,
    });
  }

  return ok({ map: data as MapRecord });
}
