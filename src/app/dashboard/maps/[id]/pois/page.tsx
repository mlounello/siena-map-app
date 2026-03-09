'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { InternalBuilderMap } from '@/components/map/internal-builder-map';
import { AppShell, Badge, Button, EmptyState, PageHeader, SectionCard, StatusMessage } from '@/components/ui';
import { FormField, SelectInput, TextArea, TextInput } from '@/components/ui/form-controls';
import { LoadingRows } from '@/components/ui/loading';

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
type Department = { id: string; name: string };

type MapRecord = {
  id: string;
  default_center_lat: number | string | null;
  default_center_lng: number | string | null;
  default_zoom: number;
  primary_department_id: string;
};

function statusTone(status: string): 'neutral' | 'warning' | 'success' | 'danger' {
  if (status === 'published') return 'success';
  if (status === 'submitted_for_review') return 'warning';
  if (status === 'rejected') return 'danger';
  return 'neutral';
}

export default function PoisPage() {
  const params = useParams<{ id: string }>();
  const mapId = params.id;
  const [mapRecord, setMapRecord] = useState<MapRecord | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: '',
    description: '',
    latitude: '42.7167',
    longitude: '-73.7519',
    category_id: '',
    stop_number: '',
    pin_color: '#006b54',
  });

  async function load(id: string) {
    setLoading(true);
    const [poisRes, categoriesRes, mapRes, deptRes] = await Promise.all([
      fetch(`/api/pois?mapId=${id}`, { cache: 'no-store' }),
      fetch('/api/categories', { cache: 'no-store' }),
      fetch(`/api/maps/${id}`, { cache: 'no-store' }),
      fetch('/api/departments', { cache: 'no-store' }),
    ]);

    const poisJson = await poisRes.json();
    const categoriesJson = await categoriesRes.json();
    const mapJson = await mapRes.json();
    const deptJson = await deptRes.json();

    const loadedPois: Poi[] = (poisJson.pois ?? []).map((poi: any) => ({
      ...poi,
      latitude: Number(poi.latitude),
      longitude: Number(poi.longitude),
      stop_number: poi.stop_number == null ? null : Number(poi.stop_number),
    }));

    setPois(loadedPois);
    setCategories(categoriesJson.categories ?? []);
    setMapRecord(mapJson.map ?? null);
    setDepartments(deptJson.departments ?? []);

    setForm((p) => ({
      ...p,
      latitude: String(mapJson.map?.default_center_lat ?? p.latitude),
      longitude: String(mapJson.map?.default_center_lng ?? p.longitude),
    }));
    setLoading(false);
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

  const departmentById = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d.name])), [departments]);

  async function createPoi(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    if (!mapRecord?.primary_department_id) {
      setMessage('Map department is missing. Update map settings before creating POIs.');
      return;
    }

    const payload = {
      map_id: mapId,
      title: form.title,
      description: form.description || null,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      category_id: form.category_id || null,
      owning_department_id: mapRecord.primary_department_id,
      stop_number: form.stop_number ? Number(form.stop_number) : null,
      pin_color: form.pin_color || null,
    };

    const res = await fetch('/api/pois', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to create POI');

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
    if (!res.ok) return setMessage(json.error ?? 'Failed to move POI marker');

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
    if (!res.ok) return setMessage(json.error ?? `Failed to ${action} POI`);

    await load(mapId);
    setMessage(`POI ${action} complete.`);
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Map Builder"
        title="POI Manager"
        subtitle="Create and position stops while managing moderation and publication state."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SectionCard title="Builder Canvas" subtitle="Click map to pick coordinates. Drag pins to move POIs.">
          {loading ? (
            <LoadingRows rows={4} />
          ) : (
            <InternalBuilderMap
              center={builderCenter}
              zoom={mapRecord?.default_zoom ?? 16}
              pois={pois}
              draftLat={Number(form.latitude)}
              draftLng={Number(form.longitude)}
              onPick={(lat, lng) => setForm((p) => ({ ...p, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))}
              onMovePoi={movePoi}
            />
          )}
        </SectionCard>

        <SectionCard title="Create POI" subtitle="New POIs default to the map primary department.">
          <form onSubmit={createPoi} className="form-grid">
            <FormField label="Title">
              <TextInput value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
            </FormField>
            <div className="form-row md:grid-cols-2">
              <FormField label="Latitude">
                <TextInput value={form.latitude} onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))} required />
              </FormField>
              <FormField label="Longitude">
                <TextInput value={form.longitude} onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))} required />
              </FormField>
            </div>
            <FormField label="Description">
              <TextArea rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </FormField>
            <div className="form-row md:grid-cols-2">
              <FormField label="Category">
                <SelectInput value={form.category_id} onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}>
                  <option value="">None</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectInput>
              </FormField>
              <FormField label="Stop number">
                <TextInput value={form.stop_number} onChange={(e) => setForm((p) => ({ ...p, stop_number: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Owning department">
              <TextInput
                value={mapRecord?.primary_department_id ? departmentById[mapRecord.primary_department_id] ?? 'Primary department' : 'Primary department not set'}
                readOnly
                disabled
              />
            </FormField>
            <Button type="submit">Create POI</Button>
          </form>
        </SectionCard>
      </div>

      {message ? <StatusMessage>{message}</StatusMessage> : null}

      <SectionCard title="POI Inventory" subtitle="Review each stop and run workflow actions.">
        {loading ? (
          <LoadingRows rows={5} />
        ) : pois.length === 0 ? (
          <EmptyState title="No POIs yet" description="Create the first POI to begin map content authoring." />
        ) : (
          <div className="space-y-3">
            {pois.map((poi) => (
              <article key={poi.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="row-title">{poi.stop_number ? `${poi.stop_number}. ` : ''}{poi.title}</h2>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge label={poi.status.replaceAll('_', ' ')} tone={statusTone(poi.status)} />
                      <Badge label={departmentById[poi.owning_department_id] ?? 'Department'} tone="info" />
                    </div>
                    <p className="row-meta">{poi.latitude.toFixed(6)}, {poi.longitude.toFixed(6)}</p>
                  </div>
                  <div className="action-bar">
                    <Button variant="secondary" onClick={() => actionPoi(poi.id, 'submit')}>Submit</Button>
                    <Button variant="secondary" onClick={() => actionPoi(poi.id, 'approve')}>Approve</Button>
                    <Button variant="danger" onClick={() => actionPoi(poi.id, 'reject')}>Reject</Button>
                    <Button onClick={() => actionPoi(poi.id, 'publish')}>Publish</Button>
                  </div>
                </div>
                {poi.description ? <p className="mt-2 text-sm text-black/75">{poi.description}</p> : null}
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}
