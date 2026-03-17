---
plan: 02-06
phase: 02-authentification-rbac
status: complete
date: 2026-03-17
---

# Summary — 02-06: Onboarding Wizard (4 Steps + Framer Motion + Service Role Bootstrap)

## What was done

**Task 1 — Server Actions + page wrapper:**
- `src/app/onboarding/actions.ts`: 4 Server Actions implemented (`saveProfilStep`, `saveCabinetStep`, `savePennylaneStep`, `completeOnboarding`).
- `saveCabinetStep` uses `supabaseAdmin` (service_role) for the initial organization INSERT — required because the user has no `org_id` claim yet and RLS `organizations_insert` would reject a normal client request. This is the "Service Role Bootstrap" pattern for first-tenant creation.
- After org creation, profile is hydrated (`organization_id`, `role`) and JWT claims updated via `supabaseAdmin.auth.admin.updateUserById` with `app_metadata: { org_id, role }`.
- `completeOnboarding` sets `profiles.is_complete = true`, triggering middleware redirect to `/dashboard`.
- `src/app/onboarding/page.tsx`: Server Component loads current step and `isInvited` flag from DB; redirects complete users to `/dashboard`.

**Task 2 — Wizard UI + step components:**
- `src/hooks/useOnboardingStep.ts`: Step state + direction tracking + `goNext`/`goPrev`. `maxStep = isInvited ? 1 : 4`.
- `src/components/onboarding/StepIndicator.tsx`: 4 circles (32px), active/completed/upcoming states, connecting lines, `aria-current="step"`, French labels.
- `src/components/onboarding/OnboardingWizard.tsx`: `AnimatePresence mode="wait"` with `slideVariants` (250ms easeInOut, x:±60). Invités skip indicator and see only Step 1.
- `src/components/onboarding/steps/StepProfil.tsx`: Avatar upload to Supabase Storage (`avatars/{userId}/avatar.jpg`), react-hook-form + Zod.
- `src/components/onboarding/steps/StepCabinet.tsx`: Cabinet name form, `saveCabinetStep` call, then `supabase.auth.refreshSession()` to activate new JWT claims before proceeding.
- `src/components/onboarding/steps/StepPennylane.tsx`: Redshift credentials form, "Tester la connexion" (simulated in Phase 2, real implementation in Phase 5), skippable.
- `src/components/onboarding/steps/StepSync.tsx`: First sync trigger (simulated, Phase 5 will call Edge Function), skippable via "Passer et aller au dashboard".

## Architectural Fix: Service Role Bootstrap (manually applied)

**Symptom:** `saveCabinetStep` was using the regular Supabase client for the `organizations` INSERT. The RLS policy `organizations_insert` checks `org_id` in JWT claims, which is `null` for a new user → INSERT silently rejected.

**Fix:** `saveCabinetStep` now uses `supabaseAdmin` (via `SERVICE_ROLE_KEY`) to bypass RLS for the initial organization creation. After creation, the profile and JWT claims are hydrated so all subsequent requests use standard RLS.

**Note on env var:** The project uses `SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_ROLE_KEY`). The plan's original reference to `SUPABASE_SERVICE_ROLE_KEY` should be treated as `SERVICE_ROLE_KEY` in `.env.local`.

## Deviations

- `SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_ROLE_KEY`): env var name differs from plan — actual key in `.env.local` is `SERVICE_ROLE_KEY`.
- `StepCabinet.tsx` enhanced with `serverError` state and better focus ring styles (beyond plan spec).
- `saveCabinetStep` uses `supabaseAdmin` for organization INSERT (original plan used regular client) — RLS bootstrap fix.

## Verification

`bun run build` → clean, 8/8 static pages, 0 TypeScript errors. Routes: `/`, `/login`, `/auth/callback`, `/dashboard`, `/onboarding` all compile.

## Acceptance criteria met

- [x] Wizard 4 étapes avec transitions Framer Motion slide (250ms easeInOut)
- [x] Étape 1 (Profil) et 2 (Cabinet) obligatoires — pas de skip
- [x] Étape 3 (Pennylane) et 4 (Sync) passables
- [x] Progression sauvegardée en DB après chaque étape via Server Actions
- [x] JWT claims (org_id, role) mis à jour après étape 2 via service_role + refreshSession côté client
- [x] `profiles.is_complete = true` + redirect `/dashboard` à la complétion
- [x] Invités voient uniquement étape 1
- [x] `bun run build` propre
