-- 011_crm_core_rls.sql
-- Phase 1.4b CRM Row Level Security

---

## -- Enable RLS

alter table public.leads enable row level security;
alter table public.contacts enable row level security;
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.deals enable row level security;
alter table public.activities enable row level security;

---

## -- LEADS

create policy leads_select
on public.leads
for select
using (
organization_id = public.current_user_organization()
);

create policy leads_insert
on public.leads
for insert
with check (
organization_id = public.current_user_organization()
);

create policy leads_update
on public.leads
for update
using (
organization_id = public.current_user_organization()
)
with check (
organization_id = public.current_user_organization()
);

create policy leads_delete
on public.leads
for delete
using (
organization_id = public.current_user_organization()
and public.is_admin()
);

---

## -- CONTACTS

create policy contacts_select
on public.contacts
for select
using (
organization_id = public.current_user_organization()
);

create policy contacts_insert
on public.contacts
for insert
with check (
organization_id = public.current_user_organization()
);

create policy contacts_update
on public.contacts
for update
using (
organization_id = public.current_user_organization()
)
with check (
organization_id = public.current_user_organization()
);

create policy contacts_delete
on public.contacts
for delete
using (
organization_id = public.current_user_organization()
and public.is_admin()
);

---

## -- PIPELINES

create policy pipelines_select
on public.pipelines
for select
using (
organization_id = public.current_user_organization()
);

create policy pipelines_insert
on public.pipelines
for insert
with check (
organization_id = public.current_user_organization()
and public.is_admin()
);

create policy pipelines_update
on public.pipelines
for update
using (
organization_id = public.current_user_organization()
and public.is_admin()
)
with check (
organization_id = public.current_user_organization()
);

create policy pipelines_delete
on public.pipelines
for delete
using (
organization_id = public.current_user_organization()
and public.is_admin()
);

---

## -- PIPELINE STAGES

create policy pipeline_stages_select
on public.pipeline_stages
for select
using (
exists (
select 1
from public.pipelines p
where p.id = pipeline_stages.pipeline_id
and p.organization_id = public.current_user_organization()
)
);

create policy pipeline_stages_insert
on public.pipeline_stages
for insert
with check (
exists (
select 1
from public.pipelines p
where p.id = pipeline_stages.pipeline_id
and p.organization_id = public.current_user_organization()
and public.is_admin()
)
);

create policy pipeline_stages_update
on public.pipeline_stages
for update
using (
exists (
select 1
from public.pipelines p
where p.id = pipeline_stages.pipeline_id
and p.organization_id = public.current_user_organization()
and public.is_admin()
)
)
with check (
exists (
select 1
from public.pipelines p
where p.id = pipeline_stages.pipeline_id
and p.organization_id = public.current_user_organization()
)
);

create policy pipeline_stages_delete
on public.pipeline_stages
for delete
using (
exists (
select 1
from public.pipelines p
where p.id = pipeline_stages.pipeline_id
and p.organization_id = public.current_user_organization()
and public.is_admin()
)
);

---

## -- DEALS

create policy deals_select
on public.deals
for select
using (
organization_id = public.current_user_organization()
);

create policy deals_insert
on public.deals
for insert
with check (
organization_id = public.current_user_organization()
);

create policy deals_update
on public.deals
for update
using (
organization_id = public.current_user_organization()
)
with check (
organization_id = public.current_user_organization()
);

create policy deals_delete
on public.deals
for delete
using (
organization_id = public.current_user_organization()
and public.is_admin()
);

---

## -- ACTIVITIES

create policy activities_select
on public.activities
for select
using (
organization_id = public.current_user_organization()
);

create policy activities_insert
on public.activities
for insert
with check (
organization_id = public.current_user_organization()
);

create policy activities_update
on public.activities
for update
using (
organization_id = public.current_user_organization()
)
with check (
organization_id = public.current_user_organization()
);

create policy activities_delete
on public.activities
for delete
using (
organization_id = public.current_user_organization()
and public.is_admin()
);

---

## -- Grants

grant select, insert, update, delete
on public.leads
to authenticated;

grant select, insert, update, delete
on public.contacts
to authenticated;

grant select, insert, update, delete
on public.pipelines
to authenticated;

grant select, insert, update, delete
on public.pipeline_stages
to authenticated;

grant select, insert, update, delete
on public.deals
to authenticated;

grant select, insert, update, delete
on public.activities
to authenticated;
