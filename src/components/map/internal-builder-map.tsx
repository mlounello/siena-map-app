'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from 'react-leaflet';

type Poi = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  stop_number: number | null;
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
  pois,
  draftLat,
  draftLng,
  onPick,
  onMovePoi,
}: {
  center: [number, number];
  zoom: number;
  pois: Poi[];
  draftLat: number;
  draftLng: number;
  onPick: (lat: number, lng: number) => void;
  onMovePoi: (poiId: string, lat: number, lng: number) => void;
}) {
  useEffect(() => {
    void import('leaflet').then((L) => {
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    });
  }, []);

  const sorted = useMemo(
    () => [...pois].sort((a, b) => (a.stop_number ?? 9999) - (b.stop_number ?? 9999)),
    [pois]
  );

  const guideLine = sorted.map((poi) => [poi.latitude, poi.longitude] as [number, number]);

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="border-b border-black/10 px-4 py-3 text-sm">
        Builder canvas: click to set new POI coordinates, drag existing markers to update location.
      </div>
      <div className="h-[460px] w-full">
        <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickCapture onPick={onPick} />

          {guideLine.length > 1 ? (
            <Polyline positions={guideLine} pathOptions={{ color: '#8b1f41', weight: 3, opacity: 0.75 }} />
          ) : null}

          {pois.map((poi) => (
            <Marker
              key={poi.id}
              position={[poi.latitude, poi.longitude]}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const marker = event.target;
                  const ll = marker.getLatLng();
                  onMovePoi(poi.id, ll.lat, ll.lng);
                },
              }}
            />
          ))}

          {Number.isFinite(draftLat) && Number.isFinite(draftLng) ? (
            <Marker position={[draftLat, draftLng]} />
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}
