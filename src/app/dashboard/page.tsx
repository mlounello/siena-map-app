import { redirect } from 'next/navigation';
import { SectionCard as DashboardCard } from '@/components/dashboard/section-card';
import { AppShell, PageHeader, SectionCard } from '@/components/ui/siena';
import { getCurrentProfile } from '@/lib/auth/roles';
import type { PlatformRole } from '@/types/siena-maps';

function hasMinRole(current: PlatformRole, required: PlatformRole) {
  const rank: Record<PlatformRole, number> = {
    viewer: 10,
    editor: 20,
    department_head: 30,
    super_admin: 40,
    owner: 50,
  };
  return rank[current] >= rank[required];
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  return (
    <AppShell>
      <PageHeader
        eyebrow="Internal Workspace"
        title="Dashboard"
        subtitle={`Signed in as ${profile.email} (${profile.role.replaceAll('_', ' ')}). Navigate core moderation and publishing tools.`}
      />

      <SectionCard title="Workspace Entrypoints" subtitle="Navigate to governance, moderation, and public preview tools.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {hasMinRole(profile.role, 'editor') ? (
            <DashboardCard
              title="Maps Console"
              description="Create maps, edit map settings, and run shell/publish workflows."
              href="/dashboard/maps"
            />
          ) : null}
          {hasMinRole(profile.role, 'department_head') ? (
            <DashboardCard
              title="Review Queue"
              description="Review submitted/rejected map and POI items by role scope."
              href="/dashboard/review-queue"
            />
          ) : null}
          {hasMinRole(profile.role, 'super_admin') ? (
            <DashboardCard
              title="Departments"
              description="Manage departments and department memberships."
              href="/dashboard/admin/departments"
            />
          ) : null}
          {hasMinRole(profile.role, 'super_admin') ? (
            <DashboardCard
              title="Users & Roles"
              description="Assign platform roles for internal accounts."
              href="/dashboard/admin/users"
            />
          ) : null}
          {hasMinRole(profile.role, 'super_admin') ? (
            <DashboardCard
              title="Categories"
              description="Manage global category library and lifecycle states."
              href="/dashboard/admin/categories"
            />
          ) : null}
          <DashboardCard
            title="Public Directory"
            description="Preview public-facing map directory and map pages."
            href="/maps"
          />
        </div>
      </SectionCard>
    </AppShell>
  );
}
