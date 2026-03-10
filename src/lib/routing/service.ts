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

function readNumericEnv(name: string, fallback: number, min?: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  if (min != null && parsed < min) return fallback;
  return parsed;
}

const SEGMENT_TIMEOUT_MS = readNumericEnv('ROUTING_TIMEOUT_MS', 4000, 1);
const PROVIDER_CONCURRENCY = Math.floor(readNumericEnv('ROUTING_PROVIDER_CONCURRENCY', 4, 1));
const ROUTING_DEBUG = process.env.ROUTING_DEBUG === 'true';

// Guardrail thresholds (centralized, tunable)
const SHORT_HOP_EPSILON_METERS = readNumericEnv('SHORT_HOP_EPSILON_METERS', 5, 0);
const SHORT_HOP_MAX_DIRECT_DISTANCE_METERS = readNumericEnv(
  'SHORT_HOP_MAX_DIRECT_DISTANCE_METERS',
  250,
  1
);
const MAX_ALLOWED_SHORT_HOP_DETOUR_RATIO = readNumericEnv(
  'MAX_ALLOWED_SHORT_HOP_DETOUR_RATIO',
  2.5,
  1
);
const MAX_SNAP_DISTANCE_METERS = readNumericEnv('MAX_SNAP_DISTANCE_METERS', 50, 0);
const MAX_SHORT_HOP_ROUTE_DISTANCE_METERS = readNumericEnv(
  'MAX_SHORT_HOP_ROUTE_DISTANCE_METERS',
  600,
  1
);

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
  shortHop,
  flagged,
  flagReasons,
}: {
  routed: boolean;
  fallbackReason: string | null;
  snapStart: number | null;
  snapEnd: number | null;
  detourRatio: number | null;
  shortHop: boolean;
  flagged: boolean;
  flagReasons: string[];
}): string[] {
  const warnings: string[] = [];
  if (!routed) warnings.push('used_straight_line_fallback');
  if (fallbackReason) warnings.push(`fallback_reason:${fallbackReason}`);
  if (shortHop) warnings.push('short_hop');
  if (snapStart != null && snapStart > MAX_SNAP_DISTANCE_METERS) warnings.push('high_snap_distance_start');
  if (snapEnd != null && snapEnd > MAX_SNAP_DISTANCE_METERS) warnings.push('high_snap_distance_end');
  if (detourRatio != null && detourRatio > MAX_ALLOWED_SHORT_HOP_DETOUR_RATIO) warnings.push('high_detour_ratio');
  if (flagged) warnings.push('guardrail_flagged');
  warnings.push(...flagReasons.map((reason) => `flag:${reason}`));
  return warnings;
}

function evaluateGuardrails({
  directDistanceMeters,
  routeDistanceMeters,
  detourRatio,
  snapStart,
  snapEnd,
  routed,
}: {
  directDistanceMeters: number;
  routeDistanceMeters: number | null;
  detourRatio: number | null;
  snapStart: number | null;
  snapEnd: number | null;
  routed: boolean;
}) {
  const shortHop = directDistanceMeters <= SHORT_HOP_MAX_DIRECT_DISTANCE_METERS;
  const flagReasons: string[] = [];

  if (snapStart != null && snapStart > MAX_SNAP_DISTANCE_METERS) {
    flagReasons.push('snap_distance_start_exceeds_threshold');
  }
  if (snapEnd != null && snapEnd > MAX_SNAP_DISTANCE_METERS) {
    flagReasons.push('snap_distance_end_exceeds_threshold');
  }
  if (
    shortHop &&
    detourRatio != null &&
    detourRatio > MAX_ALLOWED_SHORT_HOP_DETOUR_RATIO
  ) {
    flagReasons.push('short_hop_detour_ratio_exceeds_threshold');
  }
  if (
    shortHop &&
    routeDistanceMeters != null &&
    routeDistanceMeters > MAX_SHORT_HOP_ROUTE_DISTANCE_METERS
  ) {
    flagReasons.push('short_hop_route_distance_exceeds_threshold');
  }
  if (shortHop && !routed) {
    flagReasons.push('short_hop_used_fallback');
  }

  return {
    shortHop,
    flagged: flagReasons.length > 0,
    flagReasons,
  };
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
      routed.distanceMeters != null && directDistanceMeters >= SHORT_HOP_EPSILON_METERS
        ? routed.distanceMeters / directDistanceMeters
        : null;
    const guardrail = evaluateGuardrails({
      directDistanceMeters,
      routeDistanceMeters: routed.distanceMeters,
      detourRatio,
      snapStart: routed.snapDistanceMetersStart,
      snapEnd: routed.snapDistanceMetersEnd,
      routed: true,
    });
    const warnings = buildWarnings({
      routed: true,
      fallbackReason: null,
      snapStart: routed.snapDistanceMetersStart,
      snapEnd: routed.snapDistanceMetersEnd,
      detourRatio,
      shortHop: guardrail.shortHop,
      flagged: guardrail.flagged,
      flagReasons: guardrail.flagReasons,
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
      short_hop: guardrail.shortHop,
      flagged: guardrail.flagged,
      flag_reasons: guardrail.flagReasons,
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
      fallback.distanceMeters != null && directDistanceMeters >= SHORT_HOP_EPSILON_METERS
        ? fallback.distanceMeters / directDistanceMeters
        : null;
    const guardrail = evaluateGuardrails({
      directDistanceMeters,
      routeDistanceMeters: fallback.distanceMeters,
      detourRatio,
      snapStart: null,
      snapEnd: null,
      routed: false,
    });
    const warnings = buildWarnings({
      routed: false,
      fallbackReason: code,
      snapStart: null,
      snapEnd: null,
      detourRatio,
      shortHop: guardrail.shortHop,
      flagged: guardrail.flagged,
      flagReasons: guardrail.flagReasons,
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
      short_hop: guardrail.shortHop,
      flagged: guardrail.flagged,
      flag_reasons: guardrail.flagReasons,
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
