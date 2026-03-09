import Link from 'next/link';
import { Button, PageHeader, Panel } from '@/components/ui';

export default function HomePage() {
  return (
    <section className="space-y-7">
      <PageHeader
        eyebrow="Siena University"
        title="Siena Maps Platform"
        subtitle="Branded internal map publishing platform for departments, approvals, and polished public experiences."
      />

      <Panel title="Workspace Entrypoints" subtitle="Start from internal governance or public discovery.">
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard">
            <Button>Open Dashboard</Button>
          </Link>
          <Link href="/maps">
            <Button variant="secondary">Open Public Directory</Button>
          </Link>
        </div>
      </Panel>
    </section>
  );
}
