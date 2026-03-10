'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell, Button, EmptyState, PageHeader, SectionCard, StatusMessage } from '@/components/ui/siena';
import { FormField, SelectInput, TextInput } from '@/components/ui/form-controls';
import { LoadingRows } from '@/components/ui/loading';

type Poi = { id: string; title: string; stop_number: number | null };
type GuidedRoute = { id: string; map_id: string; title: string; is_primary: boolean };
type GuidedRouteStop = {
  id: string;
  guided_route_id: string;
  poi_id: string;
  stop_number: number;
  poi?: { id: string; title: string; stop_number: number | null } | null;
};

function reorderItems(ids: string[], sourceId: string, targetId: string) {
  const sourceIndex = ids.indexOf(sourceId);
  const targetIndex = ids.indexOf(targetId);
  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return ids;

  const next = [...ids];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export default function GuidedRouteEditorPage() {
  const params = useParams<{ id: string }>();
  const mapRouteParam = params.id;

  const [resolvedMapId, setResolvedMapId] = useState<string>('');
  const [pois, setPois] = useState<Poi[]>([]);
  const [guidedRoute, setGuidedRoute] = useState<GuidedRoute | null>(null);
  const [orderedPoiIds, setOrderedPoiIds] = useState<string[]>([]);
  const [newStopPoiId, setNewStopPoiId] = useState('');
  const [routeTitle, setRouteTitle] = useState('Primary Guided Route');
  const [draggingPoiId, setDraggingPoiId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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

    const [poiRes, routeRes] = await Promise.all([
      fetch(`/api/pois?mapId=${resolvedMapId}`, { cache: 'no-store' }),
      fetch(`/api/guided-routes?mapId=${resolvedMapId}`, { cache: 'no-store' }),
    ]);

    const poiJson = await poiRes.json();
    const routeJson = await routeRes.json();

    if (!poiRes.ok) {
      setMessage(poiJson.error ?? 'Failed to load POIs');
      setLoading(false);
      return;
    }

    if (!routeRes.ok) {
      setMessage(routeJson.error ?? 'Failed to load guided route');
      setLoading(false);
      return;
    }

    const loadedPois: Poi[] = (poiJson.pois ?? []).map((poi: any) => ({
      id: poi.id,
      title: poi.title,
      stop_number: poi.stop_number,
    }));
    setPois(loadedPois);

    const loadedGuidedRoute: GuidedRoute | null = routeJson.guidedRoute ?? null;
    setGuidedRoute(loadedGuidedRoute);

    const loadedStops: GuidedRouteStop[] = routeJson.stops ?? [];
    const ordered = loadedStops
      .slice()
      .sort((a, b) => a.stop_number - b.stop_number)
      .map((stop) => stop.poi_id);

    setOrderedPoiIds(ordered);
    setNewStopPoiId('');

    if (loadedGuidedRoute?.title) {
      setRouteTitle(loadedGuidedRoute.title);
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

  const poiById = useMemo(() => {
    return new Map(pois.map((poi) => [poi.id, poi]));
  }, [pois]);

  const availablePois = useMemo(
    () => pois.filter((poi) => !orderedPoiIds.includes(poi.id)),
    [pois, orderedPoiIds]
  );

  async function createGuidedRoute(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedMapId) return;

    const res = await fetch('/api/guided-routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        map_id: resolvedMapId,
        title: routeTitle || 'Primary Guided Route',
      }),
    });

    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to create guided route');

    setGuidedRoute(json.guidedRoute ?? null);
    setMessage('Primary guided route created. Add POIs and save the order to generate route segments.');
    await load();
  }

  function addStop() {
    if (!newStopPoiId) return;
    if (orderedPoiIds.includes(newStopPoiId)) return;

    setOrderedPoiIds((prev) => [...prev, newStopPoiId]);
    setNewStopPoiId('');
  }

  function removeStop(poiId: string) {
    setOrderedPoiIds((prev) => prev.filter((id) => id !== poiId));
  }

  function moveStop(poiId: string, direction: 'up' | 'down') {
    setOrderedPoiIds((prev) => {
      const index = prev.indexOf(poiId);
      if (index < 0) return prev;

      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const next = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }

  function onDropOn(poiId: string) {
    if (!draggingPoiId || draggingPoiId === poiId) return;
    setOrderedPoiIds((prev) => reorderItems(prev, draggingPoiId, poiId));
    setDraggingPoiId(null);
  }

  async function saveStops() {
    if (!guidedRoute) return;
    setSaving(true);

    const res = await fetch(`/api/guided-routes/${guidedRoute.id}/stops`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poi_ids: orderedPoiIds }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) return setMessage(json.error ?? 'Failed to save route stops');

    setMessage(`Saved ${json.stopCount} stop(s) and generated ${json.connectionCount} route segment(s).`);
    await load();
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Map Builder"
        title="Guided Route Builder"
        subtitle="Create one guided route, add POIs as stops, then drag to reorder. Saving generates route lines automatically."
      />

      {!resolvedMapId ? (
        <SectionCard title="Resolving map" subtitle="Waiting for map id resolution from route parameter.">
          <LoadingRows rows={2} />
        </SectionCard>
      ) : loading ? (
        <SectionCard title="Loading guided route" subtitle="Reading map POIs and route state.">
          <LoadingRows rows={4} />
        </SectionCard>
      ) : !guidedRoute ? (
        <SectionCard title="Create primary guided route" subtitle="Each map has one primary route in MVP.">
          <form onSubmit={createGuidedRoute} className="form-grid">
            <FormField label="Route title">
              <TextInput value={routeTitle} onChange={(e) => setRouteTitle(e.target.value)} required />
            </FormField>
            <Button type="submit">Create Guided Route</Button>
          </form>
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title={guidedRoute.title}
            subtitle="Add stops and order them. Save when ready to rebuild route segments from this sequence."
            actions={
              <Button onClick={saveStops} disabled={saving}>
                {saving ? 'Saving...' : 'Save Route Order'}
              </Button>
            }
          >
            <div className="form-row md:grid-cols-[1fr_auto] md:items-end">
              <FormField label="Add POI stop">
                <SelectInput value={newStopPoiId} onChange={(e) => setNewStopPoiId(e.target.value)}>
                  <option value="">Select POI</option>
                  {availablePois.map((poi) => (
                    <option key={poi.id} value={poi.id}>
                      {poi.stop_number ? `${poi.stop_number}. ` : ''}
                      {poi.title}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <Button onClick={addStop} disabled={!newStopPoiId}>
                Add Stop
              </Button>
            </div>

            {orderedPoiIds.length === 0 ? (
              <EmptyState
                title="No stops in this route"
                description="Add POIs, then save route order to generate explicit connection segments."
              />
            ) : (
              <div className="mt-4 space-y-2">
                {orderedPoiIds.map((poiId, index) => {
                  const poi = poiById.get(poiId);
                  return (
                    <div
                      key={poiId}
                      draggable
                      onDragStart={() => setDraggingPoiId(poiId)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => onDropOn(poiId)}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2"
                    >
                      <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--heading)]">
                        {index + 1}
                      </span>
                      <div>
                        <p className="row-title">{poi?.title ?? 'Unknown POI'}</p>
                        <p className="row-meta">Drag to reorder or use arrow controls.</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" onClick={() => moveStop(poiId, 'up')} disabled={index === 0}>
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => moveStop(poiId, 'down')}
                          disabled={index === orderedPoiIds.length - 1}
                        >
                          ↓
                        </Button>
                        <Button variant="danger" onClick={() => removeStop(poiId)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </>
      )}

      {message ? <StatusMessage>{message}</StatusMessage> : null}
    </AppShell>
  );
}
