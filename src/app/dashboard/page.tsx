import { redirect } from 'next/navigation';
import { SectionCard } from '@/components/dashboard/section-card';
import { PageHeader, Panel } from '@/components/ui/siena';
import { getCurrentProfile } from '@/lib/auth/roles';

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Internal Workspace"
        title="Dashboard"
        subtitle={`Signed in as ${profile.email} (${profile.role}).`}
      />

      <Panel>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SectionCard
            title="Maps Console"
            description="Create maps, edit map settings, and run shell/publish workflows."
            href="/dashboard/maps"
          />
          <SectionCard
            title="Review Queue"
            description="Review submitted/rejected map and POI items by role scope."
            href="/dashboard/review-queue"
          />
          <SectionCard
            title="Departments"
            description="Manage departments and department memberships."
            href="/dashboard/admin/departments"
          />
          <SectionCard
            title="Users & Roles"
            description="Assign platform roles for internal accounts."
            href="/dashboard/admin/users"
          />
          <SectionCard
            title="Public Directory"
            description="Preview public-facing map directory and map pages."
            href="/maps"
          />
        </div>
      </Panel>
    </section>
  );
}
