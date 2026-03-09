'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
    ? 'inline-flex h-10 items-center rounded-md bg-white px-3.5 text-xs font-semibold tracking-[0.08em] text-[var(--brand-dark)] shadow-sm'
    : 'inline-flex h-10 items-center rounded-md px-3.5 text-xs font-semibold tracking-[0.08em] text-white/88 hover:bg-white/12 hover:text-white';
}

function mobileNavItemClass(pathname: string, href: string) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return active
    ? 'inline-flex h-9 items-center rounded-md bg-white px-3 text-[11px] font-semibold tracking-[0.08em] text-[var(--brand-dark)]'
    : 'inline-flex h-9 items-center rounded-md border border-white/18 bg-white/8 px-3 text-[11px] font-semibold tracking-[0.08em] text-white/88 hover:bg-white/12';
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
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [user, setUser] = useState<HeaderUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/auth/check', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !json?.authenticated) return;
        setUser({ email: json.user?.email, profile: json.profile ?? null });
      })
      .catch(() => {
        // Keep header resilient on public routes.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function onClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }

    function onEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const initials = useMemo(() => initialsFromUser(user), [user]);
  const displayName = user?.profile?.display_name || user?.email || 'Public Visitor';
  const role = user?.profile?.role ? user.profile.role.replaceAll('_', ' ') : 'Public';

  async function signOut() {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push('/login');
    router.refresh();
    setIsSigningOut(false);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--brand-dark)]/60 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] text-white shadow-md">
      <div className="mx-auto w-full max-w-[76rem] px-4 py-2 md:px-6 md:py-3">
        <div className="hidden h-16 items-center gap-4 md:flex">
          <div className="flex w-[280px] min-w-[280px] items-center">
            <Link href="/" className="inline-flex min-w-0 items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-[var(--brand-yellow)] text-[11px] font-bold tracking-[0.16em] text-[var(--brand-dark)] shadow-sm">
                SI
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[19px] font-semibold uppercase tracking-[0.07em]">Siena Maps</span>
                <span className="block truncate text-[11px] text-white/74">Publishing Platform</span>
              </span>
            </Link>
          </div>

          <div className="flex min-w-0 flex-1 justify-center">
            <nav
              className="inline-flex min-w-0 items-center gap-1 rounded-lg border border-white/18 bg-white/8 p-1"
              aria-label="Primary"
            >
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className={navItemClass(pathname, item.href)}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex w-[280px] min-w-[280px] justify-end" ref={menuRef}>
            <div className="relative">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/22 bg-white/10 px-2 pr-3 hover:bg-white/14"
                title="Account menu"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-yellow)] text-[11px] font-bold tracking-[0.08em] text-[var(--brand-dark)]">
                  {initials}
                </span>
                <span className="text-left">
                  <span className="block max-w-[150px] truncate text-xs font-semibold">{displayName}</span>
                  <span className="block text-[10px] uppercase tracking-[0.1em] text-white/72">{role}</span>
                </span>
                <svg className="h-3.5 w-3.5 text-white/75" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M5.25 7.5a.75.75 0 0 1 1.06 0L10 11.19l3.69-3.69a.75.75 0 1 1 1.06 1.06l-4.22 4.22a.75.75 0 0 1-1.06 0L5.25 8.56a.75.75 0 0 1 0-1.06z" />
                </svg>
              </button>

              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-[230px] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--foreground)] shadow-md" role="menu">
                  <div className="border-b border-[var(--border)] px-2 pb-2">
                    <p className="truncate text-sm font-semibold text-[var(--heading)]">{displayName}</p>
                    <p className="truncate text-xs text-black/60">{user?.email ?? 'Not signed in'}</p>
                  </div>
                  <Link href="/dashboard" className="mt-1 block rounded-md px-2 py-2 text-sm hover:bg-[var(--surface-subtle)]" onClick={() => setMenuOpen(false)}>
                    Profile
                  </Link>
                  <p className="px-2 py-1 text-xs uppercase tracking-[0.08em] text-black/55">Role: {role}</p>
                  {user ? (
                    <button
                      type="button"
                      className="mt-1 w-full rounded-md px-2 py-2 text-left text-sm text-[var(--accent-red)] hover:bg-[var(--surface-subtle)]"
                      onClick={() => void signOut()}
                      disabled={isSigningOut}
                    >
                      {isSigningOut ? 'Signing out…' : 'Sign out'}
                    </button>
                  ) : (
                    <Link href="/login" className="mt-1 block rounded-md px-2 py-2 text-sm hover:bg-[var(--surface-subtle)]" onClick={() => setMenuOpen(false)}>
                      Sign in
                    </Link>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="md:hidden">
          <div className="flex min-h-[52px] items-center justify-between gap-2">
            <Link href="/" className="inline-flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[var(--brand-yellow)] text-[10px] font-bold tracking-[0.15em] text-[var(--brand-dark)]">
                SI
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[16px] font-semibold uppercase tracking-[0.06em]">Siena Maps</span>
                <span className="block text-[10px] text-white/74">Publishing Platform</span>
              </span>
            </Link>

            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2 py-1">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-yellow)] text-[10px] font-bold text-[var(--brand-dark)]">
                {initials}
              </span>
            </div>
          </div>

          <nav className="mt-2 flex items-center gap-1 overflow-x-auto pb-0.5" aria-label="Mobile Primary">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={`${mobileNavItemClass(pathname, item.href)} shrink-0`}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
