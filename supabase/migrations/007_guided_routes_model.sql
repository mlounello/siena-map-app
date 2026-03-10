BEGIN;

CREATE TABLE IF NOT EXISTS app_siena_maps.guided_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES app_siena_maps.maps(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Primary Guided Route',
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES app_siena_maps.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES app_siena_maps.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guided_routes_map_primary_unique
  ON app_siena_maps.guided_routes(map_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_guided_routes_map
  ON app_siena_maps.guided_routes(map_id);

CREATE TRIGGER guided_routes_updated_at
  BEFORE UPDATE ON app_siena_maps.guided_routes
  FOR EACH ROW
  EXECUTE FUNCTION app_siena_maps.update_updated_at();

CREATE TABLE IF NOT EXISTS app_siena_maps.guided_route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guided_route_id UUID NOT NULL REFERENCES app_siena_maps.guided_routes(id) ON DELETE CASCADE,
  poi_id UUID NOT NULL REFERENCES app_siena_maps.pois(id) ON DELETE CASCADE,
  stop_number INTEGER NOT NULL CHECK (stop_number >= 1),
  created_by UUID REFERENCES app_siena_maps.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (guided_route_id, stop_number),
  UNIQUE (guided_route_id, poi_id)
);

CREATE INDEX IF NOT EXISTS idx_guided_route_stops_route
  ON app_siena_maps.guided_route_stops(guided_route_id, stop_number);

ALTER TABLE app_siena_maps.guided_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_siena_maps.guided_route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY guided_routes_read_public_or_internal
  ON app_siena_maps.guided_routes FOR SELECT
  USING (
    (
      auth.role() = 'anon'
      AND EXISTS (
        SELECT 1
        FROM app_siena_maps.maps m
        WHERE m.id = guided_routes.map_id
          AND m.publication_status = 'published'
          AND m.visibility IN ('public', 'unlisted')
      )
    )
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY guided_routes_manage_map_editors
  ON app_siena_maps.guided_routes FOR ALL
  USING (app_siena_maps.can_edit_map(map_id))
  WITH CHECK (app_siena_maps.can_edit_map(map_id));

CREATE POLICY guided_route_stops_read_public_or_internal
  ON app_siena_maps.guided_route_stops FOR SELECT
  USING (
    (
      auth.role() = 'anon'
      AND EXISTS (
        SELECT 1
        FROM app_siena_maps.guided_routes gr
        JOIN app_siena_maps.maps m ON m.id = gr.map_id
        WHERE gr.id = guided_route_stops.guided_route_id
          AND m.publication_status = 'published'
          AND m.visibility IN ('public', 'unlisted')
      )
    )
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY guided_route_stops_manage_map_editors
  ON app_siena_maps.guided_route_stops FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM app_siena_maps.guided_routes gr
      WHERE gr.id = guided_route_stops.guided_route_id
        AND app_siena_maps.can_edit_map(gr.map_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_siena_maps.guided_routes gr
      WHERE gr.id = guided_route_stops.guided_route_id
        AND app_siena_maps.can_edit_map(gr.map_id)
    )
  );

COMMIT;
