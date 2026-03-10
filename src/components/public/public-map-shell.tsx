'use client';

import dynamic from 'next/dynamic';

const PublicLeafletMap = dynamic(
  () => import('@/components/map/public-leaflet-map').then((module) => module.PublicLeafletMap),
  { ssr: false }
);

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
};

export function PublicMapShell({
  displayMode,
  routeMode,
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
  return (
    <PublicLeafletMap
      displayMode={displayMode}
      routeMode={routeMode ?? 'walking'}
      center={center}
      zoom={zoom}
      themePreset={themePreset}
      pois={pois}
      routeConnections={routeConnections}
    />
  );
}
