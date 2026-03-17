---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Plans 07 (Resend email) and 08 (RBAC guard) remaining
stopped_at: Phase 02 Plan 07 complete (Invitation Route + React Email). Plan 08 remaining.
last_updated: "2026-03-17T12:56:54.727Z"
last_activity: 2026-03-17 — Service Role bootstrap fix + onboarding wizard complete
progress:
  total_phases: 9
  completed_phases: 1
  total_plans: 12
  completed_plans: 11
  percent: 69
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** Un cabinet comptable ouvre CabinetPilot et sait instantanément, pour chacun de ses clients, où en est la mission juridique — qui la gère, quel est son statut, et si une deadline approche.
**Current focus:** Phase 02 — Authentification & RBAC

## Current Position

Phase: 2 of 9 (Authentification & RBAC)
Plan: 6 of 8 in current phase — complete
Status: Plans 07 (Resend email) and 08 (RBAC guard) remaining
Last activity: 2026-03-17 — Service Role bootstrap fix + onboarding wizard complete

Progress: [███████████████░░░░░] 69%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
| ----- | ----- | ----- | -------- |
| -     | -     | -     | -        |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

_Updated after each plan completion_
| Phase 01 P01 | 3 | 3 tasks | 7 files |
| Phase 01 P02 | 2 | 3 tasks | 4 files |
| Phase 01 P03 | 1 | 2 tasks | 2 files |
| Phase 01 P04 | 5 | 1 tasks | 1 files |
| Phase 02 P07 | 15 | 1 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Magic link uniquement (pas de mot de passe ni OAuth) — décision produit v1 validée
- [Init]: Entité centrale `dossiers` avec champ `type` extensible — AGO en premier, autres types en v2
- [Init]: Supabase Vault pour les credentials Redshift — sécurité non-négociable
- [Init]: Statuts personnalisables par org — rigidité = rejet produit
- [Init]: Pricing par dossiers actifs (pas par siège)
- [Phase 01-01]: pgTAP natif avec set local request.jwt.claims — évite dépendance supabase-test-helpers non officielle
- [Phase 01-01]: Pattern subquery sur nom organisation dans pgTAP — évite DECLARE hors DO block
- [Phase 01]: plan_type enum PostgreSQL avec 4 valeurs (starter/pro/cabinet/enterprise)
- [Phase 01]: profiles.organization_id et role NULLABLE à la création — remplis à l'onboarding Phase 2
- [Phase 01]: Trigger AFTER INSERT sur organizations seed 13 statuts atomiquement — aucun code applicatif requis
- [Phase 01]: type TEXT (pas enum) sur dossiers — extensible pour types v2 sans migration destructive
- [Phase 01]: Fonctions helper dans schéma private — non exposées via PostgREST, sécurité par isolation de schéma
- [Phase 01]: get_my_cabinet_ids() retourne '{}' (pas NULL) via coalesce — évite = ANY(NULL) toujours faux en RLS
- [Phase 01]: No DELETE policy on organizations or dossiers — admin-only operations, absence of policy silently blocks all deletes
- [Phase 01]: dossiers INSERT open to all authenticated org members — collaborateurs can create dossiers, org_id check prevents cross-org
- [Phase 02]: Git remote origin linked to https://github.com/Zakbill/cabinetpilotlegal.git on branch master
- [Phase 02]: Supabase redirect URLs whitelisted for localhost — login/magic-link callback flow functional
- [Phase 02 — CRITICAL]: Service Role Bootstrap pattern — `saveCabinetStep` uses `supabaseAdmin` (SERVICE_ROLE_KEY) to INSERT into `organizations` because the user has no `org_id` claim yet and `organizations_insert` RLS would reject the request. After org creation, profile + JWT claims are hydrated. All future org-creation logic must account for this bootstrap: new tenants are always created via service role, not user client.
- [Phase 02]: Env var for service role is `SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_ROLE_KEY`) in this project's `.env.local`
- [Phase 02]: SERVICE_ROLE_KEY confirmed env var name for Supabase admin client in invite route
- [Phase 02]: Resend invitation email non-blocking — invitation flow succeeds even if branded email fails

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 5 / Research flag]: `npm:pg` dans Deno pour Redshift TCP est MEDIUM confidence — vérifier timeout Edge Function avant implémentation. Recommande `/gsd:research-phase` avant Phase 5.
- [Phase 8 / Research flag]: `pg_net.http_post` exact signature est MEDIUM confidence — vérifier avant Phase 8. Recommande `/gsd:research-phase` avant Phase 8.

### Resolved (archived for context)

- [RESOLVED 2026-03-17] RLS `organizations_insert` blocked first org creation — fixed with Service Role Bootstrap in `saveCabinetStep`.
- [RESOLVED 2026-03-17] Auth redirect URLs not whitelisted in Supabase — login/callback flow now functional on localhost.
- [RESOLVED 2026-03-17] Git remote origin was not configured — now linked to GitHub.

## Session Continuity

Last session: 2026-03-17T12:56:54.723Z
Stopped at: Phase 02 Plan 07 complete (Invitation Route + React Email). Plan 08 remaining.
Resume file: None
