'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell, Button, EmptyState, PageHeader, SectionCard, StatusMessage } from '@/components/ui/siena';
import { FormField, SelectInput, TextInput } from '@/components/ui/form-controls';
import { LoadingRows } from '@/components/ui/loading';

type Poi = { id: string; title: string; stop_number: number | null };
type Connection = {
  id: string;
  from_poi_id: string;
  to_poi_id: string;
  order_index: number;
  line_style: string | null;
  line_color: string | null;
  line_thickness: number;
  is_directional: boolean;
  status: 'unpublished' | 'published' | 'archived';
};

export default function RouteEditorPage() {
  const params = useParams<{ id: string }>();
  const mapRouteParam = params.id;
  const [resolvedMapId, setResolvedMapId] = useState<string>('');

  const [pois, setPois] = useState<Poi[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    from_poi_id: '',
    to_poi_id: '',
    order_index: '1',
    line_style: 'solid',
    line_color: '#006b54',
    line_thickness: '4',
    is_directional: false,
    status: 'unpublished' as Connection['status'],
  });

  function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  async function resolveMapId(param: string) {
    if (isUuid(param)) return param;

    const res = await fetch('/api/maps', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) return '';

    const found = (json.maps ?? []).find((map: { id: string; slug: string }) => map.slug === param);
    return found?.id ?? '';
  }

  async function load() {
    if (!resolvedMapId) return;
    setLoading(true);
    const [poiRes, connRes] = await Promise.all([
      fetch(`/api/pois?mapId=${resolvedMapId}`, { cache: 'no-store' }),
      fetch(`/api/route-connections?mapId=${resolvedMapId}`, { cache: 'no-store' }),
    ]);

    const poiJson = await poiRes.json();
    const connJson = await connRes.json();

    setPois((poiJson.pois ?? []).map((p: any) => ({ id: p.id, title: p.title, stop_number: p.stop_number })));
    setConnections(connJson.routeConnections ?? []);

    if (!form.from_poi_id && poiJson.pois?.[0]?.id) {
      setForm((prev) => ({
        ...prev,
        from_poi_id: poiJson.pois[0].id,
        to_poi_id: poiJson.pois?.[1]?.id ?? poiJson.pois[0].id,
      }));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!mapRouteParam) return;
    void resolveMapId(mapRouteParam).then((id) => {
      if (!id) {
        setMessage('Map not found. Use a valid map id or slug.');
        return;
      }
      setResolvedMapId(id);
    });
  }, [mapRouteParam]);

  useEffect(() => {
    if (resolvedMapId) void load();
  }, [resolvedMapId]);

  const poiNameById = useMemo(() => Object.fromEntries(pois.map((p) => [p.id, p.title])), [pois]);

  async function createConnection(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedMapId) return setMessage('Map id is not resolved yet.');
    const res = await fetch('/api/route-connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        map_id: resolvedMapId,
        from_poi_id: form.from_poi_id,
        to_poi_id: form.to_poi_id,
        order_index: Number(form.order_index),
        line_style: form.line_style,
        line_color: form.line_color,
        line_thickness: Number(form.line_thickness),
        is_directional: form.is_directional,
        status: form.status,
      }),
    });

    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to create connection');

    setMessage('Route connection created.');
    await load();
  }

  async function updateConnection(id: string, patch: Partial<Connection>) {
    const res = await fetch(`/api/route-connections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to update connection');
    setMessage('Connection updated.');
    await load();
  }

  async function deleteConnection(id: string) {
    const res = await fetch(`/api/route-connections/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to delete connection');
    setMessage('Connection deleted.');
    await load();
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Map Builder" title="Route Connection Editor" subtitle="Define explicit route segments and per-connection display styling." />

      {!resolvedMapId ? (
        <SectionCard title="Resolving map" subtitle="Waiting for map id resolution from route parameter.">
          <LoadingRows rows={2} />
        </SectionCard>
      ) : (
        <>
      <SectionCard title="Create Connection">
        <form onSubmit={createConnection} className="form-grid">
          <div className="form-row md:grid-cols-4">
            <FormField label="From POI">
              <SelectInput value={form.from_poi_id} onChange={(e) => setForm((p) => ({ ...p, from_poi_id: e.target.value }))} required>
                <option value="">Select stop</option>
                {pois.map((poi) => <option key={poi.id} value={poi.id}>{poi.stop_number ? `${poi.stop_number}. ` : ''}{poi.title}</option>)}
              </SelectInput>
            </FormField>
            <FormField label="To POI">
              <SelectInput value={form.to_poi_id} onChange={(e) => setForm((p) => ({ ...p, to_poi_id: e.target.value }))} required>
                <option value="">Select stop</option>
                {pois.map((poi) => <option key={poi.id} value={poi.id}>{poi.stop_number ? `${poi.stop_number}. ` : ''}{poi.title}</option>)}
              </SelectInput>
            </FormField>
            <FormField label="Order index">
              <TextInput value={form.order_index} onChange={(e) => setForm((p) => ({ ...p, order_index: e.target.value }))} />
            </FormField>
            <FormField label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Connection['status'] }))}>
                <option value="unpublished">unpublished</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </SelectInput>
            </FormField>
          </div>

          <div className="form-row md:grid-cols-4 md:items-end">
            <FormField label="Line style">
              <TextInput value={form.line_style} onChange={(e) => setForm((p) => ({ ...p, line_style: e.target.value }))} />
            </FormField>
            <FormField label="Line color">
              <input type="color" className="ui-input h-[40px] p-1" value={form.line_color} onChange={(e) => setForm((p) => ({ ...p, line_color: e.target.value }))} />
            </FormField>
            <FormField label="Line thickness">
              <TextInput value={form.line_thickness} onChange={(e) => setForm((p) => ({ ...p, line_thickness: e.target.value }))} />
            </FormField>
            <label className="inline-flex h-[40px] items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
              <input type="checkbox" checked={form.is_directional} onChange={(e) => setForm((p) => ({ ...p, is_directional: e.target.checked }))} />
              Directional
            </label>
          </div>

          <Button type="submit">Add Connection</Button>
        </form>
      </SectionCard>

      <SectionCard title="Current Connections" subtitle="Publish, unpublish, or remove individual route segments.">
        {loading ? (
          <LoadingRows rows={4} />
        ) : connections.length === 0 ? (
          <EmptyState title="No route connections" description="Add a connection to start building guided path lines." />
        ) : (
          <div className="space-y-2">
            {connections.map((conn) => (
              <div key={conn.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm">
                <p className="row-title">{conn.order_index}. {poiNameById[conn.from_poi_id] ?? 'Unknown stop'} → {poiNameById[conn.to_poi_id] ?? 'Unknown stop'}</p>
                <p className="row-meta">{conn.line_style ?? 'solid'} | {conn.line_color ?? 'default'} | {conn.line_thickness}px | {conn.status}</p>
                <div className="mt-2 action-bar">
                  <Button variant="secondary" onClick={() => updateConnection(conn.id, { status: conn.status === 'published' ? 'unpublished' : 'published' })}>
                    {conn.status === 'published' ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button variant="danger" onClick={() => deleteConnection(conn.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
        </>
      )}

      {message ? <StatusMessage>{message}</StatusMessage> : null}
    </AppShell>
  );
}
