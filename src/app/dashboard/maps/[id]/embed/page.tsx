'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, PageHeader, Panel } from '@/components/ui/siena';

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
    const res = await fetch(`/api/embed-configs?mapId=${mapId}`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to load embed presets');
    setConfigs(json.embedConfigs ?? []);
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
    <section className="space-y-6">
      <PageHeader eyebrow="Embed Output" title="Embed Generator" subtitle="Save reusable embed presets and copy iframe code." />

      <Panel title="Preset Builder">
        <form onSubmit={savePreset} className="grid gap-3 md:grid-cols-3">
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Preset name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Width" value={form.width} onChange={(e) => setForm((p) => ({ ...p, width: e.target.value }))} />
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Height" value={form.height} onChange={(e) => setForm((p) => ({ ...p, height: e.target.value }))} />
          <select className="rounded-md border px-3 py-2 text-sm" value={form.default_mode} onChange={(e) => setForm((p) => ({ ...p, default_mode: e.target.value as EmbedConfig['default_mode'] }))}>
            <option value="both">both</option>
            <option value="explore_only">explore_only</option>
            <option value="guided_only">guided_only</option>
          </select>

          {([
            ['show_legend', 'Show legend'],
            ['show_search', 'Show search'],
            ['show_sidebar', 'Show sidebar'],
            ['show_tour_panel', 'Show tour panel'],
            ['show_branding', 'Show branding'],
            ['show_cta', 'Show CTA'],
          ] as const).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))}
              />
              {label}
            </label>
          ))}

          <Button type="submit" className="md:col-span-3">Save Preset</Button>
        </form>
      </Panel>

      <Panel title="Embed Preview">
        <div className="space-y-3">
          <iframe src={previewUrl} className="w-full rounded-lg border border-black/10" style={{ height: form.height }} />
          <textarea readOnly value={iframeCode} className="w-full rounded-md border px-3 py-2 text-xs" rows={4} />
        </div>
      </Panel>

      <Panel title="Saved Presets">
        <div className="space-y-2">
          {configs.map((config) => (
            <div key={config.id} className="rounded-lg border border-black/10 bg-white p-3 text-sm">
              <p className="font-semibold text-[var(--brand-dark)]">{config.name}</p>
              <p className="text-xs text-black/60">{config.width} x {config.height} | mode: {config.default_mode}</p>
            </div>
          ))}
        </div>
      </Panel>

      {message ? <p className="siena-subtitle text-[var(--brand)]">{message}</p> : null}
    </section>
  );
}
