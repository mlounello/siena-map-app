import { z } from 'zod';
import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { syncSienaAppUsersToControlRoom } from '@/lib/control-room/user-sync';
import { createDbClient } from '@/lib/supabase/server';
import { listSienaAppUsers } from '@/lib/users/app-users';

const updateSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['owner', 'super_admin', 'department_head', 'editor', 'viewer']),
});

export async function GET() {
  const profile = await requireRole('super_admin');
  if (!profile) return unauthorized();

  const { db } = await createDbClient();
  try {
    const users = await listSienaAppUsers(db);
    return ok({
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

  const sync = await syncSienaAppUsersToControlRoom(db, 'role_change');
  return ok({ user: data, sync });
}
