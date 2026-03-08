CREATE OR REPLACE FUNCTION app_siena_maps.bootstrap_owner(target_email TEXT)
RETURNS TABLE (id UUID, email TEXT, role app_siena_maps.platform_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_siena_maps, public, auth
AS $$
DECLARE
  current_profile app_siena_maps.profiles%ROWTYPE;
  existing_owner app_siena_maps.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO current_profile
  FROM app_siena_maps.profiles
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF lower(coalesce(current_profile.email, '')) <> lower(coalesce(target_email, '')) THEN
    RAISE EXCEPTION 'Authenticated user email does not match OWNER_EMAIL';
  END IF;

  SELECT *
  INTO existing_owner
  FROM app_siena_maps.profiles
  WHERE role = 'owner'
  LIMIT 1;

  IF FOUND AND existing_owner.id <> current_profile.id THEN
    RAISE EXCEPTION 'Owner role already assigned';
  END IF;

  UPDATE app_siena_maps.profiles
  SET role = 'owner'
  WHERE id = current_profile.id;

  RETURN QUERY
  SELECT p.id, p.email, p.role
  FROM app_siena_maps.profiles p
  WHERE p.id = current_profile.id;
END;
$$;

REVOKE ALL ON FUNCTION app_siena_maps.bootstrap_owner(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_siena_maps.bootstrap_owner(TEXT) TO authenticated;
