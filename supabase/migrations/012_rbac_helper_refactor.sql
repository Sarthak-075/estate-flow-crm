-- 010a_rbac_helper_refactor.sql
-- Phase 1.3.1 RBAC Helper Refactor
-----------------------------------

-- Goal:
-- Make team_members the source of truth for organization membership
-- and role resolution.
-----------------------

-- Assumptions:
-- - Phase 1.3 unique active membership constraint exists:
--     team_members_one_active_membership_idx
-- - A profile may have many historical memberships,
--   but only one ACTIVE membership.
------------------------------------

-- This migration is backward-compatible with all existing RLS policies.

---

-- ## current_user_organization()

create or replace function public.current_user_organization()
returns uuid
language plpgsql
stable
as $$
declare
org_id uuid;
begin
select tm.organization_id
into org_id
from public.team_members tm
where tm.profile_id = (auth.jwt() ->> 'sub')::uuid
and tm.status = 'active'
limit 1;

return org_id;
end;
$$;

---

-- ## current_user_role()

create or replace function public.current_user_role()
returns text
language plpgsql
stable
as $$
declare
role_name text;
begin
select r.name
into role_name
from public.team_members tm
join public.roles r
on r.id = tm.role_id
where tm.profile_id = (auth.jwt() ->> 'sub')::uuid
and tm.status = 'active'
limit 1;

return role_name;
end;
$$;

---

-- ## is_owner()

create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
select public.current_user_role() = 'owner';
$$;

---

-- ## is_admin()

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
select public.current_user_role() in ('owner', 'admin');
$$;

---

-- ## Permissions

grant execute on function public.current_user_organization()
to authenticated;

grant execute on function public.current_user_role()
to authenticated;

grant execute on function public.is_owner()
to authenticated;

grant execute on function public.is_admin()
to authenticated;

---

-- ## Documentation

comment on function public.current_user_organization() is
'Returns the organization_id of the current authenticated user from the active team_members row.';

comment on function public.current_user_role() is
'Returns the role name of the current authenticated user from the active team_members row.';

comment on function public.is_owner() is
'Returns true if the current authenticated user has the owner role.';

comment on function public.is_admin() is
'Returns true if the current authenticated user has owner or admin role.';
