# Events & Automations

> Event-driven workflows power real-time responsiveness and keep business logic out of the UI. The system uses an **Event Outbox Pattern** to ensure reliability and transactional integrity. Events are written to the `event_outbox` table by the Service Layer within the same transaction as the primary business logic.

## 1. Event Outbox Architecture
The flow is as follows:
1.  **Service Layer:** A business operation (e.g., creating a lead) is performed.
2.  **Transactional Write:** Within the same database transaction, the service writes the business data (e.g., to the `leads` table) and inserts a corresponding event record into the `event_outbox` table.
3.  **Commit:** The transaction is committed. The business data and the event are now durably stored.
4.  **Outbox Worker:** A dedicated background worker process continuously polls the `event_outbox` table for unprocessed events.
5.  **Event Processing:** The worker picks up new events, locks the rows to prevent concurrent processing, and dispatches them to a job queue (`jobs` table) for asynchronous execution.
6.  **Job Worker:** Another set of workers pick jobs from the `jobs` table and execute the actual business logic (e.g., sending an email, calling a webhook).
7.  **Update Status:** The outbox worker marks the event as `processed` or `failed` in the `event_outbox` table. Failed events can be retried or moved to a dead-letter queue.

This architecture removes the need for an external message broker like Redis for the core eventing mechanism.

### Event Outbox Schema
```sql
CREATE TABLE event_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    event_type TEXT NOT NULL, -- e.g., "lead.created"
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processed, failed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    attempts INT NOT NULL DEFAULT 0
);
```

## 2. Core Events (alphabetical)
| Event Type | Trigger Point | Payload Sample |
|---|---|---|
| **lead.created** | `LeadService.createLead` | `{ "leadId": "...", "createdBy": "...", "source": "..." }` |
| **lead.assigned** | `LeadService.assignLead` | `{ "leadId": "...", "assigneeId": "...", "assignedBy": "..." }` |
| **lead.statusChanged** | `LeadService.updateLead` when `status` changes | `{ "leadId": "...", "from": "Contacted", "to": "Interested", "changedBy": "..." }` |
| **lead.duplicateDetected** | Duplicate detection rule triggers (create/update/import) | `{ "leadId": "...", "duplicateGroupId": "...", "candidates": ["..."], "detectedBy": "rule\|manual" }` |
| **lead.merged** | `LeadService.mergeLead` completes | `{ "sourceLeadId": "...", "targetLeadId": "...", "mergedBy": "...", "mergedAt": "..." }` |
| **lead.slaBreached** | SLA evaluation job marks breach | `{ "leadId": "...", "responseTimeMinutes": 123, "thresholdMinutes": 30 }` |
| **call.missed** | `CallService.logCall` with `outcome='missed'` | `{ "callId": "...", "leadId": "...", "agentId": "..." }` |
| **followup.due** | Scheduler creates event for `followups` where `due_at <= now` | `{ "followupId": "...", "leadId": "...", "dueAt": "..." }` |
| **property.shared** | `LeadService.shareProperty` | `{ "leadId": "...", "propertyId": "...", "sharedBy": "..." }` |
| **siteVisit.scheduled** | `SiteVisitService.createVisit` | `{ "visitId": "...", "propertyId": "...", "scheduledStart": "..." }` |
| **siteVisit.completed** | `SiteVisitService.completeVisit` | `{ "visitId": "...", "leadId": "...", "outcome": "successful", "completedAt": "..." }` |
| **siteVisit.noShow** | `SiteVisitService.markNoShow` | `{ "visitId": "...", "leadId": "...", "scheduledStart": "..." }` |
| **siteVisit.attended** | `AttendanceService.checkIn` | `{ "visitId": "...", "profileId": "...", "arrivedAt": "..." }` |
| **task.created** | `TaskService.createTask` | `{ "taskId": "...", "title": "...", "assigneeId": "..." }` |
| **task.completed** | `TaskService.completeTask` | `{ "taskId": "...", "completedBy": "..." }` |
| **task.overdue** | Job detects overdue task | `{ "taskId": "...", "assigneeId": "...", "dueAt": "..." }` |
| **socialPost.published** | `SocialService.publishPost` | `{ "postId": "...", "platform": "...", "externalId": "..." }` |
| **notification.sent** | `NotificationService.send` | `{ "notificationId": "...", "recipientId": "...", "type": "..." }` |

## 3. Automation Examples
### 3.1 Lead Created → Auto‑Assign (Round‑Robin)
**Trigger**: `lead.created` event is processed.
**Action**:
1. A job is created to handle the assignment.
2. The job queries active agents in the organization.
3. It selects the agent with the fewest open leads.
4. Calls `LeadService.assignLead(leadId, selectedAgentId)`, which in turn creates a `lead.assigned` event.
**Notification**: The `lead.assigned` event triggers a job to send an in-app notification to the assigned agent.

### 3.2 Follow‑up Due → Reminder
**Trigger**: `followup.due` event is processed.
**Action**:
1. A job is created to send a reminder.
2. The job calls the `MessageService` to send a WhatsApp template message.
3. The job updates `followups.reminder_sent = true`.
**Notification**: A separate job sends a push notification via Supabase Realtime.

### 3.3 Call Missed → Escalation
**Trigger**: `call.missed` event is processed.
**Action**:
1. A job is created to handle the escalation.
2. The job creates a high-priority task for the lead owner (`task.created` event is fired).
3. The job sends an SMS/WhatsApp to the owner via the `MessageService`.

### 3.4 Duplicate Detected → Review Gate
**Trigger**: `lead.duplicateDetected` event is processed.
**Actions**:
1. Notify the manager/owner via in-app notification.
2. Create a review task assigned to a manager: “Review duplicate lead group”.
3. Prevent reassignment or auto-qualification while `duplicate_status='pending'`.
    - This is enforced via policy checks in the Service Layer (and optionally a DB constraint/workflow).

### 3.4.1 Lead Merged → Post-Merge Reconciliation
**Trigger**: `lead.merged` event is processed.
**Actions**:
1. Create audit log (the merge transaction must write an `audit_logs` entry; the event exists as the durable trigger for any post-merge reconciliation).
2. Notify manager.
3. Recalculate lead score.
4. Refresh duplicate groups.

### 3.5 SLA Breached → Escalation + Follow-up
**Trigger**: `lead.slaBreached` event is processed.
**Actions**:
1. Escalate by notifying the manager/owner.
2. Create a high-priority follow-up task due within a short window (e.g., 15 minutes).
3. Optionally send an external notification through configured integrations.

### 3.6 Site Visit Completed → Advance Pipeline + Collect Feedback
**Trigger**: `siteVisit.completed` event is processed.
**Actions**:
1. Update the lead status to `Site Visit Completed` (if not already).
2. Create a follow-up task for the assigned agent (e.g., “Send proposal / negotiate”).
3. Request feedback (store feedback on the site visit and optionally log an activity).

## 4. Job System & Retry Strategy
The event outbox is the source of truth, feeding a PostgreSQL-based job queue.
- **Jobs Table:** A `jobs` table stores tasks to be executed by background workers.
- **Workers:** Workers poll the `jobs` table, lock a job using `SELECT ... FOR UPDATE SKIP LOCKED`, and execute it.
- **Idempotency:** Workers must be idempotent. The combination of `event_outbox` status and `jobs` table ensures that events are processed reliably.
- **Retries:** Failed jobs have their `attempts` count incremented and `run_at` time updated for a future retry with exponential backoff.
- **Dead-Letter Queue (DLQ):** After a configurable number of retries (e.g., 5), the job's status is set to `failed`, and it's effectively in a DLQ. An admin UI will allow for monitoring and manual replay of failed jobs.

| Attempt | Delay | Action |
|---|---|---|
| 1 | Immediate | Run job |
| 2 | 10s | Retry |
| 3 | 60s | Retry |
| 4 | 5m | Retry |
| 5 | 30m | Retry |
| 6+ | – | Mark as `failed` (move to DLQ) |
