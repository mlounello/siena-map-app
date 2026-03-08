import type { PlatformRole, Profile } from '@/types/siena-maps';
import { createDbClient } from '@/lib/supabase/server';

export async function requireUser() {
  const { supabase } = await createDbClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await requireUser();
  if (!user) return null;

  const { db } = await createDbClient();
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

export function hasMinimumRole(current: PlatformRole, required: PlatformRole): boolean {
  const rank: Record<PlatformRole, number> = {
    viewer: 10,
    editor: 20,
    department_head: 30,
    super_admin: 40,
    owner: 50,
  };

  return rank[current] >= rank[required];
}

export async function requireRole(required: PlatformRole): Promise<Profile | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  if (!hasMinimumRole(profile.role, required)) return null;
  return profile;
}
