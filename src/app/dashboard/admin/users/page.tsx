'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell, Badge, DataTable, EmptyState, PageHeader, SectionCard, StatusMessage } from '@/components/ui/siena';
import { FormField, SelectInput } from '@/components/ui/form-controls';
import { LoadingRows } from '@/components/ui/loading';

type User = {
  id: string;
  email: string;
  display_name: string | null;
  role: 'owner' | 'super_admin' | 'department_head' | 'editor' | 'viewer';
};

function roleTone(role: User['role']): 'neutral' | 'info' | 'success' | 'warning' {
  if (role === 'owner' || role === 'super_admin') return 'success';
  if (role === 'department_head') return 'info';
  if (role === 'editor') return 'warning';
  return 'neutral';
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/users', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? 'Failed to load users');
      setLoading(false);
      return;
    }
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
    };

    for (const user of users) {
      if (user.role === 'owner') counts.owners += 1;
      if (user.role === 'super_admin') counts.admins += 1;
      if (user.role === 'department_head') counts.departmentHeads += 1;
      if (user.role === 'editor') counts.editors += 1;
      if (user.role === 'viewer') counts.viewers += 1;
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
    setMessage('Role updated.');
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Administration" title="Users & Roles" subtitle="Assign platform-wide access levels and governance roles." />
      {message ? <StatusMessage>{message}</StatusMessage> : null}

      <SectionCard title="Role Snapshot" subtitle="Current role distribution across all accounts.">
        <div className="toolbar">
          <Badge label={`${summary.total} users`} tone="neutral" />
          <Badge label={`${summary.owners} owners`} tone="success" />
          <Badge label={`${summary.admins} super admins`} tone="success" />
          <Badge label={`${summary.departmentHeads} department heads`} tone="info" />
          <Badge label={`${summary.editors} editors`} tone="warning" />
          <Badge label={`${summary.viewers} viewers`} tone="neutral" />
        </div>
      </SectionCard>

      <SectionCard title="Role Management" subtitle="Owner and super admin can update user roles.">
        {loading ? (
          <LoadingRows rows={6} />
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Users will appear here after first sign-in." />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Email</th>
                <th>Display Name</th>
                <th>Current Role</th>
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
