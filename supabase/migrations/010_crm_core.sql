-- 010_crm_core.sql
-- Phase 1.4 CRM Core Domain
-- Leads, Contacts, Pipelines, Pipeline Stages, Deals, Activities

---

## -- Leads

create table if not exists public.leads (
id uuid primary key default gen_random_uuid(),

organization_id uuid not null
references public.organizations(id)
on delete cascade,

first_name text,
last_name text,

email text,
phone text,

source text,

status text not null default 'new'
check (
status in (
'new',
'contacted',
'qualified',
'unqualified',
'converted'
)
),

assigned_to uuid
references public.profiles(id)
on delete set null,

converted_contact_id uuid,

conversion_date timestamptz,

created_at timestamptz default now(),
updated_at timestamptz
);

create index if not exists leads_org_idx
on public.leads (organization_id);

create index if not exists leads_status_idx
on public.leads (status);

create index if not exists leads_assigned_to_idx
on public.leads (assigned_to);

create unique index if not exists leads_org_email_idx
on public.leads (organization_id, email);

---

## -- Contacts

create table if not exists public.contacts (
id uuid primary key default gen_random_uuid(),

organization_id uuid not null
references public.organizations(id)
on delete cascade,

lead_id uuid
references public.leads(id)
on delete set null,

first_name text not null,
last_name text not null,

email text,
phone text,

title text,
department text,

assigned_to uuid
references public.profiles(id)
on delete set null,

created_at timestamptz default now(),
updated_at timestamptz
);

create index if not exists contacts_org_idx
on public.contacts (organization_id);

create index if not exists contacts_lead_idx
on public.contacts (lead_id);

create index if not exists contacts_last_name_idx
on public.contacts (last_name);

create index if not exists contacts_assigned_to_idx
on public.contacts (assigned_to);

create unique index if not exists contacts_org_email_idx
on public.contacts (organization_id, email);

---

## -- Pipelines

create table if not exists public.pipelines (
id uuid primary key default gen_random_uuid(),

organization_id uuid not null
references public.organizations(id)
on delete cascade,

name text not null,

description text,

is_active boolean default true,

created_at timestamptz default now(),
updated_at timestamptz
);

create index if not exists pipelines_org_idx
on public.pipelines (organization_id);

create unique index if not exists pipelines_org_name_idx
on public.pipelines (organization_id, name);

---

## -- Pipeline Stages

create table if not exists public.pipeline_stages (
id uuid primary key default gen_random_uuid(),

pipeline_id uuid not null
references public.pipelines(id)
on delete cascade,

name text not null,

position integer not null,

is_won boolean default false,
is_lost boolean default false,

created_at timestamptz default now(),
updated_at timestamptz
);

create index if not exists pipeline_stages_pipe_idx
on public.pipeline_stages (pipeline_id);

create unique index if not exists pipeline_stages_pipe_pos_idx
on public.pipeline_stages (pipeline_id, position);

create unique index if not exists pipeline_stages_pipe_name_idx
on public.pipeline_stages (pipeline_id, name);

---

## -- Deals

create table if not exists public.deals (
id uuid primary key default gen_random_uuid(),

organization_id uuid not null
references public.organizations(id)
on delete cascade,

contact_id uuid
references public.contacts(id)
on delete set null,

pipeline_id uuid not null
references public.pipelines(id)
on delete cascade,

pipeline_stage_id uuid not null
references public.pipeline_stages(id)
on delete cascade,

title text not null,

amount numeric(15,2),

currency text default 'USD',

close_date date,

status text not null default 'open'
check (
status in (
'open',
'won',
'lost'
)
),

assigned_to uuid
references public.profiles(id)
on delete set null,

created_at timestamptz default now(),
updated_at timestamptz
);

create index if not exists deals_org_idx
on public.deals (organization_id);

create index if not exists deals_contact_idx
on public.deals (contact_id);

create index if not exists deals_pipe_idx
on public.deals (pipeline_id);

create index if not exists deals_stage_idx
on public.deals (pipeline_stage_id);

create index if not exists deals_status_idx
on public.deals (status);

create index if not exists deals_amount_idx
on public.deals (amount);

create index if not exists deals_close_date_idx
on public.deals (close_date);

create index if not exists deals_assigned_to_idx
on public.deals (assigned_to);

---

## -- Activities

create table if not exists public.activities (
id uuid primary key default gen_random_uuid(),

organization_id uuid not null
references public.organizations(id)
on delete cascade,

lead_id uuid
references public.leads(id)
on delete cascade,

contact_id uuid
references public.contacts(id)
on delete cascade,

deal_id uuid
references public.deals(id)
on delete cascade,

performed_by uuid
references public.profiles(id)
on delete set null,

activity_type text not null
check (
activity_type in (
'call',
'email',
'meeting',
'note',
'task'
)
),

subject text,

notes text,

metadata jsonb,

occurred_at timestamptz default now(),

created_at timestamptz default now(),
updated_at timestamptz
);

create index if not exists activities_org_idx
on public.activities (organization_id);

create index if not exists activities_lead_idx
on public.activities (lead_id);

create index if not exists activities_contact_idx
on public.activities (contact_id);

create index if not exists activities_deal_idx
on public.activities (deal_id);

create index if not exists activities_user_idx
on public.activities (performed_by);

create index if not exists activities_type_idx
on public.activities (activity_type);

create index if not exists activities_occurred_at_idx
on public.activities (occurred_at);

---

## -- Post-creation foreign key

alter table public.leads
add constraint leads_converted_contact_fk
foreign key (converted_contact_id)
references public.contacts(id)
on delete set null;
