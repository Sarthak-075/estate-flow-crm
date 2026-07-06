-- 007_audit_logs.sql
-- Audit logs table (immutable record of changes)

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null, -- e.g., 'INSERT', 'UPDATE', 'DELETE'
  resource_type text,
  resource_id uuid,
  before jsonb,
  after jsonb,
  ip_address inet,
  created_at timestamptz default now()
);

create index if not exists audit_logs_org_idx on public.audit_logs (organization_id);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_resource_idx on public.audit_logs (resource_type, resource_id);

-- Enable RLS – owners and admins can read audit logs; others have no access.
alter table public.audit_logs enable row level security;
create policy audit_owner_admin
on public.audit_logs
using (public.is_owner() or public.is_admin());