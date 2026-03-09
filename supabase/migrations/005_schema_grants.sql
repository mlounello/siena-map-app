-- Grant API roles access to custom app schema objects.
-- Without this, authenticated requests can fail with:
-- "permission denied for schema app_siena_maps"

GRANT USAGE ON SCHEMA app_siena_maps TO anon, authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA app_siena_maps TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app_siena_maps TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app_siena_maps TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_siena_maps TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_siena_maps TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA app_siena_maps
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_siena_maps
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_siena_maps
  GRANT ALL PRIVILEGES ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA app_siena_maps
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_siena_maps
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
