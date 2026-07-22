import { z } from 'zod';
import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';
import { listSienaAppUsers } from '@/lib/users/app-users';

const updateSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['owner', 'super_admin', 'department_head', 'editor', 'viewer']).optional(),
  is_active: z.boolean().optional(),
}).refine((value) => (value.role === undefined) !== (value.is_active === undefined), {
  message: 'Provide exactly one of role or is_active',
});

export async function GET() {
  const profile = await requireRole('super_admin');
  if (!profile) return unauthorized();

  const { db } = await createDbClient();
  try {
    const users = await listSienaAppUsers(db);
    return ok({
      currentUserId: profile.id,
      users: users.map(
        ({ has_signed_in_to_app: _hasSignedInToApp, last_app_sign_in_at: _lastAppSignInAt, ...user }) => user
      ),
    });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : 'Failed to load users');
  }
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
    .select('id, role, is_active')
    .eq('id', parsed.data.user_id)
    .maybeSingle();

  if (targetError) return serverError(targetError.message);
  if (!targetProfile) return badRequest('User not found');

  if (parsed.data.role !== undefined) {
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

  if (targetProfile.role === 'owner' && parsed.data.is_active === false) {
    return forbidden('The protected owner account cannot be deactivated');
  }

  if (targetProfile.id === actor.id && parsed.data.is_active === false) {
    return forbidden('You cannot disable your own Siena Maps access');
  }

  const { error: accessError } = await db.rpc('set_user_access', {
    p_user_id: parsed.data.user_id,
    p_is_active: parsed.data.is_active,
  });

  if (accessError) return serverError(accessError.message);

  const { data, error } = await db
    .from('profiles')
    .select('id, email, display_name, role, is_active, created_at, updated_at')
    .eq('id', parsed.data.user_id)
    .single();

  if (error) return serverError(error.message);

  return ok({ user: data });
}
