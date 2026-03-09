import { z } from 'zod';
import { badRequest, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';

const updateSchema = z.object({
  from_poi_id: z.string().uuid().optional(),
  to_poi_id: z.string().uuid().optional(),
  order_index: z.number().int().min(1).optional(),
  line_style: z.string().max(50).nullable().optional(),
  line_color: z.string().max(30).nullable().optional(),
  line_thickness: z.number().int().min(1).max(20).optional(),
  is_directional: z.boolean().optional(),
  label: z.string().max(120).nullable().optional(),
  status: z.enum(['unpublished', 'published', 'archived']).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole('editor');
  if (!profile) return unauthorized();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(', '));

  const { db } = await createDbClient();
  const { data, error } = await db
    .from('route_connections')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return serverError(error.message);
  return ok({ routeConnection: data });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole('editor');
  if (!profile) return unauthorized();
  const { id } = await params;

  const { db } = await createDbClient();
  const { error } = await db.from('route_connections').delete().eq('id', id);
  if (error) return serverError(error.message);

  return ok({ deleted: true, id });
}
