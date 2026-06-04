# API Specification

> All APIs are hosted on Vercel as Next.js route handlers. All endpoints are versioned under `/api/v1`. Authentication is handled by Supabase Auth JWT middleware. Each endpoint enforces **organization‑scoped RLS** via the `org_id` claim in the token.

## 1. Authentication
| Method | Route | Request Body | Response | Permissions |
|---|---|---|---|---|
| POST | `/api/v1/auth/sign‑up` | `{ email, password, full_name, organization_name }` | `{ access_token, refresh_token, user: { id, email, profile } }` | Public (creates new org & owner role) |
| POST | `/api/v1/auth/sign‑in` | `{ email, password }` | Same as sign‑up | Public |
| POST | `/api/v1/auth/refresh` | `{ refresh_token }` | `{ access_token }` | Authenticated |
| POST | `/api/v1/auth/logout` | – | `204 No Content` | Authenticated |
| POST | `/api/v1/auth/invite` | `{ email, role }` | `{ invitation_id }` | Owner/Admin |
| POST | `/api/v1/auth/accept-invitation` | `{ invitation_id, password }` | `{ access_token }` | Public (invitation token) |

## 2. Leads
| Method | Route | Request | Response | Permissions |
|---|---|---|---|---|
| GET | `/api/v1/leads` | Query params: `status`, `assigned_to`, `search` | `{ leads: Lead[] }` | Agent+ (only own org) |
| GET | `/api/v1/leads/:id` | – | `Lead` | Agent+ |
| POST | `/api/v1/leads` | `LeadCreate` | `Lead` (201) | Agent (creates own) |
| PATCH | `/api/v1/leads/:id` | `LeadUpdate` | `Lead` | Agent (owner) / Manager (any) |
| DELETE | `/api/v1/leads/:id` | – | `204` | Owner/Admin |
| POST | `/api/v1/leads/:id/assign` | `{ assignee_id }` | `Lead` | Manager/Owner |
| POST | `/api/v1/leads/:id/share` | `{ property_id, note? }` | `{ share_id }` | Agent/Manager |

### Lead DTOs
```ts
type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Site Visit Scheduled'
  | 'Site Visit Completed'
  | 'Negotiation'
  | 'Booking Done'
  | 'Won'
  | 'Lost'
  | 'Not Responding';

type LeadTemperature = 'Cold' | 'Warm' | 'Hot';
type DuplicateStatus = 'pending' | 'merged' | 'ignored';

interface Lead {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  status: LeadStatus;
  lead_temperature?: LeadTemperature;
  budget_min?: number;
  budget_max?: number;
  preferred_location?: string;
  property_type?: string;
  last_contacted_at?: string;
  next_followup_at?: string;
  lead_score?: number;
  source_platform?: string;

  is_duplicate: boolean;
  duplicate_group_id?: string;
  merged_into_lead_id?: string;
  duplicate_status?: DuplicateStatus;
  site_visit_count: number;
  won_value?: number;
  lost_reason?: string;

  source?: string; // free-form attribution (legacy)
  assigned_to?: string; // profile id
  created_by: string;
  created_at: string;
  updated_at: string;
}
interface LeadCreate {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  source?: string;
  source_platform?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_location?: string;
  property_type?: string;
}
interface LeadUpdate {
  status?: LeadStatus;
  assigned_to?: string;
  lead_temperature?: LeadTemperature;
  budget_min?: number;
  budget_max?: number;
  preferred_location?: string;
  property_type?: string;
  next_followup_at?: string;
  lost_reason?: string;
}
```

### Duplicate Management APIs
| Method | Route | Request | Response | Permissions |
|---|---|---|---|---|
| GET | `/api/v1/leads/duplicates` | optional filters: `status=pending\|ignored\|merged`, `group_id` | `{ duplicates: Lead[] }` | Manager/Owner/Admin |
| POST | `/api/v1/leads/:id/mark-duplicate` | `{ duplicate_group_id?: string, reason?: string }` | `Lead` | Manager/Owner/Admin |
| POST | `/api/v1/leads/:id/merge` | `{ target_lead_id: string }` | `{ source_lead_id, target_lead_id, merged }` | Owner/Admin |

Notes:
- `mark-duplicate` sets `is_duplicate=true` and `duplicate_status='pending'`.

### Merge Endpoint Clarification
#### Merge Behavior
The endpoint must execute the **Canonical Lead Merge Policy** as defined in `DATABASE.md`.

Response:
```json
{
  "source_lead_id": "...",
  "target_lead_id": "...",
  "merged": true
}
```

Notes:
- `merge` sets the source lead to `duplicate_status='merged'` and `merged_into_lead_id=target_lead_id`.
- The operation must emit a `lead.merged` event and create an `audit_logs` entry.

## 3. Properties
| Method | Route | Request | Response | Permissions |
|---|---|---|---|---|
| GET | `/api/v1/properties` | Filters: `type`, `location`, `price_min`, `price_max` | `{ properties: Property[] }` | Agent+ |
| GET | `/api/v1/properties/:id` | – | `Property` | Agent+ |
| POST | `/api/v1/properties` | `PropertyCreate` | `Property` (201) | Manager/Owner |
| PATCH | `/api/v1/properties/:id` | `PropertyUpdate` | `Property` | Manager/Owner |
| DELETE | `/api/v1/properties/:id` | – | `204` | Owner/Admin |
| POST | `/api/v1/properties/:id/images` | multipart/form-data (`file`) | `{ image_id }` | Manager/Owner |
| DELETE | `/api/v1/properties/:id/images/:imageId` | – | `204` | Manager/Owner |

### Property DTOs
```ts
interface Property {
  id: string;
  organization_id: string;
  type: 'project' | 'building' | 'unit';
  reference_id: string; // FK to projects/buildings/units
  title: string;
  description?: string;
  price_range?: string;
  location: { lat:number; lng:number };
  created_at: string;
}
```

## 4. Tasks & Follow‑ups
| Method | Route | Req | Res | Perm |
|---|---|---|---|---|
| GET | `/api/v1/tasks` | optional `status`, `assignee_id` | `{ tasks: Task[] }` | Agent+ |
| POST | `/api/v1/tasks` | `TaskCreate` | `Task` (201) | Agent (own) / Manager |
| PATCH | `/api/v1/tasks/:id` | `TaskUpdate` | `Task` | Owner/Assignee/Manager |
| POST | `/api/v1/tasks/:id/complete` | – | `Task` | Assignee/Manager |
| GET | `/api/v1/followups` | filter `due_before` | `{ followups: Followup[] }` | Agent+ |
| POST | `/api/v1/followups` | `FollowupCreate` | `Followup` (201) | Agent |

## 5. Attendance & Site Visits
| Method | Route | Req | Res | Perm |
|---|---|---|---|---|
| GET | `/api/v1/site-visits` | filter `property_id`, `date` | `{ visits: SiteVisit[] }` | Agent+ |
| POST | `/api/v1/site-visits` | `SiteVisitCreate` | `SiteVisit` (201) | Agent/Manager |
| PATCH | `/api/v1/site-visits/:id` | `SiteVisitUpdate` | `SiteVisit` | Manager/Owner |
| POST | `/api/v1/site-visits/:id/attend` | `{ profile_id }` | `{ attendance_id }` | Agent |
| POST | `/api/v1/site-visits/:id/complete` | `{ completed_at?: string, visit_outcome: 'successful'\|'no_show'\|'cancelled'\|'rescheduled', gps_verified?: boolean }` | `SiteVisit` | Agent/Manager |
| POST | `/api/v1/site-visits/:id/feedback` | `{ feedback: string }` | `SiteVisit` | Agent/Manager |

## 6. Notifications
| Method | Route | Req | Res | Perm |
|---|---|---|---|---|
| GET | `/api/v1/notifications` | `?unread=true` | `{ notifications: Notification[] }` | Authenticated |
| PATCH | `/api/v1/notifications/:id/read` | – | `204` | Authenticated |
| DELETE | `/api/v1/notifications/:id` | – | `204` | Authenticated |

## 7. Webhooks (Incoming from third‑party services)
All webhook endpoints validate a signature header (`x-signature`) using the secret stored in `integration_settings`.
| Method | Route | Description | Payload |
|---|---|---|---|
| POST | `/api/v1/webhooks/twilio/voice` | Incoming call status callbacks | Twilio Call webhook JSON |
| POST | `/api/v1/webhooks/twilio/whatsapp` | Incoming WhatsApp message | Twilio Message webhook |
| POST | `/api/v1/webhooks/resend` | Email delivery events | Resend webhook JSON |
| POST | `/api/v1/webhooks/openai` | Chat completion callbacks (optional) | OpenAI event JSON |

## 8. Reports
| Method | Route | Req | Res | Perm |
|---|---|---|---|---|
| GET | `/api/v1/reports/lead‑conversion` | `?from=&to=` | CSV/JSON report | Manager/Owner |
| GET | `/api/v1/reports/agent‑performance` | same | CSV/JSON | Manager/Owner |
| GET | `/api/v1/reports/property‑inventory` | filter `status` | CSV/JSON | Manager/Owner |
| GET | `/api/v1/reports/sla` | `?from=&to=` | `{ summary, by_agent, breaches }` | Manager/Owner |

### SLA APIs
| Method | Route | Req | Res | Perm |
|---|---|---|---|---|
| GET | `/api/v1/leads/:id/sla` | – | `{ lead_id, first_response_at, response_time_minutes, sla_breached }` | Agent+ |

## 9. Settings & Integrations
| Method | Route | Req | Res | Perm |
|---|---|---|---|---|
| GET | `/api/v1/integrations` | – | list of enabled integrations per org | Owner/Admin |
| PATCH | `/api/v1/integrations/:provider` | `{ enabled, config }` | updated record | Owner/Admin |
| GET | `/api/v1/settings` | – | organization settings | Owner/Admin |
| PATCH | `/api/v1/settings` | partial settings | updated settings | Owner/Admin |

### Organization Settings APIs
#### Get Organization Settings
`GET /api/v1/settings`

Response:
```json
{
  "timezone": "Asia/Kolkata",
  "business_hours": {},
  "sla_first_response_minutes": 30,
  "sla_followup_minutes": 1440,
  "branding": {}
}
```

Permissions: Owner, Admin

#### Update Organization Settings
`PATCH /api/v1/settings`

Request:
```json
{
  "timezone": "Asia/Kolkata",
  "sla_first_response_minutes": 45
}
```

Permissions: Owner, Admin

## 10. Feature Flags
| Method | Route | Req | Res | Perm |
|---|---|---|---|---|
| GET | `/api/v1/feature-flags` | – | `{ flags: FeatureFlag[] }` | Owner/Admin |
| PATCH | `/api/v1/feature-flags/:id` | `{ enabled: boolean }` | `FeatureFlag` | Owner/Admin |

## 11. Operations (Admin)
Operational visibility into async processing.
| Method | Route | Req | Res | Perm |
|---|---|---|---|---|
| GET | `/api/v1/events` | optional filters: `status`, `type`, `from`, `to` | `{ events: OutboxEvent[] }` | Owner/Admin |
| GET | `/api/v1/jobs` | optional filters: `status`, `queue_name`, `from`, `to` | `{ jobs: Job[] }` | Owner/Admin |
| GET | `/api/v1/dead-letter-queue` | optional filters: `queue_name`, `from`, `to` | `{ jobs: Job[] }` (failed only) | Owner/Admin |

### Operations DTOs
```ts
type OutboxStatus = 'pending' | 'processing' | 'failed' | 'completed';

interface OutboxEvent {
  id: string;
  organization_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  retry_count: number;
  created_at: string;
  processed_at?: string;
}

type JobStatus = 'pending' | 'processing' | 'failed' | 'completed';

interface Job {
  id: string;
  organization_id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  queue_name: string;
  priority: number;
  next_run_at?: string;
  locked_at?: string;
  locked_by?: string;
  processed_at?: string;
  last_error?: string;
  created_at: string;
}
```

---
### Common Error Responses
```json
{ "error": "string", "code": "UNAUTHORIZED|FORBIDDEN|NOT_FOUND|VALIDATION_ERROR" }
```
All errors return appropriate HTTP status codes (401, 403, 404, 422).
