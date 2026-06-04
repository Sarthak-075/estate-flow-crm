-- 003_profiles.sql
-- Profiles table (1:1 with auth.users)

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null,
  full_name text,
  email text not null,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz
);

create index if not exists profiles_org_idx on public.profiles (organization_id);
