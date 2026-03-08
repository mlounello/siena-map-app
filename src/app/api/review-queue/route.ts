import { z } from 'zod';
import { ok, serverError, unauthorized, badRequest } from '@/lib/api/http';
import { createDbClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/roles';

const paramsSchema = z.object({
  departmentId: z.string().uuid().optional(),
  mapStatuses: z.string().optional(),
  poiStatuses: z.string().optional(),
  mapLimit: z.coerce.number().int().min(1).max(500).default(150),
  poiLimit: z.coerce.number().int().min(1).max(1000).default(300),
});

const DEFAULT_MAP_STATUSES = ['submitted_for_review', 'rejected'];
const DEFAULT_POI_STATUSES = ['submitted_for_review', 'rejected'];

function parseCsv(value: string | undefined, fallback: string[]) {
  if (!value) return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const profile = await requireRole('department_head');
  if (!profile) return unauthorized();

  const { searchParams } = new URL(request.url);
  const parsed = paramsSchema.safeParse({
    departmentId: searchParams.get('departmentId') || undefined,
    mapStatuses: searchParams.get('mapStatuses') || undefined,
    poiStatuses: searchParams.get('poiStatuses') || undefined,
    mapLimit: searchParams.get('mapLimit') || undefined,
    poiLimit: searchParams.get('poiLimit') || undefined,
  });

  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((issue) => issue.message).join(', '));
  }

  const { db } = await createDbClient();
  const isGlobalReviewer = profile.role === 'owner' || profile.role === 'super_admin';

  const mapStatuses = parseCsv(parsed.data.mapStatuses, DEFAULT_MAP_STATUSES);
  const poiStatuses = parseCsv(parsed.data.poiStatuses, DEFAULT_POI_STATUSES);

  let membershipDepartmentIds: string[] = [];
  if (!isGlobalReviewer) {
    const { data: memberships, error: membershipError } = await db
      .from('department_memberships')
      .select('department_id')
      .eq('user_id', profile.id)
      .in('role', ['department_head', 'editor', 'viewer']);

    if (membershipError) return serverError(membershipError.message);
    membershipDepartmentIds = (memberships ?? []).map((row) => row.department_id as string);

    if (parsed.data.departmentId && !membershipDepartmentIds.includes(parsed.data.departmentId)) {
      return unauthorized('Department scope not allowed for current reviewer');
    }
  }

  const [mapsResult, mapDeptResult] = await Promise.all([
    db
      .from('maps')
      .select('id, slug, title, shell_status, publication_status, submitted_at, updated_at, primary_department_id')
      .in('shell_status', mapStatuses)
      .order('updated_at', { ascending: false })
      .limit(parsed.data.mapLimit * 2),
    db.from('map_departments').select('map_id, department_id'),
  ]);

  if (mapsResult.error) return serverError(mapsResult.error.message);
  if (mapDeptResult.error) return serverError(mapDeptResult.error.message);

  const collaboratorsByMap = new Map<string, string[]>();
  for (const row of mapDeptResult.data ?? []) {
    const mapId = row.map_id as string;
    const current = collaboratorsByMap.get(mapId) ?? [];
    current.push(row.department_id as string);
    collaboratorsByMap.set(mapId, current);
  }

  const scopedMaps = (mapsResult.data ?? []).filter((mapRow) => {
    const primaryDepartmentId = mapRow.primary_department_id as string;
    const collaboratorIds = collaboratorsByMap.get(mapRow.id as string) ?? [];

    if (parsed.data.departmentId) {
      if (primaryDepartmentId !== parsed.data.departmentId && !collaboratorIds.includes(parsed.data.departmentId)) {
        return false;
      }
    }

    if (isGlobalReviewer) return true;

    return (
      membershipDepartmentIds.includes(primaryDepartmentId) ||
      collaboratorIds.some((departmentId) => membershipDepartmentIds.includes(departmentId))
    );
  });

  const scopedMapIds = new Set(scopedMaps.map((item) => item.id as string));

  const { data: pois, error: poisError } = await db
    .from('pois')
    .select('id, map_id, title, status, updated_at, owning_department_id, stop_number')
    .in('status', poiStatuses)
    .order('updated_at', { ascending: false })
    .limit(parsed.data.poiLimit * 2);

  if (poisError) return serverError(poisError.message);

  const scopedPois = (pois ?? []).filter((poiRow) => {
    const owningDepartmentId = poiRow.owning_department_id as string;
    const mapId = poiRow.map_id as string;

    if (parsed.data.departmentId) {
      const mapHasDepartment = scopedMapIds.has(mapId);
      if (owningDepartmentId !== parsed.data.departmentId && !mapHasDepartment) {
        return false;
      }
    }

    if (isGlobalReviewer) return true;

    return membershipDepartmentIds.includes(owningDepartmentId) || scopedMapIds.has(mapId);
  });

  return ok({
    queue: {
      maps: scopedMaps.slice(0, parsed.data.mapLimit),
      pois: scopedPois.slice(0, parsed.data.poiLimit),
    },
    filters: {
      departmentId: parsed.data.departmentId ?? null,
      mapStatuses,
      poiStatuses,
      roleScope: isGlobalReviewer ? 'global' : 'department_scoped',
    },
    counts: {
      maps: scopedMaps.length,
      pois: scopedPois.length,
    },
  });
}
