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

type RouteConnection = {
  id: string;
  from_poi_id: string;
  to_poi_id: string;
  order_index: number;
  line_color: string | null;
  line_thickness: number | null;
};

export function PublicMapShell({
  displayMode,
  center,
  zoom,
  pois,
  routeConnections,
}: {
  displayMode: 'explore_only' | 'guided_only' | 'both';
  center: { lat: number | string | null; lng: number | string | null };
  zoom: number;
  pois: Poi[];
  routeConnections?: RouteConnection[];
}) {
  return (
    <PublicLeafletMap
      displayMode={displayMode}
      center={center}
      zoom={zoom}
      pois={pois}
      routeConnections={routeConnections}
    />
  );
}
