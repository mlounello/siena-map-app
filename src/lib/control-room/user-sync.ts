import type { PlatformRole } from '@/types/siena-maps';
import { env } from '@/lib/config/env';
import { listSienaAppUsers } from '@/lib/users/app-users';

type DbClient = Awaited<ReturnType<typeof import('@/lib/supabase/server').createDbClient>>['db'];

const CONTROL_ROOM_SYNC_URL =
  env.CONTROL_ROOM_APP_USER_SYNC_URL || 'https://mlounello.com/api/admin/sync/app-users';

type SyncTrigger = 'manual_admin' | 'auth_callback' | 'role_change';

type ControlRoomSyncUser = {
  fullName: string;
  email: string;
  globalRole: string;
  accountStatus: string;
  appRole: string;
  permissionLevel: string;
  membershipStatus: string;
  notes: string;
};

type SyncResult =
  | {
      ok: true;
      syncedCount: number;
      status: number;
      trigger: SyncTrigger;
    }
  | {
      ok: false;
      syncedCount: number;
      status: number | null;
      trigger: SyncTrigger;
      error: string;
    };

function mapGlobalRole(role: PlatformRole): string {
  return role === 'owner' || role === 'super_admin' ? 'admin' : 'member';
}

function mapPermissionLevel(role: PlatformRole): string {
  if (role === 'owner' || role === 'super_admin' || role === 'department_head') return 'managed';
  if (role === 'editor') return 'contributor';
  return 'read_only';
}

function mapAccountStatus(isActive: boolean): string {
  return isActive ? 'active' : 'inactive';
}

function toControlRoomUser(user: Awaited<ReturnType<typeof listSienaAppUsers>>[number]): ControlRoomSyncUser {
  return {
    fullName: user.display_name || user.email.split('@')[0] || user.email,
    email: user.email,
    globalRole: mapGlobalRole(user.role),
    accountStatus: mapAccountStatus(user.is_active),
    appRole: user.role,
    permissionLevel: mapPermissionLevel(user.role),
    membershipStatus: mapAccountStatus(user.is_active),
    notes: 'Imported from Siena Map App',
  };
}

export async function syncSienaAppUsersToControlRoom(
  db: DbClient,
  trigger: SyncTrigger
): Promise<SyncResult> {
  const secret = env.APP_SYNC_SECRET;
  if (!secret) {
    console.warn(`[control-room-sync] skipped (${trigger}): missing APP_SYNC_SECRET`);
    return {
      ok: false,
      syncedCount: 0,
      status: null,
      trigger,
      error: 'Missing APP_SYNC_SECRET',
    };
  }

  try {
    const users = await listSienaAppUsers(db);
    const payload = {
      appSlug: 'siena-map-app',
      fullSync: true,
      users: users.map(toControlRoomUser),
    };

    const response = await fetch(CONTROL_ROOM_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Sync-Secret': secret,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const error = `Control room sync failed (${response.status})${errorText ? `: ${errorText}` : ''}`;
      console.error('[control-room-sync]', { trigger, status: response.status, error });
      return {
        ok: false,
        syncedCount: payload.users.length,
        status: response.status,
        trigger,
        error,
      };
    }

    console.info('[control-room-sync]', {
      trigger,
      status: response.status,
      syncedCount: payload.users.length,
    });

    return {
      ok: true,
      syncedCount: payload.users.length,
      status: response.status,
      trigger,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    console.error('[control-room-sync]', { trigger, error: message });
    return {
      ok: false,
      syncedCount: 0,
      status: null,
      trigger,
      error: message,
    };
  }
}
