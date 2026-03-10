import { buildSegmentCacheKey } from '@/lib/routing/cache-key';
import { fallbackStraightSegment } from '@/lib/routing/fallback';
import { getRoutingProvider } from '@/lib/routing/provider';
import type {
  Coordinate,
  RouteMode,
  RoutingBatchResponse,
  RoutingSegmentDiagnostics,
  RoutingSegmentInput,
  RoutingSegmentResult,
} from '@/lib/routing/types';

const SEGMENT_TIMEOUT_MS = Number(process.env.ROUTING_TIMEOUT_MS || 4000);
const PROVIDER_CONCURRENCY = Number(process.env.ROUTING_PROVIDER_CONCURRENCY || 4);
const ROUTING_DEBUG = process.env.ROUTING_DEBUG === 'true';

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineMeters(a: Coordinate, b: Coordinate): number {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return earthRadiusMeters * c;
}

function buildWarnings({
  routed,
  fallbackReason,
  snapStart,
  snapEnd,
  detourRatio,
}: {
  routed: boolean;
  fallbackReason: string | null;
  snapStart: number | null;
  snapEnd: number | null;
  detourRatio: number | null;
}): string[] {
  const warnings: string[] = [];
  if (!routed) warnings.push('used_straight_line_fallback');
  if (fallbackReason) warnings.push(`fallback_reason:${fallbackReason}`);
  if (snapStart != null && snapStart > 50) warnings.push('high_snap_distance_start');
  if (snapEnd != null && snapEnd > 50) warnings.push('high_snap_distance_end');
  if (detourRatio != null && detourRatio > 2.5) warnings.push('high_detour_ratio');
  return warnings;
}

async function processOneSegment(
  segment: RoutingSegmentInput,
  mode: RouteMode,
  debug: boolean
): Promise<RoutingSegmentResult> {
  const provider = getRoutingProvider();
  const cacheKey = buildSegmentCacheKey({
    provider: provider.name,
    mode,
    from: segment.from,
    to: segment.to,
  });

  const directDistanceMeters = haversineMeters(segment.from, segment.to);

  try {
    const routed = await provider.routeSegment(
      {
        mode,
        from: segment.from,
        to: segment.to,
      },
      SEGMENT_TIMEOUT_MS
    );

    const detourRatio =
      routed.distanceMeters != null && directDistanceMeters > 0
        ? routed.distanceMeters / directDistanceMeters
        : null;
    const warnings = buildWarnings({
      routed: true,
      fallbackReason: null,
      snapStart: routed.snapDistanceMetersStart,
      snapEnd: routed.snapDistanceMetersEnd,
      detourRatio,
    });
    const diagnostics: RoutingSegmentDiagnostics = {
      segment_id: segment.id,
      requested_from: segment.from,
      requested_to: segment.to,
      snapped_from: routed.snappedFrom,
      snapped_to: routed.snappedTo,
      snap_distance_meters_start: routed.snapDistanceMetersStart,
      snap_distance_meters_end: routed.snapDistanceMetersEnd,
      provider: provider.name,
      profile: routed.profile,
      geometry_source: 'provider',
      fallback_reason: null,
      route_distance_meters: routed.distanceMeters,
      direct_distance_meters: directDistanceMeters,
      detour_ratio: detourRatio,
      duration_seconds: routed.durationSeconds,
      warnings,
    };

    if (debug || ROUTING_DEBUG || warnings.length > 0) {
      console.info('[routing:segment]', diagnostics);
    }

    return {
      id: segment.id,
      routed: true,
      fallback: 'none',
      source: provider.name,
      geometry: routed.geometry,
      distanceMeters: routed.distanceMeters,
      durationSeconds: routed.durationSeconds,
      errorCode: null,
      cacheKey,
      diagnostics,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : 'ROUTING_ERROR';
    const fallback = fallbackStraightSegment(segment, mode, code);
    const detourRatio =
      fallback.distanceMeters != null && directDistanceMeters > 0
        ? fallback.distanceMeters / directDistanceMeters
        : null;
    const warnings = buildWarnings({
      routed: false,
      fallbackReason: code,
      snapStart: null,
      snapEnd: null,
      detourRatio,
    });
    const diagnostics: RoutingSegmentDiagnostics = {
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
      fallback_reason: code,
      route_distance_meters: fallback.distanceMeters,
      direct_distance_meters: directDistanceMeters,
      detour_ratio: detourRatio,
      duration_seconds: fallback.durationSeconds,
      warnings,
    };

    if (debug || ROUTING_DEBUG || warnings.length > 0) {
      console.warn('[routing:segment:fallback]', diagnostics);
    }

    return { ...fallback, cacheKey, diagnostics };
  }
}

async function runWithConcurrency<TInput, TResult>(
  items: TInput[],
  worker: (item: TInput) => Promise<TResult>,
  concurrency: number
): Promise<TResult[]> {
  if (items.length === 0) return [];
  const output: TResult[] = new Array(items.length);
  let cursor = 0;

  async function consume() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) break;
      output[index] = await worker(items[index]);
    }
  }

  const runners = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => consume());
  await Promise.all(runners);
  return output;
}

export async function routeSegmentsBatch({
  mode,
  segments,
  debug = false,
}: {
  mode: RouteMode;
  segments: RoutingSegmentInput[];
  debug?: boolean;
}): Promise<RoutingBatchResponse> {
  const provider = getRoutingProvider();
  const results = await runWithConcurrency(
    segments,
    (segment) => processOneSegment(segment, mode, debug),
    PROVIDER_CONCURRENCY
  );

  return {
    provider: provider.name,
    mode,
    results,
  };
}
