'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, PageHeader, Panel } from '@/components/ui/siena';

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
    setMessage('Map created.');
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Map Governance"
        title="Maps Console"
        subtitle="Create map shells and manage approval/publication state."
      />

      <Panel title="Create Map Shell" subtitle="Department heads and above can create shells.">
        <form onSubmit={createMap} className="grid gap-3 md:grid-cols-5">
          <input placeholder="Title" value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} required className="rounded-md border px-3 py-2 text-sm" />
          <input placeholder="Slug" value={createForm.slug} onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))} required className="rounded-md border px-3 py-2 text-sm" />
          <select value={createForm.primary_department_id} onChange={(e) => setCreateForm((p) => ({ ...p, primary_department_id: e.target.value }))} required className="rounded-md border px-3 py-2 text-sm">
            <option value="">Primary department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select value={createForm.visibility} onChange={(e) => setCreateForm((p) => ({ ...p, visibility: e.target.value }))} className="rounded-md border px-3 py-2 text-sm">
            <option value="internal_only">Internal</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
          <Button type="submit">Create</Button>
        </form>
      </Panel>

      {message ? <p className="siena-subtitle text-[var(--brand)]">{message}</p> : null}

      <Panel title="Map Inventory" subtitle="Every map with shell and publication status.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.08em] text-black/60">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">Shell</th>
                <th className="px-3 py-2">Publish</th>
                <th className="px-3 py-2">Visibility</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {!loading && maps.length === 0 ? (
                <tr><td className="px-3 py-4 text-black/60" colSpan={6}>No maps yet.</td></tr>
              ) : (
                maps.map((map) => (
                  <tr key={map.id} className="border-t border-black/10">
                    <td className="px-3 py-3">
                      <Link href={`/dashboard/maps/${map.id}`} className="font-semibold text-[var(--brand-dark)] hover:underline">
                        {map.title}
                      </Link>
                      <p className="text-xs text-black/55">/{map.slug}</p>
                    </td>
                    <td className="px-3 py-3">{departmentNameById[map.primary_department_id] ?? 'Unknown'}</td>
                    <td className="px-3 py-3"><Badge label={map.shell_status.replaceAll('_', ' ')} tone={shellTone(map.shell_status)} /></td>
                    <td className="px-3 py-3"><Badge label={map.publication_status} tone={publicationTone(map.publication_status)} /></td>
                    <td className="px-3 py-3">{map.visibility}</td>
                    <td className="px-3 py-3 text-xs">{new Date(map.updated_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}
