CREATE OR REPLACE FUNCTION app_siena_maps.can_view_map(target_map UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_siena_maps.maps m
    WHERE m.id = target_map
      AND (
        app_siena_maps.has_min_role('super_admin')
        OR EXISTS (
          SELECT 1
          FROM app_siena_maps.department_memberships dm
          WHERE dm.department_id = m.primary_department_id
            AND dm.user_id = auth.uid()
            AND dm.role IN ('department_head', 'editor', 'viewer')
        )
        OR EXISTS (
          SELECT 1
          FROM app_siena_maps.map_departments md
          JOIN app_siena_maps.department_memberships dm
            ON dm.department_id = md.department_id
          WHERE md.map_id = m.id
            AND dm.user_id = auth.uid()
            AND dm.role IN ('department_head', 'editor', 'viewer')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION app_siena_maps.can_view_poi(target_poi UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_siena_maps.pois p
    WHERE p.id = target_poi
      AND (
        app_siena_maps.has_min_role('super_admin')
        OR app_siena_maps.can_view_map(p.map_id)
        OR EXISTS (
          SELECT 1
          FROM app_siena_maps.department_memberships dm
          WHERE dm.department_id = p.owning_department_id
            AND dm.user_id = auth.uid()
            AND dm.role IN ('department_head', 'editor', 'viewer')
        )
      )
  );
$$;

DROP POLICY IF EXISTS maps_public_read ON app_siena_maps.maps;
CREATE POLICY maps_public_read
  ON app_siena_maps.maps FOR SELECT
  USING (
    (
      auth.role() = 'anon'
      AND publication_status = 'published'
      AND visibility IN ('public', 'unlisted')
    )
    OR (
      auth.uid() IS NOT NULL
      AND app_siena_maps.can_view_map(id)
    )
  );

DROP POLICY IF EXISTS pois_read_public_or_internal ON app_siena_maps.pois;
CREATE POLICY pois_read_public_or_internal
  ON app_siena_maps.pois FOR SELECT
  USING (
    (
      auth.role() = 'anon'
      AND status = 'published'
      AND EXISTS (
        SELECT 1
        FROM app_siena_maps.maps m
        WHERE m.id = pois.map_id
          AND m.publication_status = 'published'
          AND m.visibility IN ('public', 'unlisted')
      )
    )
    OR (
      auth.uid() IS NOT NULL
      AND app_siena_maps.can_view_poi(id)
    )
  );

DROP POLICY IF EXISTS route_connections_read_public_or_internal ON app_siena_maps.route_connections;
CREATE POLICY route_connections_read_public_or_internal
  ON app_siena_maps.route_connections FOR SELECT
  USING (
    (
      auth.role() = 'anon'
      AND status = 'published'
      AND EXISTS (
        SELECT 1
        FROM app_siena_maps.maps m
        WHERE m.id = route_connections.map_id
          AND m.publication_status = 'published'
          AND m.visibility IN ('public', 'unlisted')
      )
    )
    OR (
      auth.uid() IS NOT NULL
      AND app_siena_maps.can_view_map(map_id)
    )
  );
