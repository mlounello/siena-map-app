import { z } from 'zod';
import { badRequest, ok, serverError } from '@/lib/api/http';
import { routeSegmentsBatch } from '@/lib/routing/service';
import type { RoutingSegmentInput } from '@/lib/routing/types';

const MAX_SEGMENTS_PER_REQUEST = 50;

const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const segmentSchema = z.object({
  id: z.string().min(1).max(120),
  from: coordinateSchema,
  to: coordinateSchema,
});

const requestSchema = z.object({
  mapId: z.string().uuid().optional(),
  mode: z.enum(['walking', 'driving']).default('walking'),
  segments: z.array(segmentSchema).min(1).max(MAX_SEGMENTS_PER_REQUEST),
  debug: z.boolean().optional(),
});

function normalizeSegments(input: z.infer<typeof requestSchema>['segments']): RoutingSegmentInput[] {
  return input.map((segment) => ({
    id: segment.id,
    from: {
      lat: Number(segment.from.lat),
      lng: Number(segment.from.lng),
    },
    to: {
      lat: Number(segment.to.lat),
      lng: Number(segment.to.lng),
    },
  }));
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((issue) => issue.message).join(', '));
  }

  if (parsed.data.segments.length > MAX_SEGMENTS_PER_REQUEST) {
    return badRequest(`Segment limit exceeded. Max ${MAX_SEGMENTS_PER_REQUEST} per request.`);
  }

  try {
    const debugFromQuery = ['1', 'true', 'yes'].includes(
      (requestUrl.searchParams.get('debug') || '').toLowerCase()
    );
    const debugFromHeader = ['1', 'true', 'yes'].includes(
      (request.headers.get('x-routing-debug') || '').toLowerCase()
    );

    const response = await routeSegmentsBatch({
      mode: parsed.data.mode,
      segments: normalizeSegments(parsed.data.segments),
      debug: Boolean(parsed.data.debug) || debugFromQuery || debugFromHeader,
    });
    return ok(response);
  } catch (error) {
    return serverError(error instanceof Error ? error.message : 'Routing request failed');
  }
}
