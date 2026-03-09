import { z } from 'zod';
import { badRequest, created, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';
import type { Category } from '@/types/siena-maps';

const createSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120),
  icon: z.string().max(100).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
});

export async function GET() {
  const { db } = await createDbClient();
  const { data, error } = await db
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) return serverError(error.message);
  return ok({ categories: (data ?? []) as Category[] });
}

export async function POST(request: Request) {
  const profile = await requireRole('super_admin');
  if (!profile) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(', '));

  const { db } = await createDbClient();
  const { data, error } = await db
    .from('categories')
    .insert({ ...parsed.data, created_by: profile.id })
    .select('*')
    .single();

  if (error) return serverError(error.message);
  return created({ category: data as Category });
}
