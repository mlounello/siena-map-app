'use client';

import { useState } from 'react';
import { Button, PageHeader, Panel } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <section className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Authentication"
        title="Sign In"
        subtitle="Use your Siena Google account to access internal maps and workflows."
      />

      <Panel>
        <div className="space-y-4">
          <Button type="button" onClick={signInWithGoogle} disabled={loading} className="w-full justify-center">
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </Button>
          {error ? <p className="siena-subtitle text-[var(--accent-red)]">{error}</p> : null}
        </div>
      </Panel>
    </section>
  );
}
