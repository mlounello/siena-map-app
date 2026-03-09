'use client';

import { useEffect, useState } from 'react';
import {
  AppShell,
  Badge,
  Button,
  EmptyState,
  PageHeader,
  SectionCard,
  StatusMessage,
} from '@/components/ui/siena';
import { FormField, TextInput } from '@/components/ui/form-controls';

type QueueMap = { id: string; title: string; shell_status: string; publication_status: string };
type QueuePoi = { id: string; map_id: string; title: string; status: string; stop_number: number | null };

export default function ReviewQueuePage() {
  const [departmentId, setDepartmentId] = useState('');
  const [maps, setMaps] = useState<QueueMap[]>([]);
  const [pois, setPois] = useState<QueuePoi[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const mapTitleById = new Map(maps.map((m) => [m.id, m.title]));

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (departmentId) qs.set('departmentId', departmentId);

    const res = await fetch(`/api/review-queue?${qs.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? 'Failed to load queue');
      setLoading(false);
      return;
    }

    setMaps(json.queue?.maps ?? []);
    setPois(json.queue?.pois ?? []);
    setLoading(false);
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
    <AppShell>
      <PageHeader
        eyebrow="Moderation"
        title="Review Queue"
        subtitle="Review submitted maps and POIs based on role scope and department ownership."
      />

      <SectionCard title="Queue Filters" subtitle="Limit moderation results to a single department when needed.">
        <div className="form-row md:grid-cols-[minmax(0,420px)_auto] md:items-end">
          <FormField label="Department UUID (optional)">
            <TextInput
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              placeholder="Filter by department"
            />
          </FormField>
          <div className="action-bar">
            <Button variant="secondary" onClick={() => setDepartmentId('')}>Clear Filter</Button>
          </div>
        </div>
      </SectionCard>

      {message ? <StatusMessage>{message}</StatusMessage> : null}
      {loading ? <StatusMessage>Loading queue…</StatusMessage> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Map Reviews" subtitle={`${maps.length} item(s) awaiting action.`}>
          <div className="space-y-3">
            {!loading && maps.length === 0 ? (
              <EmptyState title="No map reviews" description="Submitted and rejected map shells will appear here." />
            ) : (
              maps.map((item) => (
                <article key={item.id} className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-subtle)] p-3.5">
                  <p className="row-title">{item.title}</p>
                  <div className="mt-2 toolbar">
                    <Badge
                      label={item.shell_status.replaceAll('_', ' ')}
                      tone={item.shell_status === 'rejected' ? 'danger' : 'warning'}
                    />
                    <Badge
                      label={item.publication_status}
                      tone={item.publication_status === 'published' ? 'success' : 'neutral'}
                    />
                  </div>
                  <div className="mt-3 action-bar">
                    <Button variant="secondary" onClick={() => mapAction(item.id, 'approve')}>Approve</Button>
                    <Button variant="danger" onClick={() => mapAction(item.id, 'reject')}>Reject</Button>
                  </div>
                </article>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="POI Reviews" subtitle={`${pois.length} item(s) awaiting action.`}>
          <div className="space-y-3">
            {!loading && pois.length === 0 ? (
              <EmptyState title="No POI reviews" description="Submitted and rejected POIs will appear here." />
            ) : (
              pois.map((item) => (
                <article key={item.id} className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-subtle)] p-3.5">
                  <p className="row-title">
                    {item.stop_number ? `${item.stop_number}. ` : ''}
                    {item.title}
                  </p>
                  <p className="row-meta">Map {mapTitleById.get(item.map_id) ?? 'Associated map'}</p>
                  <div className="mt-2 toolbar">
                    <Badge label={item.status.replaceAll('_', ' ')} tone={item.status === 'rejected' ? 'danger' : 'warning'} />
                  </div>
                  <div className="mt-3 action-bar">
                    <Button variant="secondary" onClick={() => poiAction(item.id, 'approve')}>Approve</Button>
                    <Button variant="danger" onClick={() => poiAction(item.id, 'reject')}>Reject</Button>
                  </div>
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
