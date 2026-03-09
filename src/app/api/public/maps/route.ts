import { ok, serverError } from '@/lib/api/http';
import { createDbClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const departmentId = searchParams.get('departmentId');
  const categoryId = searchParams.get('categoryId');

  const { db } = await createDbClient();

  let query = db
    .from('maps')
    .select(
      'id, slug, title, intro_text, primary_department_id, visibility, map_type, display_mode, published_at, departments:primary_department_id(name)'
    )
    .eq('publication_status', 'published')
    .eq('visibility', 'public')
    .order('published_at', { ascending: false })
    .limit(120);

  if (departmentId) query = query.eq('primary_department_id', departmentId);
  if (q) query = query.ilike('title', `%${q}%`);

  const { data: maps, error } = await query;
  if (error) return serverError(error.message);

  let filteredMaps = maps ?? [];

  if (categoryId && filteredMaps.length > 0) {
    const mapIds = filteredMaps.map((m) => m.id as string);
    const { data: poiCategoryRows, error: poiCategoryError } = await db
      .from('pois')
      .select('map_id')
      .in('map_id', mapIds)
      .eq('status', 'published')
      .eq('category_id', categoryId);

    if (poiCategoryError) return serverError(poiCategoryError.message);

    const allowedMapIds = new Set((poiCategoryRows ?? []).map((row) => row.map_id as string));
    filteredMaps = filteredMaps.filter((map) => allowedMapIds.has(map.id as string));
  }

  return ok({ maps: filteredMaps });
}
