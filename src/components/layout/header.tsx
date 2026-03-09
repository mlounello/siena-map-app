'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function navClass(pathname: string, href: string) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return active
    ? 'rounded-lg bg-white/22 px-3 py-1.5 text-white'
    : 'rounded-lg px-3 py-1.5 text-white/90 hover:bg-white/12 hover:text-white';
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--brand-dark)]/45 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] text-white shadow-md backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-block rounded-md bg-[var(--brand-yellow)] px-2 py-1 text-[11px] font-bold tracking-[0.16em] text-[#1a1a1a]">
            SIENA
          </span>
          <span className="headline-primary text-base tracking-[0.08em]">Maps Platform</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-xs font-semibold tracking-[0.1em]">
          <Link href="/dashboard" className={navClass(pathname, '/dashboard')}>
            Dashboard
          </Link>
          <Link href="/dashboard/maps" className={navClass(pathname, '/dashboard/maps')}>
            Maps Console
          </Link>
          <Link href="/dashboard/review-queue" className={navClass(pathname, '/dashboard/review-queue')}>
            Review Queue
          </Link>
          <Link href="/maps" className={navClass(pathname, '/maps')}>
            Public Directory
          </Link>
        </nav>
      </div>
    </header>
  );
}
