CREATE OR REPLACE FUNCTION app_siena_maps.can_edit_map(target_map UUID)
RETURNS BOOLEAN AS $$
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
            AND dm.role IN ('department_head', 'editor')
        )
        OR EXISTS (
          SELECT 1
          FROM app_siena_maps.map_departments md
          JOIN app_siena_maps.department_memberships dm
            ON dm.department_id = md.department_id
          WHERE md.map_id = m.id
            AND dm.user_id = auth.uid()
            AND dm.role IN ('department_head', 'editor')
        )
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
