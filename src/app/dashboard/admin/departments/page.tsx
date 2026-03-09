'use client';

import { useEffect, useState } from 'react';
import { Button, PageHeader, Panel } from '@/components/ui/siena';

type Department = { id: string; name: string; slug: string; description: string | null };

export default function DepartmentsAdminPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [members, setMembers] = useState<Array<{ user_id: string; role: string; profiles?: { email?: string } }>>([]);
  const [message, setMessage] = useState('');

  const [createForm, setCreateForm] = useState({ name: '', slug: '', description: '' });
  const [memberForm, setMemberForm] = useState({ user_id: '', role: 'viewer' });

  async function loadDepartments() {
    const res = await fetch('/api/departments', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to load departments');
    setDepartments(json.departments ?? []);
    if (!selectedDepartmentId && json.departments?.[0]?.id) setSelectedDepartmentId(json.departments[0].id);
  }

  async function loadMembers(departmentId: string) {
    if (!departmentId) return;
    const res = await fetch(`/api/departments/${departmentId}/members`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to load members');
    setMembers(json.members ?? []);
  }

  useEffect(() => {
    void loadDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartmentId) void loadMembers(selectedDepartmentId);
  }, [selectedDepartmentId]);

  async function createDepartment(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to create department');

    setCreateForm({ name: '', slug: '', description: '' });
    await loadDepartments();
    setMessage('Department created.');
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDepartmentId) return;

    const res = await fetch(`/api/departments/${selectedDepartmentId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberForm),
    });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to add member');

    setMemberForm({ user_id: '', role: 'viewer' });
    await loadMembers(selectedDepartmentId);
    setMessage('Member added.');
  }

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Administration" title="Departments" subtitle="Create departments and assign members." />

      <Panel title="Create Department">
        <form onSubmit={createDepartment} className="grid gap-3 md:grid-cols-4">
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Name" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} required />
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Slug" value={createForm.slug} onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))} required />
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Description" value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} />
          <Button type="submit">Create</Button>
        </form>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Department List">
          <div className="mt-3 space-y-2">
            {departments.map((department) => (
              <button
                key={department.id}
                onClick={() => setSelectedDepartmentId(department.id)}
                className={`w-full rounded-lg border p-3 text-left ${selectedDepartmentId === department.id ? 'border-[var(--brand)] bg-[var(--surface-muted)]/25' : 'border-black/10 bg-white'}`}
              >
                <p className="font-semibold text-[var(--brand-dark)]">{department.name}</p>
                <p className="text-xs text-black/60">{department.slug}</p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Members">
          <form onSubmit={addMember} className="mt-3 grid gap-2">
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="User UUID" value={memberForm.user_id} onChange={(e) => setMemberForm((p) => ({ ...p, user_id: e.target.value }))} required />
            <select className="rounded-md border px-3 py-2 text-sm" value={memberForm.role} onChange={(e) => setMemberForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="viewer">viewer</option>
              <option value="editor">editor</option>
              <option value="department_head">department_head</option>
            </select>
            <Button type="submit">Add Member</Button>
          </form>

          <div className="mt-4 space-y-2">
            {members.map((member) => (
              <div key={member.user_id} className="rounded-lg border border-black/10 bg-white p-3 text-sm">
                <p className="font-semibold text-[var(--brand-dark)]">{member.profiles?.email ?? member.user_id}</p>
                <p className="text-xs text-black/60">{member.role}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {message ? <p className="siena-subtitle text-[var(--brand)]">{message}</p> : null}
    </section>
  );
}
