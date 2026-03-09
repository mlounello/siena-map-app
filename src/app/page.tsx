import Link from 'next/link';
import { Compass, MapPinned } from 'lucide-react';
import { Button, PageHeader, Panel } from '@/components/ui';

export default function HomePage() {
  return (
    <section className="mx-auto max-w-4xl space-y-7">
      <PageHeader
        eyebrow="Siena University"
        title="Siena Maps Platform"
        subtitle="Create, govern, and publish Siena-branded interactive maps for internal and public experiences."
      />

      <Panel title="Get Started" subtitle="Choose your internal workspace or browse public map experiences.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard" className="group rounded-xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--heading)]">
              <MapPinned className="h-4 w-4 text-[var(--brand)]" />
              Open Dashboard
            </p>
            <p className="mt-1 text-sm text-black/70">Manage maps, approvals, and map publishing workflows.</p>
          </Link>
          <Link href="/maps" className="group rounded-xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--heading)]">
              <Compass className="h-4 w-4 text-[var(--accent-blue)]" />
              Browse Public Maps
            </p>
            <p className="mt-1 text-sm text-black/70">View published maps and guided experiences.</p>
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard">
            <Button>Open Dashboard</Button>
          </Link>
          <Link href="/maps">
            <Button variant="secondary">Browse Public Maps</Button>
          </Link>
        </div>
      </Panel>
    </section>
  );
}
