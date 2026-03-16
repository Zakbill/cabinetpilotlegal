---
phase: 01-fondation-sch-ma-rls
plan: 01
subsystem: testing
tags: [pgtap, supabase, postgres, rls, multi-tenant, sql]

# Dependency graph
requires: []
provides:
  - Répertoire supabase/ initialisé via supabase CLI (config.toml)
  - 6 fichiers de tests pgTAP couvrant FOUND-01 à FOUND-05
  - Scaffold RED tests — échouent intentionnellement avant les migrations
  - Pattern BEGIN/ROLLBACK pour isolation complète de chaque test
provides-context-for:
  - "Plans 01-02 à 01-04 : les tests RED guident les implémentations (schéma, RLS, trigger)"
affects:
  - 01-02-PLAN
  - 01-03-PLAN
  - 01-04-PLAN

# Tech tracking
tech-stack:
  added:
    - Supabase CLI (supabase init)
    - pgTAP (extension PostgreSQL pour tests DB)
  patterns:
    - Tests pgTAP wrappés dans BEGIN/ROLLBACK pour isolation totale
    - Fixtures avec UUIDs fixes pour tests d'isolation RLS multi-tenant
    - Pattern subquery sur nom d'organisation — évite DECLARE hors DO block
    - set local role authenticated + set local request.jwt.claims pour simuler JWT dans pgTAP

key-files:
  created:
    - supabase/config.toml
    - supabase/tests/00_setup.sql
    - supabase/tests/01_schema.test.sql
    - supabase/tests/02_rls_isolation.test.sql
    - supabase/tests/03_rls_collaborateur.test.sql
    - supabase/tests/04_status_seed.test.sql
    - supabase/tests/05_status_restrict.test.sql
  modified: []

key-decisions:
  - "pgTAP natif (set local request.jwt.claims) plutôt que supabase-test-helpers — évite une dépendance externe non officielle"
  - "Fixtures avec UUIDs fixes dans BEGIN/ROLLBACK — pas de supabase start requis en Plan 01"
  - "Pattern subquery (select id from organizations where name = ...) imposé pour éviter les DECLARE hors DO block en contexte SQL pgTAP"

patterns-established:
  - "Chaque test file wrappé BEGIN/ROLLBACK — teardown automatique, aucune pollution de la DB"
  - "UUIDs fixes format 00000000-0000-0000-0000-0000000000XX pour fixtures de test multi-tenant"
  - "Simulation JWT dans RLS tests : set local role authenticated + set local request.jwt.claims"

requirements-completed: [FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05]

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 1 Plan 01: Scaffolds de tests pgTAP (RED) — FOUND-01 à FOUND-05

**Supabase initialisé et 6 fichiers de tests pgTAP créés couvrant tous les requirements Phase 1 (isolation multi-tenant, JWT claims RLS, trigger 13 statuts, ON DELETE RESTRICT)**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-16T05:37:02Z
- **Completed:** 2026-03-16T05:40:00Z
- **Tasks:** 3 of 3
- **Files created:** 7

## Accomplishments

- supabase init exécuté — config.toml et structure supabase/ créés
- 6 fichiers de tests pgTAP écrits avec pattern BEGIN/ROLLBACK et assertions correctes
- Chaque requirement FOUND-01 à FOUND-05 couvert par au moins un test
- 04_status_seed.test.sql contient 16 assertions vérifiant les 13 labels exacts, display_order et types (normal/terminal) — syntaxe subquery valide en contexte pgTAP pur

## Task Commits

1. **Task 1: Initialiser Supabase CLI et créer répertoire de tests** - `4186179` (chore)
2. **Task 2: Créer les tests de schéma (FOUND-01, FOUND-05)** - `038f368` (test)
3. **Task 3: Créer les tests RLS et trigger de statuts (FOUND-02, FOUND-03, FOUND-04)** - `038659a` (test)

## Files Created

- `supabase/config.toml` — Configuration Supabase CLI générée par supabase init
- `supabase/tests/00_setup.sql` — Active extension pgTAP (create extension if not exists pgtap)
- `supabase/tests/01_schema.test.sql` — 8 assertions : has_table, has_column, col_is_null (AGO fields), col_is_fk (status_id)
- `supabase/tests/02_rls_isolation.test.sql` — Isolation org_A vs org_B : is_empty + isnt_empty avec fixtures BEGIN/ROLLBACK
- `supabase/tests/03_rls_collaborateur.test.sql` — Restriction collaborateur aux cabinets assignés via user_cabinet_assignments
- `supabase/tests/04_status_seed.test.sql` — 16 assertions sur trigger de seeding : count total=13, 7 normaux, 6 terminaux, labels et display_order exacts
- `supabase/tests/05_status_restrict.test.sql` — throws_ok 23503 pour FK ON DELETE RESTRICT sur dossiers.status_id

## Decisions Made

- Utilisation de pgTAP natif avec `set local request.jwt.claims` plutôt que supabase-test-helpers pour éviter une dépendance tierce non officielle. Tests RLS simulés directement au niveau SQL.
- Fixtures avec UUIDs fixes (format 00000000-0000-0000-0000-000000000010, etc.) wrappées dans BEGIN/ROLLBACK — pas d'effet sur la DB, teardown automatique.
- Pattern subquery `(select id from public.organizations where name = '...')` dans 04_status_seed.test.sql pour éviter les variables DECLARE hors d'un bloc DO $$ — conforme à la syntaxe pgTAP SQL pur.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixtures complètes dans 02 et 03 rls test files**

- **Found during:** Task 3
- **Issue:** Le plan précisait d'ajouter un bloc setup "partiel" avec un commentaire `-- ...`. Pour que les tests soient exécutables dès que la DB sera configurée, les fixtures ont été complétées (cabinet A, cabinet B, profile collaborateur, user_cabinet_assignments, dossiers de test).
- **Fix:** Fixtures complètes insérées avant `set local role authenticated` — organisations, cabinets, profiles, assignments, dossiers avec DO block pour récupérer le status_id du trigger.
- **Files modified:** supabase/tests/02_rls_isolation.test.sql, supabase/tests/03_rls_collaborateur.test.sql
- **Verification:** Tous les UUIDs fixes correspondent entre les fixtures et les assertions
- **Committed in:** 038659a (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical completeness)
**Impact on plan:** Fixtures complètes rendent les tests directement exécutables dès Plan 02 terminé. Aucun scope creep — le contenu est conforme à l'intention du plan.

## Issues Encountered

None.

## User Setup Required

None — aucun service externe requis pour ce plan. Les tests seront exécutés via `supabase test db` dans les plans suivants une fois les migrations créées.

## Next Phase Readiness

- Tests RED créés — Plan 02 peut démarrer les migrations (organizations, cabinets, profiles)
- Plan 03 créera les fonctions helper RLS et les politiques
- Plan 04 créera le trigger de pré-chargement des statuts
- Les tests passent au GREEN automatiquement à mesure que les migrations sont appliquées

---
*Phase: 01-fondation-sch-ma-rls*
*Completed: 2026-03-16*

## Self-Check: PASSED

- All 7 files created: FOUND
- All 3 task commits: FOUND (4186179, 038f368, 038659a)
