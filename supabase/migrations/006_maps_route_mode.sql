BEGIN;

ALTER TABLE app_siena_maps.maps
  ADD COLUMN IF NOT EXISTS route_mode TEXT NOT NULL DEFAULT 'walking'
  CHECK (route_mode IN ('walking', 'driving'));

COMMIT;

