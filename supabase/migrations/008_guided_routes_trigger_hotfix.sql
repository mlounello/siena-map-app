BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'app_siena_maps'
      AND table_name = 'guided_routes'
  ) THEN
    DROP TRIGGER IF EXISTS guided_routes_updated_at ON app_siena_maps.guided_routes;

    CREATE TRIGGER guided_routes_updated_at
      BEFORE UPDATE ON app_siena_maps.guided_routes
      FOR EACH ROW
      EXECUTE FUNCTION app_siena_maps.update_updated_at();
  END IF;
END $$;

COMMIT;
