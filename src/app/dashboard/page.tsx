import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth/roles';

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold text-[var(--brand)]">Dashboard</h1>
        <p>You are not signed in.</p>
        <Link href="/login" className="underline">
          Go to login
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold text-[var(--brand)]">Dashboard</h1>
      <p className="text-black/80">
        Signed in as <strong>{profile.email}</strong> with role <strong>{profile.role}</strong>.
      </p>
      <div className="rounded-xl border border-black/10 bg-white p-4 text-sm">
        Phase 1 scaffold includes API routes for map and POI operations and a review queue endpoint.
      </div>
    </section>
  );
}
