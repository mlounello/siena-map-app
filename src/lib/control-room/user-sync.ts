import type { PlatformRole } from '@/types/siena-maps';
import { env } from '@/lib/config/env';
import { listSienaAppUsers } from '@/lib/users/app-users';

type DbClient = Awaited<ReturnType<typeof import('@/lib/supabase/server').createDbClient>>['db'];

const CONTROL_ROOM_SYNC_URL =
  env.CONTROL_ROOM_APP_USERS_SYNC_URL || 'https://mlounello.com/api/admin/sync/app-users';

type SyncTrigger = 'manual_admin' | 'auth_callback' | 'role_change' | 'access_change';

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
      remoteSummary?: string;
    }
  | {
      ok: false;
      syncedCount: number;
      status: number | null;
      trigger: SyncTrigger;
      error: string;
      remoteSummary?: string;
    };

function summarizeRemoteBody(body: unknown): string | undefined {
  if (typeof body === 'string') {
    return body.slice(0, 180);
  }

  if (!body || typeof body !== 'object') return undefined;

  const record = body as Record<string, unknown>;
  const parts: string[] = [];

  for (const key of ['message', 'error', 'status', 'syncedCount', 'importedCount', 'updatedCount', 'createdCount']) {
    const value = record[key];
    if (value == null) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      parts.push(`${key}=${String(value)}`);
    }
  }

  return parts.length > 0 ? parts.join(', ') : undefined;
}

function bodySignalsFailure(body: unknown): boolean {
  if (typeof body === 'string') {
    return body.includes('Cloudflare Access') || body.includes('<!DOCTYPE html') || body.includes('<html');
  }

  if (!body || typeof body !== 'object') return false;

  const record = body as Record<string, unknown>;
  return (
    record.ok === false ||
    record.success === false ||
    record.synced === false ||
    typeof record.error === 'string'
  );
}

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
  const cfAccessClientId = env.CF_ACCESS_CLIENT_ID;
  const cfAccessClientSecret = env.CF_ACCESS_CLIENT_SECRET;
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

  if (!cfAccessClientId || !cfAccessClientSecret) {
    console.warn(`[control-room-sync] skipped (${trigger}): missing Cloudflare Access service token env`);
    return {
      ok: false,
      syncedCount: 0,
      status: null,
      trigger,
      error: 'Missing CF_ACCESS_CLIENT_ID or CF_ACCESS_CLIENT_SECRET',
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
        'CF-Access-Client-Id': cfAccessClientId,
        'CF-Access-Client-Secret': cfAccessClientSecret,
        'X-App-Sync-Secret': secret,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const rawBody = await response.text().catch(() => '');
    let parsedBody: unknown = null;

    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = rawBody;
      }
    }

    const remoteSummary = summarizeRemoteBody(parsedBody);

    if (!response.ok) {
      const error = `Control room sync failed (${response.status})${rawBody ? `: ${rawBody}` : ''}`;
      console.error('[control-room-sync]', {
        trigger,
        status: response.status,
        error,
        remoteSummary,
        remoteBody: parsedBody,
      });
      return {
        ok: false,
        syncedCount: payload.users.length,
        status: response.status,
        trigger,
        error,
        remoteSummary,
      };
    }

    if (bodySignalsFailure(parsedBody)) {
      const error =
        typeof parsedBody === 'string' && parsedBody.includes('Cloudflare Access')
          ? 'Control room sync blocked by Cloudflare Access'
          : `Control room sync returned a semantic failure despite HTTP ${response.status}`;
      console.error('[control-room-sync]', {
        trigger,
        status: response.status,
        error,
        remoteSummary,
        remoteBody: parsedBody,
      });
      return {
        ok: false,
        syncedCount: payload.users.length,
        status: response.status,
        trigger,
        error,
        remoteSummary,
      };
    }

    console.info('[control-room-sync]', {
      trigger,
      status: response.status,
      syncedCount: payload.users.length,
      remoteSummary,
      remoteBody: parsedBody,
    });

    return {
      ok: true,
      syncedCount: payload.users.length,
      status: response.status,
      trigger,
      remoteSummary,
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
