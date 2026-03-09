'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type HeaderUser = {
  email?: string | null;
  profile?: {
    display_name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Maps', href: '/dashboard/maps' },
  { label: 'Approvals', href: '/dashboard/review-queue' },
  { label: 'Public', href: '/maps' },
];

function navClass(pathname: string, href: string) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return active
    ? 'rounded-md bg-white/18 px-3 py-1.5 text-white'
    : 'rounded-md px-3 py-1.5 text-white/90 hover:bg-white/10 hover:text-white';
}

function initialsFromUser(user: HeaderUser | null) {
  const raw = user?.profile?.display_name || user?.profile?.email || user?.email || 'SM';
  const parts = raw
    .split('@')[0]
    .split(/[\s._-]+/)
    .filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
  return initials || 'SM';
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
        // Keep header stable if auth endpoint fails on public pages.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const initials = useMemo(() => initialsFromUser(user), [user]);
  const displayName = user?.profile?.display_name || user?.email || 'Public Visitor';
  const role = user?.profile?.role ? user.profile.role.replaceAll('_', ' ') : null;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--brand-dark)]/50 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] text-white shadow-md">
      <div className="mx-auto flex h-16 w-full max-w-[76rem] items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-flex h-8 items-center rounded bg-[var(--brand-yellow)] px-2 text-[10px] font-bold tracking-[0.16em] text-[#1a1a1a]">
            SIENA
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold uppercase tracking-[0.08em]">Siena Maps</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/75">Publishing Platform</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 text-xs font-semibold tracking-[0.08em] md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={navClass(pathname, item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2 py-1">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-yellow)] text-xs font-bold tracking-[0.08em] text-[var(--brand-dark)]">
            {initials}
          </span>
          <div className="hidden pr-1 text-right sm:block">
            <p className="max-w-[180px] truncate text-xs font-semibold">{displayName}</p>
            <p className="text-[10px] uppercase tracking-[0.11em] text-white/75">{role || (user ? 'Authenticated' : 'Public')}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[76rem] items-center gap-1 px-4 pb-2 md:hidden">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={navClass(pathname, item.href)}>
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
