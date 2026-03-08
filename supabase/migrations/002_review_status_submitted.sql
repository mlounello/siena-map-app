DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'app_siena_maps'
      AND t.typname = 'review_status'
      AND e.enumlabel = 'submitted'
  ) THEN
    ALTER TYPE app_siena_maps.review_status ADD VALUE 'submitted';
  END IF;
END $$;
