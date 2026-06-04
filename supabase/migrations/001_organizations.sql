-- 001_organizations.sql
-- Create the core organizations table

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_active boolean default true
);

-- Unique domain per organization (optional sub‑domain feature)
create unique index if not exists orgs_domain_idx on public.organizations (domain);
