-- 005_team_members.sql
-- Team members linking profiles to organizations with roles

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  invited_at timestamptz,
  status text check (status in ('active','pending','removed')) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz
);

create unique index if not exists team_members_org_profile_idx on public.team_members (organization_id, profile_id);

-- Enable RLS
alter table public.team_members enable row level security;

-- Policy: owners and admins can see all; members can see their own rows
create policy "owner_admin_all" on public.team_members
  using (public.is_owner() or public.is_admin());

create policy "member_self" on public.team_members
  using (auth.jwt() ->> 'sub' = team_members.profile_id::text);

-- Insert/Update/Delete allowed for owners and admins only
create policy "owner_admin_modify" on public.team_members
  for all using (public.is_owner() or public.is_admin()) with check (public.is_owner() or public.is_admin());
