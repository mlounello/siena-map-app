import type { PlatformRole } from '@/types/siena-maps';

type DbClient = Awaited<ReturnType<typeof import('@/lib/supabase/server').createDbClient>>['db'];

export type SienaAppUserRecord = {
  id: string;
  email: string;
  display_name: string | null;
  role: PlatformRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  has_signed_in_to_app: boolean;
  last_app_sign_in_at: string | null;
};

export async function listSienaAppUsers(db: DbClient): Promise<SienaAppUserRecord[]> {
  const { data: profiles, error: profilesError } = await db
    .from('profiles')
    .select(
      'id, email, display_name, role, is_active, created_at, updated_at, has_signed_in_to_app, last_app_sign_in_at'
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const { data: memberships, error: membershipsError } = await db
    .from('department_memberships')
    .select('user_id');

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const memberIds = new Set((memberships ?? []).map((membership) => membership.user_id));

  return (profiles ?? []).filter(
    (user) => user.has_signed_in_to_app || user.role !== 'viewer' || memberIds.has(user.id)
  );
}

