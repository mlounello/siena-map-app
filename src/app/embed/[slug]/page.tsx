import { notFound } from 'next/navigation';
import { PublicMapShell } from '@/components/public/public-map-shell';
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

  const { data: map, error } = await db
    .from('maps')
    .select('*')
    .eq('slug', slug)
    .eq('publication_status', 'published')
    .in('visibility', ['public', 'unlisted'])
    .maybeSingle();

  if (error || !map) notFound();

  const { data: pois } = await db
    .from('pois')
    .select('id, title, description, latitude, longitude, stop_number, category_id, pin_color, categories:category_id(id, name, icon, color)')
    .eq('map_id', map.id)
    .eq('status', 'published')
    .order('stop_number', { ascending: true, nullsFirst: false })
    .order('title', { ascending: true });

  const mode = (typeof qs.mode === 'string' ? qs.mode : map.display_mode) as
    | 'explore_only'
    | 'guided_only'
    | 'both';

  return (
    <main className="p-0">
      <PublicMapShell
        displayMode={mode}
        center={{ lat: map.default_center_lat, lng: map.default_center_lng }}
        zoom={map.default_zoom ?? 16}
        themePreset={map.theme_preset}
        pois={pois ?? []}
      />
    </main>
  );
}
