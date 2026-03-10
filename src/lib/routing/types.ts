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
  diagnostics: RoutingSegmentDiagnostics;
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
  snappedFrom: Coordinate | null;
  snappedTo: Coordinate | null;
  snapDistanceMetersStart: number | null;
  snapDistanceMetersEnd: number | null;
  profile: RouteMode;
};

export type RoutingSegmentDiagnostics = {
  segment_id: string;
  requested_from: Coordinate;
  requested_to: Coordinate;
  snapped_from: Coordinate | null;
  snapped_to: Coordinate | null;
  snap_distance_meters_start: number | null;
  snap_distance_meters_end: number | null;
  provider: 'mapbox' | 'fallback_straight';
  profile: RouteMode;
  geometry_source: 'provider' | 'straight_line_fallback';
  fallback_reason: string | null;
  route_distance_meters: number | null;
  direct_distance_meters: number | null;
  detour_ratio: number | null;
  duration_seconds: number | null;
  warnings: string[];
};
