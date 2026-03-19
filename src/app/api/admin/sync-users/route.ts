import { ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { syncSienaAppUsersToControlRoom } from '@/lib/control-room/user-sync';
import { createDbClient } from '@/lib/supabase/server';

export async function POST() {
  const profile = await requireRole('super_admin');
  if (!profile) return unauthorized();

  const { db } = await createDbClient();
  const result = await syncSienaAppUsersToControlRoom(db, 'manual_admin');

  if (!result.ok) {
    return serverError(result.error);
  }

  return ok(result);
}

