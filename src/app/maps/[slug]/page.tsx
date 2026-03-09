import { notFound } from 'next/navigation';
import { PublicMapShell } from '@/components/public/public-map-shell';
import { Badge, Panel, Toolbar } from '@/components/ui/siena';
import { createDbClient } from '@/lib/supabase/server';

export default async function PublicMapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { db } = await createDbClient();

  const { data: map, error: mapError } = await db
    .from('maps')
    .select('*')
    .eq('slug', slug)
    .eq('publication_status', 'published')
    .in('visibility', ['public', 'unlisted'])
    .maybeSingle();

  if (mapError || !map) notFound();

  const { data: pois } = await db
    .from('pois')
    .select('id, title, description, latitude, longitude, stop_number')
    .eq('map_id', map.id)
    .eq('status', 'published')
    .order('stop_number', { ascending: true, nullsFirst: false })
    .order('title', { ascending: true });

  const { data: routeConnections } = await db
    .from('route_connections')
    .select('id, from_poi_id, to_poi_id, order_index, line_color, line_thickness')
    .eq('map_id', map.id)
    .eq('status', 'published')
    .order('order_index', { ascending: true });

  return (
    <section className="space-y-6">
      <Panel>
        <header className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--brand)]">{map.title}</h1>
          {map.intro_text ? <p className="max-w-3xl text-sm text-black/75">{map.intro_text}</p> : null}
          <Toolbar>
            <Badge label={map.display_mode.replaceAll('_', ' ')} tone="info" />
            <Badge label={map.visibility.replaceAll('_', ' ')} tone="neutral" />
            <Badge label={`${(pois ?? []).length} Stops`} tone="success" />
          </Toolbar>
        </header>
      </Panel>

      <PublicMapShell
        displayMode={map.display_mode}
        center={{ lat: map.default_center_lat, lng: map.default_center_lng }}
        zoom={map.default_zoom ?? 16}
        pois={pois ?? []}
        routeConnections={routeConnections ?? []}
      />
    </section>
  );
}
