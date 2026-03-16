---
plan: 02-04
phase: 02-authentification-rbac
status: complete
date: 2026-03-16
---

# Summary — 02-04: Middleware Auth + PKCE Callback + Stubs

## What was done

**Task 1 — middleware.ts (root):**
- `PUBLIC_ROUTES = ['/login', '/auth/callback', '/']`
- No session → redirect `/login`
- Session + `is_complete = false` → redirect `/onboarding` (with loop protection: `/onboarding` is excluded)
- Already complete user on `/login` → redirect `/dashboard`
- Uses `updateSession` helper from `src/lib/supabase/middleware.ts` — always `getUser()`, never `getSession()`
- `export const config` with matcher excluding `_next/static`, `_next/image`, `favicon.ico`, and file extensions

**Task 2 — auth callback + stubs:**
- `src/app/auth/callback/route.ts`: `exchangeCodeForSession(code)` → detects `user_metadata` invitation fields (`organization_id`, `role`, `cabinet_ids`) → pre-assigns profile + cabinet assignments → checks `is_complete` → redirects to `/onboarding` or `/dashboard`; error path → `/login?error=auth_callback_failed`
- `src/app/page.tsx`: root redirect — checks session, redirects to `/login` or `/dashboard`
- `src/app/dashboard/page.tsx`: stub showing profile name + role — Phase 3 will replace

## Acceptance criteria met

- [x] `middleware.ts` at root (not in `src/`)
- [x] Contains `updateSession`, `is_complete`, `PUBLIC_ROUTES`
- [x] No `getSession` anywhere
- [x] `export const config` with matcher
- [x] `exchangeCodeForSession` in callback
- [x] `user_metadata` invite detection
- [x] `/onboarding` redirect in callback
- [x] `auth_callback_failed` error redirect
- [x] `src/app/page.tsx` redirects to `/login` and `/dashboard`
- [x] `bun run build` clean
