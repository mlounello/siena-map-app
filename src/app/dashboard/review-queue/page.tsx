'use client';

import { useEffect, useState } from 'react';

type QueueMap = { id: string; title: string; shell_status: string; publication_status: string };
type QueuePoi = { id: string; map_id: string; title: string; status: string; stop_number: number | null };

export default function ReviewQueuePage() {
  const [departmentId, setDepartmentId] = useState('');
  const [maps, setMaps] = useState<QueueMap[]>([]);
  const [pois, setPois] = useState<QueuePoi[]>([]);
  const [message, setMessage] = useState('');

  async function load() {
    const qs = new URLSearchParams();
    if (departmentId) qs.set('departmentId', departmentId);

    const res = await fetch(`/api/review-queue?${qs.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? 'Failed to load queue');
      return;
    }

    setMaps(json.queue?.maps ?? []);
    setPois(json.queue?.pois ?? []);
  }

  useEffect(() => {
    void load();
  }, [departmentId]);

  async function mapAction(id: string, action: 'approve' | 'reject') {
    const res = await fetch(`/api/maps/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action === 'reject' ? { note: 'Rejected from queue' } : {}),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? `Failed to ${action} map`);
      return;
    }
    setMessage(`Map ${action} complete.`);
    await load();
  }

  async function poiAction(id: string, action: 'approve' | 'reject') {
    const res = await fetch(`/api/pois/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action === 'reject' ? { note: 'Rejected from queue' } : {}),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? `Failed to ${action} POI`);
      return;
    }
    setMessage(`POI ${action} complete.`);
    await load();
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--brand)]">Review Queue</h1>

      <div className="rounded-xl border border-black/10 bg-white p-4">
        <label className="text-sm text-black/70">Filter by department UUID</label>
        <input
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          placeholder="Optional department id"
          className="mt-2 w-full rounded-md border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      {message ? <p className="text-sm text-[var(--brand)]">{message}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h2 className="font-semibold">Maps</h2>
          <div className="mt-3 space-y-2">
            {maps.map((item) => (
              <div key={item.id} className="rounded-lg border border-black/10 p-3 text-sm">
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-black/60">{item.shell_status} / {item.publication_status}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => mapAction(item.id, 'approve')} className="rounded border border-black/15 px-2 py-1 text-xs">Approve</button>
                  <button onClick={() => mapAction(item.id, 'reject')} className="rounded border border-black/15 px-2 py-1 text-xs">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h2 className="font-semibold">POIs</h2>
          <div className="mt-3 space-y-2">
            {pois.map((item) => (
              <div key={item.id} className="rounded-lg border border-black/10 p-3 text-sm">
                <p className="font-medium">{item.stop_number ? `${item.stop_number}. ` : ''}{item.title}</p>
                <p className="text-xs text-black/60">{item.status}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => poiAction(item.id, 'approve')} className="rounded border border-black/15 px-2 py-1 text-xs">Approve</button>
                  <button onClick={() => poiAction(item.id, 'reject')} className="rounded border border-black/15 px-2 py-1 text-xs">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
