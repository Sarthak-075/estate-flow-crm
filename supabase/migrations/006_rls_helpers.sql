-- 
-- ==============================================================
-- RLS Helper Functions
-- Must run before any policies that reference these functions.
-- ==============================================================

-- Returns the current user's organization_id.
create or replace function public.current_user_organization()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid();
$$;

-- Returns the current user's role.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.name
  from public.team_members tm
  join public.roles r
    on r.id = tm.role_id
  where tm.profile_id = auth.uid()
    and tm.organization_id = public.current_user_organization()
    and tm.status = 'active'
  limit 1;
$$;

-- Returns true when the current user is an Owner.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() = 'owner',
    false
  );
$$;

-- Returns true when the current user is an Admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() in ('owner', 'admin'),
    false
  );
$$;
-- ==============================================================
-- Enable RLS on all tables (will be enforced by policies below)
-- ==============================================================

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.team_members enable row level security;
alter table public.organization_settings enable row level security;

-- ==============================================================
-- RLS Policies
-- --------------------------------------------------------------
-- Owners & admins have full access to all tables.
-- Regular members can read/write only their own profile and team membership.
-- ==============================================================

-- Organizations: owners & admins can see all, others none.
create policy org_owner_admin_all on public.organizations
  using (public.is_owner() or public.is_admin())
  with check (public.is_owner() or public.is_admin());

-- Profiles: owners & admins can read/write any; a member can read/write their own profile.
create policy profile_owner_admin_all on public.profiles
  using (public.is_owner() or public.is_admin())
  with check (public.is_owner() or public.is_admin());

create policy profile_self on public.profiles
  using (auth.jwt() ->> 'sub' = id::text)
  with check (auth.jwt() ->> 'sub' = id::text);

-- Roles: owners & admins only.
create policy role_owner_admin on public.roles
  using (public.is_owner() or public.is_admin())
  with check (public.is_owner() or public.is_admin());

-- Permissions: owners & admins only.
create policy permission_owner_admin on public.permissions
  using (public.is_owner() or public.is_admin())
  with check (public.is_owner() or public.is_admin());

-- Team Members: owners & admins full; a member can see/modify their own row.
create policy team_owner_admin_all on public.team_members
  using (public.is_owner() or public.is_admin())
  with check (public.is_owner() or public.is_admin());

create policy team_self on public.team_members
  using (auth.jwt() ->> 'sub' = profile_id::text)
  with check (auth.jwt() ->> 'sub' = profile_id::text);

-- Organization Settings: owners & admins only.
create policy settings_owner_admin on public.organization_settings
  using (public.is_owner() or public.is_admin())
  with check (public.is_owner() or public.is_admin());
