-- 004_roles_permissions.sql
-- Roles and Permissions tables

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz
);

create unique index if not exists roles_org_name_idx on public.roles (organization_id, name);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  resource text not null,
  action text not null,
  allowed boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz
);

create index if not exists perms_role_idx on public.permissions (role_id);