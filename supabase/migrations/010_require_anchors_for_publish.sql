ALTER TABLE app_siena_maps.maps
  ADD COLUMN IF NOT EXISTS require_anchors_for_publish BOOLEAN NOT NULL DEFAULT FALSE;
