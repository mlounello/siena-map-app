import { notFound } from 'next/navigation';
import { PublicMapShell } from '@/components/public/public-map-shell';
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

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--brand)]">{map.title}</h1>
        {map.intro_text ? <p className="mt-2 max-w-3xl text-sm text-black/75">{map.intro_text}</p> : null}
      </header>

      <PublicMapShell displayMode={map.display_mode} pois={pois ?? []} />
    </section>
  );
}
