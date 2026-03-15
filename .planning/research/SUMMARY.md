# Project Research Summary

**Project:** CabinetPilot
**Domain:** Multi-tenant legal mission tracking SaaS for French accounting firms (cabinets d'expertise comptable) — AGO obligation management
**Researched:** 2026-03-15
**Confidence:** MEDIUM (training knowledge cutoff August 2025; no live verification tools available)

## Executive Summary

CabinetPilot is a purpose-built, Pennylane-native SaaS dashboard that replaces the Airtable + N8N workflows French accounting firms currently use to track AGO (Assemblée Générale Ordinaire) obligations. The product's core value is a reliable, automatically-synced view of Pennylane dossiers with per-dossier workflow management — status tracking, deadline visibility, activity logs, and role-based access for multi-cabinet groups. The first customer (Actuariel) brings 920 dossiers across 3 cabinets, which sets the concrete performance baseline to target from day one.

The recommended architecture is a React SPA (Vite + TypeScript + shadcn/ui) backed entirely by Supabase — handling auth, database, Edge Functions, Realtime, and Vault in a single platform. Supabase's Row-Level Security is the cornerstone of multi-tenancy: org isolation enforced at the database layer, with cabinet-level scoping for collaborateur roles embedded in RLS policies, never in application code. Pennylane data is sourced from AWS Redshift Datashare via a Supabase Edge Function using a standard PostgreSQL wire-compatible client. Stripe manages subscription tiers that gate auto-sync and export features; Resend handles transactional email.

The top risks fall into two categories: data integrity and integration complexity. On data integrity, within-org data leakage between cabinets (RGPD / secret professionnel exposure) is the most dangerous failure mode — it requires three-level RLS policies (org, cabinet, user) written and tested before any data is loaded. On integration complexity, the Redshift-to-Supabase sync runs cross-cloud and is at significant risk of Edge Function timeouts; a two-stage sync architecture with a staging table is the mitigation pattern to design in from the start, not retrofit. Both risks are preventable with upfront schema discipline.

---

## Key Findings

### Recommended Stack

The stack is a well-integrated, constraint-driven set of technologies. PROJECT.md constraints (shadcn/ui, framer-motion, Resend, Stripe) narrow most choices; the remaining decisions (TanStack Query v5 over SWR, Zustand over Redux, Vite SPA over Next.js) follow naturally from the app's profile — a single-page dashboard with no SSR requirements, server-state from Supabase, and ephemeral client-state for UI.

Pin React at 18.3.x (not 19) and Tailwind at 3.4.x (not v4): both have documented ecosystem compatibility issues with framer-motion and shadcn/ui respectively as of mid-2025. All Supabase Edge Functions run on Deno — use `npm:pkg` import notation for Node-compatible packages; Node.js `require()` does not work.

**Core technologies:**
- **React 18.3 + Vite 5 + TypeScript 5.5** — SPA build stack; stable, fast dev server, strict type safety catches RLS shape mismatches early
- **shadcn/ui + Tailwind 3.4 + Radix UI** — component system; copy-paste owned components, Radix headless primitives for custom variants
- **framer-motion 11** — all animations (sidebar collapse via `layout` prop, side panel slide-in via `AnimatePresence`, status badge transitions)
- **@tanstack/react-table v8 + @tanstack/react-query v5** — headless table with full filter/sort control; TanStack Query for Supabase server state with caching and optimistic updates
- **Zustand 4** — client-only ephemeral state (sidebar, selected dossier, active filters); no Redux
- **Supabase (JS client 2.x)** — auth (JWT + custom claims), PostgREST (RLS-enforced), Realtime, Vault (per-org Redshift credentials), Edge Functions (Deno)
- **pg + npm:pg in Deno** — Redshift connection via PostgreSQL wire protocol; port 5439, SSL required
- **pg_cron + pg_net** — scheduled auto-sync triggers Edge Function via HTTP; queue-based dispatch for per-org scheduling
- **Stripe (server-side 14.x/16.x + @stripe/stripe-js 4.x client)** — subscription billing; webhook in Edge Function with signature verification
- **Resend 3.x + React Email** — transactional email (invitations, sync failure alerts); pre-render email HTML at build time for v1
- **react-hook-form 7 + zod 3** — form state and schema validation; zod schemas double as TypeScript types

See `.planning/research/STACK.md` for installation commands, integration code patterns, and version verification checklist.

### Expected Features

The product serves a single workflow — AGO deadline management — for a legally regulated profession. Missing any table-stakes feature causes cabinets to stay on Airtable. Missing the differentiators means the product is just another generic task tracker.

**Must have (table stakes):**
- Dossier list with status column, filtering (cabinet / statut / échéance), and sorting — primary daily-use surface for 920+ dossiers
- Status change per dossier (from side panel; no page reload) — the entire workflow is status progression
- Deadline visibility with urgency color-coding (overdue / <30 days / ok) — statutory deadlines, legally significant
- Activity log per dossier (status changes + manual comments, append-only, with author + timestamp) — audit trail for a regulated profession
- Manual comments on dossiers — internal coordination for multi-collaborateur cabinets
- RBAC with two roles (expert-comptable, collaborateur) and cabinet-level scoping — collaborateurs see only their assigned cabinets
- Email invitation flow with role pre-assignment — team onboarding without password sharing
- Pennylane Redshift sync (manual trigger) with sync status feedback — this IS the product; without data, nothing else matters
- Customizable statuses per org (rename, reorder, add, delete) with 7 defaults pre-loaded — cabinets reject rigid workflows
- Organization creation and onboarding flow (Pennylane credentials + first sync) — must complete in one session
- Multi-tenant data isolation enforced at DB layer (RLS) — non-negotiable for legal/financial data
- Subscription and billing management (Stripe; plan-based dossier limits) — required to monetize

**Should have (differentiators):**
- Automatic weekly Pennylane sync via pg_cron (Pro+ plan) — eliminates manual sync entirely; cabinet never has stale data
- Smart deadline alerts (in-app urgency indicators, email digest) — AGO deadlines are statutory; proactive alerting prevents liability
- Configurable exclusion filters per org (codes juridiques, régimes fiscaux, seuil exercice) — different cabinets exclude different dossier types
- Sync history / audit log visible in UI (Cabinet+ plan) — compliance evidence of sync activity
- CSV export filtered or full (Cabinet+ plan) — accountants always need Excel
- Per-dossier side panel with slide-in animation — fast context without losing list position; superior UX vs full-page navigation
- Pricing per dossiers actifs (not per seat) — matches how cabinets think about workload

**Defer (v2+):**
- Other mission types (création de société, dissolution, etc.) — schema is extensible but AGO must be complete first
- Email notifications for deadline alerts — in-app indicators first; Resend template complexity not worth it for v1
- Client portal (client-facing access) — requires separate auth flows; flag as v3
- AI-generated PV drafts — legal liability risk for v1; research as v2 differentiator
- Kanban board view — table + status filter is the functional equivalent for this domain
- Mobile native app — web-first; cabinets work on desktop

See `.planning/research/FEATURES.md` for full anti-features list and feature dependency graph.

### Architecture Approach

The architecture has a clear separation: the React SPA handles all UI and calls Supabase directly via RLS-scoped PostgREST; Edge Functions (Deno, service role) handle all cross-system operations — Redshift sync, Stripe webhooks, email invitations, and plan limit checks. The Supabase database is the integration hub. JWT custom claims (`org_id`, `role` embedded in `app_metadata`) eliminate DB lookups on every RLS check. Supabase Vault stores per-org Redshift credentials encrypted at rest; Edge Functions retrieve them at invocation time and never expose them to the client.

**Major components:**
1. **React SPA** — UI rendering, routing (react-router-dom), client state (Zustand), server state (TanStack Query + Supabase JS), Realtime subscriptions for live dossier/log updates
2. **Supabase Database (PostgreSQL + RLS)** — tenant isolation via `auth.org_id()` and `auth.org_role()` helper functions; 10 tables: `organisations`, `cabinets`, `org_members`, `cabinet_assignments`, `dossiers`, `statuts_config`, `activity_logs`, `sync_logs`, `subscriptions`, `vault.secrets`
3. **Edge Functions (Deno)** — `sync-pennylane` (Redshift fetch + upsert), `stripe-webhook` (billing state), `invite-member` (Resend + invitations table), `check-plan-limits` (usage enforcement)
4. **pg_cron + pg_net** — weekly auto-sync trigger via a `sync_queue` table; staggered per-org dispatch, plan-checked at queue INSERT time
5. **Stripe** — subscription lifecycle (hosted Checkout + Customer Portal); subscriptions table mirrors Stripe state locally to avoid per-page API calls
6. **AWS Redshift (Pennylane Datashare)** — read-only source of truth; accessed by `sync-pennylane` only, TCP/TLS on port 5439

The recommended build order (from ARCHITECTURE.md) flows: schema + RLS foundation → auth + org creation → cabinet + member management → dossiers core + status engine → dashboard UI → Pennylane sync → Stripe billing → landing page.

### Critical Pitfalls

1. **Within-org cabinet data leakage (RGPD/secret professionnel risk)** — Collaborateur RLS policies must enforce cabinet-level scoping, not just org-level. Write all three isolation levels (org, cabinet, user) from day one and write automated tests asserting 0-row responses for unauthorized cabinet access. This is a RGPD Article 5(1)(f) breach and a professional secrecy violation under French law — non-negotiable.

2. **Redshift sync Edge Function timeout (partial sync state)** — Cross-cloud latency (Supabase EU → AWS Redshift eu-west-1) plus Deno cold start can consume 10-45 seconds per org. Design a two-stage sync from the start: (a) fetch from Redshift → write to staging table, (b) upsert staging → `dossiers`. Track `sync_state` column in `sync_logs`. A timeout during stage (a) leaves dossiers untouched; without the staging table, you get partial state that is impossible to detect.

3. **Stripe webhook without idempotency** — Stripe delivers events at-least-once. A non-idempotent handler creates duplicate subscription records or flips canceled orgs back to active. Use a `processed_webhook_events` table with a unique constraint on `stripe_event_id`; skip processing if already seen. Additionally, always verify the Stripe signature before parsing any payload — the webhook URL is public and forgeable.

4. **RLS policy performance collapse at scale** — Correlated subqueries in RLS policies execute once per row scanned. 920 dossiers × subquery overhead = measurable latency. Replace with `SECURITY DEFINER` helper functions that Postgres caches per transaction, and add indexes on `cabinet_assignments(user_id)` and `dossiers(org_id, cabinet_id)` before any policy is written.

5. **Customizable status deletion with attached dossiers** — Deleting a status that has active dossiers either dangling-references `status_id` (invisible dossiers) or throws an unhandled FK error. For a cabinet tracking AGO deadlines, invisible dossiers is catastrophic. Use `ON DELETE RESTRICT` FK, add a DB-level NOT NULL constraint on `dossiers.status_id`, and build a "reassign before delete" UI flow.

See `.planning/research/PITFALLS.md` for 10 critical, 5 moderate, and 3 minor pitfalls with phase-specific warnings.

---

## Implications for Roadmap

The architecture's build order from ARCHITECTURE.md and the feature dependencies from FEATURES.md both point to the same phase structure. Each phase is a deployable vertical slice that unblocks the next.

### Phase 1: Project Foundation + Schema + RLS
**Rationale:** Every subsequent phase depends on tenant isolation being correct. RLS written too late means retrofitting policies across a live schema — the highest-cost mistake in a multi-tenant SaaS. This phase has no UI deliverables but is the load-bearing structure for everything else.
**Delivers:** Supabase project initialized, all tables created with RLS enabled, JWT custom claims wired (`auth.org_id()`, `auth.org_role()` helper functions), all policies written across three isolation levels (org, cabinet, user), indexes on high-traffic columns, Postgres trigger for immutable `activity_logs` on status change, status FK with `ON DELETE RESTRICT`.
**Addresses:** Table stakes — data isolation, customizable statuses, activity log integrity
**Avoids:** Pitfall 1 (RLS leakage), Pitfall 3 (policy performance), Pitfall 9 (status delete), Pitfall 13 (activity log application-side), Pitfall 11 (task_uid schema design)
**Research flag:** Standard Supabase RLS patterns — well-documented; skip research-phase.

### Phase 2: Authentication + Organization Onboarding
**Rationale:** Cannot test any feature without a valid JWT that carries `org_id` and `role` claims. The onboarding flow must complete in one session (Pennylane credentials + first connection test) or users abandon. This is also where invite tokens and their security constraints must be built correctly before any collaborateur is ever added.
**Delivers:** Auth flows (login, registration, invite acceptance), org creation on first login, Pennylane credential entry with "test connection" validation, invite-member Edge Function (Resend), pending invitations table with `expires_at` + `accepted_at` columns.
**Addresses:** Table stakes — organization creation, invitation flow, multi-user access
**Avoids:** Pitfall 2 (service_role vs anon key convention established here), Pitfall 10 (Vault credential failure handling), Pitfall 14 (invitation token expiry)
**Uses:** Supabase Auth, Resend, Supabase Vault
**Research flag:** Standard Supabase Auth patterns — skip research-phase. Resend invite flow is straightforward.

### Phase 3: Dossiers Core + Dashboard UI
**Rationale:** First user-visible value. Requires Phases 1 and 2 to be stable (valid JWT, org exists, schema frozen). This phase delivers the product's primary daily-use surface — the dossier table with filtering, the side panel, status management, and the real-time activity log.
**Delivers:** TanStack Table with server-side pagination/filtering (cabinet, statut, échéance), side panel with Framer Motion slide-in, status change with optimistic UI, activity log display, manual comments, deadline urgency color-coding, customizable status management UI (with reassign-before-delete flow), Realtime subscription on `dossiers` + `activity_logs`.
**Addresses:** Table stakes — dossier list, status change, filtering, deadline visibility, side panel, activity log, manual comments, status customization
**Avoids:** Pitfall 15 (server-side pagination from day one — Cabinet plan hits 3,500 dossiers), Pitfall 16 (optimistic UI for status badge animation), Pitfall 18 (CSS variable-based badge color palette for dark mode)
**Research flag:** TanStack Table server-side mode is well-documented. Framer Motion `AnimatePresence` patterns are established. Skip research-phase.

### Phase 4: Pennylane Sync
**Rationale:** The product's core value proposition is replacing Airtable + N8N. The dossier table built in Phase 3 has no data until this phase delivers. The Redshift connection is the highest-risk integration technically — it must be designed with timeout resilience from day one.
**Delivers:** `sync-pennylane` Edge Function (two-stage: Redshift fetch → staging table → upsert to `dossiers`), Supabase Vault credential storage and retrieval, sync status feedback in the UI (loading / success / error states + last sync timestamp), `sync_logs` table with `sync_state` tracking, org-level exclusion filter configuration, manual sync trigger in the UI.
**Addresses:** Table stakes — Pennylane sync, sync status feedback; Differentiator — configurable exclusion filters, sync history
**Avoids:** Pitfall 6 (Edge Function timeout — two-stage architecture), Pitfall 2 (service_role in Edge Function), Pitfall 10 (Vault credential null handling with French error messages)
**Research flag:** NEEDS RESEARCH — `npm:pg` in Deno for Redshift TCP, exact Vault API shape, Edge Function timeout limits (plan-dependent and may have changed). Recommend `/gsd:research-phase` before implementing sync function.

### Phase 5: Stripe Billing + Plan Enforcement
**Rationale:** Plan enforcement wraps around sync (auto-sync is Pro+ gated) and data limits (dossier count caps). Billing must be built after sync is stable and validated — building it earlier means plan enforcement gates an unvalidated feature, which confuses testing. Billing is also where the subscription mirroring pattern must be idempotency-safe.
**Delivers:** `stripe-webhook` Edge Function (signature verification, idempotency via `processed_stripe_events` table, subscription state mirror), `subscriptions` table, billing page (plan display, dossier usage counter, Stripe Customer Portal redirect), plan-gated UI elements (auto-sync toggle, CSV export, sync history), `check-plan-limits` Edge Function.
**Addresses:** Table stakes — subscription/billing management; Differentiators — plan-gated auto-sync, CSV export, sync history
**Avoids:** Pitfall 4 (webhook idempotency), Pitfall 5 (webhook signature verification), Pitfall 12 (plan enforcement in DB queue logic, not just UI), Pitfall 6 (anti-pattern: plan check only at UI layer)
**Research flag:** Stripe webhook in Deno is well-documented via official Supabase guides — skip research-phase. Verify `Stripe.createFetchHttpClient()` is still the correct Deno pattern.

### Phase 6: Automatic Sync (pg_cron + Queue)
**Rationale:** Auto-sync is deliberately deferred after manual sync is validated (per FEATURES.md MVP recommendation). pg_cron is a non-trivial integration: it requires queue-based dispatch, plan checks at queue INSERT time, staggered processing, and failure alerting — none of which can be safely rushed. Doing this after Stripe (Phase 5) ensures plan state is stable before gating auto-sync.
**Delivers:** `sync_queue` table, pg_cron job (Monday 6h UTC, plan-filtered queue INSERT only), queue processor Edge Function or pg_cron job (5-org batches, staggered), pg_cron monitoring query (alerts via Resend on sync failures > 0 in 24h), dead-man's-switch for stuck sync states.
**Addresses:** Differentiator — automatic weekly sync (Pro+)
**Avoids:** Pitfall 7 (pg_cron without queue — connection storms, plan check bypass), Pitfall 8 (pg_cron silent failure — no alerting)
**Research flag:** NEEDS RESEARCH — `pg_net.http_post` exact signature, pg_cron job management API (`cron.unschedule`), current Edge Function concurrency limits. Recommend `/gsd:research-phase` for cron + queue architecture.

### Phase 7: Landing Page + Public Presence
**Rationale:** Built last because pricing (from Stripe Phase 5) and feature set (from Phases 3-6) must be finalized before writing copy. Landing page depends on knowing what to promise. Framer Motion animations here draw on the same animation patterns proven in Phases 3-6.
**Delivers:** Marketing landing page (features section, pricing section, CTA to registration), Cal Sans / DM Sans typography applied consistently, Framer Motion scroll animations.
**Addresses:** Public funnel for self-serve signups
**Research flag:** Standard React + Framer Motion landing page patterns — skip research-phase.

### Phase Ordering Rationale

- **Schema before code:** RLS policies cannot be safely added after data exists — retrofitting them risks temporary exposure windows. Phase 1 is pure schema + policy work with zero UI.
- **Auth before features:** JWT custom claims are the input to every RLS policy. No claims = no reliable testing of any data feature.
- **Data before display:** The dashboard (Phase 3) is built shell-first (TanStack Table with empty state), then populated by Pennylane sync (Phase 4). This allows UI development to proceed in parallel with sync integration.
- **Manual before automatic:** Manual sync (Phase 4) is validated with the first real client before pg_cron automation (Phase 6) is introduced. This isolates the hard integration from the scheduling complexity.
- **Billing last among core:** Stripe (Phase 5) wraps around sync (Phase 4) because plan enforcement gates sync features. Building billing first creates circular dependency on unvalidated features.
- **Pitfall-driven grouping:** Phase 1 clusters all schema/RLS pitfalls (Pitfalls 1, 3, 9, 11, 13). Phase 4 clusters all sync timeout pitfalls (Pitfall 6). Phase 5 clusters all billing security pitfalls (Pitfalls 4, 5, 12). This makes pitfall prevention reviewable at the phase level.

### Research Flags

**Phases needing `/gsd:research-phase` during planning:**
- **Phase 4 (Pennylane Sync):** `npm:pg` in Deno for Redshift TCP connection is MEDIUM confidence; Edge Function timeout limits are plan-dependent and may have changed since training cutoff; Vault `decrypted_secrets` view name should be verified against live Supabase project.
- **Phase 6 (Auto-Sync / pg_cron):** `pg_net.http_post` exact signature is MEDIUM confidence; pg_cron job lifecycle management should be verified; Deno Edge Function concurrency limits under pg_cron-triggered load are unknown.

**Phases with standard, well-documented patterns (skip research-phase):**
- **Phase 1 (Schema + RLS):** Supabase RLS with JWT custom claims is a core Supabase feature with official documentation.
- **Phase 2 (Auth + Onboarding):** Supabase Auth email/password flow with invite tokens is well-documented.
- **Phase 3 (Dashboard UI):** TanStack Table v8 + React Query v5 + Framer Motion v11 all have stable, documented APIs.
- **Phase 5 (Stripe):** Stripe webhook in Deno Edge Function is covered by official Supabase integration guides.
- **Phase 7 (Landing Page):** Standard React/Framer Motion patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | React/Vite/TS/shadcn/TanStack are HIGH. framer-motion package naming status (vs `motion`) is MEDIUM — verify before install. React 19 compatibility is LOW — stay on 18.3.x. |
| Features | HIGH | Requirements derived from PROJECT.md + first customer (Actuariel, 920 dossiers) — highly concrete. Competitive market analysis (Coala, ACD, Pennylane ecosystem) is MEDIUM — no live research. |
| Architecture | HIGH for Supabase patterns | RLS, JWT custom claims, Vault, Edge Functions with service_role are all established, well-documented Supabase patterns. MEDIUM for pg_net HTTP call signature from pg_cron — verify before Phase 6. |
| Pitfalls | MEDIUM | All critical pitfalls are structurally sound (derived from established multi-tenant SaaS patterns + French legal context). Specific Supabase limits (Edge Function timeout, pg_cron `cron.job_run_details` behavior) should be verified against current docs. |

**Overall confidence:** MEDIUM-HIGH — requirements are concrete (real first customer), stack choices are constrained and proven, architecture follows established Supabase patterns. Two integration points (Redshift via Deno, pg_cron + pg_net) are technically MEDIUM and warrant research-phase before implementation.

### Gaps to Address

- **Edge Function timeout limit:** Supabase changed this value and it varies by plan. Verify current limit at https://supabase.com/docs/guides/functions/limits before Phase 4 design. If the limit is < 30s, the two-stage sync architecture becomes mandatory, not optional.
- **framer-motion vs motion package naming:** The `framer-motion` package was rebranding to `motion` as of mid-2025. Verify current correct package name at https://www.npmjs.com/package/framer-motion before Phase 3 install.
- **React 19 compatibility:** Peer dependency warnings from framer-motion and shadcn/ui were present with React 19 in mid-2025. Verify current status before project init — staying on React 18.3.x is the safe default.
- **Tailwind v4 + shadcn compatibility:** Do NOT upgrade to Tailwind v4 until shadcn/ui officially announces support. Check https://ui.shadcn.com/docs/changelog before any Tailwind upgrade.
- **pg_net.http_post signature:** The exact parameter names for `net.http_post` in the pg_net extension should be verified in Supabase docs before Phase 6. The cron → HTTP call → Edge Function chain is the auto-sync critical path.
- **Redshift Datashare port + SSL config:** Verify port 5439 and `ssl: { rejectUnauthorized: false }` with actual Pennylane-provided connection details before Phase 4 implementation. These are HIGH confidence from research but must be confirmed with Pennylane's specific cluster configuration.

---

## Sources

### Primary (HIGH confidence)
- `PROJECT.md` — validated requirements from first customer Actuariel (920 dossiers, 3 cabinets); Pennylane Redshift Datashare integration; pricing model; technology constraints
- Supabase official docs (training knowledge, pre-August 2025): RLS, JWT custom claims, Vault, Edge Functions, pg_cron, Stripe webhook integration guide
- French Code de Commerce: AGO deadlines (Art. L223-26 SARL, Art. L225-100 SA); secret professionnel (Art. 226-13 Code pénal); RGPD Article 5(1)(f)

### Secondary (MEDIUM confidence)
- Stripe webhook best practices (idempotency, signature verification) — training knowledge, cross-validated with Supabase Stripe guide structure
- TanStack Table v8 + TanStack Query v5 API patterns — training knowledge; v8/v5 APIs were stable as of mid-2025
- Redshift PostgreSQL wire-compatibility (port 5439, SSL config) — training knowledge; HIGH confidence on wire protocol, MEDIUM on SSL config specifics
- Multi-tenant SaaS with Supabase RLS — community pattern, cross-validated with official docs structure
- French expert-comptable market tooling (Coala, ACD, Pennylane ecosystem) — training knowledge; no live competitive research performed

### Tertiary (LOW confidence — validate before use)
- framer-motion v11 vs `motion` package rename status — verify at https://www.npmjs.com/package/framer-motion
- React 19 compatibility with framer-motion + shadcn — verify at https://ui.shadcn.com/docs/changelog
- Supabase Edge Function timeout limits by plan — verify at https://supabase.com/docs/guides/functions/limits
- pg_net `net.http_post` exact signature — verify at https://supabase.com/docs/guides/database/extensions/pg_net

---

*Research completed: 2026-03-15*
*Ready for roadmap: yes*
