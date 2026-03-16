---
phase: 01-fondation-sch-ma-rls
plan: 02
subsystem: database
tags: [postgres, supabase, migrations, rls, multi-tenant, enums, triggers]

# Dependency graph
requires: []
provides:
  - "Table organizations avec enum plan_type (starter/pro/cabinet/enterprise) et active_dossiers_count"
  - "Table profiles liée auth.users.id avec FK ON DELETE CASCADE, organization_id et role nullables"
  - "Table cabinets avec organization_id, name, code optionnel"
  - "Table user_cabinet_assignments avec PK composite (user_id, cabinet_id)"
  - "Table org_statuses avec enum status_type (normal/terminal) et contrainte unique (organization_id, display_order)"
  - "Fonction seed_default_statuses() et trigger trg_seed_org_statuses AFTER INSERT sur organizations avec 13 statuts prescrits"
affects:
  - "01-fondation-sch-ma-rls plan 03 (dossiers + FK status_id → org_statuses ON DELETE RESTRICT)"
  - "01-fondation-sch-ma-rls plan 04 (RLS policies — lit profiles, user_cabinet_assignments)"
  - "Phase 2 (Auth & RBAC — onboarding écrit organization_id et role dans profiles)"
  - "Phase 5 (Sync — trigger mise à jour active_dossiers_count dans organizations)"
  - "Phase 7 (Billing — colonnes Stripe ajoutées à organizations)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migrations SQL versionnées dans supabase/migrations/ avec timestamps Supabase CLI"
    - "Enums PostgreSQL natifs pour les domaines métier (plan_type, user_role, status_type)"
    - "Trigger AFTER INSERT pour pré-chargement atomique des données de référence par organisation"
    - "Index préventifs sur toutes les colonnes filtrées par les politiques RLS"
    - "FK profiles.id = auth.users.id (pattern extension Supabase Auth)"

key-files:
  created:
    - "supabase/migrations/20260316000001_create_organizations.sql"
    - "supabase/migrations/20260316000002_create_profiles_cabinets.sql"
    - "supabase/migrations/20260316000003_create_user_cabinet_assignments.sql"
    - "supabase/migrations/20260316000004_create_org_statuses.sql"
  modified: []

key-decisions:
  - "plan_type enum PostgreSQL avec 4 valeurs (starter/pro/cabinet/enterprise) — pas de colonne text libre"
  - "profiles.organization_id et role sont NULLABLE à la création — remplis à l'onboarding Phase 2"
  - "user_cabinet_assignments PK composite (user_id, cabinet_id) — pas d'UUID id séparé"
  - "unique (organization_id, display_order) dans org_statuses — empêche conflits d'ordre affichage"
  - "13 statuts exacts prescrits par CONTEXT.md insérés par trigger atomique — aucun code applicatif requis"

patterns-established:
  - "Pattern 1: Enums PostgreSQL natifs pour les domaines bornés (plan, rôle, type de statut)"
  - "Pattern 2: Trigger AFTER INSERT pour seed atomique — garantit la cohérence sans code applicatif"
  - "Pattern 3: Index préventifs sur toutes les FK et colonnes filtrées RLS dès la création"
  - "Pattern 4: FK profiles.id → auth.users(id) ON DELETE CASCADE pour extension auth Supabase"

requirements-completed: [FOUND-04, FOUND-05]

# Metrics
duration: 2min
completed: 2026-03-16
---

# Phase 1 Plan 02: Migrations Schéma de Base Summary

**4 migrations SQL Supabase créant le schéma multi-tenant complet : organizations, profiles, cabinets, user_cabinet_assignments, org_statuses avec trigger de pré-chargement automatique des 13 statuts par organisation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-16T05:41:31Z
- **Completed:** 2026-03-16T05:43:02Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- 4 tables fondation créées dans l'ordre de dépendances correct (organizations → profiles/cabinets → user_cabinet_assignments → org_statuses)
- 3 enums PostgreSQL natifs : plan_type, user_role, status_type avec valeurs exactes prescrites
- Trigger trg_seed_org_statuses garantit que chaque nouvelle organisation reçoit automatiquement ses 13 statuts par défaut — aucun code applicatif requis
- Index préventifs sur toutes les colonnes filtrées par RLS (organization_id, user_id, cabinet_id)

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration organizations (table + enum plan)** - `41d4030` (feat)
2. **Task 2: Migrations profiles et cabinets** - `a49b147` (feat)
3. **Task 3: Migrations user_cabinet_assignments et org_statuses + trigger seed** - `00115fd` (feat)

## Files Created/Modified

- `supabase/migrations/20260316000001_create_organizations.sql` - Table organizations avec enum plan_type, active_dossiers_count default 0, sans colonnes Stripe
- `supabase/migrations/20260316000002_create_profiles_cabinets.sql` - Table profiles (FK auth.users) et table cabinets avec code nullable
- `supabase/migrations/20260316000003_create_user_cabinet_assignments.sql` - Table pivot avec PK composite et index sur user_id pour get_my_cabinet_ids()
- `supabase/migrations/20260316000004_create_org_statuses.sql` - Table org_statuses + enum status_type + fonction seed + trigger AFTER INSERT avec 13 statuts prescrits

## Decisions Made

- Colonnes Stripe (subscription_id, customer_id) exclus de la migration 001 — déférées en Phase 7 conformément à CONTEXT.md
- profiles.organization_id et role laissés NULLABLE — remplis lors de l'onboarding Phase 2, pas à la création du compte
- PK composite (user_id, cabinet_id) dans user_cabinet_assignments — pas d'UUID id séparé, table pivot pure
- Contrainte UNIQUE (organization_id, display_order) ajoutée dans org_statuses pour garantir l'intégrité des ordres d'affichage

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — répertoire supabase/migrations/ créé (nouveau projet), les 4 fichiers SQL créés conformément aux spécifications exactes du plan.

## User Setup Required

None - no external service configuration required. Les migrations sont prêtes pour `supabase migration up` ou `supabase db push` lors du déploiement.

## Next Phase Readiness

- Schéma de base complet — Plan 03 peut créer la table dossiers et la FK status_id → org_statuses ON DELETE RESTRICT
- Plan 04 (RLS) peut créer les politiques en s'appuyant sur profiles, user_cabinet_assignments, et les index créés ici
- Le trigger de pré-chargement est fonctionnel — tout test créant une organisation recevra automatiquement ses 13 statuts

---
*Phase: 01-fondation-sch-ma-rls*
*Completed: 2026-03-16*
