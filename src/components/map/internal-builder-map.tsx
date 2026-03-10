'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMapEvents } from 'react-leaflet';
import { getPinColor, getPinSymbol } from '@/lib/map/pins';
import { resolveTilePreset } from '@/lib/map/base-layers';
import { fetchRoutedSegments, lineStringToLatLngPairs } from '@/lib/map/routing-client';

type Poi = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  route_anchor_lat?: number | null;
  route_anchor_lng?: number | null;
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
  order_index?: number | null;
  line_color: string | null;
  line_thickness: number | null;
  connection_type?: 'outdoor_routed' | 'internal_transfer' | null;
  transfer_note?: string | null;
  status?: string | null;
};

type RouteSegment = {
  id: string;
  positions: [number, number][];
  color: string;
  weight: number;
  fromPoiId: string;
  toPoiId: string;
  orderIndex: number;
};

type SegmentDiagnostics = NonNullable<
  Awaited<ReturnType<typeof fetchRoutedSegments>>['results'][number]['diagnostics']
>;

function MapClickCapture({
  onPick,
  onPickAnchor,
}: {
  onPick: (lat: number, lng: number) => void;
  onPickAnchor: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
    contextmenu(e) {
      onPickAnchor(e.latlng.lat, e.latlng.lng);
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
  draftAnchorLat,
  draftAnchorLng,
  onPick,
  onPickAnchor,
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
  draftAnchorLat: number;
  draftAnchorLng: number;
  onPick: (lat: number, lng: number) => void;
  onPickAnchor: (lat: number, lng: number) => void;
  onMovePoi: (poiId: string, lat: number, lng: number) => void;
}) {
  const LINE_VISIBILITY_STORAGE_KEY = 'siena_maps_builder_show_lines';
  const [leafletModule, setLeafletModule] = useState<typeof import('leaflet') | null>(null);
  const [showGuideLine, setShowGuideLine] = useState(true);
  const [snappedSegments, setSnappedSegments] = useState<Record<string, [number, number][]>>({});
  const [segmentDiagnostics, setSegmentDiagnostics] = useState<Record<string, SegmentDiagnostics>>({});
  const [showOnlyFlagged, setShowOnlyFlagged] = useState(true);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
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

  const pointsById = useMemo(() => {
    return new Map(
      pois.map((poi) => [
        poi.id,
        [
          Number.isFinite(Number(poi.route_anchor_lat)) ? Number(poi.route_anchor_lat) : poi.latitude,
          Number.isFinite(Number(poi.route_anchor_lng)) ? Number(poi.route_anchor_lng) : poi.longitude,
        ] as [number, number],
      ])
    );
  }, [pois]);
  const poiNameById = useMemo(() => new Map(pois.map((poi) => [poi.id, poi.title])), [pois]);

  const routeSegments = useMemo(() => {
    return routeConnections
      .filter((route) => route.status !== 'archived' && route.connection_type !== 'internal_transfer')
      .map((route) => {
        const from = pointsById.get(route.from_poi_id);
        const to = pointsById.get(route.to_poi_id);
        if (!from || !to) return null;
        return {
          id: route.id,
          positions: [from, to] as [number, number][],
          color: route.line_color || '#006b54',
          weight: route.line_thickness || 4,
          fromPoiId: route.from_poi_id,
          toPoiId: route.to_poi_id,
          orderIndex: route.order_index ?? 0,
        } as RouteSegment;
      })
      .filter((segment): segment is RouteSegment => !!segment);
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
    if (!showGuideLine || routeSegments.length === 0) {
      setSnappedSegments({});
      setSegmentDiagnostics({});
      return;
    }

    const controller = new AbortController();

    async function fetchSnappedSegments() {
      const segments = routeSegments.map((segment) => ({
        id: segment.id,
        from: { lat: segment.positions[0][0], lng: segment.positions[0][1] },
        to: { lat: segment.positions[1][0], lng: segment.positions[1][1] },
      }));

      try {
        const payload = await fetchRoutedSegments({
          mapId,
          mode: routeMode,
          segments,
          signal: controller.signal,
        });

        const next: Record<string, [number, number][]> = {};
        const diagnosticsById: Record<string, SegmentDiagnostics> = {};
        for (const result of payload.results) {
          next[result.id] = lineStringToLatLngPairs(result.geometry.coordinates);
          if (result.diagnostics) diagnosticsById[result.id] = result.diagnostics;
        }
        if (!controller.signal.aborted) {
          setSnappedSegments(next);
          setSegmentDiagnostics(diagnosticsById);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSnappedSegments({});
          setSegmentDiagnostics({});
        }
      }
    }

    void fetchSnappedSegments();

    return () => controller.abort();
  }, [showGuideLine, routeSegments, routeMode, mapId]);

  const qaRows = useMemo(() => {
    return routeSegments
      .map((segment) => {
        const diagnostics = segmentDiagnostics[segment.id] ?? null;
        const fromLabel = poiNameById.get(segment.fromPoiId) ?? 'Unknown POI';
        const toLabel = poiNameById.get(segment.toPoiId) ?? 'Unknown POI';
        return {
          id: segment.id,
          fromLabel,
          toLabel,
          orderIndex: segment.orderIndex,
          diagnostics,
        };
      })
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [routeSegments, segmentDiagnostics, poiNameById]);

  const visibleQaRows = useMemo(() => {
    if (!showOnlyFlagged) return qaRows;
    return qaRows.filter((row) => row.diagnostics?.flagged);
  }, [qaRows, showOnlyFlagged]);

  function fmtMeters(value: number | null | undefined) {
    if (value == null || !Number.isFinite(value)) return 'n/a';
    return `${Math.round(value)}m`;
  }

  function fmtRatio(value: number | null | undefined) {
    if (value == null || !Number.isFinite(value)) return 'n/a';
    return value.toFixed(2);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 text-sm">
        <span>Builder canvas: click sets POI coordinates, right-click sets door anchor, drag markers to move POIs.</span>
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
      <div className="border-b border-black/10 bg-[var(--surface-subtle)]/60 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-black/65">
            Routing QA
          </p>
          <button
            type="button"
            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
              showOnlyFlagged
                ? 'border-amber-700 bg-amber-100 text-amber-900'
                : 'border-black/15 bg-white text-black/70'
            }`}
            onClick={() => setShowOnlyFlagged((current) => !current)}
          >
            {showOnlyFlagged ? 'Showing flagged only' : 'Showing all segments'}
          </button>
        </div>

        {routeSegments.length === 0 ? (
          <p className="text-xs text-black/60">No outdoor route segments generated yet.</p>
        ) : visibleQaRows.length === 0 ? (
          <p className="text-xs text-black/60">No flagged segments for current routed geometry.</p>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {visibleQaRows.map((row) => {
              const diagnostics = row.diagnostics;
              const flagged = Boolean(diagnostics?.flagged);
              const reasons = diagnostics?.flag_reasons ?? [];
              return (
                <article
                  key={row.id}
                  onClick={() => setSelectedSegmentId((current) => (current === row.id ? null : row.id))}
                  className={`rounded-md border px-3 py-2 text-xs ${
                    selectedSegmentId === row.id
                      ? 'border-[var(--brand)] bg-[var(--surface-muted)]'
                      : flagged
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-black/10 bg-white'
                  }`}
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-black/80">
                      {row.orderIndex > 0 ? `${row.orderIndex}. ` : ''}{row.fromLabel} {'->'} {row.toLabel}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        flagged ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {flagged ? 'Flagged' : 'OK'}
                    </span>
                  </div>

                  {reasons.length > 0 ? (
                    <p className="mb-1 text-amber-900">
                      Reasons: {reasons.join(', ')}
                    </p>
                  ) : null}

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-black/70 md:grid-cols-3">
                    <span>Source: {diagnostics?.geometry_source ?? 'n/a'}</span>
                    <span>Direct: {fmtMeters(diagnostics?.direct_distance_meters)}</span>
                    <span>Route: {fmtMeters(diagnostics?.route_distance_meters)}</span>
                    <span>Detour: {fmtRatio(diagnostics?.detour_ratio)}</span>
                    <span>Snap start: {fmtMeters(diagnostics?.snap_distance_meters_start)}</span>
                    <span>Snap end: {fmtMeters(diagnostics?.snap_distance_meters_end)}</span>
                  </div>

                  {diagnostics?.fallback_reason ? (
                    <p className="mt-1 text-red-700">Fallback: {diagnostics.fallback_reason}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
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
          <MapClickCapture onPick={onPick} onPickAnchor={onPickAnchor} />

          {showGuideLine
            ? routeSegments.map((segment) => (
                <Polyline
                  key={`guide-segment-${segment.id}`}
                  positions={snappedSegments[segment.id] ?? segment.positions}
                  pathOptions={{
                    color: segment.color,
                    weight: selectedSegmentId === segment.id ? Math.max(segment.weight + 2, 5) : segment.weight,
                    opacity: selectedSegmentId === segment.id ? 1 : 0.78,
                  }}
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

          {pois
            .filter(
              (poi) =>
                Number.isFinite(Number(poi.route_anchor_lat)) && Number.isFinite(Number(poi.route_anchor_lng))
            )
            .map((poi) => (
              <CircleMarker
                key={`anchor-${poi.id}`}
                center={[Number(poi.route_anchor_lat), Number(poi.route_anchor_lng)]}
                radius={4}
                pathOptions={{
                  color: '#1b4932',
                  weight: 2,
                  fillColor: '#fcc917',
                  fillOpacity: 1,
                }}
              />
            ))}

          {Number.isFinite(draftAnchorLat) && Number.isFinite(draftAnchorLng) ? (
            <CircleMarker
              center={[draftAnchorLat, draftAnchorLng]}
              radius={5}
              pathOptions={{
                color: '#006b54',
                weight: 2,
                fillColor: '#ffffff',
                fillOpacity: 0.95,
              }}
            />
          ) : null}

          {leafletModule && Number.isFinite(draftLat) && Number.isFinite(draftLng) ? (
            <Marker position={[draftLat, draftLng]} icon={getDraftIcon()} />
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}
