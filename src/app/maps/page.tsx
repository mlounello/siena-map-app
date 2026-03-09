'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AppShell,
  Badge,
  Button,
  EmptyState,
  FilterBar,
  PageHeader,
  SectionCard,
  StatusMessage,
} from '@/components/ui/siena';
import { FormField, SelectInput, TextInput } from '@/components/ui/form-controls';
import { LoadingInline } from '@/components/ui/loading';

type PublicMap = {
  id: string;
  slug: string;
  title: string;
  intro_text: string | null;
  primary_department_id: string;
  departments?: { name?: string | null } | Array<{ name?: string | null }> | null;
  map_type: string;
};

type Category = { id: string; name: string };

export default function PublicDirectoryPage() {
  const [maps, setMaps] = useState<PublicMap[]>([]);
  const [allMaps, setAllMaps] = useState<PublicMap[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  async function load() {
    setLoading(true);
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
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const departmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of allMaps) {
      const joined = Array.isArray(m.departments) ? m.departments[0] : m.departments;
      map.set(m.primary_department_id, joined?.name || 'Department');
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
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
    <AppShell>
      <PageHeader
        eyebrow="Public Directory"
        title="Discover Siena Maps"
        subtitle="Explore published map experiences across Siena teams."
      />

      <SectionCard title="Search & Filters" subtitle="Refine by keyword, department, and category.">
        <FilterBar>
          <div className="grid w-full gap-3 md:grid-cols-3">
            <FormField label="Search maps">
              <TextInput placeholder="Campus, Admissions, Tour..." value={q} onChange={(e) => setQ(e.target.value)} />
            </FormField>
            <FormField label="Department">
              <SelectInput value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">All departments</option>
                {departmentOptions.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label="Category">
              <SelectInput value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>
        </FilterBar>
      </SectionCard>

      {loading ? <LoadingInline>Loading published maps…</LoadingInline> : null}

      {!loading && maps.length === 0 ? (
        <EmptyState
          title="No maps match these filters"
          description="Try broadening your search or clear one or more filters."
          action={<Button variant="secondary" onClick={() => { setQ(''); setDepartmentId(''); setCategoryId(''); }}>Clear Filters</Button>}
        />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {maps.map((map) => (
          <article
            key={map.id}
            className="rounded-2xl border border-[var(--border)] bg-gradient-to-b from-white to-[var(--surface-subtle)] p-5 shadow-[0_1px_2px_rgba(20,46,35,0.06)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[0_10px_24px_rgba(20,46,35,0.1)]"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[1.1rem] font-semibold tracking-[-0.01em] text-[var(--heading)]">{map.title}</h2>
              <Badge label={map.map_type.replaceAll('_', ' ')} tone="info" />
            </div>
            <p className="mt-2 text-sm leading-6 text-black/73">{map.intro_text ?? 'No description provided yet.'}</p>
            <p className="row-meta mt-2">
              {(Array.isArray(map.departments) ? map.departments[0]?.name : map.departments?.name) || 'Department'}
            </p>
            <div className="mt-4 action-bar">
              <Link href={`/maps/${map.slug}`}>
                <Button>Open Map</Button>
              </Link>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
