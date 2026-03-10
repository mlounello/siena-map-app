export type RouteMode = 'walking' | 'driving';

export type Coordinate = {
  lat: number;
  lng: number;
};

export type RoutingSegmentInput = {
  id: string;
  from: Coordinate;
  to: Coordinate;
};

export type LineStringGeometry = {
  type: 'LineString';
  coordinates: Array<[number, number]>; // [lng, lat]
};

export type RoutingSegmentResult = {
  id: string;
  routed: boolean;
  fallback: 'none' | 'straight';
  source: 'mapbox' | 'fallback_straight';
  geometry: LineStringGeometry;
  distanceMeters: number | null;
  durationSeconds: number | null;
  errorCode: string | null;
  cacheKey: string;
};

export type RoutingBatchRequest = {
  mapId?: string;
  mode: RouteMode;
  segments: RoutingSegmentInput[];
};

export type RoutingBatchResponse = {
  provider: 'mapbox';
  mode: RouteMode;
  results: RoutingSegmentResult[];
};

export type RoutingProviderRequest = {
  mode: RouteMode;
  from: Coordinate;
  to: Coordinate;
};

export type RoutingProviderResponse = {
  geometry: LineStringGeometry;
  distanceMeters: number | null;
  durationSeconds: number | null;
};

