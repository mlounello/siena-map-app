import type {
  DisplayMode,
  MapShellStatus,
  MapType,
  MapVisibility,
  PlatformRole,
  PoiStatus,
  PublicationStatus,
} from '../../types/siena-maps';

export const APP_SCHEMA = process.env.NEXT_PUBLIC_APP_SCHEMA || 'app_siena_maps';

export const PLATFORM_ROLE_RANK: Record<PlatformRole, number> = {
  viewer: 10,
  editor: 20,
  department_head: 30,
  super_admin: 40,
  owner: 50,
};

export const MAP_VISIBILITY_OPTIONS: MapVisibility[] = [
  'public',
  'unlisted',
  'internal_only',
];

export const MAP_TYPE_OPTIONS: MapType[] = [
  'geographic_osm',
  'custom_image',
  'floorplan',
];

export const DISPLAY_MODE_OPTIONS: DisplayMode[] = [
  'explore_only',
  'guided_only',
  'both',
];

export const MAP_SHELL_STATUSES: MapShellStatus[] = [
  'draft',
  'submitted_for_review',
  'approved',
  'rejected',
  'archived',
];

export const PUBLICATION_STATUSES: PublicationStatus[] = [
  'unpublished',
  'published',
  'archived',
];

export const POI_STATUSES: PoiStatus[] = [
  'draft',
  'submitted_for_review',
  'approved',
  'published',
  'rejected',
  'archived',
];

export const DEFAULT_MAP_SETTINGS = {
  map_type: 'geographic_osm' as MapType,
  visibility: 'internal_only' as MapVisibility,
  display_mode: 'both' as DisplayMode,
  default_center_lat: 42.7167,
  default_center_lng: -73.7519,
  default_zoom: 16,
  show_sidebar: true,
  show_legend: true,
  show_search: true,
  show_tour_panel: true,
  show_branding: true,
  show_cta: true,
  theme_preset: 'siena_default',
};
