'use client';

import { useEffect, useState } from 'react';
import { AppShell, DataTable, EmptyState, PageHeader, SectionCard, StatusMessage } from '@/components/ui/siena';
import { FormField, SelectInput } from '@/components/ui/form-controls';
import { LoadingInline, LoadingRows } from '@/components/ui/loading';

type User = {
  id: string;
  email: string;
  display_name: string | null;
  role: 'owner' | 'super_admin' | 'department_head' | 'editor' | 'viewer';
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

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

  async function changeRole(userId: string, role: User['role']) {
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role }),
    });

    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to update role');

    await load();
    setMessage('Role updated.');
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Administration" title="Users & Roles" subtitle="Assign platform-wide access levels and governance roles." />
      {message ? <StatusMessage>{message}</StatusMessage> : null}

      <SectionCard title="Role Management" subtitle="Owner and super admin can update user roles.">
        {loading ? (
          <LoadingRows rows={5} />
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Users will appear here after first sign-in." />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Email</th>
                <th>Display Name</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="row-title">{user.email}</td>
                  <td>{user.display_name ?? '—'}</td>
                  <td>
                    <FormField>
                      <SelectInput
                        value={user.role}
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

      {loading ? <LoadingInline>Loading users…</LoadingInline> : null}
    </AppShell>
  );
}
