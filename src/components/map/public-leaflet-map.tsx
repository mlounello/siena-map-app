'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { getPinColor, getPinSymbol } from '@/lib/map/pins';
import { resolveTilePreset } from '@/lib/map/base-layers';

type Poi = {
  id: string;
  title: string;
  description: string | null;
  stop_number: number | null;
  latitude: number | string;
  longitude: number | string;
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
  status?: string | null;
};

type RoutedLine = {
  id: string;
  positions: [number, number][];
  color: string;
  weight: number;
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
  center,
  zoom,
  themePreset,
  pois,
  routeConnections,
}: {
  displayMode: 'explore_only' | 'guided_only' | 'both';
  center: { lat: number | string | null; lng: number | string | null };
  zoom: number;
  themePreset?: string | null;
  pois: Poi[];
  routeConnections?: RouteConnection[];
}) {
  const [uiMode, setUiMode] = useState<'explore' | 'guided'>(
    displayMode === 'guided_only' ? 'guided' : 'explore'
  );
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
        .map((route) => {
          const from = pointsById.get(route.from_poi_id);
          const to = pointsById.get(route.to_poi_id);
          if (!from || !to) return null;
          return {
            id: route.id,
            positions: [from, to] as [number, number][],
            color: route.line_color || '#006b54',
            weight: route.line_thickness || 4,
          };
        })
        .filter((route): route is RoutedLine => !!route),
    [pointsById, routeConnections]
  );

  const centerPoint: LatLngExpression =
    center.lat != null && center.lng != null
      ? [Number(center.lat), Number(center.lng)]
      : stops[0]
        ? [stops[0].latitude, stops[0].longitude]
        : [42.7167, -73.7519];

  const activeStop = stops[activeIndex] ?? null;
  const guidedLine = stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]);
  const tilePreset = resolveTilePreset(themePreset);
  const showGuidedLines = uiMode === 'guided' || displayMode === 'guided_only';

  const selectedPoi = useMemo(() => {
    if (selectedPoiId) {
      const found = normalizedPois.find((poi) => poi.id === selectedPoiId);
      if (found) return found;
    }
    if (uiMode === 'guided') return activeStop;
    return null;
  }, [selectedPoiId, normalizedPois, uiMode, activeStop]);

  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; items: typeof normalizedPois }>();
    const list = uiMode === 'guided' ? stops : normalizedPois;

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
  }, [normalizedPois, stops, uiMode]);

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
    if (explicitRoutes.length === 0) return;

    const controller = new AbortController();

    async function snapToRoads() {
      const next: Record<string, [number, number][]> = {};

      await Promise.all(
        explicitRoutes.map(async (route) => {
          const from = route.positions[0];
          const to = route.positions[1];
          if (!from || !to) return;

          const fromLng = from[1];
          const fromLat = from[0];
          const toLng = to[1];
          const toLat = to[0];

          const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

          try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) return;
            const payload = await response.json();
            const coords: Array<[number, number]> | undefined = payload?.routes?.[0]?.geometry?.coordinates;
            if (!coords || coords.length < 2) return;

            next[route.id] = coords.map((coord) => [coord[1], coord[0]]);
          } catch {
            // Keep straight-line fallback for this segment.
          }
        })
      );

      if (!controller.signal.aborted) setSnappedRoutes(next);
    }

    void snapToRoads();

    return () => controller.abort();
  }, [explicitRoutes, showGuidedLines]);

  useEffect(() => {
    if (uiMode === 'guided' && activeStop) {
      setSelectedPoiId(activeStop.id);
    }
  }, [uiMode, activeStop]);

  return (
    <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <p className="text-sm font-medium">Interactive Map</p>
          <div className="flex items-center gap-3">
            <p className="text-xs text-black/65">{tilePreset.label}</p>
            {displayMode === 'both' ? (
              <div className="inline-flex rounded-md border border-black/15 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setUiMode('explore')}
                  className={`rounded px-2 py-1 ${uiMode === 'explore' ? 'bg-[var(--brand)] text-white' : ''}`}
                >
                  Explore
                </button>
                <button
                  type="button"
                  onClick={() => setUiMode('guided')}
                  className={`rounded px-2 py-1 ${uiMode === 'guided' ? 'bg-[var(--brand)] text-white' : ''}`}
                >
                  Guided
                </button>
              </div>
            ) : (
              <p className="text-xs text-black/65">{displayMode === 'guided_only' ? 'Guided Tour' : 'Explore'}</p>
            )}
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

            {showGuidedLines && explicitRoutes.length > 0
              ? explicitRoutes.map((route) => (
                  <Polyline
                    key={route.id}
                    positions={snappedRoutes[route.id] ?? route.positions}
                    pathOptions={{ color: route.color, weight: route.weight, opacity: 0.85 }}
                  />
                ))
              : null}

            {showGuidedLines && explicitRoutes.length === 0 && guidedLine.length > 1 ? (
              <Polyline positions={guidedLine} pathOptions={{ color: '#8b1f41', weight: 4, opacity: 0.85 }} />
            ) : null}

            {leafletModule
              ? (uiMode === 'guided' ? stops : normalizedPois).map((poi, index) => (
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
                  : uiMode === 'guided' && activeStop
                    ? ([activeStop.latitude, activeStop.longitude] as LatLngExpression)
                    : null
              }
            />
          </MapContainer>
        </div>
        {stops.length === 0 ? (
          <div className="border-t border-black/10 bg-[var(--surface-muted)]/20 px-4 py-3 text-xs text-black/70">
            No published POIs yet for this map.
          </div>
        ) : null}
      </div>

      <aside className="rounded-xl border border-black/10 bg-white p-4">
        <h2 className="font-semibold">Stops</h2>
        {selectedPoi ? (
          <div className="mt-3 rounded-lg bg-[var(--surface-muted)] p-3 text-sm">
            <p className="font-medium">
              {selectedPoi.stop_number ? `${selectedPoi.stop_number}. ` : ''}
              {selectedPoi.title}
            </p>
            {selectedPoi.description ? <p className="mt-1 text-black/70">{selectedPoi.description}</p> : null}
            {uiMode === 'guided' ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={activeIndex <= 0}
                  onClick={() => setActiveIndex((i) => Math.max(i - 1, 0))}
                  className="rounded border border-black/15 px-2 py-1 text-xs disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={activeIndex >= stops.length - 1}
                  onClick={() => setActiveIndex((i) => Math.min(i + 1, stops.length - 1))}
                  className="rounded border border-black/15 px-2 py-1 text-xs disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : null}
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
                        if (displayMode === 'guided_only') setUiMode('guided');
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
        </div>
      </aside>
    </section>
  );
}
