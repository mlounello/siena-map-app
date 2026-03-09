'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';

type Poi = {
  id: string;
  title: string;
  description: string | null;
  stop_number: number | null;
  latitude: number | string;
  longitude: number | string;
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
  pois,
}: {
  displayMode: 'explore_only' | 'guided_only' | 'both';
  center: { lat: number | string | null; lng: number | string | null };
  zoom: number;
  pois: Poi[];
}) {
  const [uiMode, setUiMode] = useState<'explore' | 'guided'>(
    displayMode === 'guided_only' ? 'guided' : 'explore'
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    void import('leaflet').then((L) => {
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    });
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

  const centerPoint: LatLngExpression =
    center.lat != null && center.lng != null
      ? [Number(center.lat), Number(center.lng)]
      : stops[0]
        ? [stops[0].latitude, stops[0].longitude]
        : [42.7167, -73.7519];

  const activeStop = stops[activeIndex] ?? null;
  const guidedLine = stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]);

  return (
    <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <p className="text-sm font-medium">Interactive Map</p>
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

        <div className="h-[460px] w-full">
          <MapContainer center={centerPoint} zoom={zoom || 16} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {guidedLine.length > 1 ? (
              <Polyline positions={guidedLine} pathOptions={{ color: '#8b1f41', weight: 4, opacity: 0.85 }} />
            ) : null}

            {(uiMode === 'guided' ? stops : normalizedPois).map((poi, index) => (
              <Marker
                key={poi.id}
                position={[poi.latitude, poi.longitude]}
                eventHandlers={{ click: () => setActiveIndex(index) }}
              >
                <Popup>
                  <p className="font-semibold">{poi.title}</p>
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
