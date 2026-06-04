# Security Architecture

> This document outlines security controls for the Estate Flow CRM SaaS platform. All recommendations align with OWASP ASVS Level 2 and GDPR/CCPA compliance.

## 1. Threat Model Overview
- **Assets**: Tenant data (leads, contacts, property info), authentication credentials, integration secrets, audit logs.
- **Actors**:
  - Legitimate Users (Owner, Admin, Manager, Agent)
  - External Attackers (network, API abuse)
  - Malicious Insider (compromised credentials)
- **Vectors**: API abuse, injection, misconfigured RLS, third‑party webhook spoofing, XSS in UI, token leakage.

## 2. Authentication Flow
1. **Sign‑up** – User provides email + password; Supabase Auth creates a user record.
2. **JWT Issuance** – Upon successful login, Supabase returns an access token (JWT) containing:
   ```json
   {
     "sub": "user‑uuid",
     "org_id": "organization‑uuid",
     "role": "owner|admin|manager|agent",
     "exp": "<timestamp>"
   }
   ```
3. **Refresh Tokens** – Rotating refresh tokens stored in HttpOnly Secure SameSite=Strict cookies.
4. **MFA** – Optional TOTP/Magic Link enforced for Owner/Admin via Supabase MFA.

## 3. Authorization & Permission Matrix
Authorization is based on a combination of the user's role and the resource being accessed. The matrix below defines the permissions for each role. `CRUD` stands for Create, Read, Update, Delete. `Own` refers to records created by or assigned to the user.

| Resource | Owner | Admin | Manager | Agent |
|---|---|---|---|---|
| **Leads** | CRUD | CRUD | CRUD | Read Own, Create, Update Own |
| **Properties** | CRUD | CRUD | CRUD | Read |
| **Tasks** | CRUD | CRUD | CRUD | Read Own, Create, Update Own |
| **Site Visits** | CRUD | CRUD | Read, Create, Update | Read, Create |
| **Attendance** | CRUD | CRUD | Read, Create, Update | Read, Create |
| **Reports** | CRUD | CRUD | Read | No Access |
| **Integrations** | CRUD | CRUD | No Access | No Access |
| **Team Members** | CRUD | CRUD | Read | No Access |
| **Settings** | CRUD | CRUD | No Access | No Access |
| **Automations** | CRUD | CRUD | Read | No Access |
| **Feature Flags**| CRUD | CRUD | No Access | No Access |
| **Billing** | CRUD | CRUD | No Access | No Access |

- **Policy Engine** – Backend services call `AuthorizationService.check(user, action, resource)` which:
  1. Verifies JWT integrity.
  2. Retrieves role-permissions from the matrix.
  3. Enforces `organization_id` matching the JWT `org_id`.
- **Fine‑grained checks** – For resources like leads, the service validates ownership (`created_by`) or assignment before allowing updates, as per the matrix.

## 4. Supabase Row‑Level Security (RLS)
All tenant-specific tables enable RLS with a primary policy to enforce tenant isolation:
```sql
-- Enforce that users can only access data within their own organization.
CREATE POLICY "org_isolation" ON leads
  FOR ALL
  USING (organization_id = (auth.jwt() ->> 'org_id')::uuid);
```
Additional policies are layered on top for role-specific access, e.g.:
```sql
-- Allow agents to update only their own leads.
CREATE POLICY "agent_update_own_lead" ON leads
  FOR UPDATE
  USING (
    (auth.jwt() ->> 'role' = 'agent') AND
    (assigned_to = (auth.jwt() ->> 'sub')::uuid)
  );
```
- An **audit trigger** on a `BEFORE` clause writes an entry to `audit_logs` for every row mutation.

## 5. API Protection
| Control | Detail |
|---|---|
| **Transport Security** | All traffic forced HTTPS via Vercel edge. HSTS (max‑age 1 year) enabled. |
| **API Versioning** | All endpoints are versioned (e.g., `/api/v1/*`) to prevent breaking changes. |
| **Rate Limiting** | Vercel Edge middleware limits `POST /api/v1/*` to 60 req/min per IP, stricter for auth endpoints (30 req/min). |
| **Input Validation** | Zod schemas for every request body; reject unknown fields (`stripUnknown: true`). |
| **Content‑Security‑Policy** | `default-src 'self'`; `script-src 'self'`; `style-src 'self' 'unsafe-inline'`; `img-src 'self' data:`. |
| **CORS** | Allow only `https://*.estateflow.io` and `http://localhost:3000` (dev). |
| **CSRF** | Server Actions automatically include CSRF tokens; API routes require `x-csrf-token` header verification. |
| **Error Handling** | Do not expose stack traces; return generic messages with error codes. |

## 6. Webhook Validation
- Each provider secret is stored encrypted in `integration_settings.config` (AES‑256 with `pgcrypto`).
- Incoming webhook handlers compute an HMAC (`sha256(secret, payload)`) and compare against the `x-signature` header.
- Reject mismatches with `401 Unauthorized`.

## 7. Secret Management
- **Supabase Secrets** – `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` stored in Vercel Environment Variables.
- **Third‑Party API Keys** – Stored encrypted in the `integration_settings` table using `pgcrypto`. Decrypted only in server‑side code.
- **No secrets in client‑side** – Services never expose keys to the browser.

## 8. Audit Logging & Monitoring
- **Immutable `audit_logs`** table records every CUD operation with `before`/`after` JSONB snapshots.
- **Log retention** – 90 days by default; archived to cold storage via Supabase Storage.
- **Alerting** – Vercel + Supabase monitors for:
  - Spike in failed auth attempts (>5/min).
  - RLS policy violations.
  - High volume of job failures in the dead-letter queue.

## 9. Rate Limiting & Abuse Prevention
- **Global** – Vercel edge limit: 1000 req/min per IP.
- **Per‑tenant** – Supabase function `rate_limit(organization_id, action)` for critical actions like lead creation (max 200 leads/min).
- **Captcha** – Optional ReCAPTCHA on sign‑up after repeated failures.

## 10. Multi‑Tenant Isolation
- **Data Isolation** – Enforced by RLS on every table.
- **Configuration Isolation** – Each organization has its own row in `integration_settings`; no cross‑tenant secret leakage.
- **Job Isolation** – All background jobs in the `jobs` table are linked to an `organization_id` and processed by workers aware of the tenant context.

## 11. Secure Development Practices
- **Static Analysis** – ESLint with security plugin and TypeScript type checking on every PR.
- **Dependency Scanning** – Dependabot + `npm audit` CI step; block merges on high severity findings.
- **Secret Scanning** – Pre‑commit hook scans for accidental secret patterns.
- **Pen‑Test Ready** – All endpoints documented in OpenAPI spec for external security testing.

## 12. Compliance
- **GDPR** – Right to access, rectify, delete (`/api/v1/users/:id/data-export`). Data stored with `organization_id` allows scoped deletion.
- **CCPA** – Opt‑out cookie for data sharing; `privacy` flag on leads.
- **PCI DSS** – Not applicable (no card data stored). Ensure no PII is logged unmasked.
