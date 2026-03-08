'use client';

import { useState } from 'react';
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
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signInError) setError(signInError.message);
    setLoading(false);
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-[var(--brand)]">Sign in</h1>
      <p className="mt-2 text-sm text-black/70">Use your Siena Google account.</p>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {loading ? 'Redirecting...' : 'Continue with Google'}
      </button>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
