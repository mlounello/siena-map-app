'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell, Button, DataTable, EmptyState, PageHeader, SectionCard, StatusMessage } from '@/components/ui/siena';
import { FormField, SelectInput, TextInput } from '@/components/ui/form-controls';
import { LoadingRows } from '@/components/ui/loading';

type Department = { id: string; name: string; slug: string; description: string | null; is_active: boolean };
type User = { id: string; email: string };
type Member = {
  user_id: string;
  role: string;
  profiles?: { email?: string };
};

export default function DepartmentsAdminPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({ name: '', slug: '', description: '' });
  const [memberForm, setMemberForm] = useState({ user_id: '', role: 'viewer' });
  const [editForm, setEditForm] = useState({ name: '', slug: '', description: '' });

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

  useEffect(() => {
    const selected = departments.find((department) => department.id === selectedDepartmentId);
    if (!selected) {
      setEditForm({ name: '', slug: '', description: '' });
      return;
    }

    setEditForm({
      name: selected.name,
      slug: selected.slug,
      description: selected.description ?? '',
    });
  }, [selectedDepartmentId, departments]);

  const userById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.email])), [users]);
  const selectedDepartment = useMemo(
    () => departments.find((department) => department.id === selectedDepartmentId) ?? null,
    [departments, selectedDepartmentId]
  );

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

  async function updateMemberRole(userId: string, role: string) {
    if (!selectedDepartmentId) return;

    setSavingMemberId(userId);
    const res = await fetch(`/api/departments/${selectedDepartmentId}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role }),
    });
    const json = await res.json();
    setSavingMemberId(null);

    if (!res.ok) return setMessage(json.error ?? 'Failed to update member role');

    await loadMembers(selectedDepartmentId);
    setMessage('Member role updated.');
  }

  async function removeMember(userId: string, email: string) {
    if (!selectedDepartmentId) return;
    if (!window.confirm(`Remove ${email} from this department?`)) return;

    setSavingMemberId(userId);
    const res = await fetch(`/api/departments/${selectedDepartmentId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    const json = await res.json();
    setSavingMemberId(null);

    if (!res.ok) return setMessage(json.error ?? 'Failed to remove member');

    await loadMembers(selectedDepartmentId);
    setMessage('Member removed.');
  }

  async function updateDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDepartmentId) return;

    const res = await fetch(`/api/departments/${selectedDepartmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        slug: editForm.slug,
        description: editForm.description || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to update department');

    await loadDepartments();
    setMessage('Department updated.');
  }

  async function deleteDepartment() {
    if (!selectedDepartmentId) return;
    const selected = departments.find((department) => department.id === selectedDepartmentId);
    if (!selected) return;

    if (!window.confirm(`Delete department "${selected.name}"? This cannot be undone.`)) return;

    const res = await fetch(`/api/departments/${selectedDepartmentId}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to delete department');

    const nextDepartments = departments.filter((department) => department.id !== selectedDepartmentId);
    setSelectedDepartmentId(nextDepartments[0]?.id ?? '');
    await loadDepartments();
    setMessage('Department deleted.');
  }

  async function setDepartmentActiveState(nextActive: boolean) {
    if (!selectedDepartmentId) return;
    if (!selectedDepartment) return;

    const action = nextActive ? 'restore' : 'archive';
    if (!window.confirm(`${action === 'archive' ? 'Archive' : 'Restore'} department "${selectedDepartment.name}"?`)) return;

    const res = await fetch(`/api/departments/${selectedDepartmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: nextActive }),
    });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? `Failed to ${action} department`);

    await loadDepartments();
    setMessage(`Department ${nextActive ? 'restored' : 'archived'}.`);
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Administration" title="Departments" subtitle="Create departments, manage memberships, and assign department roles." />

      {message ? <StatusMessage>{message}</StatusMessage> : null}

      <SectionCard title="Create Department" subtitle="Add a new governance scope for maps, POIs, and roles.">
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
        <SectionCard title="Department List" subtitle="Select a department to edit settings or manage members.">
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
                  <p className="row-meta">
                    {department.slug}
                    {!department.is_active ? ' · archived' : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Department Settings" subtitle="Edit, archive, restore, or delete the selected department.">
          {!selectedDepartmentId ? (
            <EmptyState title="Select a department first" />
          ) : (
            <form onSubmit={updateDepartment} className="form-grid">
              <div className="form-row md:grid-cols-3 md:items-end">
                <FormField label="Name">
                  <TextInput value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} required />
                </FormField>
                <FormField label="Slug">
                  <TextInput value={editForm.slug} onChange={(e) => setEditForm((p) => ({ ...p, slug: e.target.value }))} required />
                </FormField>
                <FormField label="Description">
                  <TextInput value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
                </FormField>
              </div>
              <div className="action-bar">
                <Button type="submit">Save Changes</Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void setDepartmentActiveState(!selectedDepartment?.is_active)}
                >
                  {selectedDepartment?.is_active ? 'Archive Department' : 'Restore Department'}
                </Button>
                <Button type="button" variant="danger" onClick={() => void deleteDepartment()}>
                  Delete Department
                </Button>
              </div>
            </form>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Department Members" subtitle="Assign users to the selected department and role scope.">
        {!selectedDepartmentId ? (
          <EmptyState title="Select a department first" description="Member assignment is tied to a selected department." />
        ) : (
          <>
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
              <div className="action-bar">
                <Button type="submit">Add Member</Button>
              </div>
            </form>

            <div className="mt-4">
              {members.length === 0 ? (
                <EmptyState title="No members in this department" />
              ) : (
                <DataTable>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.user_id}>
                        <td className="row-title">{member.profiles?.email ?? userById[member.user_id] ?? 'Unknown user'}</td>
                        <td>
                          <SelectInput
                            value={member.role}
                            onChange={(e) => {
                              const nextRole = e.target.value;
                              setMembers((current) =>
                                current.map((entry) =>
                                  entry.user_id === member.user_id ? { ...entry, role: nextRole } : entry
                                )
                              );
                            }}
                            disabled={savingMemberId === member.user_id}
                          >
                            <option value="viewer">viewer</option>
                            <option value="editor">editor</option>
                            <option value="department_head">department head</option>
                          </SelectInput>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => void updateMemberRole(member.user_id, member.role)}
                              disabled={savingMemberId === member.user_id}
                            >
                              Save Role
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              onClick={() =>
                                void removeMember(
                                  member.user_id,
                                  member.profiles?.email ?? userById[member.user_id] ?? 'this user'
                                )
                              }
                              disabled={savingMemberId === member.user_id}
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </div>
          </>
        )}
      </SectionCard>
    </AppShell>
  );
}
