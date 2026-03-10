'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { getPinColor, getPinSymbol } from '@/lib/map/pins';
import { resolveTilePreset } from '@/lib/map/base-layers';
import { fetchRoutedSegments, lineStringToLatLngPairs } from '@/lib/map/routing-client';

type Poi = {
  id: string;
  title: string;
  description: string | null;
  stop_number: number | null;
  latitude: number | string;
  longitude: number | string;
  route_anchor_lat?: number | string | null;
  route_anchor_lng?: number | string | null;
  category_id?: string | null;
  pin_color?: string | null;
  categories?:
    | {
        id?: string;
        name?: string | null;
        icon?: string | null;
        color?: string | null;
      }
    | Array<{
        id?: string;
        name?: string | null;
        icon?: string | null;
        color?: string | null;
      }>
    | null;
};

type RouteConnection = {
  id: string;
  from_poi_id: string;
  to_poi_id: string;
  order_index: number;
  line_color: string | null;
  line_thickness: number | null;
  connection_type?: 'outdoor_routed' | 'internal_transfer' | null;
  transfer_note?: string | null;
  status?: string | null;
};

type RoutedLine = {
  id: string;
  positions: [number, number][];
  color: string;
  weight: number;
  groupKey: string;
  groupLabel: string;
};

function FlyToStop({ target }: { target: LatLngExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 16), { duration: 0.8 });
  }, [map, target]);
  return null;
}

export function PublicLeafletMap({
  displayMode,
  routeMode = 'walking',
  center,
  zoom,
  themePreset,
  pois,
  routeConnections,
}: {
  displayMode: 'explore_only' | 'guided_only' | 'both';
  routeMode?: 'walking' | 'driving';
  center: { lat: number | string | null; lng: number | string | null };
  zoom: number;
  themePreset?: string | null;
  pois: Poi[];
  routeConnections?: RouteConnection[];
}) {
  const [showRoutes, setShowRoutes] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [leafletModule, setLeafletModule] = useState<typeof import('leaflet') | null>(null);
  const [snappedRoutes, setSnappedRoutes] = useState<Record<string, [number, number][]>>({});
  const markerIconCache = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    void import('leaflet').then((L) => setLeafletModule(L));
  }, []);

  const normalizedPois = useMemo(
    () =>
      pois
        .map((poi) => ({
          ...poi,
          latitude: Number(poi.latitude),
          longitude: Number(poi.longitude),
          route_anchor_lat: poi.route_anchor_lat == null ? null : Number(poi.route_anchor_lat),
          route_anchor_lng: poi.route_anchor_lng == null ? null : Number(poi.route_anchor_lng),
        }))
        .filter((poi) => Number.isFinite(poi.latitude) && Number.isFinite(poi.longitude)),
    [pois]
  );

  const stops = useMemo(
    () => [...normalizedPois].sort((a, b) => (a.stop_number ?? 9999) - (b.stop_number ?? 9999)),
    [normalizedPois]
  );

  const pointsById = useMemo(() => {
    return new Map(
      normalizedPois.map((poi) => [poi.id, [poi.latitude, poi.longitude] as [number, number]])
    );
  }, [normalizedPois]);

  const explicitRoutes = useMemo(
    () =>
      (routeConnections ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .filter((route) => route.connection_type !== 'internal_transfer')
        .map((route) => {
          const fromPoi = normalizedPois.find((poi) => poi.id === route.from_poi_id);
          const toPoi = normalizedPois.find((poi) => poi.id === route.to_poi_id);
          const fromCategory = Array.isArray(fromPoi?.categories) ? fromPoi?.categories[0] : fromPoi?.categories;
          const groupKey = fromCategory?.id ?? 'uncategorized';
          const groupLabel = fromCategory?.name ?? 'Uncategorized';
          const from = fromPoi
            ? [
                Number.isFinite(Number(fromPoi.route_anchor_lat)) ? Number(fromPoi.route_anchor_lat) : fromPoi.latitude,
                Number.isFinite(Number(fromPoi.route_anchor_lng)) ? Number(fromPoi.route_anchor_lng) : fromPoi.longitude,
              ]
            : pointsById.get(route.from_poi_id);
          const to = toPoi
            ? [
                Number.isFinite(Number(toPoi.route_anchor_lat)) ? Number(toPoi.route_anchor_lat) : toPoi.latitude,
                Number.isFinite(Number(toPoi.route_anchor_lng)) ? Number(toPoi.route_anchor_lng) : toPoi.longitude,
              ]
            : pointsById.get(route.to_poi_id);
          if (!from || !to) return null;
          return {
            id: route.id,
            positions: [from, to] as [number, number][],
            color: route.line_color || '#006b54',
            weight: route.line_thickness || 4,
            groupKey,
            groupLabel,
          };
        })
        .filter((route): route is RoutedLine => !!route),
    [pointsById, routeConnections]
  );
  const [selectedRouteGroup, setSelectedRouteGroup] = useState('all');

  const routeGroups = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; count: number }>();
    for (const route of explicitRoutes) {
      const existing = groups.get(route.groupKey);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(route.groupKey, { key: route.groupKey, label: route.groupLabel, count: 1 });
      }
    }
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [explicitRoutes]);

  const visibleRoutes = useMemo(() => {
    if (selectedRouteGroup === 'all') return explicitRoutes;
    return explicitRoutes.filter((route) => route.groupKey === selectedRouteGroup);
  }, [explicitRoutes, selectedRouteGroup]);

  const internalTransfers = useMemo(
    () =>
      (routeConnections ?? [])
        .filter((route) => route.connection_type === 'internal_transfer')
        .sort((a, b) => a.order_index - b.order_index)
        .map((route) => {
          const from = normalizedPois.find((poi) => poi.id === route.from_poi_id);
          const to = normalizedPois.find((poi) => poi.id === route.to_poi_id);
          return {
            id: route.id,
            order: route.order_index,
            label: route.transfer_note || 'Transfer indoors to next stop.',
            fromTitle: from?.title ?? 'Unknown stop',
            toTitle: to?.title ?? 'Unknown stop',
          };
        }),
    [routeConnections, normalizedPois]
  );

  const centerPoint: LatLngExpression =
    center.lat != null && center.lng != null
      ? [Number(center.lat), Number(center.lng)]
      : stops[0]
        ? [stops[0].latitude, stops[0].longitude]
        : [42.7167, -73.7519];

  const guidedLine = stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]);
  const tilePreset = resolveTilePreset(themePreset);
  const showGuidedLines = showRoutes;
  const hasRouteGroups = routeGroups.length > 1;
  const hasAnyRouteGeometry = explicitRoutes.length > 0 || guidedLine.length > 1;
  const routeStateLabel = showRoutes ? 'Visible' : 'Hidden';
  const routeSelectionLabel =
    selectedRouteGroup === 'all'
      ? hasRouteGroups
        ? 'Full route'
        : 'Primary route'
      : routeGroups.find((group) => group.key === selectedRouteGroup)?.label ?? 'Route segment';

  const selectedPoi = useMemo(() => {
    if (selectedPoiId) {
      const found = normalizedPois.find((poi) => poi.id === selectedPoiId);
      if (found) return found;
    }
    return null;
  }, [selectedPoiId, normalizedPois]);

  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; items: typeof normalizedPois }>();
    const list = normalizedPois;

    for (const poi of list) {
      const category = Array.isArray(poi.categories) ? poi.categories[0] : poi.categories;
      const label = category?.name || 'Uncategorized';
      const key = category?.id || 'uncategorized';
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(poi);
      } else {
        groups.set(key, { key, label, items: [poi] });
      }
    }

    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [normalizedPois]);

  function getMarkerIcon(poi: Poi) {
    if (!leafletModule) return undefined;

    const category = Array.isArray(poi.categories) ? poi.categories[0] : poi.categories;
    const iconKey = category?.icon ?? null;
    const categoryColor = category?.color ?? null;
    const color = getPinColor(poi.pin_color, categoryColor);
    const symbol = getPinSymbol(iconKey);
    const cacheKey = `${color}|${symbol}`;

    if (markerIconCache.current.has(cacheKey)) {
      return markerIconCache.current.get(cacheKey);
    }

    const icon = leafletModule.divIcon({
      className: 'siena-pin-marker',
      html: `<div class="siena-pin" style="--pin-color:${color}"><span class="siena-pin-symbol">${symbol}</span></div>`,
      iconSize: [30, 40],
      iconAnchor: [15, 38],
      popupAnchor: [0, -32],
    });

    markerIconCache.current.set(cacheKey, icon);
    return icon;
  }

  useEffect(() => {
    if (!showGuidedLines) return;
    if (visibleRoutes.length === 0) return;

    const controller = new AbortController();

    async function routeSegments() {
      const next: Record<string, [number, number][]> = {};

      try {
        const payload = await fetchRoutedSegments({
          mode: routeMode,
          segments: visibleRoutes.map((route) => ({
            id: route.id,
            from: { lat: route.positions[0][0], lng: route.positions[0][1] },
            to: { lat: route.positions[1][0], lng: route.positions[1][1] },
          })),
          signal: controller.signal,
        });

        for (const result of payload.results) {
          next[result.id] = lineStringToLatLngPairs(result.geometry.coordinates);
        }
      } catch {
        // Straight-line fallback remains in render path.
      }

      if (!controller.signal.aborted) setSnappedRoutes(next);
    }

    void routeSegments();

    return () => controller.abort();
  }, [visibleRoutes, showGuidedLines, routeMode]);

  return (
    <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <p className="text-sm font-medium">Interactive Map</p>
          <div className="flex items-center gap-3">
            <p className="text-xs text-black/65">{tilePreset.label}</p>
            <span className="rounded-full border border-black/15 bg-[var(--surface-subtle)] px-2 py-0.5 text-[11px] font-semibold text-black/70">
              Route {routeStateLabel}
            </span>
            <button
              type="button"
              onClick={() => setShowRoutes((current) => !current)}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                showRoutes
                  ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                  : 'border-black/15 bg-white text-black/70'
              }`}
            >
              {showRoutes ? 'Hide Route' : 'Show Route'}
            </button>
            {hasRouteGroups ? (
              <select
                className="rounded-md border border-black/15 bg-white px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:bg-black/5 disabled:text-black/40"
                value={selectedRouteGroup}
                disabled={!showRoutes}
                onChange={(e) => setSelectedRouteGroup(e.target.value)}
              >
                <option value="all">Full route</option>
                {routeGroups.map((group) => (
                  <option key={group.key} value={group.key}>
                    {group.label} ({group.count})
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        <div className="h-[460px] w-full">
          <MapContainer center={centerPoint} zoom={zoom || 16} className="h-full w-full" scrollWheelZoom>
            {tilePreset.layers.map((layer, index) => (
              <TileLayer
                key={`${tilePreset.key}-layer-${index}`}
                attribution={layer.attribution}
                url={layer.url}
                maxZoom={layer.maxZoom}
                opacity={layer.opacity}
              />
            ))}

            {showGuidedLines && visibleRoutes.length > 0
              ? visibleRoutes.map((route) => (
                  <Polyline
                    key={route.id}
                    positions={snappedRoutes[route.id] ?? route.positions}
                    pathOptions={{ color: route.color, weight: route.weight, opacity: 0.85 }}
                  />
                ))
              : null}

            {showGuidedLines && visibleRoutes.length === 0 && guidedLine.length > 1 ? (
              <Polyline positions={guidedLine} pathOptions={{ color: '#8b1f41', weight: 4, opacity: 0.85 }} />
            ) : null}

            {leafletModule
              ? normalizedPois.map((poi, index) => (
                  <Marker
                    key={poi.id}
                    position={[poi.latitude, poi.longitude]}
                    icon={getMarkerIcon(poi)}
                    eventHandlers={{
                      click: () => {
                        setActiveIndex(index);
                        setSelectedPoiId(poi.id);
                      },
                    }}
                  >
                    <Popup>
                      <p className="font-semibold">{poi.title}</p>
                      {(Array.isArray(poi.categories) ? poi.categories[0]?.name : poi.categories?.name) ? (
                        <p className="mt-1 text-xs text-black/65">{Array.isArray(poi.categories) ? poi.categories[0]?.name : poi.categories?.name}</p>
                      ) : null}
                      {poi.description ? <p className="mt-1 text-sm">{poi.description}</p> : null}
                    </Popup>
                  </Marker>
                ))
              : null}

            {selectedPoi ? (
              <CircleMarker
                center={[selectedPoi.latitude, selectedPoi.longitude]}
                radius={10}
                pathOptions={{ color: '#fcc917', weight: 3, fillColor: '#fcc917', fillOpacity: 0.2 }}
              />
            ) : null}

            <FlyToStop
              target={
                selectedPoi
                  ? ([selectedPoi.latitude, selectedPoi.longitude] as LatLngExpression)
                  : null
              }
            />
          </MapContainer>
        </div>
        {!showRoutes && hasAnyRouteGeometry ? (
          <div className="border-t border-black/10 bg-[var(--surface-muted)]/20 px-4 py-2.5 text-xs text-black/70">
            Guided route is currently hidden. Use <span className="font-semibold">Show Route</span> to display it.
          </div>
        ) : null}
        {showRoutes && !hasAnyRouteGeometry ? (
          <div className="border-t border-black/10 bg-[var(--surface-muted)]/20 px-4 py-2.5 text-xs text-black/70">
            No route lines are available for this map yet.
          </div>
        ) : null}
        {stops.length === 0 ? (
          <div className="border-t border-black/10 bg-[var(--surface-muted)]/20 px-4 py-3 text-xs text-black/70">
            No published POIs yet for this map.
          </div>
        ) : null}
      </div>

      <aside className="rounded-xl border border-black/10 bg-white p-4">
        <div className="space-y-2">
          <h2 className="font-semibold">Stops</h2>
          <div className="rounded-lg border border-black/10 bg-[var(--surface-muted)]/25 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-black/55">Map key</p>
            <div className="mt-1.5 grid gap-1.5 text-xs text-black/70">
              <p className="flex items-center gap-2">
                <span className="inline-block h-[3px] w-6 rounded-full bg-[#8b1f41]" />
                Guided route line
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">•</span>
                Stop marker (category-colored pin)
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                Internal transfer note (no outdoor line)
              </p>
            </div>
          </div>
          {hasAnyRouteGeometry ? (
            <p className="text-xs text-black/65">
              Route view: <span className="font-semibold text-black/75">{routeSelectionLabel}</span>
            </p>
          ) : null}
        </div>

        {selectedPoi ? (
          <div className="mt-3 rounded-lg bg-[var(--surface-muted)] p-3 text-sm">
            <p className="font-medium">
              {selectedPoi.stop_number ? `${selectedPoi.stop_number}. ` : ''}
              {selectedPoi.title}
            </p>
            {selectedPoi.description ? <p className="mt-1 text-black/70">{selectedPoi.description}</p> : null}
          </div>
        ) : null}

        <div className="mt-3 space-y-3">
          {groupedByCategory.map((group) => (
            <section key={group.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.07em] text-black/60">{group.label}</h3>
                <span className="text-[11px] text-black/45">{group.items.length}</span>
              </div>
              <div className="space-y-1.5">
                {group.items.map((stop) => {
                  const selected = selectedPoi?.id === stop.id;
                  return (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => {
                        const idx = stops.findIndex((poi) => poi.id === stop.id);
                        if (idx >= 0) setActiveIndex(idx);
                        setSelectedPoiId(stop.id);
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                        selected ? 'border-[var(--brand)] bg-[var(--surface-muted)]' : 'border-black/10'
                      }`}
                    >
                      <p className="font-medium">
                        {stop.stop_number ? `${stop.stop_number}. ` : ''}
                        {stop.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {internalTransfers.length > 0 ? (
            <section className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.07em] text-black/60">Internal Transfers</h3>
                <span className="text-[11px] text-black/45">{internalTransfers.length}</span>
              </div>
              <div className="space-y-1.5">
                {internalTransfers.map((transfer) => (
                  <div key={transfer.id} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <p className="font-semibold">
                      {transfer.order}. {transfer.fromTitle} {'->'} {transfer.toTitle}
                    </p>
                    <p>{transfer.label}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </section>
  );
}
