import { buildSegmentCacheKey } from '@/lib/routing/cache-key';
import { fallbackStraightSegment } from '@/lib/routing/fallback';
import { getRoutingProvider } from '@/lib/routing/provider';
import type {
  RouteMode,
  RoutingBatchResponse,
  RoutingSegmentInput,
  RoutingSegmentResult,
} from '@/lib/routing/types';

const SEGMENT_TIMEOUT_MS = Number(process.env.ROUTING_TIMEOUT_MS || 4000);
const PROVIDER_CONCURRENCY = Number(process.env.ROUTING_PROVIDER_CONCURRENCY || 4);

async function processOneSegment(
  segment: RoutingSegmentInput,
  mode: RouteMode
): Promise<RoutingSegmentResult> {
  const provider = getRoutingProvider();
  const cacheKey = buildSegmentCacheKey({
    provider: provider.name,
    mode,
    from: segment.from,
    to: segment.to,
  });

  try {
    const routed = await provider.routeSegment(
      {
        mode,
        from: segment.from,
        to: segment.to,
      },
      SEGMENT_TIMEOUT_MS
    );

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
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : 'ROUTING_ERROR';
    const fallback = fallbackStraightSegment(segment, mode, code);
    return { ...fallback, cacheKey };
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
}: {
  mode: RouteMode;
  segments: RoutingSegmentInput[];
}): Promise<RoutingBatchResponse> {
  const provider = getRoutingProvider();
  const results = await runWithConcurrency(
    segments,
    (segment) => processOneSegment(segment, mode),
    PROVIDER_CONCURRENCY
  );

  return {
    provider: provider.name,
    mode,
    results,
  };
}

