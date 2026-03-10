'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AppShell, Badge, Button, EmptyState, PageHeader, SectionCard, StatusMessage } from '@/components/ui';
import { FormField, SelectInput, TextArea, TextInput } from '@/components/ui/form-controls';
import { LoadingRows } from '@/components/ui/loading';

const InternalBuilderMap = dynamic(
  () => import('@/components/map/internal-builder-map').then((module) => module.InternalBuilderMap),
  { ssr: false, loading: () => <LoadingRows rows={4} /> }
);

type Poi = {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  route_anchor_lat: number | null;
  route_anchor_lng: number | null;
  status: string;
  owning_department_id: string;
  created_by: string | null;
  category_id?: string | null;
  pin_color?: string | null;
  stop_number: number | null;
};

type Category = { id: string; name: string; icon: string | null; color: string | null };
type Department = { id: string; name: string };
type RouteConnection = {
  id: string;
  from_poi_id: string;
  to_poi_id: string;
  line_color: string | null;
  line_thickness: number | null;
  connection_type: 'outdoor_routed' | 'internal_transfer';
  transfer_note: string | null;
  status: 'unpublished' | 'published' | 'archived';
};

type MapRecord = {
  id: string;
  route_mode: 'walking' | 'driving' | null;
  default_center_lat: number | string | null;
  default_center_lng: number | string | null;
  default_zoom: number;
  theme_preset: string | null;
  primary_department_id: string;
};

type PoiFormState = {
  title: string;
  description: string;
  latitude: string;
  longitude: string;
  route_anchor_lat: string;
  route_anchor_lng: string;
  category_id: string;
  pin_color: string;
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
  const [routeConnections, setRouteConnections] = useState<RouteConnection[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingPoiId, setEditingPoiId] = useState<string | null>(null);

  const [form, setForm] = useState<PoiFormState>({
    title: '',
    description: '',
    latitude: '42.7167',
    longitude: '-73.7519',
    route_anchor_lat: '',
    route_anchor_lng: '',
    category_id: '',
    pin_color: '',
  });

  function applyMapCenterDefaults(target: PoiFormState, map: MapRecord | null): PoiFormState {
    return {
      ...target,
      latitude: String(map?.default_center_lat ?? target.latitude),
      longitude: String(map?.default_center_lng ?? target.longitude),
      route_anchor_lat: String(map?.default_center_lat ?? target.route_anchor_lat),
      route_anchor_lng: String(map?.default_center_lng ?? target.route_anchor_lng),
    };
  }

  function resetFormToCreate(map: MapRecord | null) {
    setEditingPoiId(null);
    setForm((prev) =>
      applyMapCenterDefaults(
        {
          ...prev,
          title: '',
          description: '',
          category_id: '',
          pin_color: '',
        },
        map
      )
    );
  }

  function loadPoiIntoForm(poi: Poi) {
    setEditingPoiId(poi.id);
    setForm({
      title: poi.title,
      description: poi.description ?? '',
      latitude: poi.latitude.toFixed(6),
      longitude: poi.longitude.toFixed(6),
      route_anchor_lat: poi.route_anchor_lat == null ? '' : Number(poi.route_anchor_lat).toFixed(6),
      route_anchor_lng: poi.route_anchor_lng == null ? '' : Number(poi.route_anchor_lng).toFixed(6),
      category_id: poi.category_id ?? '',
      pin_color: poi.pin_color ?? '',
    });
  }

  async function load(id: string) {
    setLoading(true);
    const [poisRes, categoriesRes, mapRes, deptRes, routeRes] = await Promise.all([
      fetch(`/api/pois?mapId=${id}`, { cache: 'no-store' }),
      fetch('/api/categories', { cache: 'no-store' }),
      fetch(`/api/maps/${id}`, { cache: 'no-store' }),
      fetch('/api/departments', { cache: 'no-store' }),
      fetch(`/api/route-connections?mapId=${id}`, { cache: 'no-store' }),
    ]);

    const poisJson = await poisRes.json();
    const categoriesJson = await categoriesRes.json();
    const mapJson = await mapRes.json();
    const deptJson = await deptRes.json();
    const routeJson = await routeRes.json();

    const loadedMap: MapRecord | null = mapJson.map ?? null;
    const loadedPois: Poi[] = (poisJson.pois ?? []).map((poi: any) => ({
      ...poi,
      latitude: Number(poi.latitude),
      longitude: Number(poi.longitude),
      route_anchor_lat: poi.route_anchor_lat == null ? null : Number(poi.route_anchor_lat),
      route_anchor_lng: poi.route_anchor_lng == null ? null : Number(poi.route_anchor_lng),
      stop_number: poi.stop_number == null ? null : Number(poi.stop_number),
    }));

    setPois(loadedPois);
    setCategories(categoriesJson.categories ?? []);
    setMapRecord(loadedMap);
    setDepartments(deptJson.departments ?? []);
    setRouteConnections(routeJson.routeConnections ?? []);

    if (!editingPoiId) {
      setForm((prev) => applyMapCenterDefaults(prev, loadedMap));
    }

    setLoading(false);
  }

  useEffect(() => {
    if (mapId) void load(mapId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId]);

  const builderCenter = useMemo<[number, number]>(() => {
    if (
      Number.isFinite(Number(mapRecord?.default_center_lat)) &&
      Number.isFinite(Number(mapRecord?.default_center_lng))
    ) {
      return [Number(mapRecord?.default_center_lat), Number(mapRecord?.default_center_lng)];
    }
    if (pois[0]) return [pois[0].latitude, pois[0].longitude];
    return [42.7167, -73.7519];
  }, [mapRecord, pois]);

  const departmentById = useMemo(
    () => Object.fromEntries(departments.map((department) => [department.id, department.name])),
    [departments]
  );

  async function savePoi(e: React.FormEvent) {
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
      route_anchor_lat: form.route_anchor_lat ? Number(form.route_anchor_lat) : null,
      route_anchor_lng: form.route_anchor_lng ? Number(form.route_anchor_lng) : null,
      category_id: form.category_id || null,
      owning_department_id: mapRecord.primary_department_id,
      pin_color: form.pin_color || null,
    };

    if (editingPoiId) {
      const patchRes = await fetch(`/api/pois/${editingPoiId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const patchJson = await patchRes.json();
      if (!patchRes.ok) return setMessage(patchJson.error ?? 'Failed to update POI');

      setMessage('POI updated.');
      resetFormToCreate(mapRecord);
      await load(mapId);
      return;
    }

    const createRes = await fetch('/api/pois', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const createJson = await createRes.json();
    if (!createRes.ok) return setMessage(createJson.error ?? 'Failed to create POI');

    resetFormToCreate(mapRecord);
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

  async function actionPoi(id: string, action: 'submit' | 'approve' | 'reject' | 'publish' | 'archive') {
    const endpoint = action === 'archive' ? 'publish' : action;
    const body =
      action === 'publish' ? { status: 'published' } : action === 'archive' ? { status: 'archived' } : {};

    const res = await fetch(`/api/pois/${id}/${endpoint}`, {
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
        subtitle="Create, reopen, edit, and position stops while managing moderation and publication state."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SectionCard title="Builder Canvas" subtitle="Click map to set coordinates. Right-click map to set door anchor. Drag pins to move POIs.">
          {loading ? (
            <LoadingRows rows={4} />
          ) : (
            <InternalBuilderMap
              center={builderCenter}
              zoom={mapRecord?.default_zoom ?? 16}
              themePreset={mapRecord?.theme_preset ?? 'MapStyle.STREETS'}
              routeMode={mapRecord?.route_mode ?? 'walking'}
              mapId={mapId}
              pois={pois}
              routeConnections={routeConnections}
              categories={categories}
              draftLat={Number(form.latitude)}
              draftLng={Number(form.longitude)}
              draftAnchorLat={Number(form.route_anchor_lat)}
              draftAnchorLng={Number(form.route_anchor_lng)}
              onPick={(lat, lng) => setForm((prev) => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))}
              onPickAnchor={(lat, lng) => {
                setForm((prev) => ({ ...prev, route_anchor_lat: lat.toFixed(6), route_anchor_lng: lng.toFixed(6) }));
                setMessage('Door anchor set from right-click location. Save POI to persist.');
              }}
              onMovePoi={movePoi}
            />
          )}
        </SectionCard>

        <SectionCard
          title={editingPoiId ? 'Edit POI' : 'Create POI'}
          subtitle={editingPoiId ? 'Update and save this POI.' : 'New POIs default to the map primary department.'}
          actions={
            editingPoiId ? (
              <Button
                variant="secondary"
                onClick={() => {
                  resetFormToCreate(mapRecord);
                  setMessage('Edit cancelled. Back to create mode.');
                }}
              >
                Cancel Edit
              </Button>
            ) : null
          }
        >
          <form onSubmit={savePoi} className="form-grid">
            <FormField label="Title">
              <TextInput value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
            </FormField>

            <div className="form-row md:grid-cols-2">
              <FormField label="Latitude">
                <TextInput value={form.latitude} onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))} required />
              </FormField>
              <FormField label="Longitude">
                <TextInput value={form.longitude} onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))} required />
              </FormField>
            </div>

            <div className="form-row md:grid-cols-2">
              <FormField label="Door anchor latitude (optional)">
                <TextInput value={form.route_anchor_lat} onChange={(e) => setForm((prev) => ({ ...prev, route_anchor_lat: e.target.value }))} />
              </FormField>
              <FormField label="Door anchor longitude (optional)">
                <TextInput value={form.route_anchor_lng} onChange={(e) => setForm((prev) => ({ ...prev, route_anchor_lng: e.target.value }))} />
              </FormField>
            </div>

            <div className="action-bar">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setForm((prev) => ({ ...prev, route_anchor_lat: prev.latitude, route_anchor_lng: prev.longitude }))}
              >
                Use current pin as door anchor
              </Button>
            </div>

            <FormField label="Description">
              <TextArea rows={3} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
            </FormField>

            <div className="form-row md:grid-cols-2">
              <FormField label="Category">
                <SelectInput value={form.category_id} onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}>
                  <option value="">None</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
            </div>

            <FormField label="Owning department">
              <TextInput
                value={
                  mapRecord?.primary_department_id
                    ? departmentById[mapRecord.primary_department_id] ?? 'Primary department'
                    : 'Primary department not set'
                }
                readOnly
                disabled
              />
            </FormField>

            <Button type="submit">{editingPoiId ? 'Save POI Updates' : 'Create POI'}</Button>
          </form>
        </SectionCard>
      </div>

      {message ? <StatusMessage>{message}</StatusMessage> : null}

      <SectionCard title="POI Inventory" subtitle="Reopen any POI to update details or workflow state.">
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
                    <h2 className="row-title">
                      {poi.stop_number ? `${poi.stop_number}. ` : ''}
                      {poi.title}
                    </h2>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge label={poi.status.replaceAll('_', ' ')} tone={statusTone(poi.status)} />
                      <Badge label={departmentById[poi.owning_department_id] ?? 'Department'} tone="info" />
                      <Badge
                        label={poi.route_anchor_lat != null && poi.route_anchor_lng != null ? 'Door anchor set' : 'No door anchor'}
                        tone={poi.route_anchor_lat != null && poi.route_anchor_lng != null ? 'success' : 'warning'}
                      />
                    </div>
                    <p className="row-meta">
                      Pin: {poi.latitude.toFixed(6)}, {poi.longitude.toFixed(6)}
                    </p>
                    {poi.route_anchor_lat != null && poi.route_anchor_lng != null ? (
                      <p className="row-meta">
                        Door: {poi.route_anchor_lat.toFixed(6)}, {poi.route_anchor_lng.toFixed(6)}
                      </p>
                    ) : null}
                  </div>
                  <div className="action-bar">
                    <Button variant="secondary" onClick={() => loadPoiIntoForm(poi)}>
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const res = await fetch(`/api/pois/${poi.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ route_anchor_lat: poi.latitude, route_anchor_lng: poi.longitude }),
                        });
                        const json = await res.json();
                        if (!res.ok) return setMessage(json.error ?? 'Failed to set door anchor from pin');
                        setMessage('Door anchor set from current pin location.');
                        await load(mapId);
                      }}
                    >
                      Set Door = Pin
                    </Button>
                    <Button variant="secondary" onClick={() => actionPoi(poi.id, 'submit')}>
                      Submit
                    </Button>
                    <Button variant="secondary" onClick={() => actionPoi(poi.id, 'approve')}>
                      Approve
                    </Button>
                    <Button variant="danger" onClick={() => actionPoi(poi.id, 'reject')}>
                      Reject
                    </Button>
                    <Button onClick={() => actionPoi(poi.id, 'publish')}>Publish</Button>
                    <Button variant="danger" onClick={() => actionPoi(poi.id, 'archive')}>
                      Archive
                    </Button>
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
