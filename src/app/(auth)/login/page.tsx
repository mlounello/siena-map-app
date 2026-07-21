'use client';

import { useEffect, useState } from 'react';
import { Chrome } from 'lucide-react';
import { Button, PageHeader, Panel } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
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
      return 'This Google account is not active and authorized for Siena Maps. Ask a Siena Maps administrator for access.';
    }
    if (errorCode === 'access_check_failed') {
      return 'Siena Maps could not verify access. Please try again or contact an administrator.';
    }
    return `Sign-in error: ${errorCode}`;
  }

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (signInError) setError(signInError.message);
    setLoading(false);
  }

  return (
    <section className="mx-auto max-w-2xl space-y-7">
      <PageHeader
        eyebrow="Authentication"
        title="Sign In"
        subtitle="Use any Google account that an administrator has authorized for Siena Maps."
      />

      <Panel title="Continue with Google" subtitle="Secure sign-in for authorized Siena Maps members.">
        <div className="space-y-4">
          <Button type="button" onClick={signInWithGoogle} disabled={loading} className="w-full justify-center">
            <Chrome className="h-4 w-4" />
            {loading ? 'Redirecting...' : 'Continue with Google'}
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
    </section>
  );
}
