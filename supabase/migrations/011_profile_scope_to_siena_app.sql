ALTER TABLE app_siena_maps.profiles
  ADD COLUMN IF NOT EXISTS has_signed_in_to_app BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_app_sign_in_at TIMESTAMPTZ;

-- Backfill clearly Siena-specific accounts so current admins/editors/members remain visible.
UPDATE app_siena_maps.profiles p
SET
  has_signed_in_to_app = TRUE,
  last_app_sign_in_at = COALESCE(p.last_app_sign_in_at, p.updated_at, p.created_at, NOW())
WHERE
  p.has_signed_in_to_app = FALSE
  AND (
    p.role <> 'viewer'
    OR EXISTS (
      SELECT 1
      FROM app_siena_maps.department_memberships dm
      WHERE dm.user_id = p.id
    )
    OR EXISTS (
      SELECT 1
      FROM app_siena_maps.maps m
      WHERE p.id IN (m.created_by, m.updated_by, m.approved_by, m.published_by)
    )
    OR EXISTS (
      SELECT 1
      FROM app_siena_maps.pois poi
      WHERE p.id IN (poi.created_by, poi.updated_by, poi.approved_by, poi.published_by)
    )
    OR EXISTS (
      SELECT 1
      FROM app_siena_maps.guided_routes gr
      WHERE p.id IN (gr.created_by, gr.updated_by)
    )
    OR EXISTS (
      SELECT 1
      FROM app_siena_maps.route_connections rc
      WHERE rc.created_by = p.id
    )
    OR EXISTS (
      SELECT 1
      FROM app_siena_maps.map_reviews mr
      WHERE p.id IN (mr.submitted_by, mr.reviewed_by)
    )
    OR EXISTS (
      SELECT 1
      FROM app_siena_maps.poi_reviews pr
      WHERE p.id IN (pr.submitted_by, pr.reviewed_by)
    )
    OR EXISTS (
      SELECT 1
      FROM app_siena_maps.embed_configs ec
      WHERE ec.created_by = p.id
    )
    OR EXISTS (
      SELECT 1
      FROM app_siena_maps.audit_log al
      WHERE al.actor_id = p.id
    )
  );

-- Siena profiles should be created when someone actually signs into Siena Maps,
-- not when they sign into any other app sharing the same Supabase project.
DROP TRIGGER IF EXISTS on_auth_user_created_siena_maps ON auth.users;

