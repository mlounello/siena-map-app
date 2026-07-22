'use client';

import { useEffect, useState } from 'react';
import { Chrome, Mail } from 'lucide-react';
import { Button, PageHeader, Panel } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [callbackMessage, setCallbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');
    setCallbackError(errorCode);
    setCallbackMessage(params.get('message'));
  }, []);

  function callbackErrorText(errorCode: string) {
    if (errorCode === 'not_authorized') {
      return 'This account is not active and authorized for Siena Maps. Ask a Siena Maps administrator for access.';
    }
    if (errorCode === 'access_check_failed') {
      return 'Siena Maps could not verify access. Please try again or contact an administrator.';
    }
    return `Sign-in error: ${errorCode}`;
  }

  async function signInWithGoogle() {
    setGoogleLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (signInError) setError(signInError.message);
    setGoogleLoading(false);
  }

  async function sendMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMagicLoading(true);
    setMagicLinkSent(false);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });

    if (signInError && !/signups? not allowed|user not found/i.test(signInError.message)) {
      setError(signInError.message);
    } else {
      setMagicLinkSent(true);
    }
    setMagicLoading(false);
  }

  return (
    <section className="mx-auto max-w-2xl space-y-7">
      <PageHeader
        eyebrow="Authentication"
        title="Sign In"
        subtitle="Use Google or a magic link with an account that an administrator has authorized for Siena Maps."
      />

      <Panel title="Continue with Google" subtitle="Secure sign-in for authorized Siena Maps members.">
        <div className="space-y-4">
          <Button type="button" onClick={signInWithGoogle} disabled={googleLoading} className="w-full justify-center">
            <Chrome className="h-4 w-4" />
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </Button>

          {error ? <p className="text-sm text-[var(--accent-red)]">{error}</p> : null}

          {callbackError ? (
            <p className="text-sm text-[var(--accent-red)]">
              {callbackErrorText(callbackError)}
              {callbackMessage ? ` (${callbackMessage})` : ''}
            </p>
          ) : null}
        </div>
      </Panel>

      <Panel title="Email magic link" subtitle="For authorized members who do not use Google sign-in.">
        <form className="space-y-4" onSubmit={sendMagicLink}>
          <label className="block space-y-2 text-sm font-medium">
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              placeholder="you@example.com"
            />
          </label>
          <Button type="submit" disabled={magicLoading} className="w-full justify-center">
            <Mail className="h-4 w-4" />
            {magicLoading ? 'Sending...' : 'Send magic link'}
          </Button>
          {magicLinkSent ? (
            <p className="text-sm text-[var(--accent-green)]">
              If this email belongs to an authorized Siena Maps member, a sign-in link is on its way.
            </p>
          ) : null}
        </form>
      </Panel>
    </section>
  );
}
