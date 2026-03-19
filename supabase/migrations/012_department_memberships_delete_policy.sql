CREATE POLICY dept_memberships_delete_admin_or_head
  ON app_siena_maps.department_memberships FOR DELETE
  USING (
    app_siena_maps.has_min_role('super_admin')
    OR app_siena_maps.is_department_head(department_id)
  );
