# Product Requirements Document (PRD)

## Vision
Create a **production‑grade, multi‑tenant Real Estate CRM** that streamlines lead capture, property management, communication, and reporting for real‑estate agencies. The platform must be secure, highly available, and scalable on Vercel + Supabase while delivering a modern, responsive UI built with Next.js 15 and Tailwind.

## User Personas
| Persona | Goals | Pain Points |
|---|---|---|
| **Agent** – Individual sales rep | Capture leads, schedule follow‑ups, access property data on the go | Switching between multiple tools, losing context
| **Broker / Manager** – Oversees a team | Assign leads, monitor performance, generate reports | Lack of visibility into team activity, manual reporting
| **Admin** – Sets up org, configures integrations | Onboard new agencies, manage permissions, audit activity | Complex onboarding, secret leakage risk |
| **Property Owner** – Lists properties via the portal | Upload listings, track inquiries | Limited tech expertise, need for secure data sharing |

## User Roles & Permissions
- **Owner** – Full admin rights to the organization (creates org, manages billing)
- **Admin** – Manage users, roles, integrations, audit logs
- **Manager** – Access team reports, assign leads, view all activities
- **Agent** – CRUD own leads, tasks, notes; view organization‑wide properties
- **Viewer** – Read‑only access to reports and property catalog

Roles map to a **role‑based permission matrix** stored in `roles` & `permissions` tables (see `DATABASE.md`).

## Core Modules
1. **Auth & Tenant Provisioning** – Supabase Auth + RLS per `organization_id`
2. **Lead Management** – Capture, qualify, assign, track activities
3. **Property Catalog** – Hierarchical model: projects → buildings → units → properties
4. **Task & Follow‑up Engine** – Automated reminders, success metrics
5. **Communication Hub** – Twilio Voice/WhatsApp, Resend email, OpenAI chat
6. **Realtime Sync** – Supabase Realtime for live dashboards & notifications
7. **Analytics & Reporting** – KPI dashboards, exportable CSV/PDF reports
8. **Integrations Framework** – Adapter pattern for third‑party services

## User Journeys (high‑level)
1. **Onboarding** – Admin creates organization → invites agents → configures integrations → first lead capture.
2. **Lead Capture → Assignment** – Agent creates lead → system validates → manager assigns → lead status moves through pipeline.
3. **Property Viewing** – Agent shares property link → prospect schedules site visit → attendance logged.
4. **Communication** – Automated WhatsApp reminder → agent receives call via Twilio Voice → logs call outcome.
5. **Reporting** – Manager pulls weekly performance report → system aggregates via materialized views.

## Success Metrics
- **Adoption**: >80% of agents use the platform daily within 30 days.
- **Lead Conversion**: 15% increase in lead‑to‑deal conversion vs baseline.
- **System SLA**: 99.9% uptime, <200 ms API latency (95th percentile).
- **Security**: Zero data‑leak incidents; all RLS rules pass automated audit.
- **Scalability**: Support 10 k active users, 1 M+ rows without performance degradation.

## MVP Scope
| Feature | Included in MVP | Out‑of‑Scope |
|---|---|---|
| Multi‑tenant auth & RLS | ✅ | • Advanced SSO (SAML, OAuth2) |
| Lead CRUD + activity log | ✅ | • AI lead scoring |
| Basic property hierarchy | ✅ | • 3D virtual tours |
| Task & follow‑up reminders | ✅ | • Complex workflow builder |
| Twilio WhatsApp & Voice (text only) | ✅ | • Full call recording & transcription |
| Email via Resend (transactional only) | ✅ | • Marketing campaigns |
| Realtime notifications (in‑app) | ✅ | • Push notifications to mobile |
| Reporting (dashboard + CSV export) | ✅ | • Advanced BI integrations |

## Future Roadmap (high‑level)
- **Phase 2**: AI suggestions (OpenAI), advanced analytics, SSO.
- **Phase 3**: Mobile app (React Native), offline support.
- **Phase 4**: Marketplace for third‑party extensions.
- **Phase 5**: Full compliance (GDPR, CCPA) automation.

---
*Prepared for the Estate Flow CRM project – ready to be committed under `/docs/PRD.md`.*