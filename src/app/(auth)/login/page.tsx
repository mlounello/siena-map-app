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
    setCallbackError(params.get('error'));
    setCallbackMessage(params.get('message'));
  }, []);

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
        subtitle="Use your Siena Google account to access map governance, approvals, and publishing workflows."
      />

      <Panel title="Continue with Google" subtitle="Secure sign-in for authorized Siena users.">
        <div className="space-y-4">
          <Button type="button" onClick={signInWithGoogle} disabled={loading} className="w-full justify-center">
            <Chrome className="h-4 w-4" />
            {loading ? 'Redirecting...' : 'Continue with Google'}
          </Button>

          {error ? <p className="text-sm text-[var(--accent-red)]">{error}</p> : null}

          {callbackError ? (
            <p className="text-sm text-[var(--accent-red)]">
              OAuth error: {callbackError}
              {callbackMessage ? ` (${callbackMessage})` : ''}
            </p>
          ) : null}
        </div>
      </Panel>
    </section>
  );
}
