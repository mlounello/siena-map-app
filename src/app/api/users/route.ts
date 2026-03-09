import { z } from 'zod';
import { badRequest, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';

const updateSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['owner', 'super_admin', 'department_head', 'editor', 'viewer']),
});

export async function GET() {
  const profile = await requireRole('super_admin');
  if (!profile) return unauthorized();

  const { db } = await createDbClient();
  const { data, error } = await db
    .from('profiles')
    .select('id, email, display_name, role, is_active, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) return serverError(error.message);
  return ok({ users: data ?? [] });
}

export async function PATCH(request: Request) {
  const actor = await requireRole('super_admin');
  if (!actor) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(', '));

  if (parsed.data.role === 'owner' && actor.role !== 'owner') {
    return unauthorized('Only owner can assign owner role');
  }

  const { db } = await createDbClient();
  const { data, error } = await db
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.user_id)
    .select('id, email, display_name, role, is_active, created_at, updated_at')
    .single();

  if (error) return serverError(error.message);
  return ok({ user: data });
}
