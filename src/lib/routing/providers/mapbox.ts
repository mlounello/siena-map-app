import type { RoutingProviderRequest, RoutingProviderResponse } from '@/lib/routing/types';

function isValidLineStringCoordinates(value: unknown): value is Array<[number, number]> {
  if (!Array.isArray(value) || value.length < 2) return false;
  return value.every(
    (item) =>
      Array.isArray(item) &&
      item.length === 2 &&
      Number.isFinite(Number(item[0])) &&
      Number.isFinite(Number(item[1]))
  );
}

function isValidLngLatPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(Number(value[0])) &&
    Number.isFinite(Number(value[1]))
  );
}

export async function routeWithMapbox(
  request: RoutingProviderRequest,
  timeoutMs: number
): Promise<RoutingProviderResponse> {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('MAPBOX_TOKEN_MISSING');
  }

  const profile = request.mode === 'driving' ? 'driving' : 'walking';
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${request.from.lng},${request.from.lat};${request.to.lng},${request.to.lat}`
  );
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('steps', 'false');
  url.searchParams.set('alternatives', 'false');
  url.searchParams.set('access_token', accessToken);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`MAPBOX_HTTP_${response.status}`);
    }

    const payload = await response.json();
    const route = payload?.routes?.[0];
    const waypoints = Array.isArray(payload?.waypoints) ? payload.waypoints : [];
    const coordinates: unknown = route?.geometry?.coordinates;

    if (!isValidLineStringCoordinates(coordinates)) {
      throw new Error('MAPBOX_NO_ROUTE');
    }

    const snappedStartLocation = isValidLngLatPair(waypoints?.[0]?.location)
      ? waypoints[0].location
      : null;
    const snappedEndLocation = isValidLngLatPair(waypoints?.[1]?.location)
      ? waypoints[1].location
      : null;

    return {
      geometry: {
        type: 'LineString',
        coordinates,
      },
      distanceMeters: Number.isFinite(Number(route?.distance)) ? Number(route.distance) : null,
      durationSeconds: Number.isFinite(Number(route?.duration)) ? Number(route.duration) : null,
      snappedFrom: snappedStartLocation
        ? { lat: Number(snappedStartLocation[1]), lng: Number(snappedStartLocation[0]) }
        : null,
      snappedTo: snappedEndLocation
        ? { lat: Number(snappedEndLocation[1]), lng: Number(snappedEndLocation[0]) }
        : null,
      snapDistanceMetersStart: Number.isFinite(Number(waypoints?.[0]?.distance))
        ? Number(waypoints[0].distance)
        : null,
      snapDistanceMetersEnd: Number.isFinite(Number(waypoints?.[1]?.distance))
        ? Number(waypoints[1].distance)
        : null,
      profile: request.mode,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('MAPBOX_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
