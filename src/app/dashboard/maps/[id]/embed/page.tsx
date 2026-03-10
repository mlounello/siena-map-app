'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AppShell,
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  SectionCard,
  StatusMessage,
} from '@/components/ui/siena';
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

const EMBED_TOGGLES = [
  ['show_legend', 'Show legend', 'Display map legend and category context.'],
  ['show_search', 'Show search', 'Allow POI search from the embed toolbar.'],
  ['show_sidebar', 'Show sidebar', 'Display the stops/details side panel.'],
  ['show_tour_panel', 'Show tour panel', 'Show guided route controls and stop sequence.'],
  ['show_branding', 'Show branding', 'Show Siena Maps branding in the embed shell.'],
  ['show_cta', 'Show call-to-action', 'Show sign-in/admin access CTA where applicable.'],
] as const;

export default function EmbedPage() {
  const params = useParams<{ id: string }>();
  const mapId = params.id;

  const [mapSlug, setMapSlug] = useState<string>('');
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
    const [configsRes, mapRes] = await Promise.all([
      fetch(`/api/embed-configs?mapId=${mapId}`, { cache: 'no-store' }),
      fetch(`/api/maps/${mapId}`, { cache: 'no-store' }),
    ]);

    const configsJson = await configsRes.json();
    const mapJson = await mapRes.json();

    if (!configsRes.ok) {
      setMessage(configsJson.error ?? 'Failed to load embed presets');
      setLoading(false);
      return;
    }

    if (!mapRes.ok || !mapJson?.map?.slug) {
      setMessage(mapJson.error ?? 'Failed to resolve map slug for embed preview');
      setLoading(false);
      return;
    }

    setMapSlug(mapJson.map.slug);
    setConfigs(configsJson.embedConfigs ?? []);
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
    if (!mapSlug) return '';

    const qs = new URLSearchParams({
      mode: form.default_mode,
      legend: String(form.show_legend),
      search: String(form.show_search),
      sidebar: String(form.show_sidebar),
      tour: String(form.show_tour_panel),
      branding: String(form.show_branding),
      cta: String(form.show_cta),
    });

    return `/embed/${mapSlug}?${qs.toString()}`;
  }, [form, mapSlug]);

  const iframeCode = `<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}${previewUrl}" width="${form.width}" height="${form.height}" style="border:0;" loading="lazy"></iframe>`;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Embed Output"
        title="Embed Generator"
        subtitle="Create reusable presets and copy embed code snippets for this map."
      />

      {message ? <StatusMessage>{message}</StatusMessage> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <SectionCard title="Preset Builder" subtitle="Set base dimensions, mode, and UI controls.">
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
              {EMBED_TOGGLES.map(([key, label, hint]) => (
                <label
                  key={key}
                  className="grid grid-cols-[auto_1fr] items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2.5"
                >
                  <input
                    className="mt-0.5"
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))}
                  />
                  <span>
                    <span className="row-title text-sm">{label}</span>
                    <span className="row-meta block">{hint}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="action-bar">
              <Button type="submit">Save Preset</Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Embed Preview" subtitle="Live preview and generated iframe code.">
          <div className="space-y-3">
            {previewUrl ? (
              <iframe src={previewUrl} className="w-full rounded-lg border border-[var(--border)] bg-white" style={{ height: form.height }} />
            ) : (
              <LoadingRows rows={3} />
            )}
            <FormField label="Preview URL">
              <TextInput readOnly value={previewUrl || 'Resolving map slug...'} />
            </FormField>
            <FormField label="Iframe code">
              <TextArea readOnly value={previewUrl ? iframeCode : 'Resolving map slug...'} rows={4} className="font-mono text-xs" />
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
          <DataTable>
            <thead>
              <tr>
                <th>Name</th>
                <th>Dimensions</th>
                <th>Default mode</th>
                <th>Enabled controls</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => {
                const enabledCount = [
                  config.show_legend,
                  config.show_search,
                  config.show_sidebar,
                  config.show_tour_panel,
                  config.show_branding,
                  config.show_cta,
                ].filter(Boolean).length;

                return (
                  <tr key={config.id}>
                    <td className="row-title">{config.name}</td>
                    <td>{config.width} x {config.height}</td>
                    <td className="row-meta">{config.default_mode.replaceAll('_', ' ')}</td>
                    <td>{enabledCount} / 6 enabled</td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </SectionCard>
    </AppShell>
  );
}
