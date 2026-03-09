import { createDbClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const oauthError = requestUrl.searchParams.get('error');
  const oauthErrorDescription = requestUrl.searchParams.get('error_description');

  if (oauthError) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', oauthError);
    if (oauthErrorDescription) {
      loginUrl.searchParams.set('message', oauthErrorDescription);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'missing_oauth_code');
    return NextResponse.redirect(loginUrl);
  }

  const { supabase, db } = await createDbClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'oauth_exchange_failed');
    loginUrl.searchParams.set('message', error.message);
    return NextResponse.redirect(loginUrl);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'session_user_unavailable');
    if (userError?.message) loginUrl.searchParams.set('message', userError.message);
    return NextResponse.redirect(loginUrl);
  }

  // Self-heal missing legacy profiles (accounts created before trigger/policy alignment).
  // This preserves owner-as-account behavior while avoiding service-role usage.
  const { error: profileError } = await db.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      display_name:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.email ? user.email.split('@')[0] : null),
      avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      is_active: true,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'profile_sync_failed');
    loginUrl.searchParams.set('message', profileError.message);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
