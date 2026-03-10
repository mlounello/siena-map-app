'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ActionBar,
  AppShell,
  Badge,
  Button,
  PageHeader,
  SectionCard,
  StatusMessage,
  Toolbar,
} from '@/components/ui/siena';
import { FormField, SelectInput, TextArea, TextInput } from '@/components/ui/form-controls';
import { LoadingInline } from '@/components/ui/loading';
import { MAP_TILE_PRESETS } from '@/lib/map/base-layers';

type MapDetail = {
  id: string;
  slug: string;
  title: string;
  intro_text: string | null;
  visibility: 'public' | 'unlisted' | 'internal_only';
  display_mode: 'explore_only' | 'guided_only' | 'both';
  route_mode: 'walking' | 'driving';
  default_center_lat: number | null;
  default_center_lng: number | null;
  default_zoom: number;
  require_anchors_for_publish: boolean;
  theme_preset: string | null;
  shell_status: string;
  publication_status: string;
};

type PlatformRole = 'owner' | 'super_admin' | 'department_head' | 'editor' | 'viewer';

type PublishBlocker = {
  poi_id: string;
  title: string;
  stop_number: number;
  reason: string;
};

type PublishBlockSummary = {
  totalStops: number;
  anchoredStops: number;
  unanchoredStops: number;
  blockerCount: number;
};

export default function MapDetailPage() {
  const params = useParams<{ id: string }>();
  const mapId = params.id;
  const [map, setMap] = useState<MapDetail | null>(null);
  const [message, setMessage] = useState('');
  const [role, setRole] = useState<PlatformRole | null>(null);
  const [publishBlockers, setPublishBlockers] = useState<PublishBlocker[]>([]);
  const [publishBlockSummary, setPublishBlockSummary] = useState<PublishBlockSummary | null>(null);

  function hasMinRole(required: PlatformRole) {
    if (!role) return false;
    const rank: Record<PlatformRole, number> = {
      viewer: 10,
      editor: 20,
      department_head: 30,
      super_admin: 40,
      owner: 50,
    };
    return rank[role] >= rank[required];
  }

  async function load(id: string) {
    const res = await fetch(`/api/maps/${id}`, { cache: 'no-store' });
    const json = await res.json();
    if (res.ok) setMap(json.map);
    else setMessage(json.error ?? 'Failed to load map');
  }

  useEffect(() => {
    if (mapId) void load(mapId);
  }, [mapId]);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/auth/check', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setRole((json?.profile?.role as PlatformRole | undefined) ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setRole(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveBasics(e: React.FormEvent) {
    e.preventDefault();
    if (!map) return;

    const res = await fetch(`/api/maps/${map.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: map.title,
        slug: map.slug,
        intro_text: map.intro_text,
        visibility: map.visibility,
        display_mode: map.display_mode,
        route_mode: map.route_mode,
        default_center_lat: map.default_center_lat,
        default_center_lng: map.default_center_lng,
        default_zoom: map.default_zoom,
        require_anchors_for_publish: map.require_anchors_for_publish,
        theme_preset: map.theme_preset,
      }),
    });

    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to save map');
    setMap(json.map);
    setMessage('Map settings saved.');
  }

  async function runAction(action: 'submit' | 'approve' | 'reject' | 'publish' | 'archive') {
    if (!map) return;
    setPublishBlockers([]);
    setPublishBlockSummary(null);

    const endpoint = action === 'archive' ? 'publish' : action;
    const body = action === 'publish' ? { status: 'published' } : action === 'archive' ? { status: 'archived' } : {};

    const res = await fetch(`/api/maps/${map.id}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) {
      if (action === 'publish' && json.code === 'anchor_publish_validation_failed') {
        setPublishBlockers(Array.isArray(json.blockers) ? json.blockers : []);
        setPublishBlockSummary(json.summary ?? null);
      }
      return setMessage(json.error ?? `Failed to ${action}`);
    }

    setMessage(`Map ${action} complete.`);
    await load(map.id);
  }

  if (!map) return <LoadingInline>Loading map workspace…</LoadingInline>;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Map Workspace"
        title={map.title}
        subtitle={`/${map.slug}`}
        actions={
          <>
            <Link href={`/dashboard/maps/${map.id}/preview`}>
              <Button variant="secondary">Internal Preview</Button>
            </Link>
            {map.visibility !== 'internal_only' && map.publication_status === 'published' ? (
              <Link href={`/maps/${map.slug}`} target="_blank">
                <Button>Open Public Map</Button>
              </Link>
            ) : null}
          </>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <SectionCard title="Builder Areas" subtitle="Navigate between POIs, route connections, and embeds.">
          <ActionBar>
            <Link href={`/dashboard/maps/${map.id}/pois`}>
              <Button variant="secondary">POI Manager</Button>
            </Link>
            <Link href={`/dashboard/maps/${map.id}/routes`}>
              <Button variant="secondary">Route Editor</Button>
            </Link>
            <Link href={`/dashboard/maps/${map.id}/embed`}>
              <Button variant="secondary">Embed Generator</Button>
            </Link>
          </ActionBar>
        </SectionCard>

        <SectionCard title="Workflow State" subtitle="Shell approval and publication are intentionally separate.">
          <Toolbar>
            <Badge
              label={`Shell ${map.shell_status.replaceAll('_', ' ')}`}
              tone={map.shell_status === 'approved' ? 'success' : map.shell_status === 'rejected' ? 'danger' : 'warning'}
            />
            <Badge
              label={`Publication ${map.publication_status}`}
              tone={map.publication_status === 'published' ? 'success' : 'warning'}
            />
            <Badge label={`Visibility ${map.visibility.replaceAll('_', ' ')}`} tone="info" />
          </Toolbar>
          {map.publication_status !== 'published' ? (
            <p className="row-meta mt-3">
              Public routes remain hidden until publication is set to published. Use Internal Preview for pre-launch QA.
            </p>
          ) : null}
        </SectionCard>
      </section>

      <SectionCard title="Map Settings" subtitle="Core metadata and display behavior for this map.">
        <form onSubmit={saveBasics} className="form-grid">
          <div className="form-row md:grid-cols-2">
            <FormField label="Map title">
              <TextInput value={map.title} onChange={(e) => setMap((p) => (p ? { ...p, title: e.target.value } : p))} />
            </FormField>
            <FormField label="Slug">
              <TextInput value={map.slug} onChange={(e) => setMap((p) => (p ? { ...p, slug: e.target.value } : p))} />
            </FormField>
          </div>

          <div className="form-row md:grid-cols-4">
            <FormField label="Default center latitude">
              <TextInput
                value={map.default_center_lat ?? ''}
                onChange={(e) =>
                  setMap((p) =>
                    p
                      ? { ...p, default_center_lat: e.target.value === '' ? null : Number(e.target.value) }
                      : p
                  )
                }
              />
            </FormField>
            <FormField label="Default center longitude">
              <TextInput
                value={map.default_center_lng ?? ''}
                onChange={(e) =>
                  setMap((p) =>
                    p
                      ? { ...p, default_center_lng: e.target.value === '' ? null : Number(e.target.value) }
                      : p
                  )
                }
              />
            </FormField>
            <FormField label="Default zoom">
              <TextInput
                value={map.default_zoom}
                onChange={(e) => setMap((p) => (p ? { ...p, default_zoom: Number(e.target.value) || 16 } : p))}
              />
            </FormField>
            <FormField label="Map style">
              <SelectInput
                value={map.theme_preset ?? 'MapStyle.STREETS'}
                onChange={(e) => setMap((p) => (p ? { ...p, theme_preset: e.target.value } : p))}
              >
                {MAP_TILE_PRESETS.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>

          <FormField label="Intro text">
            <TextArea
              rows={4}
              value={map.intro_text ?? ''}
              onChange={(e) => setMap((p) => (p ? { ...p, intro_text: e.target.value } : p))}
            />
          </FormField>

          <div className="form-row md:grid-cols-4">
            <FormField label="Visibility">
              <SelectInput
                value={map.visibility}
                onChange={(e) => setMap((p) => (p ? { ...p, visibility: e.target.value as MapDetail['visibility'] } : p))}
              >
                <option value="internal_only">Internal only</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </SelectInput>
            </FormField>
            <FormField label="Display mode">
              <SelectInput
                value={map.display_mode}
                onChange={(e) => setMap((p) => (p ? { ...p, display_mode: e.target.value as MapDetail['display_mode'] } : p))}
              >
                <option value="both">Both</option>
                <option value="explore_only">Explore only</option>
                <option value="guided_only">Guided only</option>
              </SelectInput>
            </FormField>
            <FormField label="Route mode">
              <SelectInput
                value={map.route_mode ?? 'walking'}
                onChange={(e) => setMap((p) => (p ? { ...p, route_mode: e.target.value as MapDetail['route_mode'] } : p))}
              >
                <option value="walking">Walking</option>
                <option value="driving">Driving</option>
              </SelectInput>
            </FormField>
            {hasMinRole('department_head') ? (
              <FormField
                label="Require anchors for publish"
                hint="When enabled, publishing is blocked only for guided-route stops that break anchored route continuity."
              >
                <SelectInput
                  value={map.require_anchors_for_publish ? 'true' : 'false'}
                  onChange={(e) =>
                    setMap((p) =>
                      p
                        ? { ...p, require_anchors_for_publish: e.target.value === 'true' }
                        : p
                    )
                  }
                >
                  <option value="false">Disabled</option>
                  <option value="true">Enabled</option>
                </SelectInput>
              </FormField>
            ) : null}
          </div>

          <ActionBar>
            <Button type="submit">Save Settings</Button>
          </ActionBar>
        </form>
      </SectionCard>

      <SectionCard title="Workflow Actions" subtitle="Execute moderation and publication actions.">
        <ActionBar>
          {hasMinRole('department_head') ? (
            <Button variant="secondary" onClick={() => runAction('submit')}>Submit</Button>
          ) : null}
          {hasMinRole('super_admin') ? (
            <Button variant="secondary" onClick={() => runAction('approve')}>Approve</Button>
          ) : null}
          {hasMinRole('super_admin') ? (
            <Button variant="danger" onClick={() => runAction('reject')}>Reject</Button>
          ) : null}
          {hasMinRole('department_head') ? (
            <Button onClick={() => runAction('publish')}>Publish</Button>
          ) : null}
          {hasMinRole('department_head') ? (
            <Button variant="danger" onClick={() => runAction('archive')}>Archive</Button>
          ) : null}
        </ActionBar>
      </SectionCard>

      {message ? <StatusMessage>{message}</StatusMessage> : null}

      {publishBlockers.length > 0 ? (
        <SectionCard
          title="Publish Blockers"
          subtitle="Anchor coverage is required for publish where guided-route continuity cannot be maintained."
          actions={
            <ActionBar>
              <Link href={`/dashboard/maps/${map.id}/routes`}>
                <Button variant="secondary">Open Route Editor</Button>
              </Link>
              <Link href={`/dashboard/maps/${map.id}/pois`}>
                <Button variant="secondary">Open POI Manager</Button>
              </Link>
            </ActionBar>
          }
        >
          {publishBlockSummary ? (
            <p className="row-meta">
              Stops: {publishBlockSummary.totalStops} | Anchored: {publishBlockSummary.anchoredStops} | Unanchored:{' '}
              {publishBlockSummary.unanchoredStops} | Blocking: {publishBlockSummary.blockerCount}
            </p>
          ) : null}
          <div className="mt-3 space-y-2">
            {publishBlockers.map((blocker) => (
              <div
                key={`${blocker.poi_id}-${blocker.stop_number}`}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2"
              >
                <p className="row-title">
                  Stop {blocker.stop_number}: {blocker.title}
                </p>
                <p className="row-meta">{blocker.reason}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </AppShell>
  );
}
