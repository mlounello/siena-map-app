BEGIN;

ALTER TABLE app_siena_maps.pois
  ADD COLUMN IF NOT EXISTS route_anchor_lat NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS route_anchor_lng NUMERIC(9, 6);

ALTER TABLE app_siena_maps.route_connections
  ADD COLUMN IF NOT EXISTS connection_type TEXT NOT NULL DEFAULT 'outdoor_routed',
  ADD COLUMN IF NOT EXISTS transfer_note TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'route_connections_connection_type_check'
      AND conrelid = 'app_siena_maps.route_connections'::regclass
  ) THEN
    ALTER TABLE app_siena_maps.route_connections
      ADD CONSTRAINT route_connections_connection_type_check
      CHECK (connection_type IN ('outdoor_routed', 'internal_transfer'));
  END IF;
END $$;

COMMIT;
