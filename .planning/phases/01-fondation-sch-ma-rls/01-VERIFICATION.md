---
phase: 01-fondation-sch-ma-rls
verified: 2026-03-16T07:00:00Z
status: gaps_found
score: 9/12 must-haves verified
re_verification: false
gaps:
  - truth: "supabase test db retourne 0 tests failed"
    status: failed
    reason: "Docker non disponible — supabase test db n'a jamais été exécuté. Les tests pgTAP existent mais leur passage GREEN n'a pas été confirmé."
    artifacts:
      - path: "supabase/tests/05_status_restrict.test.sql"
        issue: "Bug structurel : aucun cabinet créé pour l'org de test. L'INSERT de dossier via SELECT FROM cabinets retourne 0 lignes, puis lastval() échoue avec 'lastval is not yet defined in this session'. Le throws_ok ne sera jamais atteint ou testera une mauvaise condition."
    missing:
      - "Créer un cabinet dans le DO block de 05_status_restrict.test.sql avant l'insertion du dossier (INSERT INTO public.cabinets ... VALUES (gen_random_uuid(), v_org_id, 'Cabinet Test'))"
      - "Ou remplacer la logique lastval() par RETURNING id INTO v_dossier_id dans l'INSERT du dossier"
      - "Installer Docker Desktop et exécuter supabase start && supabase db reset && supabase test db"

  - truth: "Les tests couvrent chaque requirement ID (FOUND-01 à FOUND-05)"
    status: partial
    reason: "01_schema.test.sql déclare plan(8) et couvre 4 des 7 champs AGO-spécifiques nullables requis par FOUND-01. Les champs id_pennylane, regime_fiscal, statut_exercice_pl ne sont pas testés col_is_null."
    artifacts:
      - path: "supabase/tests/01_schema.test.sql"
        issue: "Couvre date_cloture, date_echeance, forme_juridique, siren — manque id_pennylane, regime_fiscal, statut_exercice_pl"
    missing:
      - "Ajouter 3 assertions col_is_null pour id_pennylane, regime_fiscal, statut_exercice_pl dans 01_schema.test.sql"
      - "Mettre à jour select plan(8) en select plan(11)"

human_verification:
  - test: "Exécuter supabase test db après installation Docker"
    expected: "Tous les tests pgTAP passent en vert — 0 FAILED lines dans l'output"
    why_human: "Nécessite Docker Desktop installé et supabase start exécuté. Ne peut pas être vérifié programmatiquement sans infrastructure Docker active."
---

# Phase 1: Fondation Schema RLS — Rapport de Verification

**Phase Goal:** Etablir le schema Supabase complet avec RLS multi-tenant — organizations, profiles, cabinets, user_cabinet_assignments, org_statuses, dossiers — et les politiques d'isolation garantissant qu'aucune donnee d'une organisation ne peut fuir vers une autre.
**Verified:** 2026-03-16T07:00:00Z
**Status:** gaps_found
**Re-verification:** Non — verification initiale

---

## Objectif d'evaluation

La phase vise a produire un schema Supabase operationnel avec RLS. Le critere ultime est : `supabase test db` passe en vert, ce qui confirme que l'isolation multi-tenant est garantie au niveau base de donnees. L'evaluation part de cet objectif et remonte vers les artefacts.

---

## Verites observables

| # | Verite | Statut | Evidence |
|---|--------|--------|----------|
| 1 | `supabase/` initialise — config.toml present | VERIFIE | Fichier present, 14 157 octets, cree le 16 mars |
| 2 | 6 fichiers de tests pgTAP existent dans `supabase/tests/` | VERIFIE | 00_setup.sql a 05_status_restrict.test.sql presents |
| 3 | Les tests couvrent chaque requirement ID (FOUND-01 a FOUND-05) | PARTIEL | 4/5 couverts completement. FOUND-01 partiel : 4/7 champs AGO testes. FOUND-05 : test structurellement casse |
| 4 | `supabase test db` retourne 0 tests failed | NON VERIFIE | Docker non disponible — tests jamais executes |
| 5 | Table organizations avec enum plan_type et active_dossiers_count | VERIFIE | Migration 001 conforme, sans colonnes Stripe |
| 6 | Tables profiles, cabinets avec colonnes et contraintes correctes | VERIFIE | profiles.id -> auth.users FK cascade, organization_id nullable, cabinets.code nullable |
| 7 | Table user_cabinet_assignments avec PK composite (user_id, cabinet_id) | VERIFIE | Migration 003 conforme |
| 8 | Table org_statuses + trigger AFTER INSERT semedant 13 statuts exacts | VERIFIE | Migration 004 : trigger trg_seed_org_statuses, 13 labels exacts avec display_order |
| 9 | Table dossiers avec 7 champs AGO nullables, status_id FK ON DELETE RESTRICT | VERIFIE | Migration 005 : `on delete restrict`, 7 champs sans NOT NULL, task_uid UNIQUE nullable |
| 10 | Fonctions private.get_my_org_id/role/cabinet_ids SECURITY DEFINER STABLE | VERIFIE | Migration 006 : schema private cree, 3 fonctions avec security definer + stable |
| 11 | RLS activee sur 6 tables avec 20 politiques TO authenticated | VERIFIE | Migration 007 : 6 `enable row level security`, 20 `create policy` |
| 12 | Politiques RLS utilisent `(select private.get_my_)` wrapping | VERIFIE | 31 occurrences de `select private.get_my_` dans migration 007 |

**Score:** 9/12 verites verifiees (2 echecs, 1 partiel)

---

## Artefacts requis

### Migrations

| Artefact | Description | Existe | Substantiel | Cable | Statut |
|----------|-------------|--------|-------------|-------|--------|
| `supabase/migrations/20260316000001_create_organizations.sql` | Table organizations + enum plan_type | Oui | Oui | N/A | VERIFIE |
| `supabase/migrations/20260316000002_create_profiles_cabinets.sql` | Tables profiles + cabinets | Oui | Oui | N/A | VERIFIE |
| `supabase/migrations/20260316000003_create_user_cabinet_assignments.sql` | Table pivot user-cabinet | Oui | Oui | N/A | VERIFIE |
| `supabase/migrations/20260316000004_create_org_statuses.sql` | Table org_statuses + trigger seed | Oui | Oui | N/A | VERIFIE |
| `supabase/migrations/20260316000005_create_dossiers.sql` | Table dossiers + FK RESTRICT | Oui | Oui | N/A | VERIFIE |
| `supabase/migrations/20260316000006_create_rls_helper_functions.sql` | Schema private + 3 helpers | Oui | Oui | N/A | VERIFIE |
| `supabase/migrations/20260316000007_enable_rls_policies.sql` | RLS activation + 20 politiques | Oui | Oui | N/A | VERIFIE |

### Tests pgTAP

| Artefact | Description | Existe | Substantiel | Bug structurel | Statut |
|----------|-------------|--------|-------------|----------------|--------|
| `supabase/tests/00_setup.sql` | Extension pgTAP | Oui | Oui | Non | VERIFIE |
| `supabase/tests/01_schema.test.sql` | Structure schema FOUND-01/05 | Oui | Oui | Partiel : 4/7 AGO fields | PARTIEL |
| `supabase/tests/02_rls_isolation.test.sql` | Isolation org_A vs org_B FOUND-02 | Oui | Oui | Non | VERIFIE |
| `supabase/tests/03_rls_collaborateur.test.sql` | Restriction collaborateur FOUND-02/03 | Oui | Oui | Non | VERIFIE |
| `supabase/tests/04_status_seed.test.sql` | Trigger 13 statuts FOUND-04 | Oui | Oui | Non | VERIFIE |
| `supabase/tests/05_status_restrict.test.sql` | FK ON DELETE RESTRICT FOUND-05 | Oui | Oui | Oui : cabinet manquant | ECHEC |

---

## Verification des liaisons cles (Key Links)

| Depuis | Vers | Via | Pattern | Statut |
|--------|------|-----|---------|--------|
| migration 002 | auth.users | profiles.id REFERENCES auth.users(id) ON DELETE CASCADE | `references auth.users` | VERIFIE |
| migration 004 | organizations | trigger AFTER INSERT sur public.organizations | `after insert on public.organizations` | VERIFIE |
| migration 005 | org_statuses | dossiers.status_id ON DELETE RESTRICT | `on delete restrict` | VERIFIE |
| migration 006 | user_cabinet_assignments | get_my_cabinet_ids() lit user_cabinet_assignments | `from public.user_cabinet_assignments` | VERIFIE |
| migration 006 | auth.jwt() | get_my_org_id/role lisent app_metadata | `auth.jwt()` | VERIFIE |
| migration 007 | migration 006 | Toutes les politiques appellent `(select private.get_my_)` | `select private.get_my_` (31 occurrences) | VERIFIE |

---

## Couverture des requirements

| Requirement | Plan source | Description | Statut | Evidence |
|-------------|-------------|-------------|--------|----------|
| FOUND-01 | 01-01, 01-02, 01-03 | Champs AGO-specifiques nullables, type extensible | PARTIEL | Migration 005 conforme (7 champs nullables, type TEXT). Test 01_schema.test.sql ne couvre que 4/7 champs AGO. |
| FOUND-02 | 01-01, 01-03, 01-04 | Isolation multi-tenant 3 niveaux via RLS | VERIFIE (non execute) | Migrations 006+007 implementent l'isolation. Tests 02 et 03 couvrent les cas. Execution bloquee par Docker. |
| FOUND-03 | 01-01, 01-03, 01-04 | JWT custom claims via auth.jwt()->'app_metadata' | VERIFIE (non execute) | Migration 006 : get_my_org_id() et get_my_role() lisent auth.jwt()->'app_metadata'. |
| FOUND-04 | 01-01, 01-02 | Trigger 13 statuts par defaut a la creation d'org | VERIFIE (non execute) | Migration 004 : trigger trg_seed_org_statuses avec 13 labels exacts. Test 04 couvre tous les labels et display_order. |
| FOUND-05 | 01-01, 01-02, 01-03 | ON DELETE RESTRICT sur dossiers.status_id | PARTIEL | Migration 005 : FK avec ON DELETE RESTRICT present. Test 05 a un bug structurel (cabinet manquant) qui empechera le throws_ok de se declencher. |

---

## Detail du bug dans 05_status_restrict.test.sql

Le test cree une organisation via `INSERT INTO organizations` — le trigger seed charge 13 statuts. Puis le DO block tente d'inserer un dossier :

```sql
insert into public.dossiers (organization_id, cabinet_id, type, status_id)
select v_org_id, id, 'AGO', v_status_id
from public.cabinets
where organization_id = v_org_id
limit 1;
```

Aucun cabinet n'est cree pour cette organisation dans ce test. Le `SELECT FROM cabinets WHERE organization_id = v_org_id` retourne 0 lignes. L'INSERT insere 0 lignes.

La ligne suivante `v_dossier_id := lastval()::uuid` appellera `lastval()` qui echoue avec `ERROR: lastval is not yet defined in this session` si aucune sequence n'a ete utilisee dans la session — ou retourne la valeur d'une sequence precedente si une autre insertion a eu lieu (uuid pk ne passe pas par une sequence, donc c'est probable que lastval() echoue).

Meme si ce bloc DO echoue silencieusement, le `throws_ok` teste :
```sql
delete from public.org_statuses where id = (select status_id from public.dossiers limit 1)
```
Si aucun dossier n'existe dans la transaction, cette sous-requete retourne NULL. DELETE WHERE id = NULL supprime 0 lignes sans erreur. Le `throws_ok` attendant 23503 echouera.

**Correction requise :** Ajouter un `INSERT INTO public.cabinets` dans le DO block avant l'insertion du dossier.

---

## Detail du gap dans 01_schema.test.sql

Le plan prescrit que FOUND-01 couvre les 7 champs AGO-specifiques tous nullables. Le test declare `select plan(8)` et couvre :
- date_cloture (col_is_null)
- date_echeance (col_is_null)
- forme_juridique (col_is_null)
- siren (col_is_null)

Champs non testes : `id_pennylane`, `regime_fiscal`, `statut_exercice_pl`.

Ces colonnes existent bien dans la migration 005 et sont nullables. La couverture de test est incomplete mais la migration elle-meme est correcte.

---

## Anti-patterns

Aucun anti-pattern detecte dans les 13 fichiers SQL (migrations et tests) :
- Aucun TODO/FIXME/PLACEHOLDER
- Aucune implementation vide ou return null
- Aucun console.log

---

## Verification humaine requise

### 1. Execution de la suite de tests pgTAP

**Test :** Installer Docker Desktop, puis depuis la racine du projet :
```bash
supabase start
supabase db reset
supabase test db
```
**Attendu :** Output sans ligne "FAILED" — tous les tests passent en vert
**Pourquoi humain :** Docker non disponible sur la machine — infrastructure requise pour Supabase local

---

## Resume des gaps

**2 gaps bloquant la validation complete de la phase :**

**Gap 1 — Bug structurel dans 05_status_restrict.test.sql (bloquant)**
Le test de ON DELETE RESTRICT pour FOUND-05 ne peut pas passer : le DO block n'insere pas de dossier car aucun cabinet n'est cree pour l'organisation de test. Le `throws_ok` attendant l'erreur 23503 ne se declenchera pas.

**Gap 2 — Couverture incomplete FOUND-01 dans 01_schema.test.sql (mineur)**
3 des 7 champs AGO-specifiques (`id_pennylane`, `regime_fiscal`, `statut_exercice_pl`) ne sont pas couverts par des assertions `col_is_null`. La migration est correcte, seuls les tests sont incomplets.

**Blocage infrastructure (necessaire pour validation finale)**
Docker n'est pas installe — `supabase test db` n'a jamais ete execute. Meme apres correction des 2 gaps ci-dessus, l'execution des tests est necessaire pour confirmer que la phase est formellement complete.

---

*Verifie : 2026-03-16*
*Verifier : Claude (gsd-verifier)*
