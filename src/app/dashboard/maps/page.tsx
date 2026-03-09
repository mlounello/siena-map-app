'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Globe2, Layers3, MapPinned } from 'lucide-react';
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
import { LoadingInline } from '@/components/ui/loading';
import { MAP_TILE_PRESETS } from '@/lib/map/base-layers';

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
    default_center_lat: '42.7167',
    default_center_lng: '-73.7519',
    default_zoom: '16',
    theme_preset: 'streets',
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

    const payload = {
      ...createForm,
      default_center_lat: createForm.default_center_lat === '' ? null : Number(createForm.default_center_lat),
      default_center_lng: createForm.default_center_lng === '' ? null : Number(createForm.default_center_lng),
      default_zoom: Number(createForm.default_zoom) || 16,
    };

    const res = await fetch('/api/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!res.ok) {
      setMessage(json.error ?? 'Failed to create map');
      return;
    }

    setCreateForm({
      title: '',
      slug: '',
      primary_department_id: '',
      visibility: 'internal_only',
      display_mode: 'both',
      default_center_lat: '42.7167',
      default_center_lng: '-73.7519',
      default_zoom: '16',
      theme_preset: 'streets',
    });
    await load();
    setMessage('Map shell created successfully.');
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Map Governance"
        title="Maps Console"
        subtitle="Create map shells, manage approval states, and publish map experiences."
        actions={
          <Link href="/dashboard/review-queue">
            <Button variant="secondary">Open Review Queue</Button>
          </Link>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_1.55fr]">
        <SectionCard
          title="Create Map Shell"
          subtitle="Department Heads and above can create map shells for approval."
        >
          <form onSubmit={createMap} className="form-grid">
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
            <div className="form-row md:grid-cols-2">
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
            <div className="form-row md:grid-cols-4">
              <FormField label="Default center latitude">
                <TextInput
                  value={createForm.default_center_lat}
                  onChange={(e) => setCreateForm((p) => ({ ...p, default_center_lat: e.target.value }))}
                />
              </FormField>
              <FormField label="Default center longitude">
                <TextInput
                  value={createForm.default_center_lng}
                  onChange={(e) => setCreateForm((p) => ({ ...p, default_center_lng: e.target.value }))}
                />
              </FormField>
              <FormField label="Default zoom">
                <TextInput
                  value={createForm.default_zoom}
                  onChange={(e) => setCreateForm((p) => ({ ...p, default_zoom: e.target.value }))}
                />
              </FormField>
              <FormField label="Map style">
                <SelectInput
                  value={createForm.theme_preset}
                  onChange={(e) => setCreateForm((p) => ({ ...p, theme_preset: e.target.value }))}
                >
                  {MAP_TILE_PRESETS.map((preset) => (
                    <option key={preset.key} value={preset.key}>
                      {preset.label}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
            </div>
            <div className="action-bar">
              <Button type="submit">Create Map Shell</Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Inventory Snapshot" subtitle="Current status mix across all maps.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="surface-stat">
              <MapPinned className="mb-1.5 h-4 w-4 text-[var(--brand)]" />
              <p className="row-meta">Total maps</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--heading)]">{maps.length}</p>
            </div>
            <div className="surface-stat">
              <Globe2 className="mb-1.5 h-4 w-4 text-[var(--accent-blue)]" />
              <p className="row-meta">Published</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--heading)]">
                {maps.filter((m) => m.publication_status === 'published').length}
              </p>
            </div>
            <div className="surface-stat">
              <ClipboardCheck className="mb-1.5 h-4 w-4 text-[var(--brand-yellow)]" />
              <p className="row-meta">Pending shell review</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--heading)]">
                {maps.filter((m) => m.shell_status === 'submitted_for_review').length}
              </p>
            </div>
            <div className="surface-stat">
              <Layers3 className="mb-1.5 h-4 w-4 text-[var(--brand-dark)]" />
              <p className="row-meta">Public / Unlisted</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--heading)]">
                {maps.filter((m) => m.visibility !== 'internal_only').length}
              </p>
            </div>
          </div>
        </SectionCard>
      </section>

      {message ? <StatusMessage>{message}</StatusMessage> : null}

      <SectionCard title="Map Inventory" subtitle="All maps with workflow, publication, and visibility status.">
        {loading ? (
          <LoadingInline>Loading map inventory…</LoadingInline>
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
