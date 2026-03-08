import { badRequest, ok, serverError, unauthorized } from '@/lib/api/http';
import { env } from '@/lib/config/env';
import { createDbClient } from '@/lib/supabase/server';

export async function POST() {
  if (!env.OWNER_EMAIL) {
    return badRequest('OWNER_EMAIL is not configured');
  }

  const { supabase, db } = await createDbClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return unauthorized();

  const { data, error } = await db.rpc('bootstrap_owner', {
    target_email: env.OWNER_EMAIL,
  });

  if (error) return serverError(error.message);

  const profile = Array.isArray(data) ? data[0] : data;
  return ok({
    message: 'Owner bootstrap complete',
    profile,
  });
}
