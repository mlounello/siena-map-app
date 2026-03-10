import { buildSegmentCacheKey } from '@/lib/routing/cache-key';
import type { RouteMode, RoutingSegmentInput, RoutingSegmentResult } from '@/lib/routing/types';

export function fallbackStraightSegment(
  segment: RoutingSegmentInput,
  mode: RouteMode,
  errorCode: string | null
): RoutingSegmentResult {
  return {
    id: segment.id,
    routed: false,
    fallback: 'straight',
    source: 'fallback_straight',
    geometry: {
      type: 'LineString',
      coordinates: [
        [segment.from.lng, segment.from.lat],
        [segment.to.lng, segment.to.lat],
      ],
    },
    distanceMeters: null,
    durationSeconds: null,
    errorCode,
    cacheKey: buildSegmentCacheKey({
      provider: 'mapbox',
      mode,
      from: segment.from,
      to: segment.to,
    }),
  };
}

