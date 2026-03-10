export type PlatformRole =
  | 'owner'
  | 'super_admin'
  | 'department_head'
  | 'editor'
  | 'viewer';

export type DepartmentRole = 'department_head' | 'editor' | 'viewer';

export type MapVisibility = 'public' | 'unlisted' | 'internal_only';

export type MapType = 'geographic_osm' | 'custom_image' | 'floorplan';

export type MapShellStatus =
  | 'draft'
  | 'submitted_for_review'
  | 'approved'
  | 'rejected'
  | 'archived';

export type PublicationStatus = 'unpublished' | 'published' | 'archived';

export type PoiStatus =
  | 'draft'
  | 'submitted_for_review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'archived';

export type DisplayMode = 'explore_only' | 'guided_only' | 'both';
export type RouteMode = 'walking' | 'driving';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: PlatformRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MapRecord {
  id: string;
  slug: string;
  title: string;
  intro_text: string | null;
  primary_department_id: string;
  visibility: MapVisibility;
  map_type: MapType;
  shell_status: MapShellStatus;
  publication_status: PublicationStatus;
  display_mode: DisplayMode;
  route_mode: RouteMode;
  default_center_lat: number | null;
  default_center_lng: number | null;
  default_zoom: number;
  show_sidebar: boolean;
  show_legend: boolean;
  show_search: boolean;
  show_tour_panel: boolean;
  show_branding: boolean;
  show_cta: boolean;
  theme_preset: string;
  created_by: string | null;
  updated_by: string | null;
  approved_by: string | null;
  published_by: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  scheduled_publish_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Poi {
  id: string;
  map_id: string;
  title: string;
  description: string | null;
  image_asset_id: string | null;
  pin_color: string | null;
  pin_icon_asset_id: string | null;
  latitude: number;
  longitude: number;
  route_anchor_lat: number | null;
  route_anchor_lng: number | null;
  category_id: string | null;
  owning_department_id: string;
  created_by: string | null;
  updated_by: string | null;
  status: PoiStatus;
  approved_by: string | null;
  approved_at: string | null;
  published_by: string | null;
  published_at: string | null;
  scheduled_publish_at: string | null;
  publish_on_approval: boolean;
  rejection_note: string | null;
  stop_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface RouteConnection {
  id: string;
  map_id: string;
  from_poi_id: string;
  to_poi_id: string;
  order_index: number;
  line_style: string | null;
  line_color: string | null;
  line_thickness: number;
  is_directional: boolean;
  label: string | null;
  connection_type: 'outdoor_routed' | 'internal_transfer';
  transfer_note: string | null;
  status: PublicationStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuidedRoute {
  id: string;
  map_id: string;
  title: string;
  is_primary: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuidedRouteStop {
  id: string;
  guided_route_id: string;
  poi_id: string;
  stop_number: number;
  created_by: string | null;
  created_at: string;
}

export interface RoutingDiagnostics {
  segment_id: string;
  requested_from: { lat: number; lng: number };
  requested_to: { lat: number; lng: number };
  snapped_from: { lat: number; lng: number } | null;
  snapped_to: { lat: number; lng: number } | null;
  snap_distance_meters_start: number | null;
  snap_distance_meters_end: number | null;
  provider: 'mapbox' | 'fallback_straight';
  profile: RouteMode;
  geometry_source: 'provider' | 'straight_line_fallback';
  fallback_reason: string | null;
  route_distance_meters: number | null;
  direct_distance_meters: number | null;
  detour_ratio: number | null;
  short_hop: boolean;
  flagged: boolean;
  flag_reasons: string[];
  duration_seconds: number | null;
  warnings: string[];
}

export interface RoutingSegmentResponse {
  id: string;
  routed: boolean;
  fallback: 'none' | 'straight';
  source: 'mapbox' | 'fallback_straight';
  geometry: {
    type: 'LineString';
    coordinates: Array<[number, number]>;
  };
  distanceMeters: number | null;
  durationSeconds: number | null;
  errorCode: string | null;
  cacheKey: string;
  diagnostics: RoutingDiagnostics;
}

export interface RoutingBatchResponse {
  provider: 'mapbox';
  mode: RouteMode;
  results: RoutingSegmentResponse[];
}
