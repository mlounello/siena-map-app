import { buildBatchRequestKey } from '@/lib/routing/cache-key';
import type { RouteMode } from '@/lib/routing/types';

export type SegmentRequest = {
  id: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
};

export type SegmentRoutingResult = {
  id: string;
  routed: boolean;
  fallback: 'none' | 'straight';
  source: string;
  geometry: {
    type: 'LineString';
    coordinates: Array<[number, number]>;
  };
  distanceMeters: number | null;
  durationSeconds: number | null;
  errorCode: string | null;
  cacheKey: string;
};

type BatchResponse = {
  provider: string;
  mode: RouteMode;
  results: SegmentRoutingResult[];
};

const inflight = new Map<string, Promise<BatchResponse>>();

export async function fetchRoutedSegments({
  mapId,
  mode,
  segments,
  signal,
}: {
  mapId?: string;
  mode: RouteMode;
  segments: SegmentRequest[];
  signal?: AbortSignal;
}): Promise<BatchResponse> {
  const requestKey = buildBatchRequestKey({ mapId, mode, segments });
  const active = inflight.get(requestKey);
  if (active) return active;

  const requestPromise = fetch('/api/routing/segments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mapId, mode, segments }),
    signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? `Routing request failed (${response.status})`);
      }

      return (await response.json()) as BatchResponse;
    })
    .finally(() => {
      inflight.delete(requestKey);
    });

  inflight.set(requestKey, requestPromise);
  return requestPromise;
}

export function lineStringToLatLngPairs(
  coordinates: Array<[number, number]>
): Array<[number, number]> {
  return coordinates.map((coordinate) => [coordinate[1], coordinate[0]]);
}

