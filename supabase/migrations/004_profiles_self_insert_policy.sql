-- Allow authenticated users to create their own profile row if missing.
-- This covers legacy users created before trigger installation and supports
-- callback-time profile self-healing without service-role keys.

CREATE POLICY profiles_insert_self
  ON app_siena_maps.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
