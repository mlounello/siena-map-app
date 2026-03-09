import Link from 'next/link';
import { Button, PageHeader, Panel } from '@/components/ui';

export default function HomePage() {
  return (
    <section className="space-y-7">
      <PageHeader
        eyebrow="Siena University"
        title="Siena Maps Platform"
        subtitle="Create, govern, and publish Siena-branded interactive maps for internal and public experiences."
      />

      <Panel title="Get Started" subtitle="Choose your internal workspace or browse public map experiences.">
        <div className="flex flex-wrap gap-3">
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
