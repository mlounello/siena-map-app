'use client';

import { PublicLeafletMap } from '@/components/map/public-leaflet-map';

type Poi = {
  id: string;
  title: string;
  description: string | null;
  stop_number: number | null;
  latitude: number | string;
  longitude: number | string;
};

export function PublicMapShell({
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
  return <PublicLeafletMap displayMode={displayMode} center={center} zoom={zoom} pois={pois} />;
}
