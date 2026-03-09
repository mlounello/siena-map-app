import { redirect } from 'next/navigation';
import { PublicMapShell } from '@/components/public/public-map-shell';
import { AppShell, Badge, EmptyState, PageHeader, SectionCard, Toolbar } from '@/components/ui/siena';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';

function toneForStatus(status: string): 'neutral' | 'warning' | 'success' | 'danger' {
  if (status === 'published' || status === 'approved') return 'success';
  if (status === 'submitted_for_review' || status === 'unpublished') return 'warning';
  if (status === 'rejected' || status === 'archived') return 'danger';
  return 'neutral';
}

export default async function MapPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole('viewer');
  if (!profile) redirect('/login');

  const { id } = await params;
  const { db } = await createDbClient();

  const { data: map, error: mapError } = await db.from('maps').select('*').eq('id', id).maybeSingle();
  if (mapError || !map) {
    return (
      <AppShell>
        <PageHeader eyebrow="Map Preview" title="Map not found" subtitle="The selected map could not be loaded." />
        <EmptyState title="No preview available" description="This map may have been removed or is no longer accessible." />
      </AppShell>
    );
  }

  const { data: pois } = await db
    .from('pois')
    .select('id, title, description, latitude, longitude, stop_number, status, category_id, pin_color, categories:category_id(id, name, icon, color)')
    .eq('map_id', map.id)
    .neq('status', 'archived')
    .order('stop_number', { ascending: true, nullsFirst: false })
    .order('title', { ascending: true });

  const { data: routeConnections } = await db
    .from('route_connections')
    .select('id, from_poi_id, to_poi_id, order_index, line_color, line_thickness, status')
    .eq('map_id', map.id)
    .neq('status', 'archived')
    .order('order_index', { ascending: true });

  const poiCount = (pois ?? []).length;
  const draftPoiCount = (pois ?? []).filter((poi) => poi.status !== 'published').length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Internal Preview"
        title={map.title}
        subtitle="Preview includes unpublished content to support QA before public launch."
      />

      <SectionCard title="Preview State" subtitle="Current workflow summary for this preview snapshot.">
        <Toolbar>
          <Badge label={`Shell ${map.shell_status.replaceAll('_', ' ')}`} tone={toneForStatus(map.shell_status)} />
          <Badge label={`Publication ${map.publication_status}`} tone={toneForStatus(map.publication_status)} />
          <Badge label={`${poiCount} POIs`} tone="info" />
          <Badge label={`${draftPoiCount} Unpublished POIs`} tone={draftPoiCount > 0 ? 'warning' : 'success'} />
        </Toolbar>
      </SectionCard>

      <PublicMapShell
        displayMode={map.display_mode}
        center={{ lat: map.default_center_lat, lng: map.default_center_lng }}
        zoom={map.default_zoom ?? 16}
        themePreset={map.theme_preset}
        pois={(pois ?? []).map((poi) => ({
          id: poi.id,
          title: poi.title,
          description: poi.description,
          latitude: poi.latitude,
          longitude: poi.longitude,
          stop_number: poi.stop_number,
          category_id: poi.category_id,
          pin_color: poi.pin_color,
          categories: poi.categories,
        }))}
        routeConnections={routeConnections ?? []}
      />
    </AppShell>
  );
}
