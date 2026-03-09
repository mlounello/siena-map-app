import { z } from 'zod';
import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';
import { canEditMap } from '@/lib/auth/access';
import { hasMinRole } from '@/lib/siena/permissions';
import type { MapRecord } from '@/types/siena-maps';

const schema = z.object({
  scheduled_publish_at: z.string().datetime().nullable().optional(),
  status: z.enum(['published', 'unpublished', 'archived']).default('published'),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole('department_head');
  if (!profile) return unauthorized();

  if (!(await canEditMap(profile, id))) return forbidden();

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest('Invalid publish payload');

  const { db } = await createDbClient();
  const { data: current, error: readError } = await db
    .from('maps')
    .select('id, shell_status')
    .eq('id', id)
    .maybeSingle();

  if (readError) return serverError(readError.message);
  if (!current) return badRequest('Map not found');
  const isElevatedPublisher = hasMinRole(profile.role, 'super_admin');
  if (current.shell_status !== 'approved' && !isElevatedPublisher) {
    return badRequest('Map shell must be approved before publishing');
  }

  const now = new Date().toISOString();
  const nextStatus = parsed.data.status;
  const publishAt = parsed.data.scheduled_publish_at ?? (nextStatus === 'published' ? now : null);
  const shellStatus = nextStatus === 'archived' ? 'archived' : current.shell_status === 'approved' ? 'approved' : 'approved';

  const { data, error } = await db
    .from('maps')
    .update({
      shell_status: shellStatus,
      publication_status: nextStatus,
      published_at: nextStatus === 'published' ? publishAt : null,
      scheduled_publish_at: parsed.data.scheduled_publish_at ?? null,
      published_by: nextStatus === 'published' ? profile.id : null,
      approved_at: shellStatus === 'approved' ? now : null,
      approved_by: shellStatus === 'approved' ? profile.id : null,
      updated_by: profile.id,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return serverError(error.message);
  return ok({ map: data as MapRecord });
}
