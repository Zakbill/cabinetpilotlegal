---
phase: 01-fondation-sch-ma-rls
plan: 03
subsystem: database
tags: [postgres, supabase, rls, jwt, multi-tenant, security-definer, migrations]

# Dependency graph
requires:
  - phase: 01-fondation-sch-ma-rls
    plan: 02
    provides: "org_statuses table with id PK — dossiers.status_id FK references it"
  - phase: 01-fondation-sch-ma-rls
    plan: 01
    provides: "organizations, cabinets, user_cabinet_assignments tables — dossiers FKs and get_my_cabinet_ids() reads from these"
provides:
  - "Table dossiers — entité centrale du produit avec type TEXT extensible, 7 champs AGO nullables, status_id ON DELETE RESTRICT"
  - "Schéma private non-exposé via PostgREST"
  - "private.get_my_org_id() — lit org_id depuis JWT app_metadata"
  - "private.get_my_role() — lit role depuis JWT app_metadata"
  - "private.get_my_cabinet_ids() — retourne uuid[] des cabinets assignés via array_agg"
affects: [01-04-rls-policies, phase-02-auth-rbac, phase-03-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Schéma private PostgreSQL pour encapsuler les fonctions helper RLS hors de PostgREST"
    - "SECURITY DEFINER + STABLE sur les fonctions RLS helper pour cache initPlan"
    - "coalesce(array_agg(...), '{}') pour retourner tableau vide plutôt que NULL"
    - "Wrapping (select auth.uid()) dans les fonctions pour forcer le cache initPlan"

key-files:
  created:
    - supabase/migrations/20260316000005_create_dossiers.sql
    - supabase/migrations/20260316000006_create_rls_helper_functions.sql
  modified: []

key-decisions:
  - "type TEXT (pas enum) sur dossiers — extensible pour types v2 sans migration destructive"
  - "status_id FK avec ON DELETE RESTRICT (pas NO ACTION) — blocage immédiat et non-différable"
  - "Fonctions helper dans schéma private — non exposées via PostgREST, sécurité par isolation de schéma"
  - "get_my_cabinet_ids() retourne '{}' (pas NULL) via coalesce — évite = ANY(NULL) toujours faux en RLS"

patterns-established:
  - "Pattern RLS helper : toujours (select private.fn()) dans les politiques pour forcer le cache initPlan"
  - "Pattern schéma private : toutes les fonctions internes au schéma private, jamais public"

requirements-completed: [FOUND-01, FOUND-02, FOUND-03]

# Metrics
duration: 1min
completed: 2026-03-16
---

# Phase 1 Plan 03: Table dossiers et fonctions helper RLS SECURITY DEFINER Summary

**Table dossiers multi-tenant avec status FK RESTRICT, 3 fonctions SECURITY DEFINER STABLE dans schéma private alimentant toutes les politiques RLS du Plan 04**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-16T05:45:15Z
- **Completed:** 2026-03-16T05:46:21Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Table dossiers créée avec type TEXT extensible, 7 champs AGO-spécifiques tous nullables, status_id ON DELETE RESTRICT vers org_statuses, task_uid UNIQUE nullable
- Schéma private PostgreSQL créé — non exposé via PostgREST, isolation des fonctions internes
- 3 fonctions helper SECURITY DEFINER STABLE dans private : get_my_org_id(), get_my_role(), get_my_cabinet_ids() — prêtes pour le Plan 04

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration dossiers avec champs AGO nullables et FK RESTRICT** - `88fa2f1` (feat)
2. **Task 2: Migration fonctions helper RLS dans schéma private** - `7e8033f` (feat)

## Files Created/Modified

- `supabase/migrations/20260316000005_create_dossiers.sql` — Table dossiers avec FK RESTRICT, index RLS, trigger updated_at, 7 champs AGO nullables
- `supabase/migrations/20260316000006_create_rls_helper_functions.sql` — Schéma private + get_my_org_id(), get_my_role(), get_my_cabinet_ids() SECURITY DEFINER STABLE

## Decisions Made

- type TEXT plutôt qu'enum — plan préconisait explicitement TEXT pour extensibilité v2, suivi tel quel
- ON DELETE RESTRICT (pas NO ACTION) — blocage immédiat non-différable confirmé par RESEARCH.md Pitfall 3
- get_my_cabinet_ids() retourne '{}' via coalesce — évite les comparaisons = ANY(NULL) silencieusement fausses dans les politiques RLS

## Deviations from Plan

None — plan exécuté exactement tel qu'écrit.

## Issues Encountered

None.

## User Setup Required

None — aucune configuration de service externe requise.

## Next Phase Readiness

- Plan 04 peut utiliser les signatures exactes des fonctions :
  - `organization_id = (select private.get_my_org_id())`
  - `(select private.get_my_role()) = 'expert-comptable'`
  - `cabinet_id = any(select private.get_my_cabinet_ids())`
- Table dossiers prête pour les politiques RLS du Plan 04
- Aucun bloqueur identifié

---
*Phase: 01-fondation-sch-ma-rls*
*Completed: 2026-03-16*

## Self-Check: PASSED

- FOUND: supabase/migrations/20260316000005_create_dossiers.sql
- FOUND: supabase/migrations/20260316000006_create_rls_helper_functions.sql
- FOUND: .planning/phases/01-fondation-sch-ma-rls/01-03-SUMMARY.md
- FOUND commit: 88fa2f1
- FOUND commit: 7e8033f
