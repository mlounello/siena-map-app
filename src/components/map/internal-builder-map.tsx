'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from 'react-leaflet';
import { getPinColor, getPinSymbol } from '@/lib/map/pins';
import { resolveTilePreset } from '@/lib/map/base-layers';

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

function MapClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function InternalBuilderMap({
  center,
  zoom,
  themePreset,
  pois,
  categories,
  draftLat,
  draftLng,
  onPick,
  onMovePoi,
}: {
  center: [number, number];
  zoom: number;
  themePreset?: string | null;
  pois: Poi[];
  categories: CategoryRef[];
  draftLat: number;
  draftLng: number;
  onPick: (lat: number, lng: number) => void;
  onMovePoi: (poiId: string, lat: number, lng: number) => void;
}) {
  const [leafletModule, setLeafletModule] = useState<typeof import('leaflet') | null>(null);
  const markerIconCache = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    void import('leaflet').then((L) => setLeafletModule(L));
  }, []);

  const sorted = useMemo(
    () => [...pois].sort((a, b) => (a.stop_number ?? 9999) - (b.stop_number ?? 9999)),
    [pois]
  );

  const guideLine = sorted.map((poi) => [poi.latitude, poi.longitude] as [number, number]);
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

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 text-sm">
        <span>Builder canvas: click to set new POI coordinates, drag existing markers to update location.</span>
        <span className="text-xs text-black/65">{tilePreset.label}</span>
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

          {guideLine.length > 1 ? (
            <Polyline positions={guideLine} pathOptions={{ color: '#8b1f41', weight: 3, opacity: 0.75 }} />
          ) : null}

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
