'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ClipboardList, MapPinned, Milestone, RefreshCw } from 'lucide-react';
import {
  AppShell,
  Badge,
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  SectionCard,
  StatusMessage,
} from '@/components/ui/siena';
import { FormField, TextInput } from '@/components/ui/form-controls';
import { LoadingRows } from '@/components/ui/loading';

type QueueMap = { id: string; title: string; shell_status: string; publication_status: string };
type QueuePoi = { id: string; map_id: string; title: string; status: string; stop_number: number | null };

export default function ReviewQueuePage() {
  const [departmentId, setDepartmentId] = useState('');
  const [maps, setMaps] = useState<QueueMap[]>([]);
  const [pois, setPois] = useState<QueuePoi[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const mapTitleById = new Map(maps.map((m) => [m.id, m.title]));

  const queueCounts = useMemo(
    () => ({
      maps: maps.length,
      pois: pois.length,
      total: maps.length + pois.length,
      rejected:
        maps.filter((m) => m.shell_status === 'rejected').length +
        pois.filter((p) => p.status === 'rejected').length,
    }),
    [maps, pois]
  );

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
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {message ? <StatusMessage>{message}</StatusMessage> : null}

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1.5fr]">
        <SectionCard title="Queue Filters" subtitle="Limit moderation results to a single department.">
          <div className="form-row md:grid-cols-[minmax(0,420px)_auto] md:items-end">
            <FormField label="Department UUID (optional)">
              <TextInput
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                placeholder="Filter by department"
              />
            </FormField>
            <div className="action-bar">
              <Button variant="secondary" onClick={() => setDepartmentId('')}>
                Clear Filter
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Queue Snapshot" subtitle="Current moderation queue by item type.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="surface-stat">
              <ClipboardList className="mb-1.5 h-4 w-4 text-[var(--brand)]" />
              <p className="row-meta">Total in queue</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--heading)]">{queueCounts.total}</p>
            </div>
            <div className="surface-stat">
              <MapPinned className="mb-1.5 h-4 w-4 text-[var(--accent-blue)]" />
              <p className="row-meta">Map items</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--heading)]">{queueCounts.maps}</p>
            </div>
            <div className="surface-stat">
              <Milestone className="mb-1.5 h-4 w-4 text-[var(--brand-dark)]" />
              <p className="row-meta">POI items</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--heading)]">{queueCounts.pois}</p>
            </div>
            <div className="surface-stat">
              <AlertCircle className="mb-1.5 h-4 w-4 text-[var(--accent-red)]" />
              <p className="row-meta">Rejected</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--heading)]">{queueCounts.rejected}</p>
            </div>
          </div>
        </SectionCard>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Map Reviews" subtitle={`${maps.length} item(s) awaiting action.`}>
          {loading ? (
            <LoadingRows rows={6} />
          ) : maps.length === 0 ? (
            <EmptyState title="No map reviews" description="Submitted and rejected map shells will appear here." />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Map</th>
                  <th>Workflow</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {maps.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p className="row-title">{item.title}</p>
                      <p className="row-meta">Map shell review</p>
                    </td>
                    <td>
                      <div className="toolbar">
                        <Badge
                          label={item.shell_status.replaceAll('_', ' ')}
                          tone={item.shell_status === 'rejected' ? 'danger' : 'warning'}
                        />
                        <Badge
                          label={item.publication_status}
                          tone={item.publication_status === 'published' ? 'success' : 'neutral'}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="action-bar">
                        <Button variant="secondary" onClick={() => mapAction(item.id, 'approve')}>
                          Approve
                        </Button>
                        <Button variant="danger" onClick={() => mapAction(item.id, 'reject')}>
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </SectionCard>

        <SectionCard title="POI Reviews" subtitle={`${pois.length} item(s) awaiting action.`}>
          {loading ? (
            <LoadingRows rows={6} />
          ) : pois.length === 0 ? (
            <EmptyState title="No POI reviews" description="Submitted and rejected POIs will appear here." />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>POI</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pois.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p className="row-title">
                        {item.stop_number ? `${item.stop_number}. ` : ''}
                        {item.title}
                      </p>
                      <p className="row-meta">Map: {mapTitleById.get(item.map_id) ?? 'Associated map'}</p>
                    </td>
                    <td>
                      <Badge
                        label={item.status.replaceAll('_', ' ')}
                        tone={item.status === 'rejected' ? 'danger' : 'warning'}
                      />
                    </td>
                    <td>
                      <div className="action-bar">
                        <Button variant="secondary" onClick={() => poiAction(item.id, 'approve')}>
                          Approve
                        </Button>
                        <Button variant="danger" onClick={() => poiAction(item.id, 'reject')}>
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
