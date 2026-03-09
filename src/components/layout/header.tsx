import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-[var(--brand-dark)]/45 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-block rounded bg-[var(--brand-yellow)] px-2 py-1 text-xs font-semibold tracking-[0.18em] text-[#1a1a1a]">
            SIENA
          </span>
          <span className="text-lg tracking-[0.08em]">MAPS PLATFORM</span>
        </Link>
        <nav className="flex items-center gap-4 text-xs font-semibold tracking-[0.12em]">
          <Link href="/maps" className="rounded px-2 py-1 hover:bg-white/10">
            Public Maps
          </Link>
          <Link href="/dashboard" className="rounded px-2 py-1 hover:bg-white/10">
            Dashboard
          </Link>
          <Link href="/api/maps" className="rounded px-2 py-1 hover:bg-white/10">
            Maps API
          </Link>
          <Link href="/api/review-queue" className="rounded px-2 py-1 hover:bg-white/10">
            Review Queue API
          </Link>
        </nav>
      </div>
    </header>
  );
}
