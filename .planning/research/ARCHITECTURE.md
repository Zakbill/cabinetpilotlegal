# Architecture Patterns

**Domain:** Multi-tenant legal mission tracking SaaS (Supabase + Stripe + Redshift sync)
**Project:** CabinetPilot
**Researched:** 2026-03-15
**Confidence:** HIGH (established Supabase patterns) / MEDIUM (Stripe + RLS integration specifics)

---

## Recommended Architecture

### System Overview

```
Browser (React SPA)
  │
  ├── Supabase JS Client (Auth + Realtime + PostgREST)
  │     │
  │     ├── Auth (JWT with org_id + role claims)
  │     ├── PostgREST API (RLS-enforced table access)
  │     └── Realtime (row-level change subscriptions)
  │
  ├── Supabase Edge Functions (Deno)
  │     ├── sync-pennylane      ← Redshift → dossiers upsert
  │     ├── stripe-webhook      ← Stripe events → subscriptions table
  │     ├── invite-member       ← Resend email + pending_invitations row
  │     └── check-plan-limits   ← Called before allowing new dossiers
  │
  └── Stripe Billing Portal (redirected, hosted)

Supabase Database (Postgres)
  ├── auth.users                ← Supabase-managed
  ├── public.organisations      ← Tenant root
  ├── public.cabinets           ← Sub-scope within org
  ├── public.org_members        ← Users ↔ orgs with role
  ├── public.cabinet_assignments← Collaborateurs ↔ cabinets
  ├── public.dossiers           ← Core entity (AGO + future types)
  ├── public.statuts_config     ← Per-org custom statuses
  ├── public.activity_logs      ← Immutable audit trail
  ├── public.sync_logs          ← Per-sync execution record
  ├── public.subscriptions      ← Stripe plan state mirror
  └── vault.secrets             ← Redshift credentials (Supabase Vault)

External Systems
  ├── AWS Redshift (eu-west-1)  ← Source of truth for Pennylane data
  ├── Stripe                    ← Billing + plan enforcement
  └── Resend                    ← Transactional email
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| React SPA | UI, client-side routing, state, Framer Motion | Supabase JS, Stripe redirect |
| Supabase Auth | JWT issuance, session management, invite tokens | SPA (session), Edge Functions (JWT verify) |
| PostgREST (RLS) | Data reads and writes with tenant isolation enforced at DB layer | SPA via supabase-js |
| Realtime | Push dossier/log row changes to subscribed clients | SPA subscriptions |
| Edge Function: sync-pennylane | Fetch Redshift credentials from Vault, connect to Redshift, run org-scoped SQL, upsert dossiers, write sync_log | Vault, Redshift, postgres (dossiers, sync_logs) |
| Edge Function: stripe-webhook | Validate Stripe signature, parse event, update subscriptions table | Stripe, postgres (subscriptions) |
| Edge Function: invite-member | Validate caller role (expert-comptable only), create pending_invitations row, send Resend email | postgres, Resend |
| Edge Function: check-plan-limits | Count active dossiers for org, compare vs plan tier, return allow/deny | postgres (dossiers, subscriptions) |
| Supabase Vault | Encrypted storage for per-org Redshift credentials | Edge Functions only (never SPA) |
| Stripe | Subscription lifecycle, payment, hosted billing portal | stripe-webhook Edge Function |
| Redshift (Pennylane) | Source data for dossiers | sync-pennylane Edge Function only |

---

## Data Flow

### 1. Authentication Flow (Build First)

```
User submits login form
  → supabase.auth.signInWithPassword()
  → Supabase Auth issues JWT
  → JWT payload includes: sub (user_id), app_metadata.org_id, app_metadata.role
  → SPA stores session, reads org_id + role from JWT claims
  → All subsequent PostgREST calls include JWT in Authorization header
  → RLS policies extract auth.uid() and custom claims to enforce scoping
```

JWT custom claims are populated via a database trigger on `auth.users` insert
and via an `auth.users` hook that reads from `org_members`.

Pattern: store `org_id` and `role` in `auth.jwt()` via a custom claim using
Supabase's `auth.users.raw_app_meta_data` — set this when creating org_members rows.

### 2. Data Read Flow (Dashboard)

```
SPA calls: supabase.from('dossiers').select('*').eq('cabinet_id', cabinetId)
  → PostgREST sends query to Postgres
  → RLS policy on dossiers evaluates:
      - expert-comptable: WHERE org_id = auth.jwt()->'app_metadata'->>'org_id'
      - collaborateur: WHERE cabinet_id IN (
            SELECT cabinet_id FROM cabinet_assignments
            WHERE user_id = auth.uid()
          )
  → Postgres returns only rows passing policy
  → PostgREST returns JSON to SPA
```

### 3. Sync Flow (Pennylane → Dossiers)

```
Manual trigger (SPA button) or pg_cron (weekly, Pro+)
  → Calls Edge Function: sync-pennylane
  → Function reads org_id from JWT (manual) or from scheduled job param
  → Reads Redshift credentials from vault.secrets for that org_id
  → Opens Redshift connection (pg driver, eu-west-1 — anticipate 200-600ms latency)
  → Executes parameterized SQL with org-specific filters
  → For each row returned:
      - INSERT INTO dossiers ... ON CONFLICT (task_uid) DO UPDATE
        (never overwrites statut — statut is excluded from the UPDATE SET)
  → Writes sync_logs row (timestamp, created_count, updated_count, errors[])
  → Returns { success, created, updated, errors } to caller
  → SPA receives response, shows toast, Realtime subscription fires on sync_logs
```

### 4. Status Change Flow (Real-time)

```
User changes status in side panel
  → SPA calls: supabase.from('dossiers').update({ statut_id }).eq('id', dossierId)
  → RLS policy validates write permission (org scope + role)
  → Postgres updates row
  → Supabase Realtime broadcasts row change to all subscribed clients in same org
  → SPA receives realtime event, updates TanStack Table row in-place
  → activity_logs INSERT trigger fires on dossiers UPDATE
      → Inserts log row: { dossier_id, user_id, action: 'status_change',
                           old_value, new_value, created_at }
```

### 5. Stripe Subscription Flow

```
User clicks "Upgrade" in billing page
  → SPA calls Stripe Customer Portal redirect (or Checkout session)
  → User completes payment on Stripe-hosted page
  → Stripe fires webhook event (customer.subscription.updated, etc.)
  → Edge Function: stripe-webhook validates signature
  → Upserts subscriptions table:
      { org_id, stripe_customer_id, stripe_subscription_id,
        plan_tier, dossier_limit, auto_sync_enabled, current_period_end, status }
  → SPA reads subscriptions row via RLS-scoped query on next load
  → Plan enforcement: check-plan-limits Edge Function blocks sync or dossier creation
    if count(dossiers WHERE org_id = X AND active = true) >= dossier_limit
```

---

## RLS Policy Patterns

### Foundational Setup

Every table that contains tenant data MUST have:
1. `org_id UUID NOT NULL REFERENCES organisations(id)` column
2. `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY`
3. Explicit policies for SELECT, INSERT, UPDATE, DELETE (never rely on defaults)

### Helper Functions (define once, reuse)

```sql
-- Returns the org_id from the JWT custom claim
CREATE OR REPLACE FUNCTION auth.org_id() RETURNS uuid AS $$
  SELECT (auth.jwt()->'app_metadata'->>'org_id')::uuid;
$$ LANGUAGE sql STABLE;

-- Returns the role from the JWT custom claim
CREATE OR REPLACE FUNCTION auth.org_role() RETURNS text AS $$
  SELECT auth.jwt()->'app_metadata'->>'role';
$$ LANGUAGE sql STABLE;
```

### Pattern A: Org-Scoped Access (dossiers, sync_logs, statuts_config)

```sql
-- SELECT: all org members see all dossiers (expert-comptable)
-- SELECT: collaborateurs see only their assigned cabinets
CREATE POLICY "dossiers_select" ON dossiers
  FOR SELECT USING (
    org_id = auth.org_id()
    AND (
      auth.org_role() = 'expert-comptable'
      OR cabinet_id IN (
        SELECT cabinet_id FROM cabinet_assignments
        WHERE user_id = auth.uid()
      )
    )
  );

-- INSERT: only expert-comptable or via service_role (Edge Functions)
CREATE POLICY "dossiers_insert" ON dossiers
  FOR INSERT WITH CHECK (
    org_id = auth.org_id()
    AND auth.org_role() = 'expert-comptable'
  );

-- UPDATE: collaborateurs can update dossiers in their cabinets (status change)
CREATE POLICY "dossiers_update" ON dossiers
  FOR UPDATE USING (
    org_id = auth.org_id()
    AND (
      auth.org_role() = 'expert-comptable'
      OR cabinet_id IN (
        SELECT cabinet_id FROM cabinet_assignments
        WHERE user_id = auth.uid()
      )
    )
  );
```

### Pattern B: Owner-Only Tables (subscriptions, org settings)

```sql
CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT USING (
    org_id = auth.org_id()
    AND auth.org_role() = 'expert-comptable'
  );

-- Subscriptions are never written by users — only by stripe-webhook via service_role
-- No INSERT/UPDATE policies needed for authenticated role
```

### Pattern C: Cabinet Assignments (admin-managed)

```sql
-- Only expert-comptable can manage cabinet assignments
CREATE POLICY "cabinet_assignments_all" ON cabinet_assignments
  FOR ALL USING (
    org_id = auth.org_id()
    AND auth.org_role() = 'expert-comptable'
  );

-- Collaborateurs can read their own assignments (needed for sidebar cabinet list)
CREATE POLICY "cabinet_assignments_self_read" ON cabinet_assignments
  FOR SELECT USING (
    user_id = auth.uid()
  );
```

### Pattern D: Activity Logs (append-only, no delete)

```sql
-- SELECT: scoped to org, collaborateurs see only their cabinets' logs
CREATE POLICY "activity_logs_select" ON activity_logs
  FOR SELECT USING (
    org_id = auth.org_id()
    AND (
      auth.org_role() = 'expert-comptable'
      OR dossier_id IN (
        SELECT id FROM dossiers
        WHERE cabinet_id IN (
          SELECT cabinet_id FROM cabinet_assignments WHERE user_id = auth.uid()
        )
      )
    )
  );

-- INSERT: authenticated users in org (status changes, comments)
CREATE POLICY "activity_logs_insert" ON activity_logs
  FOR INSERT WITH CHECK (
    org_id = auth.org_id()
    AND user_id = auth.uid()
  );

-- No UPDATE, no DELETE policies → immutable audit trail
```

### Edge Function RLS Bypass

Edge Functions that perform cross-org operations (sync-pennylane, stripe-webhook) use the `service_role` key — they bypass RLS entirely. This is intentional and safe because:
- These functions are never called from the client directly with user context
- They validate org scoping in application logic before writing
- stripe-webhook validates Stripe signature before trusting any payload

---

## Stripe Plan Enforcement Patterns

### Subscriptions Table Structure

```sql
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organisations(id) UNIQUE,
  stripe_customer_id        TEXT NOT NULL,
  stripe_subscription_id    TEXT,
  plan_tier       TEXT NOT NULL CHECK (plan_tier IN ('starter','pro','cabinet','enterprise')),
  dossier_limit   INTEGER,          -- NULL = unlimited (enterprise)
  auto_sync       BOOLEAN DEFAULT false,
  status          TEXT NOT NULL,    -- 'active', 'trialing', 'past_due', 'canceled'
  current_period_end TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

### Enforcement Points

Three places enforce plan limits — all three are needed:

1. **Pre-sync check (Edge Function: sync-pennylane)**
   Before executing the Redshift query, count active dossiers. If at limit, return 402 error with `{ code: 'PLAN_LIMIT_REACHED' }`. The SPA shows a plan upgrade prompt.

2. **Auto-sync gate (pg_cron)**
   The scheduled cron job skips orgs where `subscriptions.auto_sync = false` or `subscriptions.status != 'active'`. Query: `SELECT org_id FROM subscriptions WHERE auto_sync = true AND status = 'active'`.

3. **UI gating (SPA read)**
   SPA reads `subscriptions` row on load, stores plan tier in context. Disable "Sync" button and show upgrade CTA when `plan_tier = 'starter'` for auto-sync, or when dossier count >= limit.

### Webhook Event Handling

```
customer.subscription.created   → INSERT subscriptions row
customer.subscription.updated   → UPDATE plan_tier, dossier_limit, auto_sync, status
customer.subscription.deleted   → UPDATE status = 'canceled', auto_sync = false
invoice.payment_failed           → UPDATE status = 'past_due' (grace period logic)
```

Idempotency: use Stripe event ID as a deduplication key in a `processed_stripe_events` table. Webhooks can fire multiple times.

---

## Suggested Build Order

Dependencies flow from bottom to top. Each layer must be stable before building the next.

```
Layer 0: Database Schema + RLS Foundation
  └── organisations, auth.users trigger, org_members, JWT custom claims
  └── RLS helper functions (auth.org_id, auth.org_role)
  └── REASON: Everything else depends on tenant isolation being correct

Layer 1: Authentication + Org Creation
  └── Supabase Auth, onboarding flow, org creation, role assignment
  └── REASON: Cannot test any feature without a valid JWT with org claims

Layer 2: Cabinet + Member Management
  └── cabinets table, cabinet_assignments, invite-member Edge Function, Resend
  └── REASON: Collaborateur RLS policies reference cabinet_assignments

Layer 3: Dossiers Core + Status Engine
  └── dossiers table, statuts_config, activity_logs
  └── RLS policies for all roles
  └── REASON: Core product value — all UI features depend on this data

Layer 4: Dashboard UI
  └── TanStack Table, filters, side panel, status change, activity log
  └── Realtime subscription on dossiers + activity_logs
  └── REASON: First user-visible value delivery; requires layers 0-3 stable

Layer 5: Pennylane Sync
  └── Supabase Vault setup, sync-pennylane Edge Function, sync_logs
  └── REASON: Depends on dossiers table schema being frozen; Vault access pattern
  └── WARNING: Redshift connection from Edge Function needs latency testing early

Layer 6: Stripe Billing
  └── subscriptions table, stripe-webhook Edge Function, billing page
  └── pg_cron auto-sync gate
  └── REASON: Plan enforcement wraps around sync (Layer 5); needs subscriptions stable
  └── Build billing last to avoid premature complexity during core feature dev

Layer 7: Landing Page
  └── Framer Motion animations, pricing section, CTAs
  └── REASON: Depends on knowing final pricing — built after Stripe plans confirmed
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing org_id Only in Application Layer
**What:** Trusting client-sent `org_id` param in queries without RLS enforcement.
**Why bad:** Any user could read another org's data by changing a parameter.
**Instead:** ALWAYS enforce `org_id = auth.org_id()` in RLS policies. Client never controls scoping.

### Anti-Pattern 2: Using `service_role` Key in the Browser
**What:** Exposing `SUPABASE_SERVICE_ROLE_KEY` in the React SPA.
**Why bad:** Bypasses all RLS — any user can access any tenant's data.
**Instead:** Service role is used ONLY in Edge Functions (server-side, never exposed).

### Anti-Pattern 3: Blocking Sync on Existing Status Values
**What:** The sync upsert overwrites the `statut_id` field when a dossier already exists.
**Why bad:** Destroys manually-set status — a hard requirement violation from PROJECT.md.
**Instead:** Use `ON CONFLICT (task_uid) DO UPDATE SET <non-status-fields-only>`. Explicitly exclude `statut_id` from the UPDATE SET clause.

### Anti-Pattern 4: RLS Policies Without Indexes
**What:** Writing `cabinet_id IN (SELECT cabinet_id FROM cabinet_assignments WHERE user_id = auth.uid())` without an index on `cabinet_assignments(user_id)`.
**Why bad:** Every row read triggers a sequential scan of cabinet_assignments — catastrophic at scale.
**Instead:** Index `cabinet_assignments(user_id)` and `dossiers(org_id, cabinet_id)` before shipping.

### Anti-Pattern 5: JWT Claims Not Refreshed After Role Change
**What:** User's role changes in `org_members` but their active JWT still has the old role.
**Why bad:** RLS policies read from JWT claims — old claims permit wrong access for up to 1 hour.
**Instead:** Call `supabase.auth.refreshSession()` after any role/cabinet assignment change. Force re-login for revocations.

### Anti-Pattern 6: Stripe Plan Enforcement Only in UI
**What:** Disabling the "Sync" button in React but not checking in the Edge Function.
**Why bad:** Any user with API access (cURL, Postman) bypasses the check.
**Instead:** Always enforce limits server-side in the Edge Function. UI gates are UX, not security.

### Anti-Pattern 7: Hardcoding Plan Tiers in Edge Functions
**What:** `if (plan === 'pro') { allowAutoSync = true }` in function code.
**Why bad:** Adding a new plan requires redeploying functions; `subscriptions.auto_sync` gets out of sync.
**Instead:** Store plan capabilities in the `subscriptions` table as boolean columns (`auto_sync`, `csv_export`). Edge Functions read the row — plan tier is metadata, not logic driver.

---

## Scalability Considerations

| Concern | At 100 dossiers | At 1,000 dossiers (v1 target) | At 10,000 dossiers |
|---------|-----------------|-------------------------------|-------------------|
| RLS policy performance | No issue | Ensure `cabinet_assignments(user_id)` index exists | Add `dossiers(org_id)` partial index |
| Realtime subscriptions | No issue | Filter subscription to `org_id` channel to avoid broadcast storms | Per-cabinet channels |
| Redshift sync latency | Single batch fine | Batch upsert with ON CONFLICT, single transaction | Paginate Redshift results |
| Stripe webhook queue | No issue | Idempotency table critical if retries spike | Standard Stripe retry handling sufficient |
| activity_logs growth | No issue | Paginate log reads in side panel (limit 50) | Partition by month if > 1M rows |

---

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| JWT custom claims for org_id + role | Avoids DB lookup on every RLS check — claims embedded in token, evaluated per-query in microseconds |
| Edge Functions use service_role | Sync and webhook operations span multiple tables and bypass RLS by design — application-level scoping in function code is the guard |
| Supabase Vault for Redshift credentials | Vault secrets are encrypted at rest and never readable via PostgREST — only accessible from Edge Functions via API |
| Upsert deduplication on task_uid | task_uid is the Pennylane-native identifier — stable across syncs, prevents duplicate creation |
| Immutable activity_logs (no DELETE policy) | Audit trail integrity — status changes and comments must be non-repudiable |
| subscriptions table mirrors Stripe state | Avoids calling Stripe API on every page load — webhook keeps table in sync, SPA reads locally |

---

## Sources

- Supabase RLS documentation: https://supabase.com/docs/guides/database/row-level-security (HIGH confidence — established pattern)
- Supabase custom JWT claims: https://supabase.com/docs/guides/auth/custom-claims-and-role-based-access-control-rbac (HIGH confidence)
- Supabase Vault: https://supabase.com/docs/guides/database/vault (HIGH confidence)
- Supabase Edge Functions with service_role: https://supabase.com/docs/guides/functions (HIGH confidence)
- Stripe webhook handling patterns (idempotency): https://stripe.com/docs/webhooks/best-practices (HIGH confidence)
- Multi-tenant SaaS with Supabase RLS — established community patterns (MEDIUM confidence — training data, cross-validated with official docs structure)
- CabinetPilot PROJECT.md — primary requirements source (HIGH confidence)
