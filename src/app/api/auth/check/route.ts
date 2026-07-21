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

  const { data: hasAppAccess, error: accessError } = await db.rpc('has_app_access', {
    p_user_id: user.id,
  });

  if (accessError) {
    return serverError('Unable to verify Siena Maps access');
  }

  if (hasAppAccess !== true) {
    return ok({
      authenticated: true,
      authorized: false,
      profileFound: false,
      reason: 'This account is not active and authorized for Siena Maps',
    });
  }

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id, email, display_name, avatar_url, role, is_active')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (profileError) {
    return serverError('Unable to load the authorized Siena Maps profile');
  }

  return ok({
    authenticated: true,
    authorized: !!profile,
    user: { id: user.id, email: user.email },
    profileFound: !!profile,
    profile: profile ?? null,
  });
}
