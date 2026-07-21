begin;

do $block$
declare
  v_count integer;
begin
  select count(*) into v_count from core.platform_owners;
  if v_count <> 1 then
    raise exception 'Expected exactly one protected platform owner; found %', v_count;
  end if;

  select count(*) into v_count
  from core.platform_owners o
  join app_siena_maps.profiles p on p.id = o.user_id
  where p.role = 'owner' and p.is_active = true and p.has_signed_in_to_app = true;
  if v_count <> 1 then
    raise exception 'Expected one active signed-in Siena profile for the protected owner; found %', v_count;
  end if;
end
$block$;

insert into core.apps (app_id, name, is_public)
values ('siena_maps', 'Siena Maps', false)
on conflict (app_id) do update
set name = excluded.name,
    is_public = excluded.is_public;

insert into core.app_roles (app_id, role, description)
values
  ('siena_maps', 'admin', 'Siena Maps application administrator entitlement'),
  ('siena_maps', 'member', 'Siena Maps application member entitlement')
on conflict (app_id, role) do update
set description = excluded.description;

-- Seed only users with clear Siena-specific activity. The 21 inherited viewer
-- profiles remain preserved and unchanged, but profile existence alone does
-- not become an application entitlement.
insert into core.app_memberships (user_id, app_id, role, is_active)
select p.id,
       'siena_maps',
       case when p.role in ('owner', 'super_admin') then 'admin' else 'member' end,
       p.is_active
from app_siena_maps.profiles p
where p.has_signed_in_to_app = true
  and (
    p.role <> 'viewer'
    or exists (
      select 1 from app_siena_maps.department_memberships dm where dm.user_id = p.id
    )
  )
on conflict (user_id, app_id) do update
set role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now();

create or replace function core.guard_platform_owner_membership()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if current_user in ('postgres', 'supabase_admin') then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if old.app_id in (
      'alcohol_origins',
      'playbill',
      'production_management',
      'siena_maps',
      'theatre_budget'
    )
    and core.is_platform_owner(old.user_id) then
    if tg_op = 'DELETE' then
      raise exception 'An app cannot remove or demote the platform owner';
    end if;
    if new.user_id is distinct from old.user_id
       or new.app_id is distinct from old.app_id
       or new.role is distinct from 'admin'
       or new.is_active is distinct from true then
      raise exception 'An app cannot remove or demote the platform owner';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

create or replace function app_siena_maps.is_app_member(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select p_user_id is not null
     and (
       core.is_platform_owner(p_user_id)
       or exists (
         select 1
         from core.app_memberships m
         where m.user_id = p_user_id
           and m.app_id = 'siena_maps'
           and m.is_active = true
       )
     );
$function$;

create or replace function app_siena_maps.has_app_access(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select app_siena_maps.is_app_member(p_user_id)
     and exists (
       select 1
       from app_siena_maps.profiles p
       where p.id = p_user_id
         and p.is_active = true
     );
$function$;

revoke all on function app_siena_maps.is_app_member(uuid) from public, anon;
revoke all on function app_siena_maps.has_app_access(uuid) from public, anon;
grant execute on function app_siena_maps.is_app_member(uuid) to authenticated, service_role;
grant execute on function app_siena_maps.has_app_access(uuid) to authenticated, service_role;

-- The protected core owner foundation supersedes the original self-service
-- owner bootstrap path. Retire it so no app session can assign owner status.
drop function if exists app_siena_maps.bootstrap_owner(text);

create or replace function app_siena_maps.get_current_role()
returns app_siena_maps.platform_role
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select case
    when core.is_platform_owner(auth.uid()) then 'owner'::app_siena_maps.platform_role
    else coalesce(
      (
        select p.role
        from app_siena_maps.profiles p
        where p.id = auth.uid()
          and p.is_active = true
          and app_siena_maps.is_app_member(p.id)
      ),
      'viewer'::app_siena_maps.platform_role
    )
  end;
$function$;

create or replace function app_siena_maps.has_min_role(required_role app_siena_maps.platform_role)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select app_siena_maps.has_app_access()
     and app_siena_maps.role_rank(app_siena_maps.get_current_role())
         >= app_siena_maps.role_rank(required_role);
$function$;

create or replace function app_siena_maps.is_department_member(target_department uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select app_siena_maps.has_app_access()
     and exists (
       select 1
       from app_siena_maps.department_memberships dm
       where dm.department_id = target_department
         and dm.user_id = auth.uid()
     );
$function$;

create or replace function app_siena_maps.is_department_head(target_department uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select app_siena_maps.has_app_access()
     and (
       exists (
         select 1
         from app_siena_maps.department_memberships dm
         where dm.department_id = target_department
           and dm.user_id = auth.uid()
           and dm.role = 'department_head'
       )
       or app_siena_maps.has_min_role('super_admin')
     );
$function$;

create or replace function app_siena_maps.can_edit_map(target_map uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select app_siena_maps.has_app_access()
     and exists (
       select 1
       from app_siena_maps.maps m
       where m.id = target_map
         and (
           app_siena_maps.has_min_role('super_admin')
           or exists (
             select 1
             from app_siena_maps.department_memberships dm
             where dm.department_id = m.primary_department_id
               and dm.user_id = auth.uid()
               and dm.role in ('department_head', 'editor')
           )
           or exists (
             select 1
             from app_siena_maps.map_departments md
             join app_siena_maps.department_memberships dm
               on dm.department_id = md.department_id
             where md.map_id = m.id
               and dm.user_id = auth.uid()
               and dm.role in ('department_head', 'editor')
           )
         )
     );
$function$;

create or replace function app_siena_maps.can_view_map(target_map uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select app_siena_maps.has_app_access()
     and exists (
       select 1
       from app_siena_maps.maps m
       where m.id = target_map
         and (
           app_siena_maps.has_min_role('super_admin')
           or exists (
             select 1
             from app_siena_maps.department_memberships dm
             where dm.department_id = m.primary_department_id
               and dm.user_id = auth.uid()
               and dm.role in ('department_head', 'editor', 'viewer')
           )
           or exists (
             select 1
             from app_siena_maps.map_departments md
             join app_siena_maps.department_memberships dm
               on dm.department_id = md.department_id
             where md.map_id = m.id
               and dm.user_id = auth.uid()
               and dm.role in ('department_head', 'editor', 'viewer')
           )
         )
     );
$function$;

create or replace function app_siena_maps.can_view_poi(target_poi uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select app_siena_maps.has_app_access()
     and exists (
       select 1
       from app_siena_maps.pois p
       where p.id = target_poi
         and (
           app_siena_maps.has_min_role('super_admin')
           or app_siena_maps.can_view_map(p.map_id)
           or exists (
             select 1
             from app_siena_maps.department_memberships dm
             where dm.department_id = p.owning_department_id
               and dm.user_id = auth.uid()
               and dm.role in ('department_head', 'editor', 'viewer')
           )
         )
     );
$function$;

create or replace function app_siena_maps.prevent_self_authorization_change()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if current_user in ('postgres', 'supabase_admin') then return new; end if;

  if auth.uid() = old.id
     and (
       new.id is distinct from old.id
       or new.email is distinct from old.email
       or new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
     ) then
    raise exception 'A Siena user cannot change their own identity, role, or access state';
  end if;

  return new;
end;
$function$;

drop trigger if exists profiles_self_authorization_guard on app_siena_maps.profiles;
create trigger profiles_self_authorization_guard
before update on app_siena_maps.profiles
for each row execute function app_siena_maps.prevent_self_authorization_change();

create or replace function app_siena_maps.set_user_access(p_user_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_role app_siena_maps.platform_role;
begin
  if not app_siena_maps.has_min_role('super_admin') then
    raise exception 'Siena super administrator access is required';
  end if;

  if auth.uid() = p_user_id and not p_is_active then
    raise exception 'A Siena administrator cannot disable their own access';
  end if;

  if core.is_platform_owner(p_user_id) and not p_is_active then
    raise exception 'The protected platform owner cannot be deactivated';
  end if;

  select p.role into v_role
  from app_siena_maps.profiles p
  where p.id = p_user_id;

  if v_role is null then
    raise exception 'Siena profile not found';
  end if;

  update app_siena_maps.profiles
  set is_active = p_is_active
  where id = p_user_id;

  insert into core.app_memberships (user_id, app_id, role, is_active)
  values (
    p_user_id,
    'siena_maps',
    case when v_role in ('owner', 'super_admin') then 'admin' else 'member' end,
    p_is_active
  )
  on conflict (user_id, app_id) do update
  set role = excluded.role,
      is_active = excluded.is_active,
      updated_at = now();
end;
$function$;

revoke all on function app_siena_maps.set_user_access(uuid, boolean) from public, anon;
grant execute on function app_siena_maps.set_user_access(uuid, boolean) to authenticated;

drop policy if exists profiles_select_authenticated on app_siena_maps.profiles;
create policy profiles_select_siena_members
  on app_siena_maps.profiles for select
  using (app_siena_maps.has_app_access());

drop policy if exists profiles_insert_self on app_siena_maps.profiles;
create policy profiles_insert_entitled_self
  on app_siena_maps.profiles for insert
  with check (auth.uid() = id and app_siena_maps.is_app_member(id));

drop policy if exists profiles_update_self on app_siena_maps.profiles;
create policy profiles_update_active_self
  on app_siena_maps.profiles for update
  using (auth.uid() = id and app_siena_maps.has_app_access())
  with check (auth.uid() = id and app_siena_maps.has_app_access());

drop policy if exists departments_select_authenticated on app_siena_maps.departments;
create policy departments_select_siena_members
  on app_siena_maps.departments for select
  using (app_siena_maps.has_app_access());

drop policy if exists dept_memberships_select_authenticated on app_siena_maps.department_memberships;
create policy dept_memberships_select_siena_members
  on app_siena_maps.department_memberships for select
  using (app_siena_maps.has_app_access());

drop policy if exists media_assets_select_authenticated on app_siena_maps.media_assets;
create policy media_assets_select_siena_members
  on app_siena_maps.media_assets for select
  using (app_siena_maps.has_app_access());

drop policy if exists map_reviews_select_authenticated on app_siena_maps.map_reviews;
create policy map_reviews_select_siena_members
  on app_siena_maps.map_reviews for select
  using (app_siena_maps.has_app_access());

drop policy if exists poi_reviews_select_authenticated on app_siena_maps.poi_reviews;
create policy poi_reviews_select_siena_members
  on app_siena_maps.poi_reviews for select
  using (app_siena_maps.has_app_access());

drop policy if exists embed_configs_read_authenticated on app_siena_maps.embed_configs;
create policy embed_configs_read_siena_members
  on app_siena_maps.embed_configs for select
  using (app_siena_maps.has_app_access());

drop policy if exists maps_public_read on app_siena_maps.maps;
create policy maps_public_read
  on app_siena_maps.maps for select
  using (
    (publication_status = 'published' and visibility in ('public', 'unlisted'))
    or app_siena_maps.can_view_map(id)
  );

drop policy if exists pois_read_public_or_internal on app_siena_maps.pois;
create policy pois_read_public_or_internal
  on app_siena_maps.pois for select
  using (
    (
      status = 'published'
      and exists (
        select 1
        from app_siena_maps.maps m
        where m.id = pois.map_id
          and m.publication_status = 'published'
          and m.visibility in ('public', 'unlisted')
      )
    )
    or app_siena_maps.can_view_poi(id)
  );

drop policy if exists pois_update_editorial_access on app_siena_maps.pois;
create policy pois_update_editorial_access
  on app_siena_maps.pois for update
  using (
    app_siena_maps.has_app_access()
    and (app_siena_maps.can_edit_map(map_id) or created_by = auth.uid())
  )
  with check (
    app_siena_maps.has_app_access()
    and (app_siena_maps.can_edit_map(map_id) or created_by = auth.uid())
  );

drop policy if exists route_connections_read_public_or_internal on app_siena_maps.route_connections;
create policy route_connections_read_public_or_internal
  on app_siena_maps.route_connections for select
  using (
    (
      status = 'published'
      and exists (
        select 1
        from app_siena_maps.maps m
        where m.id = route_connections.map_id
          and m.publication_status = 'published'
          and m.visibility in ('public', 'unlisted')
      )
    )
    or app_siena_maps.can_view_map(map_id)
  );

drop policy if exists map_departments_select_authenticated on app_siena_maps.map_departments;
create policy map_departments_read_public_or_internal
  on app_siena_maps.map_departments for select
  using (
    exists (
      select 1
      from app_siena_maps.maps m
      where m.id = map_departments.map_id
        and m.publication_status = 'published'
        and m.visibility in ('public', 'unlisted')
    )
    or app_siena_maps.can_view_map(map_id)
  );

drop policy if exists guided_routes_read_public_or_internal on app_siena_maps.guided_routes;
create policy guided_routes_read_public_or_internal
  on app_siena_maps.guided_routes for select
  using (
    exists (
      select 1
      from app_siena_maps.maps m
      where m.id = guided_routes.map_id
        and m.publication_status = 'published'
        and m.visibility in ('public', 'unlisted')
    )
    or app_siena_maps.can_view_map(map_id)
  );

drop policy if exists guided_route_stops_read_public_or_internal on app_siena_maps.guided_route_stops;
create policy guided_route_stops_read_public_or_internal
  on app_siena_maps.guided_route_stops for select
  using (
    exists (
      select 1
      from app_siena_maps.guided_routes gr
      join app_siena_maps.maps m on m.id = gr.map_id
      where gr.id = guided_route_stops.guided_route_id
        and m.publication_status = 'published'
        and m.visibility in ('public', 'unlisted')
    )
    or exists (
      select 1
      from app_siena_maps.guided_routes gr
      where gr.id = guided_route_stops.guided_route_id
        and app_siena_maps.can_view_map(gr.map_id)
    )
  );

do $block$
declare
  v_count integer;
begin
  select count(*) into v_count from core.apps where app_id = 'siena_maps' and is_public = false;
  if v_count <> 1 then raise exception 'Siena app registration failed'; end if;

  select count(*) into v_count from core.app_roles where app_id = 'siena_maps';
  if v_count <> 2 then raise exception 'Expected two Siena entitlement roles; found %', v_count; end if;

  select count(*) into v_count
  from core.app_memberships m
  join app_siena_maps.profiles p on p.id = m.user_id
  where m.app_id = 'siena_maps'
    and m.is_active = p.is_active
    and p.has_signed_in_to_app = true
    and (p.role <> 'viewer' or exists (
      select 1 from app_siena_maps.department_memberships dm where dm.user_id = p.id
    ));
  if v_count < 1 then raise exception 'No clearly active Siena memberships were seeded'; end if;

  select count(*) into v_count
  from core.platform_owners o
  join core.app_memberships m on m.user_id = o.user_id
  where m.app_id = 'siena_maps' and m.role = 'admin' and m.is_active = true;
  if v_count <> 1 then raise exception 'Protected owner Siena membership is not active admin'; end if;
end
$block$;

commit;
