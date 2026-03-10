import { notFound } from 'next/navigation';
import { PublicMapShell } from '@/components/public/public-map-shell';
import { getCurrentProfile } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';

export default async function EmbedMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const qs = await searchParams;
  const { db } = await createDbClient();
  const profile = await getCurrentProfile();

  const { data: publicMap, error: publicError } = await db
    .from('maps')
    .select('*')
    .eq('slug', slug)
    .eq('publication_status', 'published')
    .in('visibility', ['public', 'unlisted'])
    .maybeSingle();

  let map = publicMap;

  // Allow authenticated internal preview in embed builder even before publish.
  if (!map && profile) {
    const { data: internalMap } = await db
      .from('maps')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    map = internalMap;
  }

  if (publicError || !map) notFound();

  const { data: pois } = await db
    .from('pois')
    .select('id, title, description, latitude, longitude, route_anchor_lat, route_anchor_lng, stop_number, category_id, pin_color, categories:category_id(id, name, icon, color)')
    .eq('map_id', map.id)
    .eq('status', 'published')
    .order('stop_number', { ascending: true, nullsFirst: false })
    .order('title', { ascending: true });

  const { data: routeConnections } = await db
    .from('route_connections')
    .select('id, from_poi_id, to_poi_id, order_index, line_color, line_thickness, connection_type, transfer_note')
    .eq('map_id', map.id)
    .eq('status', 'published')
    .order('order_index', { ascending: true });

  const mode = (typeof qs.mode === 'string' ? qs.mode : map.display_mode) as
    | 'explore_only'
    | 'guided_only'
    | 'both';

  return (
    <main className="p-0">
      <PublicMapShell
        displayMode={mode}
        routeMode={map.route_mode ?? 'walking'}
        center={{ lat: map.default_center_lat, lng: map.default_center_lng }}
        zoom={map.default_zoom ?? 16}
        themePreset={map.theme_preset}
        pois={pois ?? []}
        routeConnections={routeConnections ?? []}
      />
    </main>
  );
}
