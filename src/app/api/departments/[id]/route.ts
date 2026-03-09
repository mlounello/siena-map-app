import { z } from 'zod';
import { badRequest, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';

const updateSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    slug: z.string().min(2).max(120).optional(),
    description: z.string().max(1000).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field is required',
  });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole('super_admin');
  if (!profile) return unauthorized();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((issue) => issue.message).join(', '));
  }

  const { db } = await createDbClient();
  const { data, error } = await db
    .from('departments')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return serverError(error.message);
  return ok({ department: data });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole('super_admin');
  if (!profile) return unauthorized();

  const { id } = await params;

  const { db } = await createDbClient();
  const { error } = await db.from('departments').delete().eq('id', id);

  if (error) {
    return serverError(
      error.message.includes('violates foreign key constraint')
        ? 'Department cannot be deleted while it is referenced by maps or memberships.'
        : error.message
    );
  }

  return ok({ success: true });
}
