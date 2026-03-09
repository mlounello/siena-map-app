'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, Button, PageHeader, Panel, Toolbar } from '@/components/ui/siena';

type MapDetail = {
  id: string;
  slug: string;
  title: string;
  intro_text: string | null;
  visibility: 'public' | 'unlisted' | 'internal_only';
  display_mode: 'explore_only' | 'guided_only' | 'both';
  shell_status: string;
  publication_status: string;
};

export default function MapDetailPage() {
  const params = useParams<{ id: string }>();
  const mapId = params.id;
  const [map, setMap] = useState<MapDetail | null>(null);
  const [message, setMessage] = useState('');

  async function load(id: string) {
    const res = await fetch(`/api/maps/${id}`, { cache: 'no-store' });
    const json = await res.json();
    if (res.ok) setMap(json.map);
    else setMessage(json.error ?? 'Failed to load map');
  }

  useEffect(() => {
    if (mapId) void load(mapId);
  }, [mapId]);

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
      }),
    });

    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? 'Failed to save map');
    setMap(json.map);
    setMessage('Saved map settings.');
  }

  async function runAction(action: 'submit' | 'approve' | 'reject' | 'publish') {
    if (!map) return;
    const body = action === 'publish' ? { status: 'published' } : {};

    const res = await fetch(`/api/maps/${map.id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) return setMessage(json.error ?? `Failed to ${action}`);

    setMessage(`Map ${action} complete.`);
    await load(map.id);
  }

  if (!map) return <p className="siena-subtitle">Loading map…</p>;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Map Builder"
        title={map.title}
        subtitle={`Slug: /${map.slug}`}
        actions={
          <>
            <Link href={`/dashboard/maps/${map.id}/preview`}>
              <Button variant="secondary">Internal Preview</Button>
            </Link>
            <Link href={`/dashboard/maps/${map.id}/pois`}>
              <Button variant="secondary">POI Manager</Button>
            </Link>
            <Link href={`/dashboard/maps/${map.id}/routes`}>
              <Button variant="secondary">Route Editor</Button>
            </Link>
            <Link href={`/dashboard/maps/${map.id}/embed`}>
              <Button variant="secondary">Embed Generator</Button>
            </Link>
            {map.visibility !== 'internal_only' && map.publication_status === 'published' ? (
              <Link href={`/maps/${map.slug}`} target="_blank">
                <Button>Open Public Map</Button>
              </Link>
            ) : null}
          </>
        }
      />

      <Panel title="Workflow State">
        <Toolbar>
          <Badge label={`Shell: ${map.shell_status.replaceAll('_', ' ')}`} tone={map.shell_status === 'approved' ? 'success' : map.shell_status === 'rejected' ? 'danger' : 'warning'} />
          <Badge label={`Publication: ${map.publication_status}`} tone={map.publication_status === 'published' ? 'success' : 'warning'} />
          <Badge label={`Visibility: ${map.visibility.replaceAll('_', ' ')}`} tone="info" />
        </Toolbar>
        {map.publication_status !== 'published' ? (
          <p className="mt-3 text-xs text-black/65">
            Public route stays hidden until publication is set to published. Use Internal Preview to validate map behavior before launch.
          </p>
        ) : null}
      </Panel>

      <Panel title="Map Settings">
        <form onSubmit={saveBasics} className="grid gap-3 md:grid-cols-2">
          <input value={map.title} onChange={(e) => setMap((p) => (p ? { ...p, title: e.target.value } : p))} className="rounded-md border px-3 py-2 text-sm" />
          <input value={map.slug} onChange={(e) => setMap((p) => (p ? { ...p, slug: e.target.value } : p))} className="rounded-md border px-3 py-2 text-sm" />
          <textarea rows={4} value={map.intro_text ?? ''} onChange={(e) => setMap((p) => (p ? { ...p, intro_text: e.target.value } : p))} className="rounded-md border px-3 py-2 text-sm md:col-span-2" />
          <select value={map.visibility} onChange={(e) => setMap((p) => (p ? { ...p, visibility: e.target.value as MapDetail['visibility'] } : p))} className="rounded-md border px-3 py-2 text-sm">
            <option value="internal_only">Internal</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
          <select value={map.display_mode} onChange={(e) => setMap((p) => (p ? { ...p, display_mode: e.target.value as MapDetail['display_mode'] } : p))} className="rounded-md border px-3 py-2 text-sm">
            <option value="both">Both</option>
            <option value="explore_only">Explore only</option>
            <option value="guided_only">Guided only</option>
          </select>
          <Button type="submit" className="md:col-span-2">Save Settings</Button>
        </form>
      </Panel>

      <Panel title="Workflow Actions">
        <Toolbar>
          <Button variant="secondary" onClick={() => runAction('submit')}>Submit</Button>
          <Button variant="secondary" onClick={() => runAction('approve')}>Approve</Button>
          <Button variant="danger" onClick={() => runAction('reject')}>Reject</Button>
          <Button onClick={() => runAction('publish')}>Publish</Button>
        </Toolbar>
      </Panel>

      {message ? <p className="siena-subtitle text-[var(--brand)]">{message}</p> : null}
    </section>
  );
}
