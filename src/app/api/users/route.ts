import { z } from 'zod';
import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/api/http';
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
    .select('id, email, display_name, role, is_active, created_at, updated_at, has_signed_in_to_app')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return serverError(error.message);

  const { data: memberships, error: membershipsError } = await db
    .from('department_memberships')
    .select('user_id');

  if (membershipsError) return serverError(membershipsError.message);

  const memberIds = new Set((memberships ?? []).map((membership) => membership.user_id));
  const users = (data ?? []).filter(
    (user) => user.has_signed_in_to_app || user.role !== 'viewer' || memberIds.has(user.id)
  );

  return ok({
    users: users.map(({ has_signed_in_to_app: _hasSignedInToApp, ...user }) => user),
  });
}

export async function PATCH(request: Request) {
  const actor = await requireRole('super_admin');
  if (!actor) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(', '));

  const { db } = await createDbClient();
  const { data: targetProfile, error: targetError } = await db
    .from('profiles')
    .select('id, role')
    .eq('id', parsed.data.user_id)
    .maybeSingle();

  if (targetError) return serverError(targetError.message);
  if (!targetProfile) return badRequest('User not found');

  if (targetProfile.role === 'owner' && actor.role !== 'owner') {
    return forbidden('Only owner can modify owner accounts');
  }

  if (parsed.data.role === 'owner' && actor.role !== 'owner') {
    return forbidden('Only owner can assign owner role');
  }

  const { data, error } = await db
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.user_id)
    .select('id, email, display_name, role, is_active, created_at, updated_at')
    .single();

  if (error) return serverError(error.message);
  return ok({ user: data });
}
