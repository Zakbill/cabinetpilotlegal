---
plan: 02-01
phase: 02-authentification-rbac
status: complete
date: 2026-03-16
---

# Summary — 02-01: DB Migrations — Onboarding Columns + Trigger

## What was done

**Task 1 — Migrations:**
- `supabase/migrations/20260316000008_add_onboarding_columns.sql` — adds `is_complete boolean not null default false` and `current_onboarding_step integer not null default 1 check (between 1 and 4)` to `public.profiles`
- `supabase/migrations/20260316000009_add_profiles_trigger.sql` — creates `public.handle_new_user()` trigger function (`security definer`, idempotent via `on conflict do nothing`) and attaches it as `on_auth_user_created` AFTER INSERT on `auth.users`

**Task 2 — pgTAP stubs:**
- `supabase/tests/02_onboarding_columns.test.sql` — 4 tests: column type + defaults for `is_complete` and `current_onboarding_step`
- `supabase/tests/02_profiles_trigger.test.sql` — 2 tests: trigger existence + trigger creates profile on auth.users insert

## Verification

Both migrations applied successfully via `supabase db push` to the linked remote project (`legal`).

**Note:** Docker Desktop not available on this machine — `supabase test db` (pgTAP) requires local DB. Tests are syntactically correct and follow the established Phase 1 `01_schema.test.sql` pattern. Run `supabase test db` once Docker is available to verify the 6 tests green.

## Acceptance criteria met

- [x] `is_complete boolean not null default false` in migration 008
- [x] `current_onboarding_step integer not null default 1` in migration 008
- [x] `check (current_onboarding_step between 1 and 4)` in migration 008
- [x] `create trigger on_auth_user_created` in migration 009
- [x] `security definer` in migration 009
- [x] `on conflict (id) do nothing` in migration 009
- [x] `supabase db push` exited 0 — migrations applied without error
- [ ] `supabase test db` — blocked by Docker not installed (tests written, syntax verified)

## Key links established

- `auth.users` → `public.profiles` via trigger `on_auth_user_created` ✓
- `profiles.is_complete` ready for middleware SELECT in plan 02-04 ✓
