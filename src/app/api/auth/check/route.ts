import { ok, serverError } from '@/lib/api/http';
import { createDbClient } from '@/lib/supabase/server';

export async function GET() {
  const { supabase, db } = await createDbClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    if (userError.message.toLowerCase().includes('session missing')) {
      return ok({
        authenticated: false,
        profileFound: false,
        schemaAccessible: true,
        reason: 'No active session cookie',
      });
    }
    return serverError(`auth.getUser error: ${userError.message}`);
  }

  if (!user) {
    return ok({
      authenticated: false,
      profileFound: false,
      schemaAccessible: true,
      reason: 'No active session cookie',
    });
  }

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id, email, display_name, avatar_url, role')
    .eq('id', user.id)
    .maybeSingle();

  return ok({
    authenticated: true,
    user: { id: user.id, email: user.email },
    profileFound: !!profile,
    profile: profile ?? null,
    profileError: profileError?.message ?? null,
  });
}
