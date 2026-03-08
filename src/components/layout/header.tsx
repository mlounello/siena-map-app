import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-black/10 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-[var(--brand)]">
          Siena Maps Platform
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <Link href="/api/maps" className="hover:underline">
            Maps API
          </Link>
          <Link href="/api/review-queue" className="hover:underline">
            Review Queue API
          </Link>
        </nav>
      </div>
    </header>
  );
}
