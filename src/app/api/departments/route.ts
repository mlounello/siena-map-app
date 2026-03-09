import { z } from 'zod';
import { badRequest, created, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';
import type { Department } from '@/types/siena-maps';

const createSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120),
  description: z.string().max(1000).nullable().optional(),
});

export async function GET() {
  const profile = await requireRole('viewer');
  if (!profile) return unauthorized();

  const { db } = await createDbClient();
  const { data, error } = await db.from('departments').select('*').order('name', { ascending: true });
  if (error) return serverError(error.message);

  return ok({ departments: (data ?? []) as Department[] });
}

export async function POST(request: Request) {
  const profile = await requireRole('super_admin');
  if (!profile) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(', '));

  const { db } = await createDbClient();
  const { data, error } = await db
    .from('departments')
    .insert({ ...parsed.data, created_by: profile.id })
    .select('*')
    .single();

  if (error) return serverError(error.message);
  return created({ department: data as Department });
}
