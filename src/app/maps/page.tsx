'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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

  const departmentOptions = useMemo(() => {
    const ids = Array.from(new Set(allMaps.map((m) => m.primary_department_id)));
    return ids;
  }, [allMaps]);

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
      <header>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--brand)]">Siena Public Maps</h1>
        <p className="mt-1 text-sm text-black/70">Search and explore published Siena maps.</p>
      </header>

      <div className="grid gap-3 rounded-xl border border-black/10 bg-white p-4 md:grid-cols-3">
        <input className="rounded-md border border-black/15 px-3 py-2 text-sm" placeholder="Search maps" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-md border border-black/15 px-3 py-2 text-sm" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">All departments</option>
          {departmentOptions.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
        <select className="rounded-md border border-black/15 px-3 py-2 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {maps.map((map) => (
          <article key={map.id} className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--brand)]">{map.title}</h2>
            <p className="mt-2 text-sm text-black/70">{map.intro_text ?? 'No description provided yet.'}</p>
            <p className="mt-2 text-xs text-black/55">Type: {map.map_type}</p>
            <Link href={`/maps/${map.slug}`} className="mt-4 inline-flex rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white">
              Open Map
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
