import { ok } from '@/lib/api/http';
import { getAppSchemaFromEnv } from '@/lib/config/env';

export async function GET() {
  return ok({
    ok: true,
    service: 'siena-map-app',
    schema: getAppSchemaFromEnv(),
    timestamp: new Date().toISOString(),
  });
}
