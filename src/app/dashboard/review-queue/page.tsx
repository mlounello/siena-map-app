'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, PageHeader, Panel } from '@/components/ui/siena';

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
    if (!res.ok) return setMessage(json.error ?? 'Failed to load queue');

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
    if (!res.ok) return setMessage(json.error ?? `Failed to ${action} map`);
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
    if (!res.ok) return setMessage(json.error ?? `Failed to ${action} POI`);
    setMessage(`POI ${action} complete.`);
    await load();
  }

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Moderation" title="Review Queue" subtitle="Action submitted items by role scope and department." />

      <Panel title="Filters">
        <label className="siena-subtitle">Department UUID (optional)</label>
        <input
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          placeholder="Filter by department"
          className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
        />
      </Panel>

      {message ? <p className="siena-subtitle text-[var(--brand)]">{message}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Map Reviews">
          <div className="mt-3 space-y-2">
            {maps.map((item) => (
              <div key={item.id} className="rounded-lg border border-black/10 bg-white p-3 text-sm">
                <p className="font-semibold text-[var(--brand-dark)]">{item.title}</p>
                <div className="mt-1 flex gap-2">
                  <Badge label={item.shell_status.replaceAll('_', ' ')} tone={item.shell_status === 'rejected' ? 'danger' : 'warning'} />
                  <Badge label={item.publication_status} tone={item.publication_status === 'published' ? 'success' : 'neutral'} />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => mapAction(item.id, 'approve')}>Approve</Button>
                  <Button variant="danger" onClick={() => mapAction(item.id, 'reject')}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="POI Reviews">
          <div className="mt-3 space-y-2">
            {pois.map((item) => (
              <div key={item.id} className="rounded-lg border border-black/10 bg-white p-3 text-sm">
                <p className="font-semibold text-[var(--brand-dark)]">{item.stop_number ? `${item.stop_number}. ` : ''}{item.title}</p>
                <div className="mt-1"><Badge label={item.status.replaceAll('_', ' ')} tone={item.status === 'rejected' ? 'danger' : 'warning'} /></div>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => poiAction(item.id, 'approve')}>Approve</Button>
                  <Button variant="danger" onClick={() => poiAction(item.id, 'reject')}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}
