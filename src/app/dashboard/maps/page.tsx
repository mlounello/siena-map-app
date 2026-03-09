'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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

    setCreateForm({
      title: '',
      slug: '',
      primary_department_id: '',
      visibility: 'internal_only',
      display_mode: 'both',
    });
    await load();
    setMessage('Map created.');
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--brand)]">Maps Console</h1>
        <p className="text-sm text-black/70">Create and manage map shells and publication status.</p>
      </header>

      <form onSubmit={createMap} className="grid gap-3 rounded-xl border border-black/10 bg-white p-4 md:grid-cols-5">
        <input
          className="rounded-md border border-black/15 px-3 py-2 text-sm"
          placeholder="Title"
          value={createForm.title}
          onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
          required
        />
        <input
          className="rounded-md border border-black/15 px-3 py-2 text-sm"
          placeholder="Slug"
          value={createForm.slug}
          onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))}
          required
        />
        <select
          className="rounded-md border border-black/15 px-3 py-2 text-sm"
          value={createForm.primary_department_id}
          onChange={(e) => setCreateForm((p) => ({ ...p, primary_department_id: e.target.value }))}
          required
        >
          <option value="">Primary department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-black/15 px-3 py-2 text-sm"
          value={createForm.visibility}
          onChange={(e) => setCreateForm((p) => ({ ...p, visibility: e.target.value }))}
        >
          <option value="internal_only">Internal</option>
          <option value="unlisted">Unlisted</option>
          <option value="public">Public</option>
        </select>
        <button className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white" type="submit">
          Create Map
        </button>
      </form>

      {message ? <p className="text-sm text-[var(--brand)]">{message}</p> : null}

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-black/70">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Shell</th>
              <th className="px-4 py-3">Publish</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {!loading && maps.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-black/60" colSpan={6}>
                  No maps yet.
                </td>
              </tr>
            ) : (
              maps.map((map) => (
                <tr key={map.id} className="border-t border-black/10">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/maps/${map.id}`} className="font-medium text-[var(--brand)] hover:underline">
                      {map.title}
                    </Link>
                    <p className="text-xs text-black/60">/{map.slug}</p>
                  </td>
                  <td className="px-4 py-3">{departmentNameById[map.primary_department_id] ?? 'Unknown'}</td>
                  <td className="px-4 py-3">{map.shell_status}</td>
                  <td className="px-4 py-3">{map.publication_status}</td>
                  <td className="px-4 py-3">{map.visibility}</td>
                  <td className="px-4 py-3">{new Date(map.updated_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
