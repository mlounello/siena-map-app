export type MapThemePreset = 'streets' | 'light' | 'dark' | 'satellite' | 'terrain';

export type TilePreset = {
  key: MapThemePreset;
  label: string;
  url: string;
  attribution: string;
  maxZoom?: number;
  subdomains?: string[];
};

export const MAP_TILE_PRESETS: TilePreset[] = [
  {
    key: 'streets',
    label: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 20,
  },
  {
    key: 'light',
    label: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
  },
  {
    key: 'dark',
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
  },
  {
    key: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  },
  {
    key: 'terrain',
    label: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, SRTM | OpenTopoMap',
    maxZoom: 17,
  },
];

const PRESET_BY_KEY = new Map(MAP_TILE_PRESETS.map((preset) => [preset.key, preset]));

export function resolveTilePreset(raw: string | null | undefined): TilePreset {
  if (!raw) return PRESET_BY_KEY.get('streets')!;

  if (PRESET_BY_KEY.has(raw as MapThemePreset)) {
    return PRESET_BY_KEY.get(raw as MapThemePreset)!;
  }

  if (raw === 'siena_default') return PRESET_BY_KEY.get('streets')!;

  return PRESET_BY_KEY.get('streets')!;
}
