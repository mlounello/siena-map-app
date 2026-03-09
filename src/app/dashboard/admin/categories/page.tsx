'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell, Button, EmptyState, PageHeader, SectionCard, StatusMessage } from '@/components/ui/siena';
import { FormField, SelectInput, TextInput } from '@/components/ui/form-controls';
import { LoadingRows } from '@/components/ui/loading';
import { BUILT_IN_PIN_OPTIONS } from '@/lib/map/pins';

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
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [createForm, setCreateForm] = useState({ name: '', slug: '', icon: 'default', color: '#006b54' });
  const [editForm, setEditForm] = useState({ name: '', slug: '', icon: 'default', color: '#006b54' });

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  async function load() {
    setLoading(true);
    const res = await fetch('/api/categories?includeInactive=1', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? 'Failed to load categories');
      setLoading(false);
      return;
    }

    const loaded: Category[] = json.categories ?? [];
    setCategories(loaded);
    if (!selectedCategoryId && loaded[0]?.id) setSelectedCategoryId(loaded[0].id);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!selectedCategory) {
      setEditForm({ name: '', slug: '', icon: 'default', color: '#006b54' });
      return;
    }

    setEditForm({
      name: selectedCategory.name,
      slug: selectedCategory.slug,
      icon: selectedCategory.icon || 'default',
      color: selectedCategory.color || '#006b54',
    });
  }, [selectedCategory]);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...createForm, icon: createForm.icon || null }),
    });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to create category');

    setCreateForm({ name: '', slug: '', icon: 'default', color: '#006b54' });
    setMessage('Category created.');
    await load();
  }

  async function updateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCategoryId) return;

    const res = await fetch('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedCategoryId,
        name: editForm.name,
        slug: editForm.slug,
        icon: editForm.icon || null,
        color: editForm.color || null,
      }),
    });

    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to update category');

    setMessage('Category updated.');
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
          <FormField label="Default icon">
            <SelectInput value={createForm.icon} onChange={(e) => setCreateForm((p) => ({ ...p, icon: e.target.value }))}>
              {BUILT_IN_PIN_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>{option.symbol} {option.label}</option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label="Color">
            <input className="ui-input h-[40px] p-1" type="color" value={createForm.color} onChange={(e) => setCreateForm((p) => ({ ...p, color: e.target.value }))} />
          </FormField>
          <Button type="submit">Create Category</Button>
        </form>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Existing Categories" subtitle="Select a category to edit, archive, or reactivate.">
          {loading ? (
            <LoadingRows rows={5} />
          ) : categories.length === 0 ? (
            <EmptyState title="No categories yet" description="Create categories to classify POIs and improve filtering." />
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${selectedCategoryId === category.id ? 'border-[var(--brand)] bg-[var(--card-subtle)]' : 'border-[var(--border)] bg-[var(--card)]'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: category.color ?? '#cfc9c4' }} />
                      <div>
                        <p className="row-title">{category.name}</p>
                        <p className="row-meta">{category.slug}{!category.is_active ? ' · archived' : ''}</p>
                      </div>
                    </div>
                    <span className="text-xs text-black/65">{BUILT_IN_PIN_OPTIONS.find((option) => option.key === (category.icon ?? 'default'))?.symbol ?? '📍'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Category Settings" subtitle="Update icon, color, and lifecycle state.">
          {!selectedCategory ? (
            <EmptyState title="Select a category first" />
          ) : (
            <form onSubmit={updateCategory} className="form-grid">
              <div className="form-row md:grid-cols-2">
                <FormField label="Name">
                  <TextInput value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} required />
                </FormField>
                <FormField label="Slug">
                  <TextInput value={editForm.slug} onChange={(e) => setEditForm((p) => ({ ...p, slug: e.target.value }))} required />
                </FormField>
              </div>
              <div className="form-row md:grid-cols-2 md:items-end">
                <FormField label="Default icon">
                  <SelectInput value={editForm.icon} onChange={(e) => setEditForm((p) => ({ ...p, icon: e.target.value }))}>
                    {BUILT_IN_PIN_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>{option.symbol} {option.label}</option>
                    ))}
                  </SelectInput>
                </FormField>
                <FormField label="Color">
                  <input className="ui-input h-[40px] p-1" type="color" value={editForm.color} onChange={(e) => setEditForm((p) => ({ ...p, color: e.target.value }))} />
                </FormField>
              </div>
              <div className="action-bar">
                <Button type="submit">Save Category</Button>
                <Button type="button" variant={selectedCategory.is_active ? 'danger' : 'secondary'} onClick={() => void toggleActive(selectedCategory)}>
                  {selectedCategory.is_active ? 'Archive' : 'Reactivate'}
                </Button>
              </div>
            </form>
          )}
        </SectionCard>
      </div>

      {message ? <StatusMessage>{message}</StatusMessage> : null}
    </AppShell>
  );
}
