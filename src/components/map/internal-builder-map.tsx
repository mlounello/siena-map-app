'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from 'react-leaflet';
import { getPinColor, getPinSymbol } from '@/lib/map/pins';
import { resolveTilePreset } from '@/lib/map/base-layers';
import { fetchRoutedSegments, lineStringToLatLngPairs } from '@/lib/map/routing-client';

type Poi = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  stop_number: number | null;
  category_id?: string | null;
  pin_color?: string | null;
};

type CategoryRef = {
  id: string;
  icon: string | null;
  color: string | null;
};

type RouteConnectionRef = {
  id: string;
  from_poi_id: string;
  to_poi_id: string;
  line_color: string | null;
  line_thickness: number | null;
  status?: string | null;
};

function MapClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function InternalBuilderMap({
  mapId,
  center,
  zoom,
  themePreset,
  routeMode = 'walking',
  pois,
  routeConnections = [],
  categories,
  draftLat,
  draftLng,
  onPick,
  onMovePoi,
}: {
  mapId?: string;
  center: [number, number];
  zoom: number;
  themePreset?: string | null;
  routeMode?: 'walking' | 'driving';
  pois: Poi[];
  routeConnections?: RouteConnectionRef[];
  categories: CategoryRef[];
  draftLat: number;
  draftLng: number;
  onPick: (lat: number, lng: number) => void;
  onMovePoi: (poiId: string, lat: number, lng: number) => void;
}) {
  const LINE_VISIBILITY_STORAGE_KEY = 'siena_maps_builder_show_lines';
  const [leafletModule, setLeafletModule] = useState<typeof import('leaflet') | null>(null);
  const [showGuideLine, setShowGuideLine] = useState(true);
  const [snappedSegments, setSnappedSegments] = useState<Array<[number, number][]>>([]);
  const markerIconCache = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    void import('leaflet').then((L) => setLeafletModule(L));
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LINE_VISIBILITY_STORAGE_KEY);
      if (stored === '0') setShowGuideLine(false);
      if (stored === '1') setShowGuideLine(true);
    } catch {
      // Local storage may be unavailable in restricted browser contexts.
    }
  }, []);

  const pointsById = useMemo(
    () => new Map(pois.map((poi) => [poi.id, [poi.latitude, poi.longitude] as [number, number]])),
    [pois]
  );

  const straightSegments = useMemo(() => {
    return routeConnections
      .filter((route) => route.status !== 'archived')
      .map((route) => {
        const from = pointsById.get(route.from_poi_id);
        const to = pointsById.get(route.to_poi_id);
        if (!from || !to) return null;
        return [from, to] as [number, number][];
      })
      .filter((segment): segment is [number, number][] => !!segment);
  }, [routeConnections, pointsById]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const tilePreset = resolveTilePreset(themePreset);

  function getMarkerIcon(poi: Poi) {
    if (!leafletModule) return undefined;

    const category = poi.category_id ? categoryById.get(poi.category_id) : undefined;
    const color = getPinColor(poi.pin_color, category?.color ?? null);
    const symbol = getPinSymbol(category?.icon ?? null);
    const cacheKey = `${color}|${symbol}`;

    if (markerIconCache.current.has(cacheKey)) return markerIconCache.current.get(cacheKey);

    const icon = leafletModule.divIcon({
      className: 'siena-pin-marker',
      html: `<div class="siena-pin" style="--pin-color:${color}"><span class="siena-pin-symbol">${symbol}</span></div>`,
      iconSize: [30, 40],
      iconAnchor: [15, 38],
    });

    markerIconCache.current.set(cacheKey, icon);
    return icon;
  }

  function getDraftIcon() {
    if (!leafletModule) return undefined;
    const cacheKey = 'draft-pin';
    if (markerIconCache.current.has(cacheKey)) return markerIconCache.current.get(cacheKey);

    const icon = leafletModule.divIcon({
      className: 'siena-pin-marker',
      html: '<div class="siena-pin" style="--pin-color:#fcc917"><span class="siena-pin-symbol">＋</span></div>',
      iconSize: [30, 40],
      iconAnchor: [15, 38],
    });

    markerIconCache.current.set(cacheKey, icon);
    return icon;
  }

  useEffect(() => {
    if (!showGuideLine || straightSegments.length === 0) {
      setSnappedSegments([]);
      return;
    }

    const controller = new AbortController();

    async function fetchSnappedSegments() {
      const segments = straightSegments.map((segment, index) => ({
        id: `builder-segment-${index}`,
        from: { lat: segment[0][0], lng: segment[0][1] },
        to: { lat: segment[1][0], lng: segment[1][1] },
      }));

      try {
        const payload = await fetchRoutedSegments({
          mapId,
          mode: routeMode,
          segments,
          signal: controller.signal,
        });

        const next = payload.results
          .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
          .map((result) => lineStringToLatLngPairs(result.geometry.coordinates));

                        if (!controller.signal.aborted) setSnappedSegments(next);
      } catch {
        if (!controller.signal.aborted) setSnappedSegments(straightSegments);
      }
    }

    void fetchSnappedSegments();

    return () => controller.abort();
  }, [showGuideLine, straightSegments, routeMode, mapId]);

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 text-sm">
        <span>Builder canvas: click to set new POI coordinates, drag existing markers to update location.</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setShowGuideLine((current) => {
                const next = !current;
                try {
                  window.localStorage.setItem(LINE_VISIBILITY_STORAGE_KEY, next ? '1' : '0');
                } catch {
                  // Local storage may be unavailable in restricted browser contexts.
                }
                return next;
              })
            }
            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
              showGuideLine
                ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                : 'border-black/15 bg-white text-black/70'
            }`}
          >
            {showGuideLine ? 'Hide Lines' : 'Show Lines'}
          </button>
          <span className="text-xs text-black/65">{tilePreset.label}</span>
        </div>
      </div>
      <div className="h-[460px] w-full">
        <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom>
          {tilePreset.layers.map((layer, index) => (
            <TileLayer
              key={`${tilePreset.key}-layer-${index}`}
              attribution={layer.attribution}
              url={layer.url}
              maxZoom={layer.maxZoom}
              opacity={layer.opacity}
            />
          ))}
          <MapClickCapture onPick={onPick} />

          {showGuideLine
            ? (snappedSegments.length > 0 ? snappedSegments : straightSegments).map((segment, index) => (
                <Polyline
                  key={`guide-segment-${index}`}
                  positions={segment}
                  pathOptions={{ color: '#8b1f41', weight: 3, opacity: 0.75 }}
                />
              ))
            : null}

          {leafletModule
            ? pois.map((poi) => (
                <Marker
                  key={poi.id}
                  position={[poi.latitude, poi.longitude]}
                  icon={getMarkerIcon(poi)}
                  draggable
                  eventHandlers={{
                    dragend: (event) => {
                      const marker = event.target;
                      const ll = marker.getLatLng();
                      onMovePoi(poi.id, ll.lat, ll.lng);
                    },
                  }}
                />
              ))
            : null}

          {leafletModule && Number.isFinite(draftLat) && Number.isFinite(draftLng) ? (
            <Marker position={[draftLat, draftLng]} icon={getDraftIcon()} />
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}
