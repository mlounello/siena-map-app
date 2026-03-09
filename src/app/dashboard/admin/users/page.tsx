'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Panel } from '@/components/ui/siena';

type User = {
  id: string;
  email: string;
  display_name: string | null;
  role: 'owner' | 'super_admin' | 'department_head' | 'editor' | 'viewer';
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState('');

  async function load() {
    const res = await fetch('/api/users', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to load users');
    setUsers(json.users ?? []);
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
    <section className="space-y-6">
      <PageHeader eyebrow="Administration" title="Users & Roles" subtitle="Set platform-wide access levels." />
      {message ? <p className="siena-subtitle text-[var(--brand)]">{message}</p> : null}

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.08em] text-black/60">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Display Name</th>
                <th className="px-3 py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-black/10">
                  <td className="px-3 py-3">{user.email}</td>
                  <td className="px-3 py-3">{user.display_name ?? '—'}</td>
                  <td className="px-3 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => void changeRole(user.id, e.target.value as User['role'])}
                      className="rounded-md border px-2 py-1"
                    >
                      <option value="viewer">viewer</option>
                      <option value="editor">editor</option>
                      <option value="department_head">department_head</option>
                      <option value="super_admin">super_admin</option>
                      <option value="owner">owner</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}
