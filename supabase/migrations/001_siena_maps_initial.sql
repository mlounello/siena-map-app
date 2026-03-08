-- Siena Maps Platform
-- Initial schema for MVP

CREATE SCHEMA IF NOT EXISTS app_siena_maps;

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE app_siena_maps.platform_role AS ENUM (
  'owner',
  'super_admin',
  'department_head',
  'editor',
  'viewer'
);

CREATE TYPE app_siena_maps.department_role AS ENUM (
  'department_head',
  'editor',
  'viewer'
);

CREATE TYPE app_siena_maps.map_visibility AS ENUM (
  'public',
  'unlisted',
  'internal_only'
);

CREATE TYPE app_siena_maps.map_type AS ENUM (
  'geographic_osm',
  'custom_image',
  'floorplan'
);

CREATE TYPE app_siena_maps.map_shell_status AS ENUM (
  'draft',
  'submitted_for_review',
  'approved',
  'rejected',
  'archived'
);

CREATE TYPE app_siena_maps.publication_status AS ENUM (
  'unpublished',
  'published',
  'archived'
);

CREATE TYPE app_siena_maps.poi_status AS ENUM (
  'draft',
  'submitted_for_review',
  'approved',
  'published',
  'rejected',
  'archived'
);

CREATE TYPE app_siena_maps.display_mode AS ENUM (
  'explore_only',
  'guided_only',
  'both'
);

CREATE TYPE app_siena_maps.review_status AS ENUM (
  'approved',
  'rejected'
);

CREATE TYPE app_siena_maps.asset_type AS ENUM (
  'poi_image',
  'pin_icon',
  'map_asset'
);

-- ============================================
-- SHARED TRIGGERS/FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION app_siena_maps.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PROFILES
-- ============================================

CREATE TABLE app_siena_maps.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role app_siena_maps.platform_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One protected owner maximum (matches final governance decision)
CREATE UNIQUE INDEX uq_siena_maps_single_owner
  ON app_siena_maps.profiles ((role))
  WHERE role = 'owner';

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON app_siena_maps.profiles
  FOR EACH ROW EXECUTE FUNCTION app_siena_maps.update_updated_at();

CREATE OR REPLACE FUNCTION app_siena_maps.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_siena_maps.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_siena_maps ON auth.users;
CREATE TRIGGER on_auth_user_created_siena_maps
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION app_siena_maps.handle_new_user();

CREATE OR REPLACE FUNCTION app_siena_maps.prevent_owner_demotion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'owner' AND NEW.role <> 'owner' THEN
    RAISE EXCEPTION 'Owner role cannot be demoted';
  END IF;

  IF OLD.role = 'owner' AND OLD.id <> auth.uid() THEN
    RAISE EXCEPTION 'Only owner can edit owner profile';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_owner_guard
  BEFORE UPDATE ON app_siena_maps.profiles
  FOR EACH ROW EXECUTE FUNCTION app_siena_maps.prevent_owner_demotion();

-- ============================================
-- DEPARTMENTS AND MEMBERSHIPS
-- ============================================

CREATE TABLE app_siena_maps.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES app_siena_maps.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON app_siena_maps.departments
  FOR EACH ROW EXECUTE FUNCTION app_siena_maps.update_updated_at();

CREATE TABLE app_siena_maps.department_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES app_siena_maps.departments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_siena_maps.profiles(id) ON DELETE CASCADE,
  role app_siena_maps.department_role NOT NULL,
  created_by UUID REFERENCES app_siena_maps.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(department_id, user_id)
);

CREATE INDEX idx_department_memberships_user
  ON app_siena_maps.department_memberships(user_id);

-- ============================================
-- TAXONOMY
-- ============================================

CREATE TABLE app_siena_maps.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES app_siena_maps.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON app_siena_maps.categories
  FOR EACH ROW EXECUTE FUNCTION app_siena_maps.update_updated_at();

-- ============================================
-- MAPS
-- ============================================

CREATE TABLE app_siena_maps.maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  intro_text TEXT,

  primary_department_id UUID NOT NULL REFERENCES app_siena_maps.departments(id),

  visibility app_siena_maps.map_visibility NOT NULL DEFAULT 'internal_only',
  map_type app_siena_maps.map_type NOT NULL DEFAULT 'geographic_osm',

  shell_status app_siena_maps.map_shell_status NOT NULL DEFAULT 'draft',
  publication_status app_siena_maps.publication_status NOT NULL DEFAULT 'unpublished',

  display_mode app_siena_maps.display_mode NOT NULL DEFAULT 'both',

  default_center_lat NUMERIC(9, 6),
  default_center_lng NUMERIC(9, 6),
  default_zoom INTEGER NOT NULL DEFAULT 16,

  show_sidebar BOOLEAN NOT NULL DEFAULT TRUE,
  show_legend BOOLEAN NOT NULL DEFAULT TRUE,
  show_search BOOLEAN NOT NULL DEFAULT TRUE,
  show_tour_panel BOOLEAN NOT NULL DEFAULT TRUE,
  show_branding BOOLEAN NOT NULL DEFAULT TRUE,
  show_cta BOOLEAN NOT NULL DEFAULT TRUE,

  theme_preset TEXT NOT NULL DEFAULT 'siena_default',

  created_by UUID REFERENCES app_siena_maps.profiles(id),
  updated_by UUID REFERENCES app_siena_maps.profiles(id),
  approved_by UUID REFERENCES app_siena_maps.profiles(id),
  published_by UUID REFERENCES app_siena_maps.profiles(id),

  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  scheduled_publish_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maps_primary_department ON app_siena_maps.maps(primary_department_id);
CREATE INDEX idx_maps_visibility ON app_siena_maps.maps(visibility);
CREATE INDEX idx_maps_shell_status ON app_siena_maps.maps(shell_status);
CREATE INDEX idx_maps_publication_status ON app_siena_maps.maps(publication_status);

CREATE TRIGGER maps_updated_at
  BEFORE UPDATE ON app_siena_maps.maps
  FOR EACH ROW EXECUTE FUNCTION app_siena_maps.update_updated_at();

CREATE TABLE app_siena_maps.map_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES app_siena_maps.maps(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES app_siena_maps.departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(map_id, department_id)
);

CREATE INDEX idx_map_departments_department ON app_siena_maps.map_departments(department_id);

-- ============================================
-- MEDIA ASSETS
-- ============================================

CREATE TABLE app_siena_maps.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type app_siena_maps.asset_type NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  file_size_bytes BIGINT,
  uploaded_by UUID REFERENCES app_siena_maps.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- POIS
-- ============================================

CREATE TABLE app_siena_maps.pois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES app_siena_maps.maps(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  image_asset_id UUID REFERENCES app_siena_maps.media_assets(id),

  pin_color TEXT,
  pin_icon_asset_id UUID REFERENCES app_siena_maps.media_assets(id),

  latitude NUMERIC(9, 6) NOT NULL,
  longitude NUMERIC(9, 6) NOT NULL,

  category_id UUID REFERENCES app_siena_maps.categories(id),

  owning_department_id UUID NOT NULL REFERENCES app_siena_maps.departments(id),
  created_by UUID REFERENCES app_siena_maps.profiles(id),
  updated_by UUID REFERENCES app_siena_maps.profiles(id),

  status app_siena_maps.poi_status NOT NULL DEFAULT 'draft',

  -- Separate approval and publication states
  approved_by UUID REFERENCES app_siena_maps.profiles(id),
  approved_at TIMESTAMPTZ,
  published_by UUID REFERENCES app_siena_maps.profiles(id),
  published_at TIMESTAMPTZ,
  scheduled_publish_at TIMESTAMPTZ,
  publish_on_approval BOOLEAN NOT NULL DEFAULT TRUE,

  rejection_note TEXT,

  stop_number INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pois_map_id ON app_siena_maps.pois(map_id);
CREATE INDEX idx_pois_status ON app_siena_maps.pois(status);
CREATE INDEX idx_pois_department ON app_siena_maps.pois(owning_department_id);
CREATE INDEX idx_pois_category ON app_siena_maps.pois(category_id);
CREATE INDEX idx_pois_stop_number ON app_siena_maps.pois(map_id, stop_number);

CREATE TRIGGER pois_updated_at
  BEFORE UPDATE ON app_siena_maps.pois
  FOR EACH ROW EXECUTE FUNCTION app_siena_maps.update_updated_at();

-- ============================================
-- ROUTE CONNECTIONS (EXPLICIT MAP ROUTES)
-- ============================================

CREATE TABLE app_siena_maps.route_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES app_siena_maps.maps(id) ON DELETE CASCADE,
  from_poi_id UUID NOT NULL REFERENCES app_siena_maps.pois(id) ON DELETE CASCADE,
  to_poi_id UUID NOT NULL REFERENCES app_siena_maps.pois(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  line_style TEXT DEFAULT 'solid',
  line_color TEXT,
  line_thickness INTEGER NOT NULL DEFAULT 4,
  is_directional BOOLEAN NOT NULL DEFAULT FALSE,
  label TEXT,
  status app_siena_maps.publication_status NOT NULL DEFAULT 'unpublished',
  created_by UUID REFERENCES app_siena_maps.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(map_id, order_index)
);

CREATE INDEX idx_route_connections_map ON app_siena_maps.route_connections(map_id);

CREATE TRIGGER route_connections_updated_at
  BEFORE UPDATE ON app_siena_maps.route_connections
  FOR EACH ROW EXECUTE FUNCTION app_siena_maps.update_updated_at();

-- ============================================
-- MODERATION / REVIEW QUEUES
-- ============================================

CREATE TABLE app_siena_maps.map_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES app_siena_maps.maps(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES app_siena_maps.profiles(id),
  reviewed_by UUID REFERENCES app_siena_maps.profiles(id),
  status app_siena_maps.review_status NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(map_id, created_at)
);

CREATE TABLE app_siena_maps.poi_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id UUID NOT NULL REFERENCES app_siena_maps.pois(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES app_siena_maps.profiles(id),
  reviewed_by UUID REFERENCES app_siena_maps.profiles(id),
  status app_siena_maps.review_status NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(poi_id, created_at)
);

-- ============================================
-- EMBED CONFIGS (SAVEABLE PRESETS)
-- ============================================

CREATE TABLE app_siena_maps.embed_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES app_siena_maps.maps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  width TEXT NOT NULL DEFAULT '100%',
  height TEXT NOT NULL DEFAULT '600px',
  theme TEXT,
  show_legend BOOLEAN NOT NULL DEFAULT TRUE,
  show_search BOOLEAN NOT NULL DEFAULT TRUE,
  show_sidebar BOOLEAN NOT NULL DEFAULT TRUE,
  show_tour_panel BOOLEAN NOT NULL DEFAULT TRUE,
  show_branding BOOLEAN NOT NULL DEFAULT TRUE,
  show_cta BOOLEAN NOT NULL DEFAULT TRUE,
  default_mode app_siena_maps.display_mode NOT NULL DEFAULT 'both',
  start_poi_id UUID REFERENCES app_siena_maps.pois(id),
  created_by UUID NOT NULL REFERENCES app_siena_maps.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER embed_configs_updated_at
  BEFORE UPDATE ON app_siena_maps.embed_configs
  FOR EACH ROW EXECUTE FUNCTION app_siena_maps.update_updated_at();

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE app_siena_maps.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES app_siena_maps.profiles(id),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON app_siena_maps.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON app_siena_maps.audit_logs(created_at DESC);

-- ============================================
-- HELPERS FOR AUTH/RLS
-- ============================================

CREATE OR REPLACE FUNCTION app_siena_maps.get_current_role()
RETURNS app_siena_maps.platform_role AS $$
  SELECT COALESCE(
    (SELECT role FROM app_siena_maps.profiles WHERE id = auth.uid()),
    'viewer'::app_siena_maps.platform_role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION app_siena_maps.role_rank(role_value app_siena_maps.platform_role)
RETURNS INTEGER AS $$
  SELECT CASE role_value
    WHEN 'viewer' THEN 10
    WHEN 'editor' THEN 20
    WHEN 'department_head' THEN 30
    WHEN 'super_admin' THEN 40
    WHEN 'owner' THEN 50
    ELSE 0
  END;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION app_siena_maps.has_min_role(required_role app_siena_maps.platform_role)
RETURNS BOOLEAN AS $$
  SELECT app_siena_maps.role_rank(app_siena_maps.get_current_role()) >= app_siena_maps.role_rank(required_role);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION app_siena_maps.is_department_member(target_department UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_siena_maps.department_memberships dm
    WHERE dm.department_id = target_department
      AND dm.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION app_siena_maps.is_department_head(target_department UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_siena_maps.department_memberships dm
    WHERE dm.department_id = target_department
      AND dm.user_id = auth.uid()
      AND dm.role = 'department_head'
  ) OR app_siena_maps.has_min_role('super_admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION app_siena_maps.can_edit_map(target_map UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_siena_maps.maps m
    WHERE m.id = target_map
      AND (
        app_siena_maps.has_min_role('super_admin')
        OR app_siena_maps.is_department_head(m.primary_department_id)
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

-- ============================================
-- RLS
-- ============================================

ALTER TABLE app_siena_maps.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_siena_maps.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_siena_maps.department_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_siena_maps.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_siena_maps.maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_siena_maps.map_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_siena_maps.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_siena_maps.pois ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_siena_maps.route_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_siena_maps.map_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_siena_maps.poi_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_siena_maps.embed_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_siena_maps.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY profiles_select_authenticated
  ON app_siena_maps.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY profiles_update_self
  ON app_siena_maps.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_admin
  ON app_siena_maps.profiles FOR UPDATE
  USING (app_siena_maps.has_min_role('super_admin'))
  WITH CHECK (app_siena_maps.has_min_role('super_admin'));

-- Departments
CREATE POLICY departments_select_authenticated
  ON app_siena_maps.departments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY departments_manage_super_admin
  ON app_siena_maps.departments FOR ALL
  USING (app_siena_maps.has_min_role('super_admin'))
  WITH CHECK (app_siena_maps.has_min_role('super_admin'));

-- Department memberships
CREATE POLICY dept_memberships_select_authenticated
  ON app_siena_maps.department_memberships FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY dept_memberships_insert_admin_or_head
  ON app_siena_maps.department_memberships FOR INSERT
  WITH CHECK (
    app_siena_maps.has_min_role('super_admin')
    OR app_siena_maps.is_department_head(department_id)
  );

CREATE POLICY dept_memberships_update_admin_or_head
  ON app_siena_maps.department_memberships FOR UPDATE
  USING (
    app_siena_maps.has_min_role('super_admin')
    OR app_siena_maps.is_department_head(department_id)
  )
  WITH CHECK (
    app_siena_maps.has_min_role('super_admin')
    OR app_siena_maps.is_department_head(department_id)
  );

-- Categories (global library)
CREATE POLICY categories_public_select
  ON app_siena_maps.categories FOR SELECT
  USING (true);

CREATE POLICY categories_manage_super_admin
  ON app_siena_maps.categories FOR ALL
  USING (app_siena_maps.has_min_role('super_admin'))
  WITH CHECK (app_siena_maps.has_min_role('super_admin'));

-- Maps
CREATE POLICY maps_public_read
  ON app_siena_maps.maps FOR SELECT
  USING (
    (
      auth.role() = 'anon'
      AND publication_status = 'published'
      AND visibility IN ('public', 'unlisted')
    )
    OR (auth.uid() IS NOT NULL)
  );

CREATE POLICY maps_insert_department_head_up
  ON app_siena_maps.maps FOR INSERT
  WITH CHECK (
    app_siena_maps.has_min_role('super_admin')
    OR app_siena_maps.is_department_head(primary_department_id)
  );

CREATE POLICY maps_update_editorial_access
  ON app_siena_maps.maps FOR UPDATE
  USING (app_siena_maps.can_edit_map(id))
  WITH CHECK (app_siena_maps.can_edit_map(id));

CREATE POLICY maps_delete_super_admin_up
  ON app_siena_maps.maps FOR DELETE
  USING (app_siena_maps.has_min_role('super_admin'));

-- Map collaborator departments
CREATE POLICY map_departments_select_authenticated
  ON app_siena_maps.map_departments FOR SELECT
  USING (auth.uid() IS NOT NULL OR auth.role() = 'anon');

CREATE POLICY map_departments_manage_editors
  ON app_siena_maps.map_departments FOR ALL
  USING (app_siena_maps.can_edit_map(map_id))
  WITH CHECK (app_siena_maps.can_edit_map(map_id));

-- Media assets
CREATE POLICY media_assets_select_authenticated
  ON app_siena_maps.media_assets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY media_assets_insert_editor_up
  ON app_siena_maps.media_assets FOR INSERT
  WITH CHECK (app_siena_maps.has_min_role('editor'));

-- POIs
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
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY pois_insert_editor_up
  ON app_siena_maps.pois FOR INSERT
  WITH CHECK (
    app_siena_maps.has_min_role('editor')
    AND app_siena_maps.can_edit_map(map_id)
  );

CREATE POLICY pois_update_editorial_access
  ON app_siena_maps.pois FOR UPDATE
  USING (
    app_siena_maps.can_edit_map(map_id)
    OR created_by = auth.uid()
  )
  WITH CHECK (
    app_siena_maps.can_edit_map(map_id)
    OR created_by = auth.uid()
  );

CREATE POLICY pois_delete_super_admin_up
  ON app_siena_maps.pois FOR DELETE
  USING (app_siena_maps.has_min_role('super_admin'));

-- Route connections
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
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY route_connections_manage_map_editors
  ON app_siena_maps.route_connections FOR ALL
  USING (app_siena_maps.can_edit_map(map_id))
  WITH CHECK (app_siena_maps.can_edit_map(map_id));

-- Reviews
CREATE POLICY map_reviews_select_authenticated
  ON app_siena_maps.map_reviews FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY map_reviews_insert_department_head_up
  ON app_siena_maps.map_reviews FOR INSERT
  WITH CHECK (app_siena_maps.has_min_role('department_head'));

CREATE POLICY poi_reviews_select_authenticated
  ON app_siena_maps.poi_reviews FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY poi_reviews_insert_department_head_up
  ON app_siena_maps.poi_reviews FOR INSERT
  WITH CHECK (app_siena_maps.has_min_role('department_head'));

-- Embed configs
CREATE POLICY embed_configs_read_authenticated
  ON app_siena_maps.embed_configs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY embed_configs_manage_map_controllers
  ON app_siena_maps.embed_configs FOR ALL
  USING (app_siena_maps.can_edit_map(map_id))
  WITH CHECK (app_siena_maps.can_edit_map(map_id));

-- Audit logs
CREATE POLICY audit_logs_read_department_head_up
  ON app_siena_maps.audit_logs FOR SELECT
  USING (app_siena_maps.has_min_role('department_head'));

CREATE POLICY audit_logs_insert_editor_up
  ON app_siena_maps.audit_logs FOR INSERT
  WITH CHECK (app_siena_maps.has_min_role('editor'));
