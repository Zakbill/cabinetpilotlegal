---
plan: 02-03
phase: 02-authentification-rbac
status: complete
date: 2026-03-16
---

# Summary — 02-03: Next.js Bootstrap + Design Tokens + Supabase Clients

## What was done

**Task 1 — Next.js bootstrap + shadcn:**
- Initialized Next.js 16 App Router (TypeScript, Tailwind v4, `src/` dir) via `bun create next-app`
- Installed all Phase 2 dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `framer-motion`, `resend`, `@react-email/components`, `react-hook-form`, `@hookform/resolvers`, `zod`, `next-themes`
- Initialized shadcn (base-nova style — current equivalent of New York in latest shadcn)
- Installed approved components: `button`, `input`, `label`, `form`, `avatar`, `separator`
- Note: `toast` deprecated in latest shadcn → replaced with `sonner` (Toaster component) per official recommendation. Behavior identical for our use case.

**Task 2 — Design tokens + clients + layout:**
- `src/lib/design-tokens.ts` — verbatim copy from `.planning/artifacts/design-tokens.ts`
- `src/lib/supabase/client.ts` — `createBrowserClient` from `@supabase/ssr`
- `src/lib/supabase/server.ts` — `createServerClient` with `getAll()`/`setAll()` cookie pattern
- `src/lib/supabase/middleware.ts` — `updateSession` helper using `getUser()` (never `getSession()`)
- `src/app/layout.tsx` — DM Sans (next/font), Cal Sans (CDN), `lang="fr"`, `suppressHydrationWarning`
- `src/app/globals.css` — CSS variables for all design tokens appended to shadcn base
- `.env.local.example` — documents all required env vars including `SUPABASE_SERVICE_ROLE_KEY`

## Deviations

- `toast` → `sonner`: official shadcn deprecation. All Phase 2 plans referencing `toast` should use `<Toaster>` from `src/components/ui/sonner.tsx` instead.
- `globals.css` remains at `src/app/globals.css` (not moved to `src/styles/`) — Tailwind v4 requires this path in `components.json`. CSS variables still declared as planned.
- `components.json` style is `"base-nova"` (current shadcn v2 style name) — functionally equivalent to New York.

## Verification

`bun run build` → clean, 0 TypeScript errors, 4 static pages generated.

## Acceptance criteria met

- [x] `@supabase/ssr` in dependencies
- [x] `framer-motion` in dependencies
- [x] `resend` in dependencies
- [x] `react-hook-form` in dependencies
- [x] `zod` in dependencies
- [x] `components.json` exists
- [x] `src/components/ui/button.tsx` exists
- [x] `src/components/ui/input.tsx` exists
- [x] `src/components/ui/form.tsx` exists (manually installed from registry)
- [x] `src/lib/design-tokens.ts` exports `colors`, `fonts`, `spacing`, `tokens`
- [x] `src/lib/supabase/client.ts` uses `createBrowserClient`
- [x] `src/lib/supabase/server.ts` uses `getAll()` pattern
- [x] `src/lib/supabase/middleware.ts` uses `getUser()`
- [x] `src/app/layout.tsx` loads DM_Sans and Cal Sans
- [x] `globals.css` contains `--color-accent: #4f46e5` and `--gradient-login-panel`
- [x] `.env.local.example` contains `SUPABASE_SERVICE_ROLE_KEY`
- [x] `bun run build` clean
