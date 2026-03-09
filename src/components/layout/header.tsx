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

function navItemClass(pathname: string, href: string) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return active
    ? 'inline-flex h-9 items-center rounded-md bg-white px-3 text-xs font-semibold tracking-[0.07em] text-[var(--brand-dark)] shadow-sm'
    : 'inline-flex h-9 items-center rounded-md px-3 text-xs font-semibold tracking-[0.07em] text-white/85 hover:bg-white/12 hover:text-white';
}

function mobileNavItemClass(pathname: string, href: string) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return active
    ? 'inline-flex h-8 items-center rounded-md bg-white px-3 text-[11px] font-semibold tracking-[0.07em] text-[var(--brand-dark)]'
    : 'inline-flex h-8 items-center rounded-md border border-white/18 bg-white/6 px-3 text-[11px] font-semibold tracking-[0.07em] text-white/86 hover:bg-white/10';
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
  const role = user?.profile?.role ? user.profile.role.replaceAll('_', ' ') : 'Public';

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--brand-dark)]/55 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] text-white shadow-md">
      <div className="mx-auto w-full max-w-[76rem] px-4 pb-2 pt-2 md:px-6 md:pb-3 md:pt-3">
        <div className="grid items-center gap-3 md:grid-cols-[minmax(250px,1fr)_auto_minmax(250px,1fr)]">
          <Link href="/" className="inline-flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--brand-yellow)] text-[10px] font-bold tracking-[0.16em] text-[var(--brand-dark)] shadow-sm">
              SI
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[17px] font-semibold uppercase tracking-[0.06em]">Siena Maps</span>
              <span className="block truncate text-[11px] text-white/74">Publishing Platform</span>
            </span>
          </Link>

          <nav className="hidden items-center rounded-lg border border-white/16 bg-white/8 p-1 md:inline-flex" aria-label="Primary">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={navItemClass(pathname, item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="justify-self-start md:justify-self-end">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 bg-white/9 px-2 pr-3 hover:bg-white/13"
              title="Signed-in account"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-yellow)] text-[11px] font-bold tracking-[0.08em] text-[var(--brand-dark)]">
                {initials}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[170px] truncate text-xs font-semibold">{displayName}</span>
                <span className="block text-[10px] uppercase tracking-[0.1em] text-white/72">{role}</span>
              </span>
              <svg className="h-3.5 w-3.5 text-white/75" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M5.25 7.5a.75.75 0 0 1 1.06 0L10 11.19l3.69-3.69a.75.75 0 1 1 1.06 1.06l-4.22 4.22a.75.75 0 0 1-1.06 0L5.25 8.56a.75.75 0 0 1 0-1.06z" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="mt-2 flex items-center gap-1 overflow-x-auto pb-0.5 md:hidden" aria-label="Mobile Primary">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`${mobileNavItemClass(pathname, item.href)} shrink-0`}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
