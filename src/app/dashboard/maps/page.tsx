'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AppShell,
  Badge,
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  SectionCard,
  StatusMessage,
} from '@/components/ui/siena';
import { FormField, SelectInput, TextInput } from '@/components/ui/form-controls';

type MapItem = {
  id: string;
  slug: string;
  title: string;
  shell_status: string;
  publication_status: string;
  visibility: string;
  primary_department_id: string;
  updated_at: string;
};

type Department = { id: string; name: string };

function shellTone(status: string): 'neutral' | 'warning' | 'success' | 'danger' {
  if (status === 'approved') return 'success';
  if (status === 'submitted_for_review') return 'warning';
  if (status === 'rejected') return 'danger';
  return 'neutral';
}

function publicationTone(status: string): 'neutral' | 'warning' | 'success' {
  if (status === 'published') return 'success';
  if (status === 'unpublished') return 'warning';
  return 'neutral';
}

function visibilityTone(status: string): 'neutral' | 'info' | 'warning' {
  if (status === 'public') return 'info';
  if (status === 'unlisted') return 'warning';
  return 'neutral';
}

export default function MapsPage() {
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [createForm, setCreateForm] = useState({
    title: '',
    slug: '',
    primary_department_id: '',
    visibility: 'internal_only',
    display_mode: 'both',
  });

  async function load() {
    setLoading(true);
    const [mapsRes, departmentsRes] = await Promise.all([
      fetch('/api/maps', { cache: 'no-store' }),
      fetch('/api/departments', { cache: 'no-store' }),
    ]);

    const mapsJson = await mapsRes.json();
    const departmentsJson = await departmentsRes.json();
    setMaps(mapsJson.maps ?? []);
    setDepartments(departmentsJson.departments ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const departmentNameById = useMemo(() => {
    const entries = departments.map((d) => [d.id, d.name] as const);
    return Object.fromEntries(entries);
  }, [departments]);

  async function createMap(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    const res = await fetch('/api/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    });
    const json = await res.json();

    if (!res.ok) {
      setMessage(json.error ?? 'Failed to create map');
      return;
    }

    setCreateForm({ title: '', slug: '', primary_department_id: '', visibility: 'internal_only', display_mode: 'both' });
    await load();
    setMessage('Map shell created successfully.');
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Map Governance"
        title="Maps Console"
        subtitle="Create map shells, manage workflow state, and monitor publication readiness."
      />

      <SectionCard
        title="Create Map Shell"
        subtitle="Department Heads and above can create map shells for approval."
      >
        <form onSubmit={createMap} className="form-grid">
          <div className="form-row md:grid-cols-2 lg:grid-cols-4">
            <FormField label="Map title">
              <TextInput
                placeholder="Campus Tour"
                value={createForm.title}
                onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Slug" hint="Used in URLs">
              <TextInput
                placeholder="campus-tour"
                value={createForm.slug}
                onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Primary department">
              <SelectInput
                value={createForm.primary_department_id}
                onChange={(e) => setCreateForm((p) => ({ ...p, primary_department_id: e.target.value }))}
                required
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label="Visibility">
              <SelectInput
                value={createForm.visibility}
                onChange={(e) => setCreateForm((p) => ({ ...p, visibility: e.target.value }))}
              >
                <option value="internal_only">Internal only</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </SelectInput>
            </FormField>
          </div>
          <div className="action-bar">
            <Button type="submit">Create Map Shell</Button>
          </div>
        </form>
      </SectionCard>

      {message ? <StatusMessage>{message}</StatusMessage> : null}

      <SectionCard title="Map Inventory" subtitle="All maps with workflow, publication, and visibility status.">
        {loading ? (
          <StatusMessage>Loading map inventory…</StatusMessage>
        ) : maps.length === 0 ? (
          <EmptyState
            title="No maps yet"
            description="Create your first map shell to start POI authoring and approvals."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Title</th>
                <th>Department</th>
                <th>Shell</th>
                <th>Publish</th>
                <th>Visibility</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {maps.map((map) => (
                <tr key={map.id}>
                  <td>
                    <Link href={`/dashboard/maps/${map.id}`} className="row-title hover:underline">
                      {map.title}
                    </Link>
                    <p className="row-meta">/{map.slug}</p>
                  </td>
                  <td>{departmentNameById[map.primary_department_id] ?? 'Unknown'}</td>
                  <td>
                    <Badge label={map.shell_status.replaceAll('_', ' ')} tone={shellTone(map.shell_status)} />
                  </td>
                  <td>
                    <Badge label={map.publication_status} tone={publicationTone(map.publication_status)} />
                  </td>
                  <td>
                    <Badge label={map.visibility.replaceAll('_', ' ')} tone={visibilityTone(map.visibility)} />
                  </td>
                  <td className="row-meta">{new Date(map.updated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>
    </AppShell>
  );
}
