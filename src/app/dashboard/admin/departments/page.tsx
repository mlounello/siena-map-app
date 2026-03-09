'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell, Button, EmptyState, PageHeader, SectionCard, StatusMessage } from '@/components/ui/siena';
import { FormField, SelectInput, TextInput } from '@/components/ui/form-controls';
import { LoadingRows } from '@/components/ui/loading';

type Department = { id: string; name: string; slug: string; description: string | null };
type User = { id: string; email: string };

export default function DepartmentsAdminPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [members, setMembers] = useState<Array<{ user_id: string; role: string; profiles?: { email?: string } }>>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const [createForm, setCreateForm] = useState({ name: '', slug: '', description: '' });
  const [memberForm, setMemberForm] = useState({ user_id: '', role: 'viewer' });

  async function loadDepartments() {
    setLoading(true);
    const [deptRes, userRes] = await Promise.all([
      fetch('/api/departments', { cache: 'no-store' }),
      fetch('/api/users', { cache: 'no-store' }),
    ]);

    const deptJson = await deptRes.json();
    const userJson = await userRes.json();

    if (!deptRes.ok) {
      setMessage(deptJson.error ?? 'Failed to load departments');
      setLoading(false);
      return;
    }
    setDepartments(deptJson.departments ?? []);
    setUsers((userJson.users ?? []).map((u: any) => ({ id: u.id, email: u.email })));
    if (!selectedDepartmentId && deptJson.departments?.[0]?.id) {
      setSelectedDepartmentId(deptJson.departments[0].id);
    }
    setLoading(false);
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

  const userById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.email])), [users]);

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
    <AppShell>
      <PageHeader eyebrow="Administration" title="Departments" subtitle="Create departments, manage memberships, and assign department roles." />

      <SectionCard title="Create Department">
        <form onSubmit={createDepartment} className="form-row md:grid-cols-4 md:items-end">
          <FormField label="Name">
            <TextInput value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} required />
          </FormField>
          <FormField label="Slug">
            <TextInput value={createForm.slug} onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))} required />
          </FormField>
          <FormField label="Description">
            <TextInput value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} />
          </FormField>
          <Button type="submit">Create Department</Button>
        </form>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Department List">
          {loading ? (
            <LoadingRows rows={5} />
          ) : departments.length === 0 ? (
            <EmptyState title="No departments yet" description="Create a department to start role scoping." />
          ) : (
            <div className="space-y-2">
              {departments.map((department) => (
                <button
                  key={department.id}
                  onClick={() => setSelectedDepartmentId(department.id)}
                  className={`w-full rounded-lg border p-3 text-left ${selectedDepartmentId === department.id ? 'border-[var(--brand)] bg-[var(--surface-subtle)]' : 'border-[var(--border)] bg-white'}`}
                >
                  <p className="row-title">{department.name}</p>
                  <p className="row-meta">{department.slug}</p>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Members" subtitle="Assign users to selected department.">
          <form onSubmit={addMember} className="form-grid">
            <div className="form-row md:grid-cols-2">
              <FormField label="User">
                <SelectInput
                  value={memberForm.user_id}
                  onChange={(e) => setMemberForm((p) => ({ ...p, user_id: e.target.value }))}
                  required
                >
                  <option value="">Select user</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.email}</option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField label="Department role">
                <SelectInput value={memberForm.role} onChange={(e) => setMemberForm((p) => ({ ...p, role: e.target.value }))}>
                  <option value="viewer">viewer</option>
                  <option value="editor">editor</option>
                  <option value="department_head">department head</option>
                </SelectInput>
              </FormField>
            </div>
            <Button type="submit">Add Member</Button>
          </form>

          <div className="mt-4 space-y-2">
            {members.length === 0 ? (
              <EmptyState title="No members in this department" />
            ) : (
              members.map((member) => (
                <div key={member.user_id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm">
                  <p className="row-title">{member.profiles?.email ?? userById[member.user_id] ?? 'Unknown user'}</p>
                  <p className="row-meta">{member.role}</p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {message ? <StatusMessage>{message}</StatusMessage> : null}
    </AppShell>
  );
}
