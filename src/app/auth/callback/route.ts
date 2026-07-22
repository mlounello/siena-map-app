import { createDbClient } from '@/lib/supabase/server';
import { syncSienaAppUsersToControlRoom } from '@/lib/control-room/user-sync';
import { NextResponse } from 'next/server';

function loginRedirect(requestUrl: string, error: string, message?: string) {
  const loginUrl = new URL('/login', requestUrl);
  loginUrl.searchParams.set('error', error);
  if (message) loginUrl.searchParams.set('message', message);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const oauthError = requestUrl.searchParams.get('error');
  const oauthErrorDescription = requestUrl.searchParams.get('error_description');

  if (oauthError) {
    return loginRedirect(request.url, oauthError, oauthErrorDescription ?? undefined);
  }

  const { supabase, db } = await createDbClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'magiclink' | 'recovery' | 'invite' | 'signup' | 'email_change' | 'email',
        })
      : { error: new Error('Missing authentication callback credentials.') };
  if (error) {
    return loginRedirect(request.url, 'authentication_exchange_failed', error.message);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return loginRedirect(request.url, 'session_user_unavailable', userError?.message);
  }

  const { data: hasAppAccess, error: accessError } = await db.rpc('has_app_access', {
    p_user_id: user.id,
  });

  if (accessError || hasAppAccess !== true) {
    // Clear only this browser session. Do not revoke the user's sessions in other
    // apps that share the Supabase Auth project.
    await supabase.auth.signOut({ scope: 'local' });
    return loginRedirect(
      request.url,
      accessError ? 'access_check_failed' : 'not_authorized'
    );
  }

  // Access is provisioned by an administrator. Sign-in may refresh descriptive
  // profile fields, but it must never create an account, reactivate one, or
  // change its authorization role.
  const { error: profileError } = await db
    .from('profiles')
    .update({
      display_name:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.email ? user.email.split('@')[0] : null),
      avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      has_signed_in_to_app: true,
      last_app_sign_in_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (profileError) {
    await supabase.auth.signOut({ scope: 'local' });
    return loginRedirect(request.url, 'profile_sync_failed');
  }

  await syncSienaAppUsersToControlRoom(db, 'auth_callback');

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
