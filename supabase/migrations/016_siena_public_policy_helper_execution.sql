begin;

-- Published-row policies may evaluate these helpers for anonymous visitors.
-- Permit execution, but bind every lookup to the caller's own Auth identity.
-- An anonymous caller has no auth.uid(), so both helpers always return false.
create or replace function app_siena_maps.is_app_member(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select p_user_id is not null
     and p_user_id is not distinct from auth.uid()
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
  select p_user_id is not null
     and p_user_id is not distinct from auth.uid()
     and app_siena_maps.is_app_member(p_user_id)
     and exists (
       select 1
       from app_siena_maps.profiles p
       where p.id = p_user_id
         and p.is_active = true
     );
$function$;

revoke all on function app_siena_maps.is_app_member(uuid) from public;
revoke all on function app_siena_maps.has_app_access(uuid) from public;
grant execute on function app_siena_maps.is_app_member(uuid) to anon, authenticated, service_role;
grant execute on function app_siena_maps.has_app_access(uuid) to anon, authenticated, service_role;

do $check$
begin
  if not has_function_privilege(
    'anon',
    'app_siena_maps.is_app_member(uuid)',
    'execute'
  ) or not has_function_privilege(
    'anon',
    'app_siena_maps.has_app_access(uuid)',
    'execute'
  ) then
    raise exception 'Anonymous policy-helper execution grants were not applied';
  end if;
end
$check$;

commit;
