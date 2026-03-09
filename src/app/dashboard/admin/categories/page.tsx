'use client';

import { useEffect, useState } from 'react';
import { Button, PageHeader, Panel } from '@/components/ui/siena';

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  is_active: boolean;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', slug: '', icon: '', color: '#006b54' });

  async function load() {
    const res = await fetch('/api/categories', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to load categories');
    setCategories(json.categories ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...createForm, icon: createForm.icon || null }),
    });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to create category');

    setCreateForm({ name: '', slug: '', icon: '', color: '#006b54' });
    setMessage('Category created.');
    await load();
  }

  async function toggleActive(category: Category) {
    const res = await fetch('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: category.id, is_active: !category.is_active }),
    });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to update category');

    setMessage('Category updated.');
    await load();
  }

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Administration" title="Category Management" subtitle="Create, style, and archive global categories." />

      <Panel title="Create Category">
        <form onSubmit={createCategory} className="grid gap-3 md:grid-cols-5">
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Name" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} required />
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Slug" value={createForm.slug} onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))} required />
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Icon name (optional)" value={createForm.icon} onChange={(e) => setCreateForm((p) => ({ ...p, icon: e.target.value }))} />
          <input className="h-[38px] rounded-md border px-2 py-1" type="color" value={createForm.color} onChange={(e) => setCreateForm((p) => ({ ...p, color: e.target.value }))} />
          <Button type="submit">Create</Button>
        </form>
      </Panel>

      <Panel title="Existing Categories">
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: category.color ?? '#cfc9c4' }} />
                <div>
                  <p className="font-semibold text-[var(--brand-dark)]">{category.name}</p>
                  <p className="text-xs text-black/60">{category.slug}</p>
                </div>
              </div>
              <Button variant={category.is_active ? 'danger' : 'secondary'} onClick={() => toggleActive(category)}>
                {category.is_active ? 'Archive' : 'Reactivate'}
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      {message ? <p className="siena-subtitle text-[var(--brand)]">{message}</p> : null}
    </section>
  );
}
