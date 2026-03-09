'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { InternalBuilderMap } from '@/components/map/internal-builder-map';

type Poi = {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  status: string;
  owning_department_id: string;
  created_by: string | null;
  stop_number: number | null;
};

type Category = { id: string; name: string };

type MapRecord = {
  id: string;
  default_center_lat: number | string | null;
  default_center_lng: number | string | null;
  default_zoom: number;
  primary_department_id: string;
};

export default function PoisPage() {
  const params = useParams<{ id: string }>();
  const mapId = params.id;
  const [mapRecord, setMapRecord] = useState<MapRecord | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    latitude: '42.7167',
    longitude: '-73.7519',
    category_id: '',
    owning_department_id: '',
    stop_number: '',
    pin_color: '#8b1f41',
  });

  async function load(id: string) {
    const [poisRes, categoriesRes, mapRes] = await Promise.all([
      fetch(`/api/pois?mapId=${id}`, { cache: 'no-store' }),
      fetch('/api/categories', { cache: 'no-store' }),
      fetch(`/api/maps/${id}`, { cache: 'no-store' }),
    ]);

    const poisJson = await poisRes.json();
    const categoriesJson = await categoriesRes.json();
    const mapJson = await mapRes.json();

    const loadedPois: Poi[] = (poisJson.pois ?? []).map((poi: any) => ({
      ...poi,
      latitude: Number(poi.latitude),
      longitude: Number(poi.longitude),
      stop_number: poi.stop_number == null ? null : Number(poi.stop_number),
    }));

    setPois(loadedPois);
    setCategories(categoriesJson.categories ?? []);
    setMapRecord(mapJson.map ?? null);

    setForm((p) => ({
      ...p,
      owning_department_id: mapJson.map?.primary_department_id ?? p.owning_department_id,
      latitude: String(mapJson.map?.default_center_lat ?? p.latitude),
      longitude: String(mapJson.map?.default_center_lng ?? p.longitude),
    }));
  }

  useEffect(() => {
    if (mapId) void load(mapId);
  }, [mapId]);

  const builderCenter = useMemo<[number, number]>(() => {
    if (Number.isFinite(Number(mapRecord?.default_center_lat)) && Number.isFinite(Number(mapRecord?.default_center_lng))) {
      return [Number(mapRecord?.default_center_lat), Number(mapRecord?.default_center_lng)];
    }
    if (pois[0]) return [pois[0].latitude, pois[0].longitude];
    return [42.7167, -73.7519];
  }, [mapRecord, pois]);

  async function createPoi(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    const payload = {
      map_id: mapId,
      title: form.title,
      description: form.description || null,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      category_id: form.category_id || null,
      owning_department_id: form.owning_department_id,
      stop_number: form.stop_number ? Number(form.stop_number) : null,
      pin_color: form.pin_color || null,
    };

    const res = await fetch('/api/pois', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? 'Failed to create POI');
      return;
    }

    setForm((p) => ({ ...p, title: '', description: '', stop_number: '' }));
    await load(mapId);
    setMessage('POI created.');
  }

  async function movePoi(poiId: string, lat: number, lng: number) {
    const res = await fetch(`/api/pois/${poiId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    });

    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? 'Failed to move POI marker');
      return;
    }

    setMessage('POI coordinates updated.');
    await load(mapId);
  }

  async function actionPoi(id: string, action: 'submit' | 'approve' | 'reject' | 'publish') {
    const body = action === 'publish' ? { status: 'published' } : {};
    const res = await fetch(`/api/pois/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? `Failed to ${action} POI`);
      return;
    }
    await load(mapId);
    setMessage(`POI ${action} complete.`);
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--brand)]">POI Manager + Builder Canvas</h1>

      <InternalBuilderMap
        center={builderCenter}
        zoom={mapRecord?.default_zoom ?? 16}
        pois={pois}
        draftLat={Number(form.latitude)}
        draftLng={Number(form.longitude)}
        onPick={(lat, lng) =>
          setForm((p) => ({
            ...p,
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6),
          }))
        }
        onMovePoi={movePoi}
      />

      <form onSubmit={createPoi} className="grid gap-3 rounded-xl border border-black/10 bg-white p-4 md:grid-cols-3">
        <input className="rounded-md border border-black/15 px-3 py-2 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
        <input className="rounded-md border border-black/15 px-3 py-2 text-sm" placeholder="Latitude" value={form.latitude} onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))} required />
        <input className="rounded-md border border-black/15 px-3 py-2 text-sm" placeholder="Longitude" value={form.longitude} onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))} required />
        <textarea className="rounded-md border border-black/15 px-3 py-2 text-sm md:col-span-3" rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        <select className="rounded-md border border-black/15 px-3 py-2 text-sm" value={form.category_id} onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}>
          <option value="">Category (optional)</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="rounded-md border border-black/15 px-3 py-2 text-sm" placeholder="Owning department UUID" value={form.owning_department_id} onChange={(e) => setForm((p) => ({ ...p, owning_department_id: e.target.value }))} required />
        <input className="rounded-md border border-black/15 px-3 py-2 text-sm" placeholder="Stop #" value={form.stop_number} onChange={(e) => setForm((p) => ({ ...p, stop_number: e.target.value }))} />
        <button className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white md:col-span-3" type="submit">Create POI</button>
      </form>

      {message ? <p className="text-sm text-[var(--brand)]">{message}</p> : null}

      <div className="space-y-3">
        {pois.map((poi) => (
          <article key={poi.id} className="rounded-xl border border-black/10 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{poi.stop_number ? `${poi.stop_number}. ` : ''}{poi.title}</h2>
                <p className="text-xs text-black/60">Status: {poi.status} | Dept: {poi.owning_department_id} | Creator: {poi.created_by ?? 'n/a'}</p>
                <p className="text-xs text-black/60">{poi.latitude.toFixed(6)}, {poi.longitude.toFixed(6)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => actionPoi(poi.id, 'submit')} className="rounded-md border border-black/15 px-2 py-1 text-xs">Submit</button>
                <button onClick={() => actionPoi(poi.id, 'approve')} className="rounded-md border border-black/15 px-2 py-1 text-xs">Approve</button>
                <button onClick={() => actionPoi(poi.id, 'reject')} className="rounded-md border border-black/15 px-2 py-1 text-xs">Reject</button>
                <button onClick={() => actionPoi(poi.id, 'publish')} className="rounded-md bg-[var(--brand)] px-2 py-1 text-xs text-white">Publish</button>
              </div>
            </div>
            {poi.description ? <p className="mt-2 text-sm text-black/75">{poi.description}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
