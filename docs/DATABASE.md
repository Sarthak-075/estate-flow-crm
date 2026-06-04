# Database Design (Supabase PostgreSQL)

> All tables include an `organization_id UUID NOT NULL` column to enforce multi‑tenant isolation via Row‑Level Security (RLS). Foreign keys to `organizations(id)` are implied on all such tables. Timestamps (`created_at`, `updated_at`) are standard on most tables.

## 1. Core Tables Overview
| Table | Purpose |
|---|---|
| **organizations** | Top‑level tenant metadata |
| **organization_settings** | Tenant-wide operational configuration (timezone, business hours, SLA, branding) |
| **profiles** | User profile (linked 1:1 with `auth.users`) |
| **team_members** | Links users to an organization with a role |
| **roles** | Pre‑defined role definitions (Owner, Admin, Manager, Agent) |
| **permissions** | Granular permission flags associated with roles |
| **leads** | Real‑estate sales lead model (expanded) |
| **activities** | Log of actions (calls, messages, notes) tied to a lead |
| **followups** | Scheduled follow‑up tasks |
| **tasks** | To‑do items for agents/managers |
| **attendance** | Site‑visit attendance records (enhanced) |
| **site_visits** | Scheduling and outcome tracking for property tours (expanded) |
| **projects** | Development projects (top‑level inventory) |
| **buildings** | Buildings belonging to a project |
| **units** | Individual unit listings within a building |
| **properties** | Canonical view of all real‑estate assets (project/building/unit) |
| **property_images** | Image assets stored in Supabase Storage |
| **property_documents** | PDFs, floor plans, contracts |
| **lead_property_shares** | Records of a lead being shared with a property |
| **social_posts** | Posts published to social channels |
| **notifications** | In‑app notification entries |
| **audit_logs** | Immutable audit trail of critical actions |
| **integration_settings** | API keys / config per tenant |
| **feature_flags** | Tenant-scoped feature toggles for controlled rollouts |
| **jobs** | Background job queue (enhanced) |
| **event_outbox** | Persistent outbox for reliable event publishing |
| **lead_sla_metrics** | SLA timing per lead |
| **plans** | Billing plan catalog (foundation only) |
| **subscriptions** | Organization subscriptions (foundation only) |
| **usage_metrics** | Tenant usage tracking for future billing |

---
## 2. Table Definitions
### organizations
| Column | Type | Description |
|---|---|---|
| id | UUID PK | Primary key |
| name | TEXT NOT NULL | Human readable org name |
| domain | TEXT | Custom sub‑domain (e.g., `acme.estateflow.io`) |
| created_at | TIMESTAMPTZ DEFAULT now() |
| updated_at | TIMESTAMPTZ |
| is_active | BOOLEAN DEFAULT true |
**Indexes**: PK on `id`, unique index on `domain`.

### organization_settings
**Purpose**: Tenant-wide configuration for operational settings.

| Column | Type | Description |
|---|---|---|
| id | UUID PK | Primary key |
| organization_id | UUID NOT NULL | One-to-one FK → organizations(id) |
| timezone | TEXT NOT NULL | IANA timezone (e.g., `Asia/Kolkata`) |
| business_hours | JSONB | Tenant business hours configuration |
| sla_first_response_minutes | INTEGER DEFAULT 30 | First response SLA threshold |
| sla_followup_minutes | INTEGER DEFAULT 1440 | Follow-up SLA threshold |
| branding | JSONB | Branding settings used by UI |
| created_at | TIMESTAMPTZ | Created timestamp |
| updated_at | TIMESTAMPTZ | Updated timestamp |

**Examples**:
```json
{
  "timezone": "Asia/Kolkata",
  "business_hours": {
    "start": "09:00",
    "end": "18:00"
  },
  "branding": {
    "logo_url": "...",
    "primary_color": "#2563eb"
  }
}
```

**Relationships**:
```
organizations
    └── organization_settings
```
One-to-one.

**Indexes**: UNIQUE (`organization_id`).

### profiles
| Column | Type | Description |
|---|---|---|
| id | UUID PK | Matches `auth.users.id` |
| organization_id | UUID NOT NULL | FK → organizations(id) |
| full_name | TEXT |
| email | TEXT NOT NULL |
| avatar_url | TEXT |
| created_at | TIMESTAMPTZ DEFAULT now() |
| updated_at | TIMESTAMPTZ |
**Indexes**: PK, index on `organization_id`.

### team_members
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| profile_id | UUID NOT NULL (FK → profiles.id) |
| role_id | UUID NOT NULL (FK → roles.id) |
| invited_at | TIMESTAMPTZ |
| status | TEXT CHECK (status IN ('active','pending','removed')) DEFAULT 'active' |
**Indexes**: composite (`organization_id`, `profile_id`).

### roles
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| name | TEXT NOT NULL |
| description | TEXT |
**Indexes**: (`organization_id`, `name`) unique.

### permissions
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| role_id | UUID NOT NULL (FK → roles.id) |
| resource | TEXT NOT NULL |
| action | TEXT NOT NULL |
| allowed | BOOLEAN DEFAULT true |
**Indexes**: (`role_id`, `resource`, `action`).

### leads (expanded real‑estate sales lead model)
**Purpose**: A lead represents a prospective buyer/tenant in the real-estate sales pipeline. The model captures qualification signals (budget, preferred location, temperature), engagement cadence (last/next contact), duplication handling, and outcome tracking.

| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| created_by | UUID NOT NULL (FK → profiles.id) |
| assigned_to | UUID (FK → profiles.id) |
| status | TEXT NOT NULL CHECK (status IN ('New','Contacted','Interested','Site Visit Scheduled','Site Visit Completed','Negotiation','Booking Done','Won','Lost','Not Responding')) DEFAULT 'New' |
| lead_temperature | TEXT CHECK (lead_temperature IN ('Cold','Warm','Hot')) |
| budget_min | NUMERIC(12,2) |
| budget_max | NUMERIC(12,2) |
| preferred_location | TEXT |
| property_type | TEXT |
| last_contacted_at | TIMESTAMPTZ |
| next_followup_at | TIMESTAMPTZ |
| lead_score | INT |
| source_platform | TEXT |
| is_duplicate | BOOLEAN DEFAULT false |
| duplicate_group_id | UUID |
| merged_into_lead_id | UUID |
| duplicate_status | TEXT CHECK (duplicate_status IN ('pending','merged','ignored')) |
| site_visit_count | INT DEFAULT 0 |
| won_value | NUMERIC(12,2) |
| lost_reason | TEXT |
| source | TEXT |
| first_name | TEXT |
| last_name | TEXT |
| email | TEXT |
| phone | TEXT |
| created_at | TIMESTAMPTZ DEFAULT now() |
| updated_at | TIMESTAMPTZ |
**Indexes**:
- (`organization_id`, `status`) — primary pipeline views
- (`organization_id`, `assigned_to`) — agent workload views
- (`organization_id`, `lead_temperature`) — prioritization
- (`organization_id`, `next_followup_at`) — follow-up queues
- (`organization_id`, `source_platform`) — attribution

**Duplicate handling semantics**:
- `is_duplicate=true` indicates this row is considered a duplicate candidate.
- `duplicate_group_id` groups potential duplicates for review.
- `merged_into_lead_id` points to the canonical lead when merged.
- `duplicate_status`:
  - `pending`: flagged for review
  - `merged`: merged into `merged_into_lead_id`
  - `ignored`: false positive, do not auto-flag again without new evidence

#### Lead Status State Machine
```
New → Contacted → Interested → Site Visit Scheduled → Site Visit Completed → Negotiation → Booking Done → Won
          ↘                ↘                ↘
         Lost            Not Responding   Lost
```

**Allowed transitions** (source → destination):
- `New` → `Contacted` | `Lost` | `Not Responding`
- `Contacted` → `Interested` | `Lost` | `Not Responding`
- `Interested` → `Site Visit Scheduled` | `Lost` | `Not Responding`
- `Site Visit Scheduled` → `Site Visit Completed` | `Lost` | `Not Responding`
- `Site Visit Completed` → `Negotiation` | `Lost`
- `Negotiation` → `Booking Done` | `Lost`
- `Booking Done` → `Won` | `Lost`

**State machine rules**:
- `Won` and `Lost` are terminal states (no further transitions).
- `Not Responding` is a terminal state unless explicitly reactivated by a manager (manual override) back to `Contacted`.
- Lead status transitions are enforced in the Service Layer to ensure consistent audit logging and downstream automations.
- Site visit completion/no-show updates lead status based on visit outcome (see `site_visits`).

### Canonical Lead Merge Policy
**Purpose**: Ensure deterministic lead merges.

#### Identity Fields
- **Phone**: Target lead value wins unless empty.
- **Email**: Target lead value wins unless empty.
- **Name**: Longest non-empty value wins.

#### Budget Fields
- `budget_min`: use lower value.
- `budget_max`: use higher value.

Reason: preserve maximum opportunity range.

#### Engagement Fields
- `last_contacted_at`: use most recent timestamp.
- `next_followup_at`: use nearest future date.
- `lead_score`: use highest score.

#### Activity Records
Merge all related records (no records are deleted):
- `activities`
- `notes`
- `calls`
- `messages`

#### Tasks
- Open tasks: reassign to target lead.
- Completed tasks: retain history.

#### Site Visits
Transfer all site visits (`site_visits.lead_id`) to the target lead.
Maintain audit history.

#### Property Shares
Merge all property shares (`lead_property_shares`).
Remove duplicate relationships (same `property_id` should not be duplicated on the target).

#### Duplicate Status
- Source lead:
  - `duplicate_status = 'merged'`
  - `merged_into_lead_id = target_lead_id`
- Target lead remains active.

#### Audit Requirements
Every merge must create:
- an `audit_logs` entry
- a `lead.merged` event

### activities
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| lead_id | UUID NOT NULL (FK → leads.id) |
| type | TEXT CHECK (type IN ('call','message','note','email')) |
| performed_by | UUID NOT NULL (FK → profiles.id) |
| timestamp | TIMESTAMPTZ DEFAULT now() |
| details | JSONB |
**Indexes**: (`organization_id`,`lead_id`), (`type`).

### notes (sub‑type of activity)
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| activity_id | UUID NOT NULL (FK → activities.id) |
| content | TEXT NOT NULL |
**Indexes**: (`activity_id`).

### calls (sub‑type of activity)
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| activity_id | UUID NOT NULL |
| duration_seconds | INT |
| outcome | TEXT |
| recording_url | TEXT |
**Indexes**: (`activity_id`).

### messages (sub‑type of activity)
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| activity_id | UUID NOT NULL |
| channel | TEXT CHECK (channel IN ('whatsapp','sms','voice')) |
| direction | TEXT CHECK (direction IN ('inbound','outbound')) |
| content | TEXT |
**Indexes**: (`activity_id`).

### followups
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| lead_id | UUID NOT NULL |
| due_at | TIMESTAMPTZ NOT NULL |
| reminder_sent | BOOLEAN DEFAULT false |
| status | TEXT CHECK (status IN ('pending','completed','overdue')) DEFAULT 'pending' |
| created_by | UUID NOT NULL |
**Indexes**: (`organization_id`,`due_at`), (`status`).

### tasks
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| title | TEXT NOT NULL |
| description | TEXT |
| assignee_id | UUID (FK → profiles.id) |
| status | TEXT CHECK (status IN ('todo','in_progress','done','blocked')) DEFAULT 'todo' |
| priority | INT DEFAULT 0 |
| due_at | TIMESTAMPTZ |
| created_by | UUID NOT NULL |
| created_at | TIMESTAMPTZ DEFAULT now() |
**Indexes**: (`organization_id`,`assignee_id`), (`status`).

### attendance (enhanced)
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| profile_id | UUID NOT NULL |
| site_visit_id | UUID NOT NULL |
| arrived_at | TIMESTAMPTZ |
| left_at | TIMESTAMPTZ |
| check_in_latitude | DOUBLE PRECISION |
| check_in_longitude | DOUBLE PRECISION |
| check_out_latitude | DOUBLE PRECISION |
| check_out_longitude | DOUBLE PRECISION |
| selfie_url | TEXT |
**Indexes**: (`organization_id`,`site_visit_id`).

#### Attendance Verification
* GPS coordinates are validated against the property location (≤30 m tolerance).
* Selfie images are stored in Supabase Storage and referenced via `selfie_url`.
* Attendance is used for field employee tracking (agent punctuality, visit completion evidence) and can feed SLA/escalation reports.

### site_visits (expanded)
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| property_id | UUID NOT NULL |
| lead_id | UUID NOT NULL |
| assigned_agent_id | UUID NOT NULL |
| scheduled_start | TIMESTAMPTZ NOT NULL |
| scheduled_end | TIMESTAMPTZ |
| status | TEXT CHECK (status IN ('Scheduled','Confirmed','Completed','Cancelled','No Show')) DEFAULT 'Scheduled' |
| visit_outcome | TEXT CHECK (visit_outcome IN ('successful','no_show','cancelled','rescheduled')) |
| feedback | TEXT |
| completed_at | TIMESTAMPTZ |
| gps_verified | BOOLEAN DEFAULT false |
| created_by | UUID NOT NULL |
**Indexes**: (`organization_id`,`property_id`), (`status`), (`lead_id`).

#### Site‑Visit Workflow
1. **Schedule** – status `Scheduled`.
2. **Confirm** – agent accepts, status becomes `Confirmed`.
3. **Complete** – after visit, status `Completed`, `completed_at` set, optional GPS verification.
4. **No‑Show / Cancel** – status `No Show` or `Cancelled` with appropriate `visit_outcome`.

**Workflow notes**:
- `gps_verified` is set by comparing check-in GPS against the property coordinates.
- `visit_outcome` is used for analytics and to trigger automations (e.g., `siteVisit.noShow`).
- Completing a site visit increments `leads.site_visit_count` and may advance the lead lifecycle.

### projects (inventory top level)
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| name | TEXT NOT NULL |
| developer_name | TEXT |
| location | TEXT |
| status | TEXT CHECK (status IN ('planning','active','completed')) DEFAULT 'planning' |
| created_at | TIMESTAMPTZ DEFAULT now() |
**Indexes**: (`organization_id`,`status`).

### buildings
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| project_id | UUID NOT NULL (FK → projects.id) |
| name | TEXT NOT NULL |
| created_at | TIMESTAMPTZ DEFAULT now() |
**Indexes**: (`project_id`).

### units
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| building_id | UUID NOT NULL |
| unit_number | TEXT NOT NULL |
| floor | INT |
| size | INT |
| price | NUMERIC(12,2) |
| availability | TEXT CHECK (availability IN ('available','reserved','sold')) DEFAULT 'available' |
| created_at | TIMESTAMPTZ DEFAULT now() |
**Indexes**: (`building_id`,`availability`).

### properties (canonical view)
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| type | TEXT CHECK (type IN ('project','building','unit')) NOT NULL |
| reference_id | UUID NOT NULL (FK to projects/buildings/units) |
| title | TEXT |
| description | TEXT |
| price_range | TEXT |
| location | GEOGRAPHY(Point,4326) |
| created_at | TIMESTAMPTZ DEFAULT now() |
**Indexes**: (`organization_id`,`type`), GIST on `location`.

*The `properties` view aggregates data from `projects`, `buildings`, and `units` to provide a uniform API for searching and displaying assets.*

### property_images
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| property_id | UUID NOT NULL |
| storage_path | TEXT NOT NULL |
| alt_text | TEXT |
| uploaded_at | TIMESTAMPTZ DEFAULT now() |
**Indexes**: (`property_id`).

### property_documents
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| property_id | UUID NOT NULL |
| storage_path | TEXT NOT NULL |
| title | TEXT |
| uploaded_at | TIMESTAMPTZ DEFAULT now() |
**Indexes**: (`property_id`).

### lead_property_shares
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| lead_id | UUID NOT NULL |
| property_id | UUID NOT NULL |
| shared_by | UUID NOT NULL |
| shared_at | TIMESTAMPTZ DEFAULT now() |
| note | TEXT |
**Indexes**: (`lead_id`,`property_id`).

### social_posts
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| platform | TEXT CHECK (platform IN ('facebook','instagram','twitter','linkedin')) |
| content | TEXT |
| posted_at | TIMESTAMPTZ |
| status | TEXT CHECK (status IN ('draft','scheduled','sent','failed')) DEFAULT 'draft' |
| engagement | JSONB |
**Indexes**: (`organization_id`,`platform`).

### notifications
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| recipient_id | UUID NOT NULL (FK → profiles.id) |
| type | TEXT NOT NULL |
| payload | JSONB |
| read_at | TIMESTAMPTZ |
| created_at | TIMESTAMPTZ DEFAULT now() |
**Indexes**: (`organization_id`,`recipient_id`,`read_at`).

### audit_logs
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| actor_id | UUID NOT NULL |
| action | TEXT NOT NULL |
| resource_type | TEXT |
| resource_id | UUID |
| before | JSONB |
| after | JSONB |
| ip_address | INET |
| created_at | TIMESTAMPTZ DEFAULT now() |
**Indexes**: (`organization_id`,`actor_id`,`created_at`).

### integration_settings
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| provider | TEXT NOT NULL |
| config | JSONB NOT NULL |
| enabled | BOOLEAN DEFAULT true |
| dryRunEnabled | BOOLEAN DEFAULT false |
| created_at | TIMESTAMPTZ DEFAULT now() |
**Indexes**: (`organization_id`,`provider`).

### jobs (background job queue – enhanced)
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| type | TEXT NOT NULL |
| payload | JSONB |
| status | TEXT CHECK (status IN ('pending','processing','failed','completed')) DEFAULT 'pending' |
| attempts | INT DEFAULT 0 |
| max_attempts | INT DEFAULT 5 |
| queue_name | TEXT NOT NULL |
| priority | INT DEFAULT 0 |
| next_run_at | TIMESTAMPTZ |
| locked_at | TIMESTAMPTZ |
| locked_by | TEXT |
| processed_at | TIMESTAMPTZ |
| last_error | TEXT |
| created_at | TIMESTAMPTZ DEFAULT now() |
**Indexes**: (`organization_id`,`status`,`queue_name`,`priority`,`next_run_at`).

### event_outbox (reliable event source)
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| event_type | TEXT NOT NULL |
| payload | JSONB NOT NULL |
| status | TEXT CHECK (status IN ('pending','processing','failed','completed')) DEFAULT 'pending' |
| retry_count | INT DEFAULT 0 |
| created_at | TIMESTAMPTZ DEFAULT now() |
| processed_at | TIMESTAMPTZ |
**Indexes**: (`organization_id`,`event_type`,`status`).

#### Dead-Letter Queue (DLQ)
The DLQ is represented by `jobs` rows with `status='failed'` after exceeding `max_attempts`. Operational APIs expose DLQ entries for review and manual replay.

### lead_sla_metrics
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| lead_id | UUID NOT NULL |
| first_response_at | TIMESTAMPTZ |
| response_time_minutes | INT |
| sla_breached | BOOLEAN DEFAULT false |
| created_at | TIMESTAMPTZ DEFAULT now() |
| updated_at | TIMESTAMPTZ |
**Indexes**: (`organization_id`,`lead_id`).

#### SLA calculations
- **First response SLA**: the elapsed time between `leads.created_at` and the first agent interaction.
  - The first interaction is typically the earliest of:
    - `leads.last_contacted_at`
    - an `activities` row of type `call`/`message`/`email`
- `response_time_minutes` is computed as the difference in minutes and stored for reporting.
- `sla_breached=true` when `response_time_minutes` exceeds an organization-configured threshold (e.g., `organization_settings.sla_first_response_minutes`).

#### SLA Evaluation Logic
```
response_time_minutes
  > sla_first_response_minutes

→ SLA Breached
```

#### Future SLA Extensions
The data model supports extending SLA evaluation beyond first response:
- First Response SLA
- Follow-up SLA
- Site Visit SLA
- Booking SLA

#### Escalation workflows
- When SLA breaches, the system emits `lead.slaBreached` to the outbox.
- Automations create a manager-visible follow-up task and optionally notify via in-app + external channels.

#### Reporting use cases
- SLA summary by agent/manager (breach counts, median response time)
- SLA trend by source platform (e.g., WhatsApp vs. website)
- Operational queue: “SLA at risk” leads where `next_followup_at` is overdue

---
### feature_flags
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| feature_key | TEXT NOT NULL |
| enabled | BOOLEAN NOT NULL DEFAULT false |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() |
| updated_at | TIMESTAMPTZ |
**Indexes**: unique (`organization_id`, `feature_key`).

---
### plans
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| name | TEXT NOT NULL |
| monthly_price | NUMERIC(12,2) NOT NULL DEFAULT 0 |
| annual_price | NUMERIC(12,2) NOT NULL DEFAULT 0 |
| limits | JSONB NOT NULL DEFAULT '{}' |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() |
| updated_at | TIMESTAMPTZ |
**Indexes**: unique (`name`).

---
### subscriptions
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| plan_id | UUID NOT NULL (FK → plans.id) |
| status | TEXT NOT NULL CHECK (status IN ('trialing','active','past_due','canceled')) DEFAULT 'trialing' |
| starts_at | TIMESTAMPTZ |
| ends_at | TIMESTAMPTZ |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() |
| updated_at | TIMESTAMPTZ |
**Indexes**: (`organization_id`, `status`).

---
### usage_metrics
| Column | Type | Description |
|---|---|---|
| id | UUID PK |
| organization_id | UUID NOT NULL |
| metric_key | TEXT NOT NULL |
| current_value | BIGINT NOT NULL DEFAULT 0 |
| period_start | TIMESTAMPTZ NOT NULL |
| period_end | TIMESTAMPTZ NOT NULL |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() |
| updated_at | TIMESTAMPTZ |
**Indexes**: (`organization_id`, `metric_key`, `period_start`, `period_end`).

---
## 3. Relationships (excerpt)
- `profiles.organization_id` → `organizations.id`
- `organization_settings.organization_id` → `organizations.id`
- `team_members.profile_id` → `profiles.id`
- `team_members.role_id` → `roles.id`
- `roles.organization_id` → `organizations.id`
- `leads.organization_id` → `organizations.id`
- `activities.lead_id` → `leads.id`
- `followups.lead_id` → `leads.id`
- `lead_property_shares.lead_id` → `leads.id`
- `lead_property_shares.property_id` → `properties.id`
- `properties.reference_id` → one of `projects.id` / `buildings.id` / `units.id`
- `property_images.property_id` → `properties.id`
- `property_documents.property_id` → `properties.id`
- `notifications.recipient_id` → `profiles.id`
- `audit_logs.actor_id` → `profiles.id`
- `jobs.organization_id` → `organizations.id`
- `event_outbox.organization_id` → `organizations.id`
- `lead_sla_metrics.lead_id` → `leads.id`

---
## 4. Index Strategy
- Primary keys are UUIDs generated client‑side (`gen_random_uuid()`).
- Every tenant table has a composite index on `(organization_id, <primary_filter>)` for fast scoped scans.
- Full‑text GIN trigram index on `leads` (`first_name`, `last_name`, `email`, `phone`).
- Geospatial GIST index on `properties.location`.
- Additional indexes for new columns: `lead_temperature`, `source_platform`, `next_followup_at`, `status` (leads); `queue_name` & `priority` (jobs).

---
## 5. Supabase RLS Strategy
All tables share a common pattern:
```sql
-- Enable RLS
alter table <table> enable row level security;

-- Policy: allow access only to rows belonging to the user's organization
create policy "org_access" on <table>
  using (organization_id = (auth.jwt() ->> 'org_id')::uuid);
```
- JWT includes `org_id` claim injected at sign‑up.
- **Admin‑only policies** for `team_members`, `roles`, `permissions`, `integration_settings` restrict to `role = 'owner' OR role = 'admin'`.
- **Lead duplicate handling** – only owners/admins may modify `is_duplicate`, `duplicate_group_id`, `merged_into_lead_id`.
- **SLA metrics** – only system jobs can update `sla_breached`.
- **Event Outbox** – insert‑only for application code; workers have a service role to update `status`.
- **Audit logging** – `BEFORE` trigger on all tables writes to `audit_logs`.

---
*All definitions are ready to be placed under `/docs/DATABASE.md`.*