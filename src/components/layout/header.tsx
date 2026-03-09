'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, LayoutDashboard, MapPinned, ShieldCheck, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { ComponentType } from 'react';

type HeaderUser = {
  email?: string | null;
  profile?: {
    display_name?: string | null;
    email?: string | null;
    role?: string | null;
    avatar_url?: string | null;
  } | null;
};

type NavItem = {
  key: 'dashboard' | 'maps' | 'approvals' | 'public';
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const appNavItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'maps', label: 'Maps', href: '/dashboard/maps', icon: MapPinned },
  { key: 'approvals', label: 'Approvals', href: '/dashboard/review-queue', icon: ShieldCheck },
  { key: 'public', label: 'Public', href: '/maps', icon: Globe },
];

function isAppRoute(pathname: string) {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

function activeNavKey(pathname: string): NavItem['key'] | null {
  if (pathname === '/dashboard') return 'dashboard';
  if (pathname === '/dashboard/maps' || pathname.startsWith('/dashboard/maps/')) return 'maps';
  if (pathname === '/dashboard/review-queue' || pathname.startsWith('/dashboard/review-queue/')) return 'approvals';
  if (pathname === '/maps' || pathname.startsWith('/maps/')) return 'public';
  return null;
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

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex min-w-0 items-center gap-3 group">
      <span
        className={`inline-flex items-center justify-center rounded-lg bg-[var(--brand-yellow)] font-bold text-[var(--brand-dark)] shadow-sm transition group-hover:scale-[1.02] ${
          compact ? 'h-9 w-9 text-[10px] tracking-[0.12em]' : 'h-11 w-11 text-[11px] tracking-[0.13em]'
        }`}
      >
        SI
      </span>
      <span className="min-w-0 leading-tight">
        <span className={`block truncate font-semibold text-white ${compact ? 'text-[1.02rem]' : 'text-[1.22rem]'}`}>
          Siena Maps
        </span>
        <span className={`block truncate text-white/86 ${compact ? 'text-[10px]' : 'text-[11px] tracking-[0.03em]'}`}>
          Publishing Platform
        </span>
      </span>
    </Link>
  );
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
        // Header must remain resilient for public pages.
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
  const avatarUrl = user?.profile?.avatar_url || null;

  async function signOut() {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push('/login');
    router.refresh();
    setIsSigningOut(false);
  }

  const inApp = isAppRoute(pathname);
  const activeKey = activeNavKey(pathname);

  if (!inApp) {
    const roleKey = user?.profile?.role ?? null;
    const internalLabel =
      roleKey === 'editor'
        ? 'Editor'
        : roleKey === 'viewer'
          ? 'Internal'
          : roleKey
            ? 'Admin'
            : 'Sign In';
    const rightAction =
      pathname === '/login'
        ? { href: '/maps', label: 'Public Maps' }
        : { href: user ? '/dashboard/maps' : '/login', label: internalLabel };

    return (
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-gradient-to-r from-[var(--brand)] via-[var(--brand)] to-[var(--brand-dark)] text-white shadow-md">
        <div className="page-container flex h-16 items-center justify-between gap-3 px-4 md:px-6">
          <BrandLockup />
          <Link
            href={rightAction.href}
            className="inline-flex h-9 items-center rounded-md border border-white/34 bg-white/12 px-3.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            {rightAction.label}
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/12 bg-gradient-to-r from-[var(--brand)] via-[var(--brand)] to-[var(--brand-dark)] text-white shadow-md">
      <div className="page-container px-4 md:px-6">
        <div className="hidden h-16 grid-cols-[minmax(240px,300px)_1fr_minmax(240px,300px)] items-center gap-3 md:grid">
          <BrandLockup />

          <nav className="mx-auto inline-flex items-center gap-1 rounded-lg border border-white/30 bg-white/12 p-1" aria-label="Primary">
            {appNavItems.map((item) => {
              const Icon = item.icon;
              const active = activeKey === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={active
                    ? 'inline-flex h-9 items-center gap-2 rounded-md bg-white px-3.5 text-sm font-semibold !text-[var(--brand-dark)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/65 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand)]'
                    : 'inline-flex h-9 items-center gap-2 rounded-md px-3.5 text-sm font-semibold text-white/95 transition hover:bg-white/18 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/65 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand)]'}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-[var(--brand-dark)]' : 'text-white/90'}`} />
                  <span className={active ? 'text-[var(--brand-dark)]' : 'text-white'}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex justify-end" ref={menuRef}>
            <div className="relative">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/34 bg-white/14 px-2.5 pr-3 transition hover:bg-white/20"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="inline-flex h-7 w-7 overflow-hidden rounded-full border border-white/30 bg-[var(--brand-yellow)] text-[10px] font-bold text-[var(--brand-dark)]">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="m-auto">{initials}</span>
                  )}
                </span>
                <span className="text-left leading-tight">
                  <span className="block max-w-[150px] truncate text-sm font-semibold text-white">{displayName}</span>
                  <span className="block text-[11px] font-medium text-white/84">{role}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-white/90" />
              </button>

              {menuOpen ? (
                <div
                  className="absolute right-0 mt-2 w-[248px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--foreground)] shadow-[0_14px_34px_rgba(18,44,34,0.18)]"
                  role="menu"
                >
                  <div className="border-b border-[var(--border)] px-2 pb-2">
                    <p className="truncate text-sm font-semibold text-[var(--heading)]">{displayName}</p>
                    <p className="truncate text-xs text-black/62">{user?.email ?? 'Not signed in'}</p>
                  </div>
                  <Link
                    href="/dashboard"
                    className="mt-1 block rounded-md px-2 py-2 text-sm text-black/84 hover:bg-[var(--muted)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <p className="px-2 py-1 text-xs text-black/58">Role: {role}</p>
                  {user ? (
                    <button
                      type="button"
                      className="mt-1 w-full rounded-md px-2 py-2 text-left text-sm text-[var(--accent-red)] hover:bg-[var(--muted)]"
                      onClick={() => void signOut()}
                      disabled={isSigningOut}
                    >
                      {isSigningOut ? 'Signing out...' : 'Sign out'}
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="mt-1 block rounded-md px-2 py-2 text-sm hover:bg-[var(--muted)]"
                      onClick={() => setMenuOpen(false)}
                    >
                      Sign in
                    </Link>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="md:hidden py-2">
          <div className="flex min-h-[52px] items-center justify-between gap-2">
            <BrandLockup compact />
            <span className="inline-flex h-8 w-8 overflow-hidden rounded-full border border-white/30 bg-[var(--brand-yellow)] text-[10px] font-bold text-[var(--brand-dark)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="m-auto">{initials}</span>
              )}
            </span>
          </div>

          <nav className="mt-2 flex items-center gap-1 overflow-x-auto pb-0.5" aria-label="Mobile Primary">
            {appNavItems.map((item) => {
              const Icon = item.icon;
              const active = activeKey === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`${active
                    ? 'inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-semibold !text-[var(--brand-dark)] hover:bg-white'
                    : 'inline-flex h-9 items-center gap-1.5 rounded-md border border-white/30 bg-white/12 px-3 text-xs font-semibold text-white/95 hover:bg-white/20'} shrink-0`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-[var(--brand-dark)]' : 'text-white/90'}`} />
                  <span className={active ? 'text-[var(--brand-dark)]' : 'text-white'}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
