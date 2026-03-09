'use client';

import { useEffect, useState } from 'react';

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
    if (!res.ok) {
      setMessage(json.error ?? 'Failed to load departments');
      return;
    }
    setDepartments(json.departments ?? []);
    if (!selectedDepartmentId && json.departments?.[0]?.id) setSelectedDepartmentId(json.departments[0].id);
  }

  async function loadMembers(departmentId: string) {
    if (!departmentId) return;
    const res = await fetch(`/api/departments/${departmentId}/members`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? 'Failed to load members');
      return;
    }
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
    if (!res.ok) {
      setMessage(json.error ?? 'Failed to create department');
      return;
    }
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
    if (!res.ok) {
      setMessage(json.error ?? 'Failed to add member');
      return;
    }

    setMemberForm({ user_id: '', role: 'viewer' });
    await loadMembers(selectedDepartmentId);
    setMessage('Member added.');
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--brand)]">Departments</h1>

      <form onSubmit={createDepartment} className="grid gap-3 rounded-xl border border-black/10 bg-white p-4 md:grid-cols-4">
        <input className="rounded-md border border-black/15 px-3 py-2 text-sm" placeholder="Name" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} required />
        <input className="rounded-md border border-black/15 px-3 py-2 text-sm" placeholder="Slug" value={createForm.slug} onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))} required />
        <input className="rounded-md border border-black/15 px-3 py-2 text-sm" placeholder="Description" value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} />
        <button className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm text-white" type="submit">Create Department</button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h2 className="font-semibold">Department List</h2>
          <div className="mt-3 space-y-2">
            {departments.map((department) => (
              <button
                key={department.id}
                onClick={() => setSelectedDepartmentId(department.id)}
                className={`w-full rounded-lg border p-3 text-left ${selectedDepartmentId === department.id ? 'border-[var(--brand)] bg-[var(--surface-muted)]' : 'border-black/10'}`}
              >
                <p className="font-medium">{department.name}</p>
                <p className="text-xs text-black/60">{department.slug}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h2 className="font-semibold">Members</h2>
          <form onSubmit={addMember} className="mt-3 grid gap-2">
            <input className="rounded-md border border-black/15 px-3 py-2 text-sm" placeholder="User UUID" value={memberForm.user_id} onChange={(e) => setMemberForm((p) => ({ ...p, user_id: e.target.value }))} required />
            <select className="rounded-md border border-black/15 px-3 py-2 text-sm" value={memberForm.role} onChange={(e) => setMemberForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="viewer">viewer</option>
              <option value="editor">editor</option>
              <option value="department_head">department_head</option>
            </select>
            <button className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm text-white" type="submit">Add Member</button>
          </form>

          <div className="mt-4 space-y-2">
            {members.map((member) => (
              <div key={member.user_id} className="rounded-lg border border-black/10 p-3 text-sm">
                <p>{member.profiles?.email ?? member.user_id}</p>
                <p className="text-xs text-black/60">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {message ? <p className="text-sm text-[var(--brand)]">{message}</p> : null}
    </section>
  );
}
