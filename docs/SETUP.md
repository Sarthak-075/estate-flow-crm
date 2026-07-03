# Local Development Setup for EstateFlow CRM (Supabase Phase 1.1)

This guide walks you through getting the Supabase backend wired up for the **Phase 1.1** core tables.

---

## 1. Copy the environment file

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in the values you obtain from your Supabase project dashboard:

- `NEXT_PUBLIC_SUPABASE_URL` – the **Project URL**.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – the **public anon key**.
- `SUPABASE_SERVICE_ROLE_KEY` – the **service role key** (keep this secret; never commit it).

---

## 2. Install dependencies (if not already done)

```bash
npm install
```

`@supabase/ssr`, `@supabase/supabase-js` and `zod` are required.

---

## 3. Run the Supabase migrations

From the root of the repo:

```bash
# Ensure the Supabase CLI is installed (https://supabase.com/docs/guides/cli)
supabase db push   # pushes all files in supabase/migrations/**/*.sql
```

The migration files will create the following tables (in order):

1. `organizations`
2. `profiles`
3. `roles` & `permissions`
4. `team_members`
5. `organization_settings`
6. Helper functions & RLS policies (`current_user_organization`, `current_user_role`, `is_owner`, `is_admin`)
7. `audit_logs`

---

## 4. Seed the database (optional but recommended)

Run the seed script to create a demo organization, default roles, basic permissions and default settings.

```bash
node -r ts-node/register src/db/seed.ts
```

If you prefer a npm script, add to `package.json`:

```json
"scripts": { "seed": "node -r ts-node/register src/db/seed.ts" }
```

Then run `npm run seed`.

---

## 5. Verify the setup

1. **Env validation** – start the dev server; if any required env var is missing the app will crash with a clear error.
   ```bash
   npm run dev
   ```
2. **Supabase client** – open a page that imports `src/lib/supabase/client` and run a simple public query, e.g. `supabase.from('organizations').select()`; it should return an array (empty for a fresh DB).
3. **RLS** – open a server‑only route (or a server action) that uses `supabaseServer`; make sure the request succeeds when a valid Supabase session cookie is present.
4. **Audit logs table** – insert a row into any table via the admin client (`src/lib/supabase/admin`) and verify that the row appears in `audit_logs`.
5. **Roles & permissions** – query the `roles` and `permissions` tables to confirm the seed data.

---

## 6. Next steps

- Implement authentication UI (sign‑in, sign‑out) using Supabase Auth.
- Add API routes that rely on the RLS policies.
- Extend the seed scripts with more realistic demo data as the product grows.

---

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the client. Keep `.env.local` out of version control (it is already listed in `.gitignore`).
