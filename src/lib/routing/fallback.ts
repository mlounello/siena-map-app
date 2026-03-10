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
    diagnostics: {
      segment_id: segment.id,
      requested_from: segment.from,
      requested_to: segment.to,
      snapped_from: null,
      snapped_to: null,
      snap_distance_meters_start: null,
      snap_distance_meters_end: null,
      provider: 'fallback_straight',
      profile: mode,
      geometry_source: 'straight_line_fallback',
      fallback_reason: errorCode,
      route_distance_meters: null,
      direct_distance_meters: null,
      detour_ratio: null,
      duration_seconds: null,
      warnings: ['used_straight_line_fallback'],
    },
  };
}
