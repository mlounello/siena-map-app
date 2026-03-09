'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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
    if (!res.ok) {
      setMessage(json.error ?? 'Failed to save map');
      return;
    }

    setMap(json.map);
    setMessage('Saved.');
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

    if (!res.ok) {
      setMessage(json.error ?? `Failed to ${action}`);
      return;
    }

    setMap(json.map ?? map);
    setMessage(`Map ${action} complete.`);
    await load(map.id);
  }

  if (!map) {
    return <p className="text-sm text-black/70">Loading map…</p>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--brand)]">Map: {map.title}</h1>
        <Link href={`/dashboard/maps/${map.id}/pois`} className="rounded-md border border-black/15 px-3 py-2 text-sm hover:bg-white">
          Open POI Manager
        </Link>
      </div>

      <form onSubmit={saveBasics} className="grid gap-3 rounded-xl border border-black/10 bg-white p-4 md:grid-cols-2">
        <input
          className="rounded-md border border-black/15 px-3 py-2 text-sm"
          value={map.title}
          onChange={(e) => setMap((p) => (p ? { ...p, title: e.target.value } : p))}
        />
        <input
          className="rounded-md border border-black/15 px-3 py-2 text-sm"
          value={map.slug}
          onChange={(e) => setMap((p) => (p ? { ...p, slug: e.target.value } : p))}
        />
        <textarea
          className="rounded-md border border-black/15 px-3 py-2 text-sm md:col-span-2"
          rows={4}
          value={map.intro_text ?? ''}
          onChange={(e) => setMap((p) => (p ? { ...p, intro_text: e.target.value } : p))}
        />
        <select
          className="rounded-md border border-black/15 px-3 py-2 text-sm"
          value={map.visibility}
          onChange={(e) => setMap((p) => (p ? { ...p, visibility: e.target.value as MapDetail['visibility'] } : p))}
        >
          <option value="internal_only">Internal</option>
          <option value="unlisted">Unlisted</option>
          <option value="public">Public</option>
        </select>
        <select
          className="rounded-md border border-black/15 px-3 py-2 text-sm"
          value={map.display_mode}
          onChange={(e) =>
            setMap((p) => (p ? { ...p, display_mode: e.target.value as MapDetail['display_mode'] } : p))
          }
        >
          <option value="both">Both</option>
          <option value="explore_only">Explore only</option>
          <option value="guided_only">Guided only</option>
        </select>
        <button className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white md:col-span-2" type="submit">
          Save Map
        </button>
      </form>

      <div className="rounded-xl border border-black/10 bg-white p-4">
        <p className="text-sm text-black/70">
          Shell: <strong>{map.shell_status}</strong> | Publish: <strong>{map.publication_status}</strong>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => runAction('submit')} className="rounded-md border border-black/15 px-3 py-2 text-sm">Submit</button>
          <button onClick={() => runAction('approve')} className="rounded-md border border-black/15 px-3 py-2 text-sm">Approve</button>
          <button onClick={() => runAction('reject')} className="rounded-md border border-black/15 px-3 py-2 text-sm">Reject</button>
          <button onClick={() => runAction('publish')} className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm text-white">Publish</button>
        </div>
      </div>

      {message ? <p className="text-sm text-[var(--brand)]">{message}</p> : null}
    </section>
  );
}
