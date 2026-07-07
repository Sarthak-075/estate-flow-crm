# Product Roadmap

> The roadmap is organized into **phases** with clear goals, deliverables, database changes, and exit criteria. It is intended for internal planning and can be committed to the `/docs` folder.

---

## Phase 0 – Foundations (Sprint 0)

**Goals**

- Set up repository, CI/CD, and development environment.
- Establish core infrastructure: Vercel project, Supabase project, shared CI pipelines.
- Define coding standards, linting, testing, and documentation processes.

**Deliverables**

- Repo initialized with `nextjs-15` scaffold, TypeScript, Tailwind, shadcn/ui.
- Vercel preview deployments for every PR.
- Supabase project with `organizations`, `profiles`, `team_members`, `roles`, `permissions`, `integration_settings` tables.
- CI workflow: lint, typecheck, unit tests, security scan.
- Basic authentication (sign‑up/sign‑in) using Supabase Auth.
- Initial documentation: `PRD.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API_SPEC.md`, `SECURITY.md`.

**Database Changes**

- Create core tenant tables (see `DATABASE.md`).
- Add `audit_logs` table and RLS policies.

**Exit Criteria**

- All core tables exist with RLS enforced.
- Auth flows functional in dev and staging environments.
- CI passes on master merge.

---

## Phase 1 — Tenant Foundation & Access Control

**Goals**

- Implement a robust multi-tenant architecture.
- Establish comprehensive authentication, authorization, and access control.
- Build the foundation for organization, team, and settings management.

**Deliverables**

- Organizations CRUD
- Team Members CRUD
- Roles CRUD
- Permissions CRUD
- Organization Settings
- Team Invitation System
- Tenant Context Middleware
- Row Level Security (RLS) Policies
- Audit Logging for all mutations

**Database Changes**

- `organizations`
- `profiles`
- `team_members`
- `roles`
- `permissions`
- `organization_settings`
- `audit_logs`

**Exit Criteria**

- Users are correctly associated with organizations.
- RLS policies are verified to isolate tenant data.
- Role-based permissions are enforced across the API.
- The team invitation and acceptance flow is fully functional.

---

## Phase 2 – Leads Management

**Goals**

- Enable agents to capture, qualify, and assign leads.
- Provide activity logging and basic reporting.

**Deliverables**

- CRUD APIs for leads, activities, notes, calls, messages, follow‑ups.
- UI screens: Lead list, lead detail, activity timeline, lead assignment modal.
- Realtime updates for lead status changes.
- Background jobs for email/SMS reminders.
- Tests: unit + integration for lead services.

**Database Changes**

- Add `leads`, `activities`, `notes`, `calls`, `messages`, `followups` tables.
- Indexes on `organization_id`, `status`, `assigned_to`.
- Triggers for audit logging on lead mutations.

**Exit Criteria**

- Leads can be created, edited, assigned, and shared.
- Real‑time lead status updates appear in UI without refresh.
- Automated reminder jobs fire correctly.
- 80% test coverage on lead module.

---

## Phase 3 – Task & Follow‑up Engine

**Goals**

- Provide agents/managers with actionable tasks linked to leads and properties.
- Implement follow‑up scheduling and notification system.

**Deliverables**

- Task CRUD APIs and UI components (task board, calendar view).
- Follow‑up creation on lead events and scheduled reminders.
- In‑app notification service with Supabase Realtime.
- Background job for overdue follow‑up escalation (Slack/WhatsApp).

**Database Changes**

- Add `tasks` table.
- Add `notifications` table.
- Indexes on `assignee_id`, `status`.

**Exit Criteria**

- Agents can create, update, complete tasks.
- Follow‑up reminders trigger notifications.
- Notification inbox shows unread count.

---

## Phase 4 – Property Catalog

**Goals**

- Model real‑estate assets (projects, buildings, units, properties).
- Enable agents to attach images/documents and share with leads.

**Deliverables**

- APIs for projects, buildings, units, properties.
- UI: hierarchical property explorer, property detail page, image gallery.
- Integration with Supabase Storage for media assets.
- Search & filter (location, price, status).

**Database Changes**

- Add `projects`, `buildings`, `units`, `properties`, `property_images`, `property_documents` tables.
- Geospatial index on `properties.location`.
- Relations linking units → buildings → projects.

**Exit Criteria**

- Full property hierarchy visible in UI.
- Media upload/download works via signed URLs.
- Property search returns correct results within 200 ms.

---

## Phase 5 – Communications Hub

**Goals**

- Integrate Twilio Voice/WhatsApp, Resend email, and OpenAI‑compatible chat for automated messaging.
- Record all communications in the activity log.

**Deliverables**

- Adapter layer for each provider (dry‑run & production modes).
- Webhook endpoints with signature validation.
- UI components for sending WhatsApp messages and initiating calls.
- Automatic logging of inbound/outbound messages as `activities` sub‑types.

**Database Changes**

- Extend `activities` with `type` values `call`, `message`.
- Add `integration_settings` rows for Twilio, Resend, OpenAI.

**Exit Criteria**

- Agents can send a WhatsApp template message and see it logged.
- Incoming calls create a `call` activity record.
- Email notifications are sent via Resend and stored.

---

## Phase 6 – Automation & Workflows

**Goals**

- Provide event‑driven automation (e.g., lead assignment, follow‑up escalation).
- Enable admins to configure simple rules via UI.

**Deliverables**

- Event Outbox for reliable event processing.
- PostgreSQL-based job queue and workers.
- Workflow engine with predefined triggers/actions.
- UI for enabling/disabling built‑in automations.

**Database Changes**

- Add `event_outbox` and `jobs` tables for background processing.
- Add `automation_rules` table.

**Exit Criteria**

- When a lead is created, the system automatically assigns it based on round‑robin.
- Missed follow‑up triggers a WhatsApp reminder.
- All automation actions are idempotent and retried up to 3 times.

---

## Phase 7 – Attendance & Site Visits

**Goals**

- Manage scheduling of property tours and track attendance.
- Sync attendance data with tasks and notifications.

**Deliverables**

- APIs and UI for creating site‑visit events.
- Attendance check‑in/out endpoints (QR code or manual).
- Reports on visit attendance rates.

**Database Changes**

- Add `site_visits` and `attendance` tables.
- Indexes on `property_id` and `profile_id`.

**Exit Criteria**

- Agents can schedule a visit, attendees can mark arrival.
- Attendance data appears in lead/property timeline.
- Attendance report generates in CSV format.

---

## Phase 8 – Social Media & Outreach

**Goals**

- Allow agents to post property listings to social platforms.
- Track publishing status and engagement metrics.

**Deliverables**

- `social_posts` API and UI for drafting/scheduling posts.
- Adapter for Facebook, Instagram, LinkedIn.
- In‑app view of post status and engagement stats.

**Database Changes**

- Add `social_posts` table with `engagement` JSONB field.

**Exit Criteria**

- Agents can schedule a post and see it transition from `draft` → `scheduled` → `sent`.
- Basic metrics (likes, clicks) are stored.

---

## Phase 9 – Advanced Reporting & Analytics

**Goals**

- Provide managers with KPI dashboards and exportable reports.
- Implement materialized views for performance.

**Deliverables**

- Dashboard UI with charts (lead conversion, agent performance, inventory).
- Export endpoints for CSV/Excel.
- Background jobs to refresh materialized views nightly.

**Database Changes**

- Create materialized views: `mv_lead_conversion`, `mv_agent_performance`.
- Add indexes to support fast aggregation.

**Exit Criteria**

- Dashboards load under 1 second for 100 k leads.
- Exported reports match on‑screen data.

---

## Phase 10 – Billing & Subscriptions

**Goals**

- Lay the architectural foundation for future billing and subscription management.
- Track usage metrics for different features.

**Deliverables**

- Database schema for plans, subscriptions, and usage tracking.
- Internal APIs for updating usage metrics.
- Architectural plan for Stripe/Razorpay integration.

**Database Changes**

- Add `plans`, `subscriptions`, `usage_metrics` tables.

**Exit Criteria**

- Usage metrics for agents, leads, and storage are tracked correctly.
- Subscription status can be checked internally.

---

## Phase 11 – Production Hardening & Compliance

**Goals**

- Meet security, compliance, and scalability targets for GA launch.
- Prepare for multi‑region deployment.

**Deliverables**

- Load testing (k6) and performance tuning.
- Full GDPR/CCPA data‑subject request tooling.
- Secret rotation procedures.
- Monitoring & alerting (error rates, latency, job failures).
- Documentation: runbooks, incident response.

**Database Changes**

- Partition `audit_logs` by month.
- Add retention policies for sensitive tables.

**Exit Criteria**

- 99.9% SLA achieved in staging for 24 h load test.
- No high‑severity security findings.
- All compliance checklists signed off.

---

## Phase 12 – Continuous Improvement

**Goals**

- Incorporate user feedback, add AI‑powered lead scoring, support custom workflow builder.
- Expand marketplace for third‑party extensions.

**Deliverables**

- AI service integration (OpenAI) for lead scoring suggestions.
- Low‑code workflow editor (future).
- Public API for external integrations.

**Exit Criteria**

- AI scoring improves conversion rate by ≥5% in beta.
- Marketplace framework ready for first partner extension.

---

_Roadmap is versioned; each phase can be broken into two‑week sprints._
