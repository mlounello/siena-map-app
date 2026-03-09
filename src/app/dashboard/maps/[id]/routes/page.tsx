'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, PageHeader, Panel } from '@/components/ui/siena';

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
  const mapId = params.id;

  const [pois, setPois] = useState<Poi[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [message, setMessage] = useState('');
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

  async function load() {
    const [poiRes, connRes] = await Promise.all([
      fetch(`/api/pois?mapId=${mapId}`, { cache: 'no-store' }),
      fetch(`/api/route-connections?mapId=${mapId}`, { cache: 'no-store' }),
    ]);

    const poiJson = await poiRes.json();
    const connJson = await connRes.json();

    setPois((poiJson.pois ?? []).map((p: any) => ({ id: p.id, title: p.title, stop_number: p.stop_number })));
    setConnections(connJson.routeConnections ?? []);

    if (!form.from_poi_id && poiJson.pois?.[0]?.id) {
      setForm((prev) => ({ ...prev, from_poi_id: poiJson.pois[0].id, to_poi_id: poiJson.pois?.[1]?.id ?? poiJson.pois[0].id }));
    }
  }

  useEffect(() => {
    if (mapId) void load();
  }, [mapId]);

  const poiNameById = useMemo(() => Object.fromEntries(pois.map((p) => [p.id, p.title])), [pois]);

  async function createConnection(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/route-connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        map_id: mapId,
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
    <section className="space-y-6">
      <PageHeader eyebrow="Map Builder" title="Route Connection Editor" subtitle="Explicitly define guided route segments and per-connection styling." />

      <Panel title="Create Connection">
        <form onSubmit={createConnection} className="grid gap-3 md:grid-cols-4">
          <select value={form.from_poi_id} onChange={(e) => setForm((p) => ({ ...p, from_poi_id: e.target.value }))} className="rounded-md border px-3 py-2 text-sm" required>
            <option value="">From POI</option>
            {pois.map((poi) => <option key={poi.id} value={poi.id}>{poi.stop_number ? `${poi.stop_number}. ` : ''}{poi.title}</option>)}
          </select>
          <select value={form.to_poi_id} onChange={(e) => setForm((p) => ({ ...p, to_poi_id: e.target.value }))} className="rounded-md border px-3 py-2 text-sm" required>
            <option value="">To POI</option>
            {pois.map((poi) => <option key={poi.id} value={poi.id}>{poi.stop_number ? `${poi.stop_number}. ` : ''}{poi.title}</option>)}
          </select>
          <input value={form.order_index} onChange={(e) => setForm((p) => ({ ...p, order_index: e.target.value }))} className="rounded-md border px-3 py-2 text-sm" placeholder="Order" />
          <input type="color" value={form.line_color} onChange={(e) => setForm((p) => ({ ...p, line_color: e.target.value }))} className="h-[38px] rounded-md border" />
          <input value={form.line_style} onChange={(e) => setForm((p) => ({ ...p, line_style: e.target.value }))} className="rounded-md border px-3 py-2 text-sm" placeholder="Style" />
          <input value={form.line_thickness} onChange={(e) => setForm((p) => ({ ...p, line_thickness: e.target.value }))} className="rounded-md border px-3 py-2 text-sm" placeholder="Thickness" />
          <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Connection['status'] }))} className="rounded-md border px-3 py-2 text-sm">
            <option value="unpublished">unpublished</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
          <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input type="checkbox" checked={form.is_directional} onChange={(e) => setForm((p) => ({ ...p, is_directional: e.target.checked }))} />
            Directional
          </label>
          <Button type="submit" className="md:col-span-4">Add Connection</Button>
        </form>
      </Panel>

      <Panel title="Current Connections">
        <div className="space-y-2">
          {connections.map((conn) => (
            <div key={conn.id} className="rounded-lg border border-black/10 bg-white p-3 text-sm">
              <p className="font-semibold text-[var(--brand-dark)]">{conn.order_index}. {poiNameById[conn.from_poi_id] ?? conn.from_poi_id} → {poiNameById[conn.to_poi_id] ?? conn.to_poi_id}</p>
              <p className="text-xs text-black/60">{conn.line_style ?? 'solid'} | {conn.line_color ?? 'default'} | {conn.line_thickness}px | {conn.status}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => updateConnection(conn.id, { status: conn.status === 'published' ? 'unpublished' : 'published' })}>
                  {conn.status === 'published' ? 'Unpublish' : 'Publish'}
                </Button>
                <Button variant="danger" onClick={() => deleteConnection(conn.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {message ? <p className="siena-subtitle text-[var(--brand)]">{message}</p> : null}
    </section>
  );
}
