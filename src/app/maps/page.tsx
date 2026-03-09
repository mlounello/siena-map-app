'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Panel } from '@/components/ui/siena';

type PublicMap = {
  id: string;
  slug: string;
  title: string;
  intro_text: string | null;
  primary_department_id: string;
  map_type: string;
};

type Category = { id: string; name: string };

export default function PublicDirectoryPage() {
  const [maps, setMaps] = useState<PublicMap[]>([]);
  const [allMaps, setAllMaps] = useState<PublicMap[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  async function load() {
    const [mapsRes, categoriesRes] = await Promise.all([
      fetch('/api/public/maps', { cache: 'no-store' }),
      fetch('/api/categories', { cache: 'no-store' }),
    ]);

    const mapsJson = await mapsRes.json();
    const categoriesJson = await categoriesRes.json();

    const list = mapsJson.maps ?? [];
    setAllMaps(list);
    setMaps(list);
    setCategories(categoriesJson.categories ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  const departmentOptions = useMemo(() => Array.from(new Set(allMaps.map((m) => m.primary_department_id))), [allMaps]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (departmentId) params.set('departmentId', departmentId);
    if (categoryId) params.set('categoryId', categoryId);

    fetch(`/api/public/maps?${params.toString()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => setMaps(json.maps ?? []));
  }, [q, departmentId, categoryId]);

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Siena University" title="Public Maps" subtitle="Discover published public experiences and tours." />

      <Panel title="Search and Filter">
        <div className="grid gap-3 md:grid-cols-3">
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Search maps" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="rounded-md border px-3 py-2 text-sm" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">All departments</option>
            {departmentOptions.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
          <select className="rounded-md border px-3 py-2 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {maps.map((map) => (
          <article key={map.id} className="siena-panel">
            <h2 className="siena-panel-title">{map.title}</h2>
            <p className="mt-2 text-sm text-black/75">{map.intro_text ?? 'No description provided yet.'}</p>
            <p className="mt-3 text-xs text-black/55">Type: {map.map_type}</p>
            <Link href={`/maps/${map.slug}`} className="siena-btn siena-btn-primary mt-4 inline-flex">
              Open Map
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
