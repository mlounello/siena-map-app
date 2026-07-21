'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell, Badge, Button, DataTable, EmptyState, PageHeader, SectionCard, StatusMessage } from '@/components/ui/siena';
import { FormField, SelectInput } from '@/components/ui/form-controls';
import { LoadingRows } from '@/components/ui/loading';

type User = {
  id: string;
  email: string;
  display_name: string | null;
  role: 'owner' | 'super_admin' | 'department_head' | 'editor' | 'viewer';
  is_active: boolean;
};

function roleTone(role: User['role']): 'neutral' | 'info' | 'success' | 'warning' {
  if (role === 'owner' || role === 'super_admin') return 'success';
  if (role === 'department_head') return 'info';
  if (role === 'editor') return 'warning';
  return 'neutral';
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/users', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? 'Failed to load users');
      setLoading(false);
      return;
    }
    setCurrentUserId(json.currentUserId ?? null);
    setUsers(json.users ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(() => {
    const counts = {
      total: users.length,
      owners: 0,
      admins: 0,
      departmentHeads: 0,
      editors: 0,
      viewers: 0,
      active: 0,
      inactive: 0,
    };

    for (const user of users) {
      if (user.role === 'owner') counts.owners += 1;
      if (user.role === 'super_admin') counts.admins += 1;
      if (user.role === 'department_head') counts.departmentHeads += 1;
      if (user.role === 'editor') counts.editors += 1;
      if (user.role === 'viewer') counts.viewers += 1;
      if (user.is_active) counts.active += 1;
      else counts.inactive += 1;
    }

    return counts;
  }, [users]);

  async function changeRole(userId: string, role: User['role']) {
    setUpdatingUserId(userId);
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role }),
    });

    const json = await res.json();
    setUpdatingUserId(null);
    if (!res.ok) return setMessage(json.error ?? 'Failed to update role');

    await load();
    setMessage(
      json.sync?.ok === false
        ? `Role updated. Control room sync warning: ${json.sync.remoteSummary ?? json.sync.error ?? 'Sync failed.'}`
        : json.sync?.remoteSummary
          ? `Role updated and synced. Control room response: ${json.sync.remoteSummary}`
          : 'Role updated and synced.'
    );
  }

  async function changeAccess(user: User) {
    setUpdatingUserId(user.id);
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, is_active: !user.is_active }),
    });

    const json = await res.json();
    setUpdatingUserId(null);
    if (!res.ok) return setMessage(json.error ?? 'Failed to update access');

    await load();
    setMessage(
      json.sync?.ok === false
        ? `Access updated. Control room sync warning: ${json.sync.remoteSummary ?? json.sync.error ?? 'Sync failed.'}`
        : `Access ${user.is_active ? 'disabled' : 'enabled'} and synced.`
    );
  }

  async function syncUsers() {
    setSyncing(true);
    const res = await fetch('/api/admin/sync-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const json = await res.json().catch(() => null);
    setSyncing(false);

    if (!res.ok) {
      setMessage(json?.error ?? 'Failed to sync Siena Maps users to control room');
      return;
    }

    setMessage(
      json?.remoteSummary
        ? `Synced ${json.syncedCount ?? 0} Siena Maps users. Control room response: ${json.remoteSummary}`
        : `Synced ${json.syncedCount ?? 0} Siena Maps users to control room.`
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Administration"
        title="Users & Roles"
        subtitle="Assign access for Siena Maps accounts that have actually signed into or been provisioned for this app."
        actions={
          <Button variant="secondary" onClick={() => void syncUsers()} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync To Control Room'}
          </Button>
        }
      />
      {message ? <StatusMessage>{message}</StatusMessage> : null}

      <SectionCard title="Role Snapshot" subtitle="Current role distribution across Siena Maps accounts.">
        <div className="toolbar">
          <Badge label={`${summary.total} users`} tone="neutral" />
          <Badge label={`${summary.owners} owners`} tone="success" />
          <Badge label={`${summary.admins} super admins`} tone="success" />
          <Badge label={`${summary.departmentHeads} department heads`} tone="info" />
          <Badge label={`${summary.editors} editors`} tone="warning" />
          <Badge label={`${summary.viewers} viewers`} tone="neutral" />
          <Badge label={`${summary.active} active`} tone="success" />
          <Badge label={`${summary.inactive} inactive`} tone="danger" />
        </div>
      </SectionCard>

      <SectionCard title="Role Management" subtitle="Owner and super admin can update Siena Maps user roles.">
        {loading ? (
          <LoadingRows rows={6} />
        ) : users.length === 0 ? (
          <EmptyState title="No Siena Maps users found" description="Users appear here after signing into Siena Maps or being provisioned through Siena Maps governance." />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Email</th>
                <th>Display Name</th>
                <th>Current Role</th>
                <th>App Access</th>
                <th>Assign Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="row-title">{user.email}</td>
                  <td>{user.display_name ?? '—'}</td>
                  <td>
                    <Badge label={user.role.replaceAll('_', ' ')} tone={roleTone(user.role)} />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Badge
                        label={user.is_active ? 'active' : 'inactive'}
                        tone={user.is_active ? 'success' : 'danger'}
                      />
                      <Button
                        variant={user.is_active ? 'danger' : 'secondary'}
                        disabled={
                          updatingUserId === user.id ||
                          user.role === 'owner' ||
                          user.id === currentUserId
                        }
                        onClick={() => void changeAccess(user)}
                      >
                        {user.is_active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </td>
                  <td>
                    <FormField>
                      <SelectInput
                        value={user.role}
                        disabled={updatingUserId === user.id}
                        onChange={(e) => void changeRole(user.id, e.target.value as User['role'])}
                      >
                        <option value="viewer">viewer</option>
                        <option value="editor">editor</option>
                        <option value="department_head">department head</option>
                        <option value="super_admin">super admin</option>
                        <option value="owner">owner</option>
                      </SelectInput>
                    </FormField>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>
    </AppShell>
  );
}
