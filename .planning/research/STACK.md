# Technology Stack

**Project:** CabinetPilot
**Researched:** 2026-03-15
**Research mode:** Training knowledge (cutoff August 2025) — external verification tools unavailable at research time. Confidence levels reflect this.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 18.3.x | UI rendering | Stable, concurrent mode, well-supported by all ecosystem libs in this stack. React 19 exists but shadcn/ui, Framer Motion, and TanStack Table were still catching up as of mid-2025 — stay on 18.x until ecosystem confirms full compatibility |
| TypeScript | 5.5.x | Type safety | Strict mode throughout; catches RLS-related data shape mismatches early |
| Vite | 5.x | Build tool | Fastest dev server for React SPA; Vite 6 beta existed mid-2025 but 5.x is the stable production choice |
| React Router | 6.x | Client-side routing | File-based or flat config both work; use `createBrowserRouter` for data-loading patterns |

**Note on React 19:** As of August 2025, React 19 stable was released but framer-motion v11 and some shadcn/ui internals still had peer dependency warnings. Pin to React 18.3.x until you have validated all peers. Confidence: MEDIUM — verify before initializing the project.

### UI Components & Design System

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| shadcn/ui | latest CLI (no npm version — it's a CLI tool) | Component library | Copy-paste components built on Radix UI + Tailwind. Source of truth for all UI as per PROJECT.md constraints |
| Radix UI | latest (via shadcn) | Headless primitives | Used for anything shadcn doesn't cover (custom Tooltips, advanced Dialog variants). Already a peer dep of shadcn |
| Tailwind CSS | 3.4.x | Utility CSS | v4 exists as a major rewrite (CSS-first config) but shadcn/ui targets v3 as of mid-2025. Do NOT upgrade to v4 until shadcn officially supports it |
| class-variance-authority | 0.7.x | Variant management | Used internally by shadcn; keep in sync with shadcn's own usage |
| clsx + tailwind-merge | latest | Class merging | Standard `cn()` helper pattern from shadcn |

**Critical:** shadcn/ui is installed via `bunx shadcn@latest init`. Do NOT install it as a package. Components are copied into your repo under `src/components/ui/`. This is intentional — you own and modify them.

### Animations

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| framer-motion | 11.x | All animations | Sidebar collapse, side panel slide-in, page transitions, table row reveals, badge status changes. The package was in the process of rebranding to `motion` in 2025 — use `framer-motion` (not `motion`) until shadcn ecosystem alignment is confirmed |

**framer-motion v11 key APIs for this project:**
- `AnimatePresence` — required for unmount animations (side panel, modal)
- `motion.div` with `layout` prop — for sidebar collapse/expand without layout jump
- `useMotionValue` + `useTransform` — avoid for simple transitions; `variants` + `transition` props are sufficient
- `LayoutGroup` — wrap table rows if you want animated reorders

**What NOT to use:** `@motion-one/react` or the standalone `motion` package — they target different APIs and would conflict. Confidence: MEDIUM — framer-motion v11 API is stable from my knowledge, but verify the framer-motion vs motion package naming status.

### Data Table

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @tanstack/react-table | 8.x (8.20+ recommended) | AGO dossiers table | Headless — renders nothing, you bring the markup. Required for full control over shadcn/ui table primitives and custom cell renderers for status badges, side panel triggers |

**TanStack Table v8 integration pattern for this project:**

```typescript
// Recommended setup — headless + shadcn Table primitives
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table";

// Use columnHelper for type-safe column definitions
const columnHelper = createColumnHelper<Dossier>();
```

**Key choices:**
- Use `getFilteredRowModel()` for client-side filtering by cabinet/statut/echeance
- Use `columnFilters` state (not `globalFilter`) — you have multi-column filters
- For "select row to open side panel": use `onRowClick` on the `<tr>`, not a TanStack selection model — keeps it simple
- Do NOT use `getPaginationRowModel()` initially — with 920 dossiers, client-side is fine; virtualization is Phase 2+

### Backend (BaaS)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase | latest JS client (2.x) | Auth, database, Edge Functions, Realtime, Vault | Single platform handles auth, RLS multi-tenancy, serverless functions, secrets management, and cron — eliminates need for separate backend |
| @supabase/supabase-js | 2.x (2.45+) | Client library | Auth hooks, typed queries, Realtime subscriptions |
| @supabase/ssr | 0.5.x | SSR helpers | Needed only if adding Next.js later — skip for pure React SPA |

**Supabase RLS pattern for multi-tenancy:**

```sql
-- Every table needs org isolation
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON dossiers
  USING (organisation_id = (
    SELECT organisation_id FROM user_profiles
    WHERE id = auth.uid()
  ));
```

**Supabase Auth for this project:**
- Email/password only (no OAuth needed per PROJECT.md)
- Custom `user_profiles` table with `organisation_id`, `role` columns
- Invitation flow: use `supabase.auth.admin.inviteUserByEmail()` from an Edge Function (requires service role key, never expose to client)

**Supabase Vault for Redshift credentials:**

```sql
-- Store per-org Redshift credentials
SELECT vault.create_secret(
  'redshift_credentials_' || org_id::text,
  jsonb_build_object(
    'host', $1,
    'port', $2,
    'database', $3,
    'username', $4,
    'password', $5
  )::text
);

-- Retrieve in Edge Function (server-side only, via service role)
SELECT decrypted_secret FROM vault.decrypted_secrets
WHERE name = 'redshift_credentials_' || org_id;
```

Confidence: HIGH for Vault API shape. Verify `vault.decrypted_secrets` view name in your Supabase project's vault schema.

### Edge Functions (Supabase)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase Edge Functions | Deno 1.x runtime (Deno 2 was in preview mid-2025) | sync-pennylane, stripe-webhook, invite-user | Serverless, co-located with DB, access to Vault via service role |

**Edge Function runtime details:**
- Runtime: Deno (not Node.js) — `import` syntax, `Deno.env.get()` for env vars
- Timeout: 150s wall-clock (configurable up to 400s for paid plans) — relevant for Redshift sync
- No persistent file system — all state must go through DB or external services
- `SUPABASE_SERVICE_ROLE_KEY` is auto-injected as `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`

**Critical for Deno in Edge Functions:** Do NOT use Node.js `require()`. Use ESM imports. For Redshift, use a Deno-compatible PostgreSQL client (see Redshift section below).

### pg_cron (Supabase)

**pg_cron is a PostgreSQL extension** — it runs inside the database, not in Edge Functions.

```sql
-- Enable extension (one-time, in SQL editor)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule: every Monday at 6:00 AM UTC
SELECT cron.schedule(
  'weekly-pennylane-sync',          -- job name
  '0 6 * * 1',                      -- cron expression: min hour dom month dow
  $$
    SELECT net.http_post(
      url := 'https://[project-ref].supabase.co/functions/v1/sync-pennylane',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer [service_role_key]"}'::jsonb,
      body := '{"trigger": "cron"}'::jsonb
    );
  $$
);
```

**Key gotchas:**
1. pg_cron runs as the `postgres` role — it cannot directly call Edge Functions without going through HTTP
2. Use `pg_net` (also a Supabase extension) to make the HTTP call to the Edge Function
3. The cron job must filter which orgs have "Pro+" plans before triggering sync — either pass org list in the body or have the Edge Function query the DB for eligible orgs
4. Cron expressions use UTC — "every Monday 6h" for French accounting firms means `0 6 * * 1` (UTC), which is 7h Paris winter / 8h Paris summer. Decide if you want `0 5 * * 1` for consistent 7h CET display
5. `cron.schedule` returns a job ID — store it if you need to `cron.unschedule()` later

Confidence: HIGH for cron syntax. MEDIUM for pg_net HTTP call pattern — verify the `net.http_post` signature in your project.

### AWS Redshift Connection from Edge Functions

This is the most architecturally complex integration. Careful design required.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `deno-postgres` | `npm:pg` or `https://deno.land/x/postgres` | Redshift TCP connection | Redshift is PostgreSQL-wire-compatible — use a Postgres client |

**Recommended approach: `npm:pg` via Deno compatibility layer**

```typescript
// supabase/functions/sync-pennylane/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import { Client } from "npm:pg";

const redshiftClient = new Client({
  host: credentials.host,         // e.g. redshift-cluster.xxx.eu-west-1.redshift.amazonaws.com
  port: 5439,                     // Redshift default port (NOT 5432)
  database: credentials.database,
  user: credentials.username,
  password: credentials.password,
  ssl: { rejectUnauthorized: false }, // Required for Redshift
  connectionTimeoutMillis: 10000,
  query_timeout: 90000,           // 90s for Redshift queries
});
```

**Connection strategy: connect-query-disconnect per invocation**

Supabase Edge Functions are stateless — do NOT attempt connection pooling across invocations. Open connection, run query, close connection in every function call.

**Latency expectations:**
- Cold Redshift connection: 2-5 seconds (eu-west-1 to Supabase EU servers)
- Query execution: 1-10 seconds depending on dossier volume
- Total sync time: 10-30 seconds for 920 dossiers
- This means UX must show a loading state for 15-30s — design accordingly

**Redshift Datashare authentication:**
- Pennylane uses Redshift Datashare (AWS feature) — the consumer cluster connects with username/password, NOT IAM
- `ssl: { rejectUnauthorized: false }` is required — Redshift uses self-signed certs in most configurations
- Port 5439 is the Redshift default — confirm with Pennylane's provided host string

**What NOT to use:**
- AWS SDK (`@aws-sdk/client-redshift`) — this is for cluster management, not data queries
- Redshift Data API — introduces async polling, adds complexity; direct TCP is simpler for this use case
- IAM authentication with `aws-sdk` signers in Deno — possible but complex; use password auth (simpler, Pennylane-compatible)

Confidence: MEDIUM — `npm:pg` in Deno Edge Functions is documented as working for standard PostgreSQL. Redshift wire-compatibility is HIGH confidence. SSL config and port are HIGH confidence. Exact Deno import path for `npm:pg` may need adjustment.

### Stripe

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| stripe (Node/Deno) | 14.x or 16.x | Subscription billing | Server-side only — never import Stripe in the React client |
| @stripe/stripe-js | 4.x | Checkout redirect | Client-side only for `redirectToCheckout` or Payment Element |

**Stripe webhook in Supabase Edge Function:**

```typescript
// supabase/functions/stripe-webhook/index.ts
import Stripe from "npm:stripe";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20", // Pin to a specific API version
  httpClient: Stripe.createFetchHttpClient(), // Required for Deno
});

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature")!;
  const body = await req.text(); // Must be raw text for signature verification

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  // Handle events
  switch (event.type) {
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // Update subscription_tier in organisations table
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

**Critical:**
1. `req.text()` NOT `req.json()` — raw body required for HMAC signature verification
2. `Stripe.createFetchHttpClient()` — required because Deno uses `fetch`, not Node's `http`
3. Pin `apiVersion` — Stripe breaks clients on API version bumps
4. Store `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as Supabase Edge Function secrets (not Vault — these are function-level secrets set via `supabase secrets set`)

Confidence: HIGH — this pattern is well-documented in Supabase's official Stripe integration guides.

### Email

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| resend | 3.x | Email sending SDK | Clean API, Deno-compatible, works in Edge Functions |
| @react-email/components | 0.0.22+ | Email templates | Type-safe HTML email components in React/JSX |
| @react-email/render | latest | Renders React Email to HTML string | Used server-side (in Edge Function or build step) |

**Resend in Supabase Edge Function:**

```typescript
// supabase/functions/send-invitation/index.ts
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

const { data, error } = await resend.emails.send({
  from: "CabinetPilot <noreply@cabinetpilot.io>",
  to: [invitee.email],
  subject: "Invitation à rejoindre votre cabinet sur CabinetPilot",
  html: emailHtml, // rendered from React Email
});
```

**React Email rendering strategy:**

Option A (recommended for simplicity): Pre-render email templates to HTML strings at build time, embed as template literals in the Edge Function. Avoids JSX compilation in Deno runtime.

Option B: Use `@react-email/render` inside the Edge Function. Requires Deno JSX support configured in `deno.json`. More complex but keeps templates DRY.

Use Option A for v1. Option B becomes worthwhile when you have 5+ email templates.

Confidence: HIGH for Resend API. MEDIUM for React Email in Deno — the JSX compilation step needs care.

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TanStack Query (@tanstack/react-query) | 5.x | Server state | Handles Supabase data fetching, caching, background refetch, optimistic updates for status changes |
| Zustand | 4.x | Client state | Sidebar open/closed, side panel selected dossier, active filters, active cabinet — local ephemeral state only |

**What NOT to use for state:**
- Redux — overkill for this scope
- React Context for server data — use TanStack Query instead
- Jotai/Recoil — less community momentum than Zustand for this pattern

**TanStack Query + Supabase pattern:**

```typescript
// Typed query example
const { data: dossiers } = useQuery({
  queryKey: ["dossiers", { organisationId, cabinetId }],
  queryFn: () =>
    supabase
      .from("dossiers")
      .select("*, statut:statuts(*), cabinet:cabinets(*)")
      .eq("organisation_id", organisationId)
      .order("date_echeance", { ascending: true }),
});
```

Confidence: HIGH — TanStack Query v5 API is stable and well-documented.

### Forms & Validation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-hook-form | 7.x | Form state | Zero re-renders, works perfectly with shadcn Form components |
| zod | 3.x | Schema validation | Type-safe validation; Zod schemas double as TypeScript types; integrates with react-hook-form via `@hookform/resolvers/zod` |

### Typography & Fonts

| Technology | Source | Purpose | Why |
|------------|--------|---------|-----|
| Cal Sans | Google Fonts / self-hosted | Headings | Specified in PROJECT.md — bold, distinctive for SaaS |
| DM Sans | Google Fonts | Body & UI text | Clean, readable, professional |

**Recommended: Self-host both fonts** using `fontsource` packages or manual woff2 files to avoid GDPR issues (Google Fonts IP logging) and improve performance.

```bash
npm install @fontsource/dm-sans
# Cal Sans is not in fontsource — download woff2 from Google Fonts and host in /public/fonts/
```

### Routing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-router-dom | 6.x | Client routing | Flat routes for SPA; no need for file-based routing in this scope |

**Route structure recommendation:**

```
/                        → Landing page
/auth/login              → Login
/auth/register           → Registration
/auth/invite/:token      → Accept invitation
/app/dashboard           → Main table (protected)
/app/settings            → Org settings / Pennylane config
/app/team                → Team management
/app/billing             → Stripe billing
/app/onboarding          → First-run flow
```

### Development Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase CLI | latest | Local dev, migrations, function deployment | Required for local Supabase stack |
| Vitest | 2.x | Unit tests | Vite-native, fast, compatible with React Testing Library |
| @testing-library/react | 15.x | Component tests | Test UI behavior, not implementation |
| ESLint | 9.x (flat config) | Linting | Enforce code style; add `eslint-plugin-react-hooks` |
| Prettier | 3.x | Formatting | Integrate with Tailwind plugin for class sorting |
| prettier-plugin-tailwindcss | latest | Class sorting | Auto-sorts Tailwind classes — prevents conflicts |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| UI Components | shadcn/ui | MUI, Ant Design, Mantine | PROJECT.md constraint is explicit; also, shadcn is more customizable for the Vercel-style design |
| Database | Supabase (PostgreSQL) | PlanetScale, Neon, Firebase | Supabase is already the auth/functions platform; adding another DB creates unnecessary complexity |
| Animation | framer-motion 11 | React Spring, GSAP | PROJECT.md constraint; framer-motion has the best React integration and the `layout` prop for sidebar collapse |
| Table | @tanstack/react-table v8 | AG Grid, react-table v7 | TanStack v8 is headless and pairs perfectly with shadcn table primitives; AG Grid is overkill |
| Email | Resend + React Email | SendGrid, Postmark, nodemailer | PROJECT.md constraint; Resend has better DX and React Email templates are type-safe |
| Subscriptions | Stripe | Paddle, LemonSqueezy | PROJECT.md constraint; Stripe is the standard for EU SaaS |
| State | Zustand + TanStack Query | Redux Toolkit, SWR | SWR lacks the mutation handling of TanStack Query; Redux adds boilerplate |
| Build | Vite | Next.js, Remix | No SSR needed for this dashboard SaaS; pure SPA is simpler and sufficient |
| Redshift client | npm:pg | Redshift Data API, IAM signer | Data API adds async complexity; IAM in Deno is complex; password auth is what Pennylane provides |
| Tailwind | 3.4.x | Tailwind v4 | v4 is a major breaking change (no `tailwind.config.js`, CSS-first config); shadcn/ui targets v3 |

---

## Installation

```bash
# 1. Create React + Vite + TypeScript project
npm create vite@latest cabinetpilot -- --template react-ts
cd cabinetpilot

# 2. Install Tailwind CSS v3
npm install -D tailwindcss@^3.4 postcss autoprefixer
npx tailwindcss init -p

# 3. Initialize shadcn/ui (follow prompts: style=New York, baseColor=zinc, cssVariables=yes)
bunx shadcn@latest init

# 4. Core dependencies
npm install @supabase/supabase-js @tanstack/react-table @tanstack/react-query
npm install framer-motion react-router-dom
npm install react-hook-form zod @hookform/resolvers
npm install zustand

# 5. Client-side Stripe (only for checkout redirect)
npm install @stripe/stripe-js

# 6. Font (DM Sans via fontsource)
npm install @fontsource/dm-sans

# 7. Dev dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D eslint prettier prettier-plugin-tailwindcss

# 8. Supabase CLI (global)
npm install -g supabase

# 9. Initialize Supabase local dev
supabase init
supabase start

# 10. Edge Function dependencies are managed via Deno imports in each function
# No npm install needed for Edge Functions — use npm:pkg notation in the function itself
```

---

## Key Integration Patterns

### Pattern: Typed Supabase Client

Generate types from your schema to get full TypeScript autocomplete:

```bash
supabase gen types typescript --local > src/types/database.types.ts
```

Then use:

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Pattern: Edge Function Secret Management

```bash
# Set secrets for Edge Functions (NOT Vault — these are function env vars)
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set RESEND_API_KEY=re_...

# Vault is for per-organisation data (Redshift credentials)
# Edge Function secrets are for app-level service credentials
```

### Pattern: Supabase Auth Hook for Organisation Lookup

```typescript
// src/hooks/useAuth.ts
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export function useRequireAuth() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) navigate("/auth/login");
      }
    );
    return () => subscription.unsubscribe();
  }, [navigate]);
}
```

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| React 18 + Vite + TypeScript | HIGH | Stable, well-established |
| shadcn/ui + Tailwind v3 | HIGH | Stable as of mid-2025; do NOT use Tailwind v4 |
| TanStack Table v8 API | HIGH | v8 API stable, no v9 announced as of Aug 2025 |
| TanStack Query v5 API | HIGH | v5 stable since late 2023, no breaking changes expected |
| framer-motion v11 API | MEDIUM | v11 stable, but `motion` package rename status uncertain — verify current package name |
| React 19 compatibility | LOW | Peer dependency warnings from framer-motion + shadcn were present in mid-2025; verify current status before using React 19 |
| Supabase RLS patterns | HIGH | Core Supabase feature, well-documented |
| Supabase Vault API | MEDIUM | Feature exists and is documented; vault schema names should be verified against your project |
| pg_cron + pg_net HTTP trigger | MEDIUM | Pattern is documented but pg_net `net.http_post` signature should be verified |
| Stripe webhook in Deno Edge Function | HIGH | Official Supabase documentation covers this exact pattern |
| npm:pg for Redshift in Deno | MEDIUM | Works for standard PostgreSQL; Redshift wire-compatibility is solid; SSL config should be tested |
| Resend in Deno Edge Function | HIGH | Resend SDK has Deno support |
| React Email rendering in Deno | MEDIUM | JSX in Deno requires configuration; Option A (pre-rendered HTML) is safer for v1 |
| Tailwind v4 with shadcn | LOW — AVOID | shadcn/ui does not support Tailwind v4 as of mid-2025 |

---

## Sources

All findings based on training knowledge (cutoff August 2025). External verification (NPM registry, official docs, WebFetch, WebSearch) was not available at research time. Before project initialization:

- [ ] Verify React version: https://react.dev/versions
- [ ] Verify shadcn/ui Tailwind v4 status: https://ui.shadcn.com/docs/changelog
- [ ] Verify framer-motion vs motion package: https://www.npmjs.com/package/framer-motion
- [ ] Verify TanStack Table latest: https://www.npmjs.com/package/@tanstack/react-table
- [ ] Verify Supabase Vault schema: https://supabase.com/docs/guides/database/vault
- [ ] Verify pg_net http_post signature: https://supabase.com/docs/guides/database/extensions/pg_net
- [ ] Verify Stripe Deno integration: https://supabase.com/docs/guides/functions/examples/stripe-webhooks
- [ ] Verify npm:pg in Deno Edge Functions: https://supabase.com/docs/guides/functions/connect-to-postgres
