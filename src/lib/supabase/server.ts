import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env, getAppSchemaFromEnv } from '@/lib/config/env';

export function getAppSchema() {
  return getAppSchemaFromEnv();
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in Server Components when middleware handles refresh.
          }
        },
      },
    }
  );
}

export async function createDbClient() {
  const supabase = await createClient();
  const schema = getAppSchema();
  return { supabase, db: supabase.schema(schema), schema };
}
