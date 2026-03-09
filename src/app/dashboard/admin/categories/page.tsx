'use client';

import { useEffect, useState } from 'react';
import { AppShell, Button, EmptyState, PageHeader, SectionCard, StatusMessage } from '@/components/ui/siena';
import { FormField, TextInput } from '@/components/ui/form-controls';
import { LoadingRows } from '@/components/ui/loading';

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
  const [loading, setLoading] = useState(true);
  const [createForm, setCreateForm] = useState({ name: '', slug: '', icon: '', color: '#006b54' });

  async function load() {
    setLoading(true);
    const res = await fetch('/api/categories', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? 'Failed to load categories');
      setLoading(false);
      return;
    }
    setCategories(json.categories ?? []);
    setLoading(false);
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
    <AppShell>
      <PageHeader eyebrow="Administration" title="Category Management" subtitle="Manage global categories used across maps and POIs." />

      <SectionCard title="Create Category">
        <form onSubmit={createCategory} className="form-row md:grid-cols-5 md:items-end">
          <FormField label="Name">
            <TextInput value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} required />
          </FormField>
          <FormField label="Slug">
            <TextInput value={createForm.slug} onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))} required />
          </FormField>
          <FormField label="Icon (optional)">
            <TextInput value={createForm.icon} onChange={(e) => setCreateForm((p) => ({ ...p, icon: e.target.value }))} />
          </FormField>
          <FormField label="Color">
            <input className="ui-input h-[40px] p-1" type="color" value={createForm.color} onChange={(e) => setCreateForm((p) => ({ ...p, color: e.target.value }))} />
          </FormField>
          <Button type="submit">Create Category</Button>
        </form>
      </SectionCard>

      <SectionCard title="Existing Categories" subtitle="Archive or reactivate categories as needed.">
        {loading ? (
          <LoadingRows rows={5} />
        ) : categories.length === 0 ? (
          <EmptyState title="No categories yet" description="Create categories to classify POIs and improve filtering." />
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: category.color ?? '#cfc9c4' }} />
                  <div>
                    <p className="row-title">{category.name}</p>
                    <p className="row-meta">{category.slug}</p>
                  </div>
                </div>
                <Button variant={category.is_active ? 'danger' : 'secondary'} onClick={() => toggleActive(category)}>
                  {category.is_active ? 'Archive' : 'Reactivate'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {message ? <StatusMessage>{message}</StatusMessage> : null}
    </AppShell>
  );
}
