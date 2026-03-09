import { z } from 'zod';
import { badRequest, ok, serverError, unauthorized } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/roles';
import { createDbClient } from '@/lib/supabase/server';

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  width: z.string().min(1).max(30).optional(),
  height: z.string().min(1).max(30).optional(),
  theme: z.string().max(60).nullable().optional(),
  show_legend: z.boolean().optional(),
  show_search: z.boolean().optional(),
  show_sidebar: z.boolean().optional(),
  show_tour_panel: z.boolean().optional(),
  show_branding: z.boolean().optional(),
  show_cta: z.boolean().optional(),
  default_mode: z.enum(['explore_only', 'guided_only', 'both']).optional(),
  start_poi_id: z.string().uuid().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole('department_head');
  if (!profile) return unauthorized();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join(', '));

  const { db } = await createDbClient();
  const { data, error } = await db
    .from('embed_configs')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return serverError(error.message);
  return ok({ embedConfig: data });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole('department_head');
  if (!profile) return unauthorized();
  const { id } = await params;

  const { db } = await createDbClient();
  const { error } = await db.from('embed_configs').delete().eq('id', id);
  if (error) return serverError(error.message);

  return ok({ deleted: true, id });
}
