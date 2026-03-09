'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
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
  const [leafletModule, setLeafletModule] = useState<typeof import('leaflet') | null>(null);
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
        .filter((route): route is { id: string; positions: [number, number][]; color: string; weight: number } => !!route),
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
            <TileLayer
              attribution={tilePreset.attribution}
              url={tilePreset.url}
              maxZoom={tilePreset.maxZoom}
            />

            {explicitRoutes.length > 0
              ? explicitRoutes.map((route) => (
                  <Polyline
                    key={route.id}
                    positions={route.positions}
                    pathOptions={{ color: route.color, weight: route.weight, opacity: 0.85 }}
                  />
                ))
              : null}

            {explicitRoutes.length === 0 && guidedLine.length > 1 ? (
              <Polyline positions={guidedLine} pathOptions={{ color: '#8b1f41', weight: 4, opacity: 0.85 }} />
            ) : null}

            {(uiMode === 'guided' ? stops : normalizedPois).map((poi, index) => (
              <Marker
                key={poi.id}
                position={[poi.latitude, poi.longitude]}
                icon={getMarkerIcon(poi)}
                eventHandlers={{ click: () => setActiveIndex(index) }}
              >
                <Popup>
                  <p className="font-semibold">{poi.title}</p>
                  {(Array.isArray(poi.categories) ? poi.categories[0]?.name : poi.categories?.name) ? (
                    <p className="mt-1 text-xs text-black/65">{Array.isArray(poi.categories) ? poi.categories[0]?.name : poi.categories?.name}</p>
                  ) : null}
                  {poi.description ? <p className="mt-1 text-sm">{poi.description}</p> : null}
                </Popup>
              </Marker>
            ))}

            <FlyToStop
              target={
                uiMode === 'guided' && activeStop
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
        {activeStop && uiMode === 'guided' ? (
          <div className="mt-3 rounded-lg bg-[var(--surface-muted)] p-3 text-sm">
            <p className="font-medium">
              {activeStop.stop_number ? `${activeStop.stop_number}. ` : ''}
              {activeStop.title}
            </p>
            {activeStop.description ? <p className="mt-1 text-black/70">{activeStop.description}</p> : null}
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
          </div>
        ) : null}

        <div className="mt-3 space-y-2">
          {stops.map((stop, index) => (
            <button
              key={stop.id}
              type="button"
              onClick={() => {
                setActiveIndex(index);
                setUiMode(displayMode === 'guided_only' ? 'guided' : uiMode);
              }}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                index === activeIndex ? 'border-[var(--brand)] bg-[var(--surface-muted)]' : 'border-black/10'
              }`}
            >
              <p className="font-medium">
                {stop.stop_number ? `${stop.stop_number}. ` : ''}
                {stop.title}
              </p>
            </button>
          ))}
        </div>
      </aside>
    </section>
  );
}
