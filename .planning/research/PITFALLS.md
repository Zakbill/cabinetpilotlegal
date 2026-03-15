# Domain Pitfalls

**Domain:** Multi-tenant legal mission tracking SaaS (French accounting firms)
**Researched:** 2026-03-15
**Confidence note:** Research tools (WebSearch, Context7) were unavailable. All findings draw from training knowledge (cutoff August 2025). Claims marked with confidence levels. Verify Supabase Edge Function cold-start limits and pg_cron behavior against current Supabase docs before implementation.

---

## Critical Pitfalls

Mistakes that cause data leaks, rewrites, compliance failures, or lost revenue.

---

### Pitfall 1: RLS Policies That Pass in Dev but Leak in Production

**What goes wrong:** RLS policies are written to check `auth.uid()` directly against an `owner_id` column, but the multi-tenant model has an intermediate layer: `org_id → cabinet_id → dossier`. Developers test with a single user who owns every record — policies appear correct. In production, a `collaborateur` assigned to Cabinet A can read dossiers from Cabinet B of the same organisation because the policy checks `org_id` membership (correct) but not `cabinet_id` assignment (missing). The leak is within-org, not cross-org — harder to detect and more dangerous for client confidentiality.

**Why it happens:** The policy is written during Phase 1 (auth) before the full RBAC model is complete. It is never revisited because it "works." The `collaborateur` role restriction to assigned cabinets only exists as application-layer logic, not as an RLS rule.

**Consequences:** A collaborateur handling Dossier A can load the URL for Dossier B belonging to a different client of the firm. For a French accounting firm, this is a RGPD violation and a professional secrecy breach (`secret professionnel` under Article 226-13 Code pénal). Can result in contract loss and regulatory exposure.

**Prevention:**
1. Write RLS policies for ALL three isolation levels from day one:
   - Cross-org isolation: `organisation_id = (SELECT organisation_id FROM members WHERE user_id = auth.uid())`
   - Cabinet-level isolation for collaborateurs: `cabinet_id = ANY(SELECT cabinet_id FROM cabinet_assignments WHERE user_id = auth.uid())`
   - Expert-comptable bypass: role check before cabinet filter
2. Never use application-layer filtering as a substitute for RLS — RLS is the last line of defense against direct API calls.
3. Write automated tests that log in as a `collaborateur`, perform a raw Supabase client query for a dossier from an unassigned cabinet, and assert a 0-row response (not a 403 — RLS returns empty, not forbidden).
4. Run `EXPLAIN (ANALYZE, BUFFERS)` on RLS-filtered queries early — nested `SELECT` in policies can be slow at scale.

**Detection (warning signs):**
- Postman/curl direct to Supabase REST API returns rows for users who should not see them
- No automated RLS tests in the test suite
- Policy was written before RBAC model was finalised

**Phase:** Address in Phase 2 (Auth & RBAC). Never defer.

---

### Pitfall 2: Missing `service_role` Guard on Admin Edge Functions

**What goes wrong:** Edge Functions that perform sync, pg_cron callbacks, or internal admin operations use `supabaseClient` initialised with the anon key instead of the service role key. RLS policies therefore apply to the function itself, causing the sync to silently skip rows it cannot read or write. Alternatively, the function is written with `service_role` correctly but the secret is committed to the repo or hardcoded in a non-Vault location.

**Why it happens:** Copy-pasting client initialisation code from frontend examples. The difference between `createClient(url, anon_key)` and `createClient(url, service_role_key, { auth: { persistSession: false } })` is not obvious to developers new to Supabase.

**Consequences:** The sync function creates 0 new records and logs no errors — it silently succeeds with empty results because RLS filters out everything. Or, if credentials are leaked, attackers bypass all RLS.

**Prevention:**
1. Establish a code convention: Edge Functions that are triggered by cron or service-to-service calls always use service role. Functions called by the browser always use anon key (respecting RLS).
2. Store `SUPABASE_SERVICE_ROLE_KEY` in Supabase Edge Function secrets, never in source code.
3. Add a smoke test to the sync function that asserts `rows_processed > 0` on a known-populated org after each deploy.

**Detection:** Sync logs show `created: 0, updated: 0` on first run despite Redshift having data.

**Phase:** Address in Phase 3 (Pennylane sync). Establish the pattern in Phase 2.

---

### Pitfall 3: RLS Policy Performance Collapse at Scale (920+ Dossiers)

**What goes wrong:** RLS policies use correlated subqueries that execute once per row scanned. For an org with 920 dossiers, a query like `SELECT * FROM dossiers` triggers 920 evaluations of `SELECT organisation_id FROM members WHERE user_id = auth.uid()`. This is imperceptible with 50 rows in dev but causes 2-5 second page loads in production.

**Why it happens:** Supabase's visual policy editor encourages writing policies as correlated subqueries. The performance implications are not surfaced at policy-write time.

**Consequences:** The dashboard table (the product's core feature) becomes unusably slow for the first real client (Actuariel, 920 dossiers). User perception: "the product is broken."

**Prevention:**
1. Replace correlated subqueries with `SECURITY DEFINER` helper functions that Postgres can cache per-transaction: `CREATE FUNCTION get_user_org_id() RETURNS UUID SECURITY DEFINER AS $$ SELECT organisation_id FROM members WHERE user_id = auth.uid() $$`
2. Add a GIN/btree index on `dossiers(organisation_id)` and `dossiers(cabinet_id)` before writing policies — Postgres uses them during RLS evaluation.
3. Benchmark with a realistic dataset (load 1000 synthetic dossiers) before first client demo.

**Detection:** Query duration > 500ms for the main dossiers list. Check with `EXPLAIN ANALYZE` — look for "Rows Removed by RLS Filter" in high numbers.

**Phase:** Address in Phase 2 (schema design). Index and benchmark in Phase 3 before going live.

---

### Pitfall 4: Stripe Webhook Processing Without Idempotency

**What goes wrong:** Stripe delivers webhooks with at-least-once semantics. If the handler returns a non-2xx response (network blip, Edge Function cold start), Stripe retries the event — sometimes multiple times within seconds. A non-idempotent handler will:
- Create duplicate subscription records
- Double-charge or double-credit usage
- Flip a subscription status back to `active` after it was correctly set to `canceled`

For the CabinetPilot model (plan controls access to pg_cron sync), this means a cancelled org retains auto-sync access indefinitely.

**Why it happens:** Developers handle the "happy path" first. Retry scenarios are not tested because they require simulating Stripe's retry behaviour.

**Consequences:** Revenue leakage (cancelled orgs keep Pro features), data corruption in `organisations.plan`, inability to audit billing state.

**Prevention:**
1. Store `stripe_event_id` in a `processed_webhook_events` table with a unique constraint. At handler start: `INSERT INTO processed_webhook_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id`. If nothing returned — skip processing.
2. Use Stripe's idempotency key pattern for all Stripe API calls originating from the backend.
3. The only source of truth for an org's plan is Stripe's subscription status, not a local cache — always read from the `subscription` object in the webhook payload, not from a derived field.
4. Test with `stripe trigger customer.subscription.deleted` via the Stripe CLI and replay the same event twice — assert no state change on second delivery.

**Detection:** `processed_webhook_events` table does not exist. Webhook handler has no deduplication check.

**Phase:** Address in Phase 4 (Stripe). Do not ship billing without idempotency guard.

---

### Pitfall 5: Stripe Webhook Signature Verification Skipped in Edge Function

**What goes wrong:** The Stripe webhook endpoint is a public URL (Supabase Edge Function). Without signature verification, any actor who discovers the URL can POST forged events — upgrading their own org to Enterprise, cancelling competitors' subscriptions.

**Why it happens:** The `stripe.webhooks.constructEvent()` call requires reading the raw body as a buffer, which is handled differently in Deno (Edge Functions runtime) than in Node.js. Developers who copy Node.js examples find they don't work directly and skip verification to move forward.

**Consequences:** Full billing system compromise. Fraudulent plan upgrades. Impossible to detect without access logs.

**Prevention:**
1. In Deno/Edge Function: read the raw body with `await req.arrayBuffer()`, convert to `Uint8Array`, and pass to `stripe.webhooks.constructEvent(body, signature, webhookSecret)`. Do not parse JSON before signature verification.
2. Store `STRIPE_WEBHOOK_SECRET` in Edge Function secrets (not Supabase Vault — separate concerns).
3. Return 400 immediately if signature check fails — never process the payload.

**Detection:** Webhook handler calls `req.json()` before verifying the signature. `STRIPE_WEBHOOK_SECRET` not in function secrets.

**Phase:** Address in Phase 4 (Stripe). Non-negotiable.

---

### Pitfall 6: Redshift Connection Timeout in Edge Functions (Cold Start + Long Query)

**What goes wrong:** Supabase Edge Functions run on Deno Deploy with a wall-clock timeout (50 seconds as of mid-2025 for non-enterprise plans, may vary — verify current limit). The Pennylane sync involves:
1. Cold start: 200-500ms
2. Retrieving encrypted credentials from Supabase Vault: 100-300ms
3. TCP handshake + TLS to AWS Redshift eu-west-1 from Supabase's Deno infrastructure: 500-2000ms (cross-cloud, cross-region)
4. Query execution (filtering 920 dossiers, joins): 1000-5000ms depending on Redshift load
5. Upsert loop or bulk insert into Postgres: 500-2000ms

Total: easily 5-10 seconds per org in the happy path, potentially 30-45 seconds for large orgs or slow Redshift. This leaves almost no margin. If Redshift is under load or the datashare is momentarily slow, the function times out — leaving the sync in an indeterminate state (partial upsert).

**Why it happens:** Local testing uses a fast local Postgres, not a cross-cloud Redshift over a real network. The timeout is not hit during development.

**Consequences:** Partial syncs that silently leave `dossiers` out of date. pg_cron fires, function times out, sync_log shows no error (process killed, not thrown). Users see stale data without knowing why.

**Prevention:**
1. Architect the sync as two stages: (a) fetch from Redshift and write raw results to a staging table in Supabase Postgres, (b) upsert from staging to `dossiers`. If the function times out during stage (a), stage (b) never runs — no partial state.
2. Use connection pooling / persistent connections with Redshift where possible (Redshift Data API is an alternative that is async and avoids timeout — worth evaluating).
3. Implement a `sync_state` column in `sync_logs`: `started → fetching → upserting → completed → failed`. A timeout leaves the row in `fetching` or `upserting` state — detectable.
4. Add a dead-man's-switch: if a sync has been in `started` state for > 5 minutes, mark it `failed` (can be done by pg_cron itself).
5. Verify the current Edge Function timeout limit in Supabase docs before designing the flow — this limit changes and is plan-dependent.

**Detection:** Sync logs show `started` state that never transitions to `completed`. Manual sync on a slow network produces a timeout error in the browser.

**Phase:** Address in Phase 3 (sync architecture). Design the two-stage pattern from the start — retrofitting it is painful.

---

### Pitfall 7: pg_cron Runs Against the Wrong Tenant (Missing org_id Scoping)

**What goes wrong:** pg_cron jobs are registered as SQL statements or function calls in the Supabase database. A common pattern is: `SELECT cron.schedule('sync-pennylane', '0 6 * * 1', 'SELECT sync_pennylane()');` where `sync_pennylane()` is a function that calls the Edge Function. The function fires at 6am Monday — for all orgs simultaneously. If all Pro+ orgs trigger Redshift connections at the same second, you get:
- Connection exhaustion on Redshift (limited concurrent connections per datashare)
- Rate limiting by the Edge Function platform
- All sync logs show the same timestamp, making debugging impossible

Additionally, if the pg_cron job is not scoped to specific orgs (only Pro/Cabinet/Enterprise), Starter orgs also get auto-sync, undermining the pricing model.

**Why it happens:** The simplest pg_cron pattern fires a single global job. Per-org scheduling is more complex and is deferred.

**Consequences:** Pricing model broken (Starter orgs get paid features). Redshift connection storms on Monday mornings. Race conditions in sync_logs.

**Prevention:**
1. The pg_cron job should NOT call a sync directly. It should INSERT rows into a `sync_queue` table with `(org_id, scheduled_at, status: 'pending')`.
2. A separate Edge Function (or pg_cron job running every minute) processes the queue sequentially or with controlled concurrency: `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY scheduled_at LIMIT 5`.
3. The queue INSERT only includes orgs where `plan IN ('pro', 'cabinet', 'enterprise')` — plan check happens at queue time, not sync time.
4. Stagger queue insertion: offset each org's sync by 30 seconds or sort by org_id hash to distribute load.

**Detection:** pg_cron registered with a direct Edge Function HTTP call rather than a queue insert. No plan check in the cron logic.

**Phase:** Address in Phase 3 (sync). Design the queue table in Phase 2 (schema).

---

### Pitfall 8: pg_cron Job Silent Failure with No Alerting

**What goes wrong:** pg_cron does not send notifications when a job fails. If the Edge Function returns a 500, or the HTTP call from within a Postgres function silently drops, or the `net.http_post` extension is not enabled — the cron job completes with status `succeeded` from pg_cron's perspective (the SQL ran; the HTTP call's failure is not surfaced). Clients on Pro plan don't get their weekly sync, with no indication anything went wrong.

**Why it happens:** pg_cron's `cron.job_run_details` table records whether the SQL ran successfully — not whether the downstream effect succeeded. This distinction is not obvious.

**Consequences:** Clients pay for auto-sync that silently stopped working weeks ago. First indication is a client complaint. In an accounting firm context (AGO deadlines are legally fixed), a missed sync can mean missed deadlines.

**Prevention:**
1. After each sync attempt (success or failure), write a row to `sync_logs` with a `status` field. A monitoring query (also via pg_cron) checks: `SELECT COUNT(*) FROM sync_logs WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours'` — alert via Resend email if > 0.
2. Use `pg_net` (Supabase's built-in HTTP extension) for Edge Function calls from pg_cron, and log the response status code in the queue row.
3. Consider using Supabase's built-in cron dashboard to inspect `cron.job_run_details` during development.

**Detection:** No `sync_logs` table with status tracking. No alerting on sync failures.

**Phase:** Address in Phase 3. The monitoring query can be added in Phase 5 (ops hardening).

---

### Pitfall 9: Customizable Status Schema With No Referential Integrity

**What goes wrong:** Statuses are customizable per org — stored in a `statuses` table with `(id, org_id, label, position, is_terminal)`. The `dossiers` table references the current status via `status_id`. If a user deletes a status that has dossiers attached, the application either:
- Throws a foreign key constraint error (if FK is enforced) — bad UX with no recovery path
- Silently nullifies `status_id` (if FK uses `ON DELETE SET NULL`) — dossiers become status-less, invisible in filtered views
- Allows the delete (no FK) — `status_id` becomes a dangling reference, joins silently drop rows

For an accounting firm that relies on status to manage deadlines, invisible dossiers is catastrophic.

**Why it happens:** Status management is built as a simple CRUD without thinking through the lifecycle of status references. The "delete" path is the happy path in testing.

**Consequences:** Dossiers disappear from the dashboard when a status is deleted. No data corruption warning, no audit trail. At annual AGO season, a cabinet may miss dozens of deadlines.

**Prevention:**
1. Never allow deletion of a status that has active dossiers. Before deleting, check `SELECT COUNT(*) FROM dossiers WHERE status_id = $1 AND org_id = $2`. If > 0, block the delete and show the count: "Ce statut est utilisé par 47 dossiers. Réassignez-les avant de supprimer."
2. Provide a "merge status" or "reassign and delete" flow in the UI.
3. For truly "deleted" statuses (archived), use `is_archived = true` rather than hard delete. The status label still resolves for historical records.
4. Protect terminal statuses differently — they represent completed workflow states and should only be deletable if all dossiers are migrated.
5. Add a DB-level `CHECK` constraint or trigger that prevents `status_id` nullification: `CONSTRAINT dossiers_status_not_null CHECK (status_id IS NOT NULL)`.

**Detection:** Status delete endpoint has no pre-check for attached dossiers. No FK with `ON DELETE RESTRICT`.

**Phase:** Address in Phase 2 (schema). The constraint must exist before any data is written.

---

### Pitfall 10: Supabase Vault Credential Retrieval Failures Not Handled Gracefully

**What goes wrong:** Redshift credentials per org are stored in Supabase Vault (encrypted). The sync Edge Function retrieves them at runtime. If the secret does not exist for an org (provisioning error, manual deletion, first-time setup incomplete), the function throws an unhandled error and crashes with a generic 500 — the sync log shows `failed` with no actionable message for the user.

**Why it happens:** The happy path (credentials exist) is tested; the missing-credentials path is not.

**Consequences:** Users see a non-actionable error. Support burden increases. In a SaaS context, the user's first sync failure during onboarding kills conversion.

**Prevention:**
1. Explicitly check for null/undefined after Vault retrieval: `if (!credentials) { throw new SyncError('CREDENTIALS_NOT_CONFIGURED', 'Les identifiants Pennylane ne sont pas configurés pour cette organisation.') }`.
2. Map error types to user-facing French messages in the sync log.
3. During onboarding, validate that Vault storage succeeded before letting the user leave the credentials page.
4. Add a "test connection" step in onboarding that does a lightweight Redshift `SELECT 1` before saving — fails fast with a clear message if credentials are wrong.

**Detection:** Sync error messages contain raw exception text rather than user-facing messages. No "test connection" step in onboarding flow.

**Phase:** Address in Phase 3 (sync). The "test connection" UX belongs in Phase 2 (onboarding).

---

## Moderate Pitfalls

---

### Pitfall 11: `task_uid` Deduplication Relies on Pennylane Data Stability

**What goes wrong:** The sync upsert uses `task_uid` (Pennylane's internal ID) as the deduplication key. If Pennylane reassigns or recycles `task_uid` values (e.g., after a client merge or account restructuring), the upsert will overwrite an existing dossier with data from a different client.

**Prevention:** Never use an external system's ID as a primary key in your own schema. Use `task_uid` as a unique index for deduplication, but keep Supabase's own `id` (UUID) as the true primary key. Add a `pennylane_task_uid` column with a unique constraint per `org_id` — the upsert targets this composite unique key, not the primary key.

**Phase:** Address in Phase 2 (schema design).

---

### Pitfall 12: Plan Enforcement Only at the UI Layer

**What goes wrong:** The pg_cron auto-sync is only enabled/disabled via a UI toggle in settings. The underlying database schedule exists regardless of plan. A Starter org that was downgraded from Pro retains their pg_cron job. The plan check lives only in the React component that renders the toggle — not in the database or Edge Function.

**Prevention:** Plan check must live in the queue INSERT logic (the SQL or function that populates `sync_queue`). Add a DB-level check: `WHERE org.plan IN ('pro', 'cabinet', 'enterprise')`. Additionally, when an org downgrades (Stripe webhook: `customer.subscription.updated`), explicitly delete their pending `sync_queue` entries.

**Phase:** Address in Phase 3 (sync) and Phase 4 (Stripe webhooks, handle downgrade event).

---

### Pitfall 13: Activity Log (Fil d'Activité) Written Application-Side, Not Database-Side

**What goes wrong:** The activity feed is written by the frontend (or API layer) when a status change is saved. If the client disconnects mid-request, or the status update succeeds but the activity log write fails, the dossier has a new status with no audit trail entry. In an accounting firm context, regulators and clients expect a complete, tamper-evident history.

**Prevention:** Use a Postgres trigger on the `dossiers` table: `CREATE TRIGGER log_status_change AFTER UPDATE OF status_id ON dossiers FOR EACH ROW WHEN (OLD.status_id IS DISTINCT FROM NEW.status_id) EXECUTE FUNCTION record_status_change()`. The trigger writes to `activity_logs` atomically with the status change — they either both happen or neither does.

**Phase:** Address in Phase 2 (schema). The trigger must exist before any status changes are allowed.

---

### Pitfall 14: Invitation Tokens Without Expiry or Single-Use Enforcement

**What goes wrong:** Email invitation links (`/invite?token=xxx`) remain valid indefinitely. A collaborateur who left the firm could use an old invitation link months later to join the organisation. The token is also not invalidated after first use if the implementation uses a simple UUID stored in the DB without a `used_at` column.

**Prevention:** Add `expires_at` (48-hour window) and `accepted_at` columns to the `invitations` table. Check both on redemption: reject if `expires_at < NOW()` or `accepted_at IS NOT NULL`.

**Phase:** Address in Phase 2 (auth/onboarding).

---

### Pitfall 15: TanStack Table Filtering Done Client-Side on Full Dataset

**What goes wrong:** The dashboard loads all 920 dossiers for an org into the browser, then filters client-side via TanStack Table. At 920 rows this is acceptable. At 3,500 rows (Cabinet plan limit), JSON payload size and React render time degrade. On mobile or slow connections, the dashboard becomes unusable.

**Prevention:** Implement server-side pagination and filtering from day one. TanStack Table supports server-side mode. The Supabase query uses `.range()` for pagination and applies filter clauses server-side. This is not premature optimisation — the product's pricing model explicitly includes a Cabinet plan at 3,500 dossiers.

**Phase:** Address in Phase 3 (dashboard). Design the data-fetching layer with server-side pagination from the start.

---

## Minor Pitfalls

---

### Pitfall 16: Framer Motion Animations Blocking Interactivity During Status Updates

**What goes wrong:** The status badge animation (change of status in the side panel) uses `AnimatePresence` to animate the old badge out and the new one in. If the exit animation duration is 300ms and the user rapidly changes status twice, the intermediate state's animation queue causes the badge to briefly show an incorrect status.

**Prevention:** Optimistic UI with a local state override — update the displayed status immediately on click, trigger the API call in the background. If the API call fails, revert to the previous status with an error toast.

**Phase:** Address in Phase 3 (dashboard, side panel implementation).

---

### Pitfall 17: Resend Email Delivery With No Bounce Handling

**What goes wrong:** Invitation emails are sent via Resend. If the recipient's email address bounces (typo in email at invitation time), the invitation status stays `pending` in the DB with no indication to the admin that delivery failed.

**Prevention:** Implement Resend webhook for `email.bounced` events. Update the invitation record with `delivery_status: 'bounced'` and surface this in the team management UI: "Invitation non délivrée — adresse e-mail invalide."

**Phase:** Address in Phase 4 (ops/email). Not blocking for MVP but needed before first production client.

---

### Pitfall 18: Dark Mode Theming Breaking shadcn Status Badges

**What goes wrong:** Custom status badges use hardcoded Tailwind color classes (`bg-indigo-100 text-indigo-800`) that do not respect dark mode. Since statuses are user-created with custom labels, there is no standard shadcn variant for them — developers reach for inline styles or hardcoded classes.

**Prevention:** Use CSS custom properties for badge colors, not Tailwind classes. Define a palette of 7-10 theme-aware color options (indigo, emerald, amber, red, zinc, etc.) that orgs can assign to statuses. Each option uses `dark:` variants or CSS variables that resolve correctly in both modes.

**Phase:** Address in Phase 3 (status management UI). Establish the pattern before the first status badge is rendered.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Phase 2: Schema & Auth | RLS policy not covering cabinet-level isolation for collaborateurs | Write and test all three isolation levels (org, cabinet, user) before writing any data |
| Phase 2: Schema & Auth | Status delete with attached dossiers — dangling references | DB-level FK with `ON DELETE RESTRICT` + UI pre-check |
| Phase 2: Schema & Auth | Activity log written application-side | Postgres trigger on `dossiers.status_id` change |
| Phase 2: Schema & Auth | Invitation tokens without expiry | `expires_at` + `accepted_at` columns from day one |
| Phase 3: Sync | Edge Function timeout on Redshift cross-cloud query | Two-stage sync with staging table; `sync_state` tracking |
| Phase 3: Sync | pg_cron firing all orgs simultaneously on Monday 6am | Queue-based dispatch with plan check and staggered processing |
| Phase 3: Sync | pg_cron silent failure | `sync_logs` with status tracking + monitoring query |
| Phase 3: Sync | Starter orgs getting auto-sync after plan downgrade | Plan check in queue INSERT SQL, not UI layer |
| Phase 3: Dashboard | Client-side TanStack Table filtering on 3500+ rows | Server-side pagination from day one |
| Phase 4: Stripe | Webhook processed multiple times (duplicate events) | `processed_webhook_events` deduplication table |
| Phase 4: Stripe | Forged webhook events | Stripe signature verification before any payload parsing |
| Phase 4: Stripe | Plan not enforced on downgrade | Handle `customer.subscription.updated` webhook — purge queue entries |
| Phase 4/5: Ops | Vault credential retrieval failure with no user message | Explicit null check with French error messages |
| Phase 5: Ops | No alerting on sync failures for paying customers | pg_cron monitoring query + Resend alert on failure |

---

## Compliance Note (French Accounting Context)

French comptables are bound by `secret professionnel` (professional secrecy) and RGPD. Specific risks for CabinetPilot:

1. **Cross-org data leakage** is not just a bug — it is a RGPD Article 5(1)(f) breach (integrity and confidentiality). Supabase's RLS must be the enforcement layer, not application code.
2. **Audit trail completeness** — The `fil d'activité` is not just a UX feature. For a regulated profession, it is evidence of who did what and when. It must be written atomically (trigger) and must be append-only (no UPDATE or DELETE on `activity_logs`).
3. **Data residency** — Supabase's hosted platform uses AWS eu-west-1/eu-central-1 for EU projects (verify current region mapping). Pennylane Redshift is already eu-west-1. Confirm both are within EEA before first client signature.
4. **Pennylane credential storage** — Supabase Vault encrypts at rest using pgsodium (AES-256). This is appropriate for storing Redshift credentials. Document this in the privacy notice sent to clients.

---

## Sources

**Confidence:** MEDIUM — all findings from training knowledge (cutoff August 2025). No real-time verification was possible (WebSearch and Context7 unavailable during this research session).

Verify before implementation:
- Supabase Edge Function timeout limits: https://supabase.com/docs/guides/functions/limits
- pg_cron documentation: https://supabase.com/docs/guides/database/extensions/pg_cron
- Supabase Vault: https://supabase.com/docs/guides/database/vault
- Stripe webhook idempotency: https://stripe.com/docs/webhooks/best-practices
- Stripe Deno/Edge integration: https://github.com/stripe/stripe-node (Deno support section)
- pg_net extension (HTTP from Postgres): https://supabase.com/docs/guides/database/extensions/pg_net
