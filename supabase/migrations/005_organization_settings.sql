-- 005_organization_settings.sql
-- Organization settings (1:1 with organizations)

create table if not exists public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  timezone text not null,
  business_hours jsonb,
  sla_first_response_minutes integer default 30,
  sla_followup_minutes integer default 1440,
  branding jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz
);

create unique index if not exists org_settings_org_idx on public.organization_settings (organization_id);

-- Enable RLS for the table (policies will be added in rls_helpers.sql)
alter table public.organization_settings enable row level security;