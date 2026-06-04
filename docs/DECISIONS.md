# Architecture Decision Records

This document records the architectural decisions made for the EstateFlow CRM project.

## ADR-001: Multi-Tenant Isolation via Supabase RLS

### Context

The CRM must support multiple tenants (organizations) with strict data isolation. Each organization's data must be inaccessible to others. We need a reliable and scalable mechanism to enforce this isolation at the database level.

### Decision

We will use Supabase's native Row Level Security (RLS) feature on our PostgreSQL database. An `organization_id` column will be added to all organization-scoped tables. RLS policies will be created for each table to ensure that queries only return rows matching the current user's authenticated `organization_id`.

### Consequences

- **Pros:**
  - Security is enforced at the database layer, providing a strong guarantee of data isolation.
  - Simplifies application code, as data filtering logic is handled by the database.
  - Scales well with Supabase's architecture.
  - Centralized security policies are easier to audit and maintain.
- **Cons:**
  - Requires careful policy management. Incorrect policies can lead to data leaks or access errors.
  - Adds a slight performance overhead to queries, though this is generally minimal and can be optimized.
  - All database queries must be executed in a user session context for RLS to work.

## ADR-002: Service Layer + Repository Pattern

### Context

We need a clear and maintainable architecture for our business logic and data access. Placing logic directly in API route handlers or React components leads to code duplication, poor testability, and tight coupling with the framework.

### Decision

We will adopt a layered architecture consisting of a Service Layer and a Repository Pattern.
- **Repository Pattern:** Handles all direct data access and communication with the database (Supabase). It abstracts away the specifics of data querying.
- **Service Layer:** Contains the core business logic. It orchestrates calls to one or more repositories to perform complex operations and transactions. API controllers/route handlers will only call service methods.

### Consequences

- **Pros:**
  - **Separation of Concerns:** Clear distinction between business logic, data access, and the presentation layer.
  - **Testability:** Services and repositories can be unit-tested in isolation.
  - **Reusability:** Business logic in services can be reused across different parts of the application (e.g., API routes, background jobs).
  - **Maintainability:** Easier to manage and modify data access logic without affecting business rules, and vice-versa.
- **Cons:**
  - Can introduce more boilerplate code for simple CRUD operations.
  - Requires a disciplined approach from the development team to maintain the separation.

## ADR-003: Event Outbox Pattern

### Context

The system needs to reliably handle side effects and integrations with external systems (e.g., sending emails, updating other services) after a transaction is committed. An in-memory event bus is not suitable for a production environment as it's not persistent, can lose events on application restart, and doesn't handle transaction rollbacks.

### Decision

We will implement the Event Outbox Pattern.
1.  When a business operation occurs, an event record is written to an `event_outbox` table within the same database transaction.
2.  A separate background worker process polls this table for new events.
3.  Upon fetching an event, the worker processes it (e.g., sends it to a job queue or an external webhook).
4.  The event is marked as processed in the `event_outbox` table. A dead-letter queue will be used for events that repeatedly fail.

### Consequences

- **Pros:**
  - **Guaranteed Delivery:** Events are persisted atomically with the state change, ensuring no events are lost.
  - **Reliability:** Decouples the main application transaction from the side effect's success or failure.
  - **Resilience:** Failed events can be retried or analyzed from the outbox or dead-letter queue.
  - **Transactional Integrity:** Side effects are only triggered after the main transaction is successfully committed.
- **Cons:**
  - **Increased Complexity:** Requires an outbox table, a background worker, and logic for processing, retries, and failure handling.
  - **Eventual Consistency:** There is a delay between the transaction commit and the processing of the event. The rest of the system will be eventually consistent.

## ADR-004: Versioned APIs (/api/v1)

### Context

As the CRM evolves, our API will change. We need a strategy to manage these changes without breaking existing client integrations or different parts of our own frontend.

### Decision

All API endpoints will be versioned, starting with `v1`. The version will be included in the URL path (e.g., `/api/v1/leads`). This is a mandatory requirement for all new and existing endpoints.

### Consequences

- **Pros:**
  - **Clear Contract:** Clients know exactly which version of the API they are interacting with.
  - **Graceful Evolution:** Allows us to introduce breaking changes in a new version (`v2`) while maintaining the stable `v1` for existing clients.
  - **Staged Deprecation:** We can monitor usage of older versions and plan for their deprecation and removal.
- **Cons:**
  - **Routing Complexity:** Can add complexity to the routing layer of the application.
  - **Code Duplication:** May require maintaining multiple versions of the same endpoint's logic for a period of time.

## ADR-005: Feature Flags per Tenant

### Context

We need a way to roll out new features to specific tenants (organizations) for beta testing, A/B testing, or as part of different subscription plans. A global on/off switch is insufficient for a multi-tenant SaaS application.

### Decision

We will implement a tenant-scoped feature flag system. A `feature_flags` table will be created to store the state (enabled/disabled) of each feature for each organization. An API will allow administrators to toggle these flags. The system will be designed for performance, with flags likely cached at the application level.

### Consequences

- **Pros:**
  - **Controlled Rollouts:** Reduces the risk of new features by enabling them for a small subset of users first.
  - **Customization:** Allows for different feature sets per tenant, enabling tiered pricing and plans.
  - **Decoupling:** Code can be deployed to production but remain hidden behind a feature flag until it's ready for release.
- **Cons:**
  - **Increased Complexity:** Application code needs to check for feature flags, which can add conditional logic.
  - **Management Overhead:** Requires a UI or tool to manage the flags for each tenant.
  - **Testing:** Requires testing all combinations of feature flags, which can be complex.

## ADR-006: PostgreSQL Job Queue Instead of BullMQ

### Context

The system requires a background job processing system for tasks like sending emails, generating reports, and processing events from the outbox. Previous considerations included external systems like Redis with BullMQ.

### Decision

To simplify our stack and reduce dependencies, we will use a job queue implemented directly within our PostgreSQL database. A `jobs` table will be created. The event outbox worker will insert jobs into this table. Dedicated job workers will then poll this table, lock jobs for processing (e.g., using `SELECT ... FOR UPDATE SKIP LOCKED`), and execute them.

### Consequences

- **Pros:**
  - **Simplified Stack:** No need to manage a separate Redis instance, reducing operational overhead and cost.
  - **Transactional Integrity:** Jobs can be created within the same transaction as other database changes.
  - **Single Data Store:** All core data, including job queues, resides in PostgreSQL, simplifying backups and data management.
- **Cons:**
  - **Performance:** For extremely high-throughput job processing, a dedicated in-memory system like Redis/BullMQ might be more performant. However, for our expected scale, PostgreSQL is sufficient.
  - **Database Load:** Puts additional load on the database, which needs to be monitored.
  - **Advanced Features:** Lacks some of the advanced features found in mature job queue libraries out of the box (e.g., complex scheduling, UI dashboards), which we may need to build ourselves.

## ADR-007: Tenant Scoped Integrations

### Context

The CRM needs to integrate with third-party services (e.g., email providers, calendar services). These integrations must be configured on a per-tenant basis, with each organization providing its own API keys and settings.

### Decision

We will store per-organization integration configuration in an `integration_settings` table scoped by `organization_id`. This table stores the configuration, credentials (encrypted), and enablement state for each third-party provider. All interactions with external APIs use the credentials and settings from this table, specific to the organization making the request.

### Consequences

- **Pros:**
  - **Data Security:** Each tenant's integration settings and credentials are isolated.
  - **Flexibility:** Organizations can enable and configure the integrations they need independently.
  - **Scalability:** The model supports adding new integrations and new tenants without architectural changes.
- **Cons:**
  - **Credential Management:** Requires a secure system for encrypting and managing sensitive API keys and tokens.
  - **UI/UX Complexity:** The user interface must provide a way for organization admins to manage these integrations.
  - **Error Handling:** The system must handle integration-specific errors and provide clear feedback to the tenant.
