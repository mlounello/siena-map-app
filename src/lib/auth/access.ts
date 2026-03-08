import { createDbClient } from '@/lib/supabase/server';
import type { PlatformRole, Profile } from '@/types/siena-maps';

function roleAtLeast(current: PlatformRole, required: PlatformRole): boolean {
  const rank: Record<PlatformRole, number> = {
    viewer: 10,
    editor: 20,
    department_head: 30,
    super_admin: 40,
    owner: 50,
  };

  return rank[current] >= rank[required];
}

export async function isDepartmentMember(
  userId: string,
  departmentId: string,
  roles?: Array<'department_head' | 'editor' | 'viewer'>
): Promise<boolean> {
  const { db } = await createDbClient();
  let query = db
    .from('department_memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('department_id', departmentId);

  if (roles?.length) {
    query = query.in('role', roles);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return false;
  return !!data;
}

export async function getMapContext(mapId: string) {
  const { db } = await createDbClient();

  const [{ data: map, error: mapError }, { data: collaborators, error: collaboratorsError }] =
    await Promise.all([
      db.from('maps').select('id, primary_department_id').eq('id', mapId).maybeSingle(),
      db.from('map_departments').select('department_id').eq('map_id', mapId),
    ]);

  if (mapError || !map) return null;
  if (collaboratorsError) return null;

  return {
    mapId: map.id,
    primaryDepartmentId: map.primary_department_id as string,
    collaboratorDepartmentIds: (collaborators ?? []).map((row) => row.department_id as string),
  };
}

export async function canEditMap(profile: Profile, mapId: string): Promise<boolean> {
  if (roleAtLeast(profile.role, 'super_admin')) return true;

  const context = await getMapContext(mapId);
  if (!context) return false;

  const scopedDepartmentIds = [
    context.primaryDepartmentId,
    ...context.collaboratorDepartmentIds,
  ];

  if (profile.role === 'department_head') {
    for (const departmentId of scopedDepartmentIds) {
      if (await isDepartmentMember(profile.id, departmentId, ['department_head'])) return true;
    }
    return false;
  }

  if (profile.role === 'editor') {
    for (const departmentId of scopedDepartmentIds) {
      if (await isDepartmentMember(profile.id, departmentId, ['department_head', 'editor'])) {
        return true;
      }
    }
    return false;
  }

  return false;
}

export async function canEditPoi(
  profile: Profile,
  poi: { map_id: string; owning_department_id: string; created_by: string | null }
): Promise<boolean> {
  if (roleAtLeast(profile.role, 'super_admin')) return true;

  if (profile.role === 'department_head') {
    return canEditMap(profile, poi.map_id);
  }

  if (profile.role === 'editor') {
    if (poi.created_by === profile.id) return true;
    return isDepartmentMember(profile.id, poi.owning_department_id, ['department_head', 'editor']);
  }

  return false;
}
