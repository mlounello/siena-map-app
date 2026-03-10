type MapDbClient = {
  from: (table: string) => any;
};

type RouteStop = {
  stop_number: number;
  poi: {
    id: string;
    title: string;
    route_anchor_lat: number | null;
    route_anchor_lng: number | null;
  } | null;
};

export type PublishAnchorBlocker = {
  poi_id: string;
  title: string;
  stop_number: number;
  reason: string;
};

export type PublishAnchorValidationResult = {
  valid: boolean;
  blockers: PublishAnchorBlocker[];
  summary: {
    totalStops: number;
    anchoredStops: number;
    unanchoredStops: number;
    blockerCount: number;
  };
};

function hasAnchor(stop: RouteStop): boolean {
  if (!stop.poi) return false;
  return Number.isFinite(stop.poi.route_anchor_lat) && Number.isFinite(stop.poi.route_anchor_lng);
}

function findPreviousAnchoredIndex(stops: RouteStop[], start: number): number {
  for (let index = start - 1; index >= 0; index -= 1) {
    if (hasAnchor(stops[index])) return index;
  }
  return -1;
}

function findNextAnchoredIndex(stops: RouteStop[], start: number): number {
  for (let index = start + 1; index < stops.length; index += 1) {
    if (hasAnchor(stops[index])) return index;
  }
  return -1;
}

export async function validateMapAnchorsForPublish(db: MapDbClient, mapId: string): Promise<PublishAnchorValidationResult> {
  const { data: primaryRoute, error: routeError } = await db
    .from('guided_routes')
    .select('id')
    .eq('map_id', mapId)
    .eq('is_primary', true)
    .maybeSingle();

  if (routeError) throw new Error(routeError.message);
  if (!primaryRoute) {
    return {
      valid: true,
      blockers: [],
      summary: {
        totalStops: 0,
        anchoredStops: 0,
        unanchoredStops: 0,
        blockerCount: 0,
      },
    };
  }

  const { data: stopRows, error: stopError } = await db
    .from('guided_route_stops')
    .select('stop_number, poi:poi_id(id, title, route_anchor_lat, route_anchor_lng)')
    .eq('guided_route_id', primaryRoute.id)
    .order('stop_number', { ascending: true });

  if (stopError) throw new Error(stopError.message);

  const stops: RouteStop[] = (stopRows ?? []).map((row: any) => ({
    stop_number: row.stop_number,
    poi: row.poi
      ? {
          id: row.poi.id,
          title: row.poi.title,
          route_anchor_lat: row.poi.route_anchor_lat == null ? null : Number(row.poi.route_anchor_lat),
          route_anchor_lng: row.poi.route_anchor_lng == null ? null : Number(row.poi.route_anchor_lng),
        }
      : null,
  }));

  const blockers: PublishAnchorBlocker[] = [];
  const anchoredStops = stops.filter((stop) => hasAnchor(stop)).length;
  const unanchoredStops = stops.length - anchoredStops;

  for (let index = 0; index < stops.length; index += 1) {
    const stop = stops[index];
    if (!stop.poi || hasAnchor(stop)) continue;

    const previousAnchoredIndex = findPreviousAnchoredIndex(stops, index);
    const nextAnchoredIndex = findNextAnchoredIndex(stops, index);

    // Intentional internal transfers are valid when a missing-anchor stop is
    // between anchored neighbors, allowing routed geometry to resume cleanly.
    if (previousAnchoredIndex !== -1 && nextAnchoredIndex !== -1) continue;

    const reason =
      previousAnchoredIndex === -1 && nextAnchoredIndex === -1
        ? 'Missing anchor and no anchored context exists in this route segment.'
        : previousAnchoredIndex === -1
          ? 'Missing anchor at route start; anchored continuity cannot begin cleanly.'
          : 'Missing anchor at route end; anchored continuity cannot continue cleanly.';

    blockers.push({
      poi_id: stop.poi.id,
      title: stop.poi.title,
      stop_number: stop.stop_number,
      reason,
    });
  }

  return {
    valid: blockers.length === 0,
    blockers,
    summary: {
      totalStops: stops.length,
      anchoredStops,
      unanchoredStops,
      blockerCount: blockers.length,
    },
  };
}
