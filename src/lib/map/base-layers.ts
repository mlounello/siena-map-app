export type MapThemePreset =
  | 'MapStyle.STREETS'
  | 'MapStyle.DATAVIZ.DARK'
  | 'MapStyle.SATELLITE'
  | 'MapStyle.HYBRID'
  | 'MapStyle.OUTDOOR'
  | 'MapStyle.BASIC'
  | 'MapStyle.OPENSTREETMAP';

export type TileLayerConfig = {
  url: string;
  attribution: string;
  maxZoom?: number;
  opacity?: number;
};

export type TilePreset = {
  key: MapThemePreset;
  label: string;
  layers: TileLayerConfig[];
};

export const MAP_TILE_PRESETS: TilePreset[] = [
  {
    key: 'MapStyle.STREETS',
    label: 'MapStyle.STREETS',
    layers: [
      {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 20,
      },
    ],
  },
  {
    key: 'MapStyle.DATAVIZ.DARK',
    label: 'MapStyle.DATAVIZ.DARK',
    layers: [
      {
        url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 20,
      },
    ],
  },
  {
    key: 'MapStyle.SATELLITE',
    label: 'MapStyle.SATELLITE',
    layers: [
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
      },
    ],
  },
  {
    key: 'MapStyle.HYBRID',
    label: 'MapStyle.HYBRID',
    layers: [
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
      },
      {
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Labels &copy; Esri',
        maxZoom: 19,
        opacity: 0.92,
      },
    ],
  },
  {
    key: 'MapStyle.OUTDOOR',
    label: 'MapStyle.OUTDOOR',
    layers: [
      {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors, SRTM | OpenTopoMap',
        maxZoom: 17,
      },
    ],
  },
  {
    key: 'MapStyle.BASIC',
    label: 'MapStyle.BASIC',
    layers: [
      {
        url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 20,
      },
    ],
  },
  {
    key: 'MapStyle.OPENSTREETMAP',
    label: 'MapStyle.OPENSTREETMAP',
    layers: [
      {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 20,
      },
    ],
  },
];

const PRESET_BY_KEY = new Map(MAP_TILE_PRESETS.map((preset) => [preset.key, preset]));

export function resolveTilePreset(raw: string | null | undefined): TilePreset {
  if (!raw) return PRESET_BY_KEY.get('MapStyle.STREETS')!;

  if (PRESET_BY_KEY.has(raw as MapThemePreset)) {
    return PRESET_BY_KEY.get(raw as MapThemePreset)!;
  }

  // Backward compatibility for earlier stored theme values.
  if (raw === 'streets') return PRESET_BY_KEY.get('MapStyle.STREETS')!;
  if (raw === 'light') return PRESET_BY_KEY.get('MapStyle.BASIC')!;
  if (raw === 'dark') return PRESET_BY_KEY.get('MapStyle.DATAVIZ.DARK')!;
  if (raw === 'satellite') return PRESET_BY_KEY.get('MapStyle.SATELLITE')!;
  if (raw === 'terrain') return PRESET_BY_KEY.get('MapStyle.OUTDOOR')!;
  if (raw === 'siena_default') return PRESET_BY_KEY.get('MapStyle.STREETS')!;

  return PRESET_BY_KEY.get('MapStyle.STREETS')!;
}
