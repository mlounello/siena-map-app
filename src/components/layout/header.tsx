'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

function navClass(pathname: string, href: string) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return active
    ? 'rounded-md bg-white/18 px-3 py-1.5 text-white'
    : 'rounded-md px-3 py-1.5 text-white/90 hover:bg-white/10 hover:text-white';
}

type HeaderUser = {
  email?: string | null;
  profile?: {
    display_name?: string | null;
    email?: string | null;
  } | null;
};

function initialsFromUser(user: HeaderUser | null) {
  const raw =
    user?.profile?.display_name ||
    user?.profile?.email ||
    user?.email ||
    'SI';
  const parts = raw
    .split('@')[0]
    .split(/[\s._-]+/)
    .filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');
  return initials || 'SI';
}

export function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<HeaderUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/auth/check', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !json?.authenticated) return;
        setUser({ email: json.user?.email, profile: json.profile ?? null });
      })
      .catch(() => {
        // Keep header resilient on unauthenticated/public routes.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const accountLabel = useMemo(() => {
    return user?.profile?.display_name || user?.email || 'Guest';
  }, [user]);

  const initials = useMemo(() => initialsFromUser(user), [user]);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--brand-dark)]/50 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] text-white shadow-md backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-block rounded-sm bg-[var(--brand-yellow)] px-2 py-1 text-[10px] font-bold tracking-[0.16em] text-[#1a1a1a]">
            SIENA
          </span>
          <span className="leading-tight">
            <span className="block headline-primary text-sm tracking-[0.08em]">Siena Maps</span>
            <span className="block text-[10px] tracking-[0.14em] text-white/80">Publishing Platform</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-xs font-semibold tracking-[0.08em] md:flex">
          <Link href="/dashboard" className={navClass(pathname, '/dashboard')}>
            Dashboard
          </Link>
          <Link href="/dashboard/maps" className={navClass(pathname, '/dashboard/maps')}>
            Maps
          </Link>
          <Link href="/dashboard/review-queue" className={navClass(pathname, '/dashboard/review-queue')}>
            Approvals
          </Link>
          <Link href="/maps" className={navClass(pathname, '/maps')}>
            Public
          </Link>
        </nav>

        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2 py-1">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-yellow)] text-xs font-bold tracking-[0.08em] text-[var(--brand-dark)]">
            {initials}
          </span>
          <div className="hidden pr-1 text-right sm:block">
            <p className="max-w-[180px] truncate text-xs font-semibold">{accountLabel}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/75">
              {user ? 'Authenticated' : 'Public'}
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 pb-2 md:hidden">
        <Link href="/dashboard" className={navClass(pathname, '/dashboard')}>
          Dashboard
        </Link>
        <Link href="/dashboard/maps" className={navClass(pathname, '/dashboard/maps')}>
          Maps
        </Link>
        <Link href="/maps" className={navClass(pathname, '/maps')}>
          Public
        </Link>
      </div>
    </header>
  );
}
