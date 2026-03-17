---
phase: 02-authentification-rbac
plan: 07
subsystem: api
tags: [resend, react-email, supabase-admin, invitation, email, rbac]

# Dependency graph
requires:
  - phase: 02-authentification-rbac-04
    provides: "auth callback reads user_metadata (organization_id, role, cabinet_ids)"
  - phase: 02-authentification-rbac-06
    provides: "profiles table with role + organization_id columns"
provides:
  - "POST /api/invite — invite user by email with role + cabinet assignment metadata"
  - "InvitationEmail React Email template — branded French invitation email"
affects: [02-08-rbac-guard, 03-onboarding, phase-04-cabinet-assignments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service Role admin client (SERVICE_ROLE_KEY) for auth.admin.inviteUserByEmail — bypasses RLS for invitation flow"
    - "inviteUserByEmail with user_metadata payload (organization_id, role, cabinet_ids) — read by /auth/callback"
    - "Resend email as optional branded layer on top of Supabase native invitation email"

key-files:
  created:
    - src/app/api/invite/route.ts
    - src/components/emails/InvitationEmail.tsx
  modified: []

key-decisions:
  - "SERVICE_ROLE_KEY (not SUPABASE_SERVICE_ROLE_KEY) — env var name confirmed from .env.local"
  - "Resend send is non-blocking (try/catch) — invitation succeeds even if branded email fails"
  - "Sender: onboarding@legal.cabinetpilot.io — matches RESEND_FROM_EMAIL env var"
  - "inviteUserByEmail passes organization_id + role + cabinet_ids in data (user_metadata) — consumed by /auth/callback Plan 04"
  - "Note in code: empty Supabase native invite template in Dashboard to avoid duplicate emails"

patterns-established:
  - "Pattern: admin client via createClient(URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })"
  - "Pattern: role guard in route handler — 403 if caller is not expert-comptable"
  - "Pattern: React Email template uses inline styles from design-tokens colors (zinc, indigo palette)"

requirements-completed: [AUTH-04, RBAC-01, RBAC-02]

# Metrics
duration: 15min
completed: 2026-03-17
---

# Phase 02 Plan 07: Invitation Route + React Email Template Summary

**POST /api/invite with SERVICE_ROLE_KEY admin client calling inviteUserByEmail, plus branded French InvitationEmail React Email template using Indigo/Zinc tokens**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-17T12:40:00Z
- **Completed:** 2026-03-17T12:55:58Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- POST /api/invite validates that caller is expert-comptable (403 otherwise), then calls `supabaseAdmin.auth.admin.inviteUserByEmail` passing `organization_id`, `role`, and `cabinet_ids` in `user_metadata`
- Branded French email sent via Resend from `onboarding@legal.cabinetpilot.io` — non-blocking so invitation still succeeds if Resend fails
- InvitationEmail React Email component with `lang="fr"`, Indigo-600 CTA button, Zinc color palette, French copy matching UI-SPEC

## Task Commits

1. **Task 1: Route Handler + React Email template** — `9b3dc9e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/api/invite/route.ts` — POST /api/invite: auth check, expert-comptable guard, inviteUserByEmail with user_metadata, Resend branded email
- `src/components/emails/InvitationEmail.tsx` — React Email template, French copy, Indigo/Zinc design tokens

## Decisions Made

- Used `SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_ROLE_KEY`) — confirmed from `.env.local` and STATE.md decisions log
- Resend send wrapped in try/catch (non-blocking) — branded email is enhancement, not critical path
- `from` field: `CabinetPilot <onboarding@legal.cabinetpilot.io>` — matches RESEND_FROM_EMAIL and user instructions
- user_metadata fields (`organization_id`, `role`, `cabinet_ids`) align exactly with what `/auth/callback` reads (Plan 04)
- Added code comment reminding to clear Supabase native invite template in Dashboard to avoid duplicate emails

## Deviations from Plan

None — plan executed exactly as written, with one correction: env var is `SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_ROLE_KEY` as shown in plan template). This was already documented in STATE.md decisions.

## Issues Encountered

None — `resend` and `@react-email/components` were already in package.json. Build passed cleanly on first attempt.

## User Setup Required

**Supabase Dashboard configuration recommended (not blocking):**
- Go to Supabase Dashboard → Auth → Email Templates → Invite
- Clear the native invite email template body to prevent duplicate invitation emails
  (Supabase sends its own email; Resend sends the branded one)

## Next Phase Readiness

- Plan 08 (RBAC guard middleware) can proceed — invitation infrastructure is complete
- `/auth/callback` correctly reads `organization_id`, `role`, `cabinet_ids` from user_metadata to pre-configure invited users
- `user_cabinet_assignments` INSERT logic already present in callback (Plan 04)

---
*Phase: 02-authentification-rbac*
*Completed: 2026-03-17*
