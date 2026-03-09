import { z } from 'zod';
import { badRequest, created, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';

const addSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['department_head', 'editor', 'viewer']),
});

const updateSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['department_head', 'editor', 'viewer']),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole('viewer');
  if (!profile) return unauthorized();
  const { id } = await params;

  const { db } = await createDbClient();
  const { data, error } = await db
    .from('department_memberships')
    .select('id, department_id, user_id, role, created_at, profiles:user_id(id, email, display_name, role)')
    .eq('department_id', id)
    .order('created_at', { ascending: false });

  if (error) return serverError(error.message);
  return ok({ members: data ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole('department_head');
  if (!profile) return unauthorized();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(', '));

  const { db } = await createDbClient();
  const { data, error } = await db
    .from('department_memberships')
    .insert({
      department_id: id,
      user_id: parsed.data.user_id,
      role: parsed.data.role,
      created_by: profile.id,
    })
    .select('*')
    .single();

  if (error) return serverError(error.message);
  return created({ membership: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole('department_head');
  if (!profile) return unauthorized();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(', '));

  const { db } = await createDbClient();
  const { data, error } = await db
    .from('department_memberships')
    .update({ role: parsed.data.role })
    .eq('department_id', id)
    .eq('user_id', parsed.data.user_id)
    .select('*')
    .single();

  if (error) return serverError(error.message);
  return ok({ membership: data });
}
