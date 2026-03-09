'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell, Button, EmptyState, PageHeader, SectionCard, StatusMessage } from '@/components/ui/siena';
import { FormField, SelectInput, TextArea, TextInput } from '@/components/ui/form-controls';
import { LoadingRows } from '@/components/ui/loading';

type EmbedConfig = {
  id: string;
  name: string;
  width: string;
  height: string;
  show_legend: boolean;
  show_search: boolean;
  show_sidebar: boolean;
  show_tour_panel: boolean;
  show_branding: boolean;
  show_cta: boolean;
  default_mode: 'explore_only' | 'guided_only' | 'both';
};

export default function EmbedPage() {
  const params = useParams<{ id: string }>();
  const mapId = params.id;

  const [configs, setConfigs] = useState<EmbedConfig[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: 'Default Embed',
    width: '100%',
    height: '600px',
    show_legend: true,
    show_search: true,
    show_sidebar: true,
    show_tour_panel: true,
    show_branding: true,
    show_cta: true,
    default_mode: 'both' as EmbedConfig['default_mode'],
  });

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/embed-configs?mapId=${mapId}`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? 'Failed to load embed presets');
      setLoading(false);
      return;
    }
    setConfigs(json.embedConfigs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (mapId) void load();
  }, [mapId]);

  async function savePreset(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/embed-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, map_id: mapId }),
    });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to save preset');

    setMessage('Embed preset saved.');
    await load();
  }

  const previewUrl = useMemo(() => {
    const qs = new URLSearchParams({
      mode: form.default_mode,
      legend: String(form.show_legend),
      search: String(form.show_search),
      sidebar: String(form.show_sidebar),
      tour: String(form.show_tour_panel),
      branding: String(form.show_branding),
      cta: String(form.show_cta),
    });

    return `/embed/${mapId}?${qs.toString()}`;
  }, [form, mapId]);

  const iframeCode = `<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}${previewUrl}" width="${form.width}" height="${form.height}" style="border:0;" loading="lazy"></iframe>`;

  return (
    <AppShell>
      <PageHeader eyebrow="Embed Output" title="Embed Generator" subtitle="Create reusable presets and copy embed code snippets." />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <SectionCard title="Preset Builder">
          <form onSubmit={savePreset} className="form-grid">
            <div className="form-row md:grid-cols-3">
              <FormField label="Preset name">
                <TextInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
              </FormField>
              <FormField label="Width">
                <TextInput value={form.width} onChange={(e) => setForm((p) => ({ ...p, width: e.target.value }))} />
              </FormField>
              <FormField label="Height">
                <TextInput value={form.height} onChange={(e) => setForm((p) => ({ ...p, height: e.target.value }))} />
              </FormField>
            </div>

            <FormField label="Default mode">
              <SelectInput value={form.default_mode} onChange={(e) => setForm((p) => ({ ...p, default_mode: e.target.value as EmbedConfig['default_mode'] }))}>
                <option value="both">both</option>
                <option value="explore_only">explore only</option>
                <option value="guided_only">guided only</option>
              </SelectInput>
            </FormField>

            <div className="grid gap-2 md:grid-cols-2">
              {([
                ['show_legend', 'Show legend'],
                ['show_search', 'Show search'],
                ['show_sidebar', 'Show sidebar'],
                ['show_tour_panel', 'Show tour panel'],
                ['show_branding', 'Show branding'],
                ['show_cta', 'Show CTA'],
              ] as const).map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm">
                  <input type="checkbox" checked={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>

            <Button type="submit">Save Preset</Button>
          </form>
        </SectionCard>

        <SectionCard title="Embed Preview">
          <div className="space-y-3">
            <iframe src={previewUrl} className="w-full rounded-lg border border-[var(--border)] bg-white" style={{ height: form.height }} />
            <FormField label="Iframe code">
              <TextArea readOnly value={iframeCode} rows={4} className="font-mono text-xs" />
            </FormField>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Saved Presets" subtitle="Reusable embed presets for this map.">
        {loading ? (
          <LoadingRows rows={4} />
        ) : configs.length === 0 ? (
          <EmptyState title="No embed presets yet" description="Save a preset to quickly reuse embed configurations." />
        ) : (
          <div className="space-y-2">
            {configs.map((config) => (
              <div key={config.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm">
                <p className="row-title">{config.name}</p>
                <p className="row-meta">{config.width} x {config.height} | mode: {config.default_mode.replaceAll('_', ' ')}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {message ? <StatusMessage>{message}</StatusMessage> : null}
    </AppShell>
  );
}
