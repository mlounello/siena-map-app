import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="space-y-5">
      <h1 className="text-4xl font-semibold tracking-tight text-[var(--brand)]">Siena Maps</h1>
      <p className="max-w-2xl text-base leading-relaxed text-black/80">
        Internal and public MVP surfaces are live: maps console, POI manager, review queue,
        department/user admin screens, and public directory/map pages.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white">
          Open Dashboard
        </Link>
        <Link href="/maps" className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm font-medium">
          Open Public Directory
        </Link>
      </div>
    </section>
  );
}
