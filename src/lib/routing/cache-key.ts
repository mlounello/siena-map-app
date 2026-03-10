import type { RouteMode, RoutingSegmentInput } from '@/lib/routing/types';

function normalizeNumber(value: number): string {
  return value.toFixed(6);
}

export function buildSegmentCacheKey({
  provider,
  mode,
  from,
  to,
}: {
  provider: 'mapbox' | 'valhalla' | 'openrouteservice' | 'graphhopper';
  mode: RouteMode;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}): string {
  return [
    'routing',
    'v1',
    provider,
    mode,
    `${normalizeNumber(from.lat)},${normalizeNumber(from.lng)}`,
    `${normalizeNumber(to.lat)},${normalizeNumber(to.lng)}`,
  ].join(':');
}

export function buildBatchRequestKey({
  mapId,
  mode,
  segments,
}: {
  mapId?: string;
  mode: RouteMode;
  segments: RoutingSegmentInput[];
}): string {
  const sorted = [...segments].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify({
    mapId: mapId ?? '',
    mode,
    segments: sorted.map((segment) => ({
      id: segment.id,
      from: {
        lat: normalizeNumber(segment.from.lat),
        lng: normalizeNumber(segment.from.lng),
      },
      to: {
        lat: normalizeNumber(segment.to.lat),
        lng: normalizeNumber(segment.to.lng),
      },
    })),
  });
}

