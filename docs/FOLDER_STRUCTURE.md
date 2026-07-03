# Folder Structure

> This structure is designed for a Next.js 15 project, promoting a clear separation of concerns by following a feature-based organization combined with a layered architecture (Service Layer, Repository Layer).

```
.
├─ app/
│   ├─ (auth)/                  # Routes for authentication (login, signup, etc.)
│   │   └─ ...
│   ├─ (dashboard)/             # Protected routes for the main application
│   │   ├─ leads/               # UI for lead management
│   │   ├─ properties/          # UI for property management
│   │   ├─ settings/            # UI for organization, team, and billing settings
│   │   └─ ...
│   └─ api/                     # API route handlers
│       └─ v1/                  # Versioned API endpoints
│           ├─ leads/
│           ├─ webhooks/
│           └─ ...
│
├─ components/                  # Global, reusable, pure UI components (shadcn/ui)
│   ├─ ui/                      # Unstyled base components (Button, Input, etc.)
│   └─ shared/                  # Composed components used across multiple features
│
├─ features/                    # Domain-specific modules, each a vertical slice
│   ├─ leads/
│   │   ├─ _components/         # React components specific to the leads feature
│   │   ├─ _hooks/              # React hooks for the leads feature
│   │   └─ _actions/            # Server Actions related to leads
│   ├─ properties/
│   │   └─ ...
│   └─ settings/
│       ├─ _components/
│       │   ├─ general/
│       │   ├─ team/
│       │   └─ billing/
│       └─ _actions/
│
├─ lib/                         # Core libraries, clients, and utilities
│   ├─ api/                     # API client/SDK for frontend-backend communication
│   ├─ auth/                    # Authentication utilities, session management
│   ├─ db/                      # Supabase client instance
│   ├─ events/                  # Event definitions and constants
│   └─ utils.ts                 # Generic helper functions
│
├─ services/                    # Backend: Business logic layer (stateless)
│   ├─ lead.service.ts
│   ├─ property.service.ts
│   ├─ team.service.ts
│   └─ billing.service.ts
│
├─ repositories/                # Backend: Data access layer
│   ├─ lead.repository.ts
│   ├─ property.repository.ts
│   └─ base.repository.ts       # Optional base class for common CRUD operations

├─ adapters/                     # External service adapters (pure integration layer)
│   ├─ twilio/
│   ├─ whatsapp/
│   ├─ resend/
│   └─ openai/

├─ events/                       # Event handlers (consume outbox events → enqueue jobs)
│   ├─ lead-created.handler.ts
│   ├─ lead-sla.handler.ts
│   └─ site-visit.handler.ts

├─ jobs/                         # Job definitions (execute side effects)
│   ├─ notification.job.ts
│   ├─ sla.job.ts
│   └─ followup.job.ts

├─ policies/                     # Authorization/business policies (centralized rules)
│   ├─ lead.policy.ts
│   ├─ property.policy.ts
│   └─ attendance.policy.ts

├─ validators/                   # Zod schemas for request + domain validation
│   ├─ lead.validator.ts
│   ├─ property.validator.ts
│   └─ task.validator.ts
│
├─ workers/                     # Backend: Background workers
│   ├─ outbox.worker.ts         # Processes events from the event_outbox
│   └─ job.worker.ts            # Executes jobs from the jobs table
│
├─ types/                       # Global TypeScript type definitions
│   ├─ domain.ts                # Core business objects (Lead, Property, etc.)
│   └─ api.ts                   # API request/response types
│
├─ config/                      # Application configuration
│   └─ site.ts                  # Site metadata, navigation links
│
├─ docs/                        # Project documentation
│
├─ public/                      # Static assets
│
├─ .env.local                   # Local environment variables (uncommitted)
├─ .env.example                 # Example environment variables
├─ next.config.mjs              # Next.js configuration
├─ tsconfig.json                # TypeScript configuration
└─ package.json
```

### Rationale

- **Feature-Based Slices (`/features`):** Each feature folder contains the UI components, hooks, and server actions related to one domain (e.g., "leads"). This keeps related code together and makes it easy to navigate. Underscores (`_`) denote private folders not accessible via URL.
- **Clear Layers (`/services`, `/repositories`):** The backend logic is strictly separated.
  - **Services:** Contain business rules. They know _what_ to do.
  - **Repositories:** Handle database operations. They know _how_ to fetch and store data.
  - This separation makes the code more testable, maintainable, and scalable.
- **API Versioning (`/app/api/v1`):** All API endpoints are explicitly versioned to ensure backward compatibility as the application evolves.
- **Background Work (`/workers`):** Isolate the logic for background processing, making it clear what runs outside the user request-response cycle.
- **Adapters (`/adapters`):** Each third-party integration is isolated behind an adapter boundary. Services never call vendor SDKs directly.
- **Events (`/events`):** Event handlers are the bridge between `event_outbox` and `jobs`: they translate domain events into concrete background work.
- **Jobs (`/jobs`):** Jobs are single-purpose executors (send notification, compute SLA, schedule follow-up) and are retried/idempotent.
- **Policies (`/policies`):** Centralizes “can user do X” and domain guards (e.g., prevent reassignment when `duplicate_status='pending'`).
- **Validators (`/validators`):** Keeps input validation consistent across route handlers, server actions, and background workers.
- **No Business Logic in UI:** React components in `/features` and `/components` are responsible for presentation only. They call Server Actions or API routes to trigger business logic.
