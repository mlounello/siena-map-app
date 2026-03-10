import { z } from 'zod';
import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';
import { canEditMap } from '@/lib/auth/access';
import { hasMinRole } from '@/lib/siena/permissions';
import { validateMapAnchorsForPublish } from '@/lib/siena/map-publish-validation';
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
    .select('id, shell_status, require_anchors_for_publish')
    .eq('id', id)
    .maybeSingle();

  if (readError) return serverError(readError.message);
  if (!current) return badRequest('Map not found');
  const isElevatedPublisher = hasMinRole(profile.role, 'super_admin');
  if (current.shell_status !== 'approved' && !isElevatedPublisher) {
    return badRequest('Map shell must be approved before publishing');
  }

  const nextStatus = parsed.data.status;
  if (nextStatus === 'published' && current.require_anchors_for_publish) {
    const anchorValidation = await validateMapAnchorsForPublish(db, id).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to validate anchor coverage';
      return { valid: false, blockers: [], summary: null, error: message };
    });

    if (!anchorValidation.valid) {
      if ('error' in anchorValidation && anchorValidation.error) {
        return serverError(anchorValidation.error);
      }

      return Response.json(
        {
          error: 'Publish blocked: required anchor coverage is incomplete for guided-route continuity.',
          code: 'anchor_publish_validation_failed',
          blockers: anchorValidation.blockers,
          summary: anchorValidation.summary,
        },
        { status: 400 }
      );
    }
  }

  const now = new Date().toISOString();
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
