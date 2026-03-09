import { badRequest, ok, serverError } from '@/lib/api/http';
import { createDbClient } from '@/lib/supabase/server';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { db } = await createDbClient();

  const { data: map, error: mapError } = await db
    .from('maps')
    .select('*')
    .eq('slug', slug)
    .eq('publication_status', 'published')
    .in('visibility', ['public', 'unlisted'])
    .maybeSingle();

  if (mapError) return serverError(mapError.message);
  if (!map) return badRequest('Map not found');

  const [poisResult, routesResult] = await Promise.all([
    db
      .from('pois')
      .select('id, title, description, latitude, longitude, stop_number, category_id, pin_color, categories:category_id(id, name, icon, color)')
      .eq('map_id', map.id)
      .eq('status', 'published')
      .order('stop_number', { ascending: true, nullsFirst: false })
      .order('title', { ascending: true }),
    db
      .from('route_connections')
      .select('id, from_poi_id, to_poi_id, order_index, line_style, line_color, line_thickness, is_directional')
      .eq('map_id', map.id)
      .eq('status', 'published')
      .order('order_index', { ascending: true }),
  ]);

  if (poisResult.error) return serverError(poisResult.error.message);
  if (routesResult.error) return serverError(routesResult.error.message);

  return ok({
    map,
    pois: poisResult.data ?? [],
    routeConnections: routesResult.data ?? [],
  });
}
