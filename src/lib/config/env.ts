import { z } from 'zod';

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_SCHEMA: z.string().min(1).default('app_siena_maps'),
  APP_SCHEMA: z.string().min(1).optional(),
  OWNER_EMAIL: z.string().email().optional(),
});

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid environment configuration: ${issues.join('; ')}`);
}

export const env = parsed.data;

export function getAppSchemaFromEnv() {
  return env.APP_SCHEMA || env.NEXT_PUBLIC_APP_SCHEMA || 'app_siena_maps';
}
