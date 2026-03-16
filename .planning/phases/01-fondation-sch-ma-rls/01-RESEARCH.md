# Phase 1: Fondation — Schéma & RLS - Research

**Researched:** 2026-03-16
**Domain:** Supabase PostgreSQL — schéma multi-tenant, Row Level Security, JWT custom claims, triggers PostgreSQL
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Outil de migrations**
- Supabase CLI exclusivement — toutes les migrations comme fichiers `.sql` versionnés dans `supabase/migrations/`
- Jamais le dashboard SQL editor pour les changements de schéma — le schéma doit être reproductible et versionné dans le repo
- Les fichiers de migration portent le timestamp Supabase CLI standard

**Structure des tables** (exactement ces colonnes, pas d'autres)

- `organizations` : id, name, created_at, plan (enum: starter/pro/cabinet/enterprise), active_dossiers_count
- `cabinets` : id, organization_id, name (required), code (optional), created_at
- `profiles` : id (= auth.users.id), organization_id, role (enum: expert-comptable/collaborateur), first_name, last_name, phone, avatar_url, created_at
- `user_cabinet_assignments` : user_id, cabinet_id, assigned_at
- `dossiers` : id, organization_id, cabinet_id, type (text), task_uid (unique), status_id (FK → org_statuses, ON DELETE RESTRICT), created_at, updated_at + champs AGO nullables
- `org_statuses` : id, organization_id, label, type (enum: normal/terminal), display_order (integer), created_at

**Champs AGO-spécifiques dans `dossiers`** : date_cloture, date_echeance, id_pennylane, forme_juridique, siren, regime_fiscal, statut_exercice_pl — tous nullables

**JWT Custom Claims** : `org_id` et `role` dans `auth.users.raw_app_meta_data`, lus via `auth.jwt()->'app_metadata'` dans les politiques RLS

**Politiques RLS** : fonctions helper (`get_my_org_id()`, `get_my_role()`, `get_my_cabinet_ids()`) — isolation totale entre organisations sur toutes les tables

**Pré-chargement des statuts** : Trigger PostgreSQL sur `organizations` INSERT — 13 statuts (7 normaux + 6 terminaux) avec ordre prescrit

**FK sur dossiers.status_id** : ON DELETE RESTRICT (blocage DB si statut utilisé)

### Claude's Discretion

- Nommage exact des fonctions helper RLS
- Index supplémentaires au-delà des FK (ex : index sur dossiers.organization_id, cabinet_id, status_id)
- Détail des colonnes `organizations` (ex : champs billing liés à Stripe — ajoutés en Phase 7 ou préparés maintenant ?)

### Deferred Ideas (OUT OF SCOPE)

- Colonnes Stripe (plan, subscription_id, customer_id) dans `organizations` — à décider en Phase 7
- Table `sync_logs` mentionnée dans SYNC-05 — scope Phase 5, pas Phase 1
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Champ `type` extensible dans `dossiers` — champs AGO-spécifiques nullables, sans contrainte sur les autres types | Schéma avec colonnes nullables, aucune CHECK constraint sur type — validé par pattern PostgreSQL nullable columns |
| FOUND-02 | Isolation multi-tenant 3 niveaux via RLS : organisation → cabinets → utilisateurs | Helper functions SECURITY DEFINER + policies TO authenticated — pattern vérifié dans Supabase docs officiels |
| FOUND-03 | JWT custom claims (`org_id`, `role`) dans `raw_app_meta_data`, lus via `auth.jwt()->'app_metadata'` | Custom Access Token Hook OU mise à jour directe `raw_app_meta_data` via admin API — patterns documentés Supabase |
| FOUND-04 | Table `org_statuses` avec 13 statuts pré-chargés (7 normaux + 6 terminaux) à la création de l'organisation | Trigger AFTER INSERT sur `organizations` — pattern PostgreSQL standard, AFTER INSERT FOR EACH ROW |
| FOUND-05 | Suppression d'un statut référencé par un dossier bloquée au niveau DB | FK avec ON DELETE RESTRICT sur `dossiers.status_id` — contrainte PostgreSQL native, HIGH confidence |
</phase_requirements>

---

## Summary

Cette phase pose la fondation complète de la base de données : un schéma multi-tenant à 6 tables, des politiques RLS à 3 niveaux d'isolation (organisation / cabinet / utilisateur), des JWT custom claims stockés dans `raw_app_meta_data`, et un trigger PostgreSQL qui pré-charge automatiquement 13 statuts à la création de chaque organisation. Aucun code frontend, aucune Edge Function — tout est DB.

Le pattern RLS recommandé par Supabase pour ce type d'architecture est la combinaison de fonctions helper SECURITY DEFINER (pour encapsuler la lecture des JWT claims et éviter les subquery joins répétés) avec le wrapping `(select auth.uid())` / `(select get_my_org_id())` pour activer le cache initPlan de PostgreSQL. Ce pattern donne des améliorations de perf documentées de 94-99% sur les tables larges.

La mise à jour de `raw_app_meta_data` (pour `org_id` et `role`) est hors scope de cette phase — CONTEXT.md précise que c'est géré en Phase 2 lors de l'onboarding. Cette phase doit seulement déclarer les colonnes et les politiques qui lisent ces claims, sans les écrire.

**Primary recommendation:** Créer les migrations en ordre logique de dépendances (organizations → profiles → cabinets → user_cabinet_assignments → org_statuses → dossiers), déployer les fonctions helper SECURITY DEFINER dans un schéma privé, puis créer les politiques RLS en utilisant systématiquement le pattern `(select helper_fn())` pour la performance.

---

## Standard Stack

### Core

| Outil / Extension | Version | Purpose | Why Standard |
|-------------------|---------|---------|--------------|
| Supabase CLI | latest (≥ 1.200) | Migrations versionnées, test db local | Seul outil officiellement supporté pour les migrations Supabase |
| PostgreSQL (via Supabase) | 15+ | Schéma, RLS, triggers, fonctions | Base imposée par Supabase |
| pgTAP | extension PostgreSQL | Tests de RLS et de schéma | Framework officiel Supabase pour `supabase test db` |
| supabase-test-helpers | usebasejump/supabase-test-helpers | Helpers pour simuler users/JWT dans pgTAP | Utilisé par la communauté Supabase, simplifie les tests RLS |

### Supporting

| Outil | Purpose | When to Use |
|-------|---------|-------------|
| `supabase start` | Lance Supabase local (Postgres + Auth + Studio) | Développement et tests locaux |
| `supabase migration new <name>` | Génère un fichier migration timestampé | Avant chaque changement de schéma |
| `supabase migration up` | Applique les migrations pending | Après création d'un fichier migration |
| `supabase test db` | Lance pgTAP — teste RLS, schéma, constraints | À chaque wave de migration |
| `supabase db reset` | Repart d'un état propre | Pendant le développement local |

**Installation (CLI):**
```bash
brew install supabase/tap/supabase
# ou via npm
npx supabase login
npx supabase init
```

---

## Architecture Patterns

### Recommended Project Structure

```
supabase/
├── migrations/
│   ├── 20260316000001_create_organizations.sql
│   ├── 20260316000002_create_profiles_cabinets.sql
│   ├── 20260316000003_create_user_cabinet_assignments.sql
│   ├── 20260316000004_create_org_statuses.sql
│   ├── 20260316000005_create_dossiers.sql
│   ├── 20260316000006_create_rls_helper_functions.sql
│   └── 20260316000007_enable_rls_policies.sql
└── tests/
    ├── 00_setup.sql              (extension pgTAP, fixtures communes)
    ├── 01_schema.test.sql        (tables, colonnes, constraints existent)
    ├── 02_rls_org_isolation.test.sql   (org_A ne voit pas org_B)
    ├── 03_rls_collaborateur.test.sql   (collaborateur limité aux cabinets assignés)
    └── 04_status_restrict.test.sql    (ON DELETE RESTRICT bloqué)
```

### Pattern 1 : Fonctions Helper SECURITY DEFINER

**What:** Des fonctions PostgreSQL créées avec `SECURITY DEFINER` dans un schéma non-exposé qui lisent les JWT claims et retournent l'org_id, le role, ou les cabinet_ids de l'utilisateur courant.

**When to use:** Toujours — dans chaque politique RLS qui a besoin de lire l'identité de l'utilisateur. Évite les subquery joins répétés sur `auth.users` ou `profiles`.

**Pourquoi SECURITY DEFINER :** La fonction s'exécute avec les droits du créateur (qui bypass RLS sur les tables internes), éliminant la récursion RLS quand la policy doit lire une autre table protégée.

**Pourquoi `(select fn())` :** PostgreSQL traite l'expression comme un initPlan — il l'évalue une seule fois pour toute la requête, pas une fois par ligne. Benchmark Supabase : ~95% d'amélioration.

**Example:**
```sql
-- Source: Supabase docs officiels (row-level-security)
-- Toutes dans un schéma privé pour empêcher l'invocation directe
create schema if not exists private;

create or replace function private.get_my_org_id()
returns uuid
language sql
security definer
stable
as $$
  select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
$$;

create or replace function private.get_my_role()
returns text
language sql
security definer
stable
as $$
  select auth.jwt() -> 'app_metadata' ->> 'role'
$$;

create or replace function private.get_my_cabinet_ids()
returns uuid[]
language sql
security definer
stable
as $$
  select array_agg(cabinet_id)
  from public.user_cabinet_assignments
  where user_id = (select auth.uid())
$$;
```

### Pattern 2 : Politique RLS avec wrapping initPlan

**What:** Chaque politique RLS enveloppe les appels de fonctions dans `(select ...)` pour forcer le cache PostgreSQL.

**Example:**
```sql
-- Politique expert-comptable : voit tous les dossiers de son org
create policy "expert_comptable_select_dossiers"
on public.dossiers
for select
to authenticated
using (
  (select private.get_my_role()) = 'expert-comptable'
  and organization_id = (select private.get_my_org_id())
);

-- Politique collaborateur : voit uniquement les dossiers de ses cabinets
create policy "collaborateur_select_dossiers"
on public.dossiers
for select
to authenticated
using (
  (select private.get_my_role()) = 'collaborateur'
  and cabinet_id = any(select private.get_my_cabinet_ids())
);
```

### Pattern 3 : Trigger de pré-chargement des statuts

**What:** Un trigger AFTER INSERT FOR EACH ROW sur `organizations` qui insère les 13 statuts par défaut dans `org_statuses`.

**Why:** Garantit qu'aucune organisation n'existe sans statuts — la contrainte est au niveau DB, pas au niveau applicatif.

**Example:**
```sql
create or replace function public.seed_default_statuses()
returns trigger
language plpgsql
as $$
begin
  insert into public.org_statuses (organization_id, label, type, display_order)
  values
    (NEW.id, 'Non commencé',                       'normal',   1),
    (NEW.id, 'Rédaction PV',                        'normal',   2),
    (NEW.id, 'Envoyé au client',                    'normal',   3),
    (NEW.id, 'PV Signé',                            'normal',   4),
    (NEW.id, 'PV / Comptes déposés',               'normal',   5),
    (NEW.id, 'Attente récépissé',                   'normal',   6),
    (NEW.id, 'Terminé',                             'normal',   7),
    (NEW.id, 'Non déposé (à la demande du client)', 'terminal', 8),
    (NEW.id, 'Fait par avocat',                     'terminal', 9),
    (NEW.id, 'Fait par ancien cabinet',             'terminal', 10),
    (NEW.id, 'Dépôt non obligatoire (Société civile)', 'terminal', 11),
    (NEW.id, 'Société en liquidation',              'terminal', 12),
    (NEW.id, 'Absence mission juridique',           'terminal', 13);
  return NEW;
end;
$$;

create trigger trg_seed_org_statuses
after insert on public.organizations
for each row execute function public.seed_default_statuses();
```

### Pattern 4 : Isolation totale entre organisations

**What:** Chaque table qui contient des données d'organisation a une colonne `organization_id` et une politique RLS qui filtre sur `organization_id = (select private.get_my_org_id())`.

**Règle :** Enable RLS sur TOUTES les tables — même celles qui semblent "sûres". Un oubli = fuite de données.

```sql
-- Activer RLS sur toutes les tables
alter table public.organizations enable row level security;
alter table public.cabinets enable row level security;
alter table public.profiles enable row level security;
alter table public.user_cabinet_assignments enable row level security;
alter table public.org_statuses enable row level security;
alter table public.dossiers enable row level security;
```

### Anti-Patterns à Eviter

- **RLS avec JOIN source-vers-cible :** `where user_id in (select user_id from team_user where team_id = team_id)` — crée une boucle source-cible qui ruine les performances. Toujours filtrer depuis la cible vers la source.
- **`auth.uid()` sans wrapping :** Appelé sur chaque ligne, pas de cache. Utiliser `(select auth.uid())`.
- **`raw_user_meta_data` pour l'autorisation :** L'utilisateur peut modifier cette colonne depuis le client. Utiliser uniquement `raw_app_meta_data`.
- **Policies sans clause `TO authenticated` :** Sans cette clause, la policy s'évalue aussi pour les utilisateurs anonymes — perte de performance mesurée à 99.78%.
- **Tester via SQL Editor Supabase :** L'éditeur SQL s'exécute en tant que `postgres` (bypass RLS). Toujours tester via le SDK client ou via pgTAP avec `set local role authenticated`.

---

## Don't Hand-Roll

| Problème | Ne pas construire | Utiliser plutôt | Pourquoi |
|----------|-------------------|-----------------|----------|
| Isolation multi-tenant | Filtres WHERE dans l'application | RLS PostgreSQL | Edge cases si un endpoint oublie le filtre — RLS s'applique toujours |
| JWT custom claims | Stocker org_id/role dans une table lue à chaque requête | `raw_app_meta_data` + `auth.jwt()` | Évite un aller-retour DB par requête |
| Seeding des statuts à l'inscription | Code applicatif dans l'API d'onboarding | Trigger PostgreSQL AFTER INSERT | Garantit l'atomicité — impossible d'oublier |
| Contrainte "statut en cours d'utilisation" | Vérification dans l'application avant DELETE | FK ON DELETE RESTRICT | L'application peut avoir des bugs, la DB ne ment pas |
| Tests RLS | Tests frontend qui vérifient les données reçues | pgTAP avec `set local role authenticated` | Teste la contrainte réelle au niveau DB, pas l'effet observable |

**Key insight :** Pour le multi-tenant, chaque couche d'isolation (application, API, DB) peut être bypassée individuellement. Seule la RLS au niveau DB est une garantie absolue. Ne jamais compter uniquement sur les filtres applicatifs.

---

## Common Pitfalls

### Pitfall 1 : RLS activée mais aucune politique définie = table verrouillée

**What goes wrong :** `alter table enable row level security` sans politique → personne ne peut lire ni écrire (sauf `postgres`). Silencieux : retourne 0 lignes plutôt qu'une erreur.

**Why it happens :** On active RLS pour sécuriser, mais on oublie d'écrire les politiques. L'app semble fonctionner (pas d'erreur 500) mais retourne des données vides.

**How to avoid :** Créer la politique dans la même migration que le `enable row level security`. Ne jamais séparer activation et politique.

**Warning signs :** `select count(*) from table` retourne 0 depuis le client SDK mais non-zéro depuis psql.

---

### Pitfall 2 : JWT pas "frais" après mise à jour de `app_metadata`

**What goes wrong :** On met à jour `raw_app_meta_data` (ex : assigner un nouveau cabinet à un collaborateur) mais les politiques RLS continuent d'utiliser l'ancien JWT pendant la durée de vie du token (par défaut 1 heure).

**Why it happens :** `auth.jwt()` lit le token courant, pas la DB. Le token n'est rafraîchi qu'à la prochaine connexion ou refresh explicite.

**How to avoid :** Forcer un refresh token côté client après toute mise à jour de `app_metadata`. En Phase 2 (onboarding), `signOut()` + `signIn()` ou appeler `supabase.auth.refreshSession()` après l'écriture admin.

**Warning signs :** Un utilisateur dont le rôle a changé continue de voir les mêmes données.

---

### Pitfall 3 : `ON DELETE RESTRICT` vs `ON DELETE NO ACTION`

**What goes wrong :** Les deux bloquent la suppression, mais `NO ACTION` est vérifiable en fin de transaction (peut être contourné avec des triggers différés). `RESTRICT` est immédiat et ne peut pas être différé.

**Why it happens :** PostgreSQL utilise `NO ACTION` par défaut si on écrit juste `REFERENCES` sans `ON DELETE`.

**How to avoid :** Toujours spécifier explicitement `ON DELETE RESTRICT` dans la définition de FK pour `dossiers.status_id`. Ne pas laisser le défaut.

---

### Pitfall 4 : Politique RLS récursive sur `profiles` ou `user_cabinet_assignments`

**What goes wrong :** La helper function `get_my_cabinet_ids()` lit `user_cabinet_assignments`. Si cette table a une politique RLS qui elle-même appelle une helper function... boucle infinie ou erreur de récursion.

**Why it happens :** La fonction est SECURITY DEFINER mais si elle est appelée en dehors de ce contexte, ou si la table qu'elle lit a une politique mal configurée, PostgreSQL peut entrer en récursion.

**How to avoid :** Les fonctions helper SECURITY DEFINER bypassent RLS sur les tables qu'elles lisent (car elles s'exécutent avec les droits du créateur). S'assurer que toutes les helpers sont dans le schéma `private`, pas `public`, pour empêcher l'appel direct par des clients.

---

### Pitfall 5 : Ordre des migrations — FK vers des tables non encore créées

**What goes wrong :** Une migration crée `dossiers` avec `status_id REFERENCES org_statuses(id)` avant que `org_statuses` soit créée. La migration échoue.

**Why it happens :** Les migrations sont appliquées séquentiellement par timestamp. Si les timestamps ne respectent pas l'ordre de dépendance, erreur `relation does not exist`.

**How to avoid :** Respecter l'ordre de création : `organizations` → `profiles` → `cabinets` → `user_cabinet_assignments` → `org_statuses` → `dossiers` → fonctions helpers → politiques RLS. Un fichier de migration par dépendance logique.

---

### Pitfall 6 : `active_dossiers_count` décalé

**What goes wrong :** Le compteur `active_dossiers_count` sur `organizations` est mis à jour par trigger. Si le trigger est absent ou bugué, la valeur devient fausse — ce qui affecte le gating des plans Stripe en Phase 7.

**Why it happens :** Phase 1 déclare la colonne, mais le trigger de mise à jour sera implémenté en Phase 5 (sync) ou Phase 7 (billing). Risque de colonne sans trigger actif.

**How to avoid :** Initialiser `active_dossiers_count` à 0 avec une valeur par défaut. Documenter explicitement que le trigger de mise à jour est dans une phase future. Ne pas mettre de contrainte NOT NULL sans default.

---

## Code Examples

Verified patterns from official Supabase sources:

### Migration workflow complet

```bash
# Source: Supabase CLI docs officiels
supabase init                              # Crée supabase/ dans le repo
supabase start                             # Lance Supabase local
supabase migration new create_organizations  # Génère supabase/migrations/TIMESTAMP_create_organizations.sql
# Écrire le SQL dans le fichier généré
supabase migration up                      # Applique la migration
supabase test db                           # Lance les tests pgTAP
```

### Activer RLS et créer une politique de base

```sql
-- Source: Supabase docs — row-level-security
alter table public.dossiers enable row level security;

create policy "dossiers_select_expert_comptable"
on public.dossiers
for select
to authenticated
using (
  (select private.get_my_role()) = 'expert-comptable'
  and organization_id = (select private.get_my_org_id())
);
```

### Test pgTAP — vérifier l'isolation multi-tenant

```sql
-- Source: Supabase docs — testing/overview + usebasejump/testing-on-supabase-with-pgtap
begin;
select plan(2);

-- Créer deux orgs distinctes
-- (en pratique via les helpers de supabase-test-helpers)

set local role authenticated;
set local request.jwt.claims = '{"sub": "user_org_a_id", "app_metadata": {"org_id": "org_a_uuid", "role": "expert-comptable"}}';

select is_empty(
  $$ select * from dossiers where organization_id = 'org_b_uuid' $$,
  'org_A user ne doit voir aucune ligne de org_B'
);

select isnt_empty(
  $$ select * from dossiers where organization_id = 'org_a_uuid' $$,
  'org_A user doit voir ses propres dossiers'
);

select * from finish();
rollback;
```

### Test pgTAP — vérifier ON DELETE RESTRICT

```sql
-- Source: pattern pgTAP standard
begin;
select plan(1);

-- Setup : insérer org, statut utilisé par un dossier
-- ...

select throws_ok(
  $$ delete from org_statuses where id = 'statut_en_cours_id' $$,
  '23503',   -- foreign_key_violation
  'La suppression d''un statut en cours d''utilisation doit lever une erreur FK'
);

select * from finish();
rollback;
```

### Lire les JWT claims depuis `app_metadata` dans RLS

```sql
-- Source: Supabase docs — custom-claims-and-role-based-access-control-rbac
-- Accès direct (pour référence, encapsuler dans une helper)
(auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
(auth.jwt() -> 'app_metadata' ->> 'role')
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `auth.uid()` directement dans RLS | `(select auth.uid())` | 2022-2023 (Supabase perf fixes) | Cache initPlan PostgreSQL — jusqu'à 95% de gain |
| Trigger sur `auth.users` pour écrire `app_metadata` | Custom Access Token Hook (auth hook) | 2023 (Supabase auth hooks GA) | Plus fiable — évite la race condition trigger vs auth service |
| Politiques sans clause `TO` | Politiques avec `TO authenticated` ou `TO anon` | Recommandation Supabase 2023+ | 99.78% d'amélioration sur tables avec utilisateurs anonymes |
| Fonctions helper dans `public` | Fonctions helper dans schéma `private` non-exposé | Bonne pratique sécurité établie | Empêche l'invocation directe par les clients |

**Deprecated/outdated:**
- **`raw_user_meta_data` pour les rôles** : Peut être modifié par l'utilisateur depuis le client. Remplacé par `raw_app_meta_data` pour toute donnée d'autorisation.
- **Subquery join dans RLS sans wrapping SELECT** : `auth.uid() = user_id` sans le `(select ...)` — toujours valide mais performances dégradées sur grandes tables. Le wrapping est maintenant la norme.

---

## Claude's Discretion Recommendations

### Index supplémentaires recommandés

Au-delà des index créés automatiquement par les clés primaires et FK :

```sql
-- Colonnes critiques pour les politiques RLS
create index idx_dossiers_organization_id on public.dossiers(organization_id);
create index idx_dossiers_cabinet_id on public.dossiers(cabinet_id);
create index idx_dossiers_status_id on public.dossiers(status_id);
create index idx_cabinets_organization_id on public.cabinets(organization_id);
create index idx_profiles_organization_id on public.profiles(organization_id);
create index idx_org_statuses_organization_id on public.org_statuses(organization_id);
create index idx_user_cabinet_assignments_user_id on public.user_cabinet_assignments(user_id);
```

Confiance : HIGH — recommandé explicitement par Supabase docs (99.94% d'amélioration documentée pour les colonnes RLS).

### Colonnes `organizations` — Stripe préparer ou pas ?

**Recommandation : ne pas préparer les colonnes Stripe maintenant.**

Raison : la Phase 7 sera une migration ALTER TABLE qui ajoute les colonnes — c'est non-destructif et sans risque de migration. Ajouter des colonnes `subscription_id`, `customer_id`, `stripe_plan` en Phase 1 crée de la confusion (colonnes null dans toutes les requêtes) sans bénéfice. Les reporter en Phase 7.

**La colonne `plan` décidée dans CONTEXT.md est conservée** (starter/pro/cabinet/enterprise) — elle est nécessaire pour le gating des fonctionnalités dès Phase 3.

### Nommage des fonctions helper

Recommandation :

```
private.get_my_org_id()        → retourne uuid
private.get_my_role()          → retourne text
private.get_my_cabinet_ids()   → retourne uuid[]
```

Placées dans le schéma `private` (non exposé via PostgREST) pour empêcher l'appel direct par les clients.

---

## Open Questions

1. **Mise à jour de `raw_app_meta_data` — trigger ou Custom Access Token Hook ?**
   - What we know : Les deux approches fonctionnent. Le Custom Access Token Hook est la méthode recommandée en 2024+ (docs Supabase). Le trigger direct sur `auth.users` a une race condition connue.
   - What's unclear : Hors scope Phase 1 — la Phase 1 déclare seulement les politiques qui LISENT ces claims. La Phase 2 (onboarding) devra trancher entre les deux approches pour ÉCRIRE les claims.
   - Recommendation : Laisser ouverte. Le Custom Access Token Hook est préférable — c'est le sujet de la recherche Phase 2.

2. **Tests pgTAP — `supabase-test-helpers` ou pgTAP natif ?**
   - What we know : `usebasejump/supabase-test-helpers` simplifie `authenticate_as()` mais est une dépendance tierce non officielle. pgTAP natif avec `set local role authenticated` + `set local request.jwt.claims` est plus verbeux mais sans dépendance.
   - Recommendation : Utiliser pgTAP natif avec `set local request.jwt.claims` pour ce projet. La configuration manuelle des claims est directe et évite une dépendance externe.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pgTAP (extension PostgreSQL) |
| Config file | `supabase/config.toml` (section `[db.settings]`) |
| Quick run command | `supabase test db --db-url postgresql://...` |
| Full suite command | `supabase test db` (depuis répertoire projet) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Insertion d'un dossier non-AGO sans les champs AGO-spécifiques réussit | unit (DB) | `supabase test db` | ❌ Wave 0 |
| FOUND-01 | Les champs AGO-spécifiques sont bien nullables | unit (DB) | `supabase test db` | ❌ Wave 0 |
| FOUND-02 | SELECT sur `dossiers` depuis org_A retourne 0 lignes de org_B | unit (DB) | `supabase test db` | ❌ Wave 0 |
| FOUND-02 | SELECT sur `dossiers` depuis un collaborateur retourne uniquement les dossiers de ses cabinets assignés | unit (DB) | `supabase test db` | ❌ Wave 0 |
| FOUND-03 | `auth.jwt()->'app_metadata'` contient `org_id` et `role` utilisables dans les policies | unit (DB) | `supabase test db` | ❌ Wave 0 |
| FOUND-04 | Après `INSERT` dans `organizations`, `org_statuses` contient exactement 13 lignes pour cette org | unit (DB) | `supabase test db` | ❌ Wave 0 |
| FOUND-04 | Les 13 statuts ont les labels, types et display_order exacts définis dans CONTEXT.md | unit (DB) | `supabase test db` | ❌ Wave 0 |
| FOUND-05 | `DELETE` d'un statut référencé par un dossier lève `23503 foreign_key_violation` | unit (DB) | `supabase test db` | ❌ Wave 0 |

### Sampling Rate

- **Par migration appliquée :** `supabase test db` (full suite — rapide, tout est SQL)
- **Par wave merge :** `supabase test db` (full suite)
- **Phase gate :** Full suite verte avant `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `supabase/tests/00_setup.sql` — installe pgTAP, crée fixtures (2 orgs, 2 users, 2 cabinets)
- [ ] `supabase/tests/01_schema.test.sql` — vérifie les tables, colonnes, contraintes (FOUND-01, FOUND-05)
- [ ] `supabase/tests/02_rls_isolation.test.sql` — vérifie isolation org (FOUND-02)
- [ ] `supabase/tests/03_rls_collaborateur.test.sql` — vérifie restriction collaborateur (FOUND-02)
- [ ] `supabase/tests/04_status_seed.test.sql` — vérifie le trigger de seeding (FOUND-04)
- [ ] `supabase/tests/05_status_restrict.test.sql` — vérifie ON DELETE RESTRICT (FOUND-05)
- [ ] Framework install : pgTAP est une extension PostgreSQL — activer via `create extension pgtap;` dans le setup

---

## Sources

### Primary (HIGH confidence)

- [Supabase Docs — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — politiques RLS, helper functions, performance benchmarks, pattern `(select auth.uid())`
- [Supabase Docs — Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — Custom Access Token Hook, `auth.jwt()`, pattern RBAC
- [Supabase Docs — Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks) — Custom Access Token Hook SQL signature
- [Supabase Docs — Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview) — `supabase test db`, pgTAP, set role/JWT pour tests
- [Supabase Docs — Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations) — convention de nommage migrations, workflow CLI
- [PostgreSQL Docs — CREATE TRIGGER](https://www.postgresql.org/docs/current/sql-createtrigger.html) — syntaxe AFTER INSERT FOR EACH ROW

### Secondary (MEDIUM confidence)

- [Supabase Docs — RLS Performance Advisor (lint 0003)](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0003_auth_rls_initplan) — confirmation du pattern initPlan
- [Basejump — Testing on Supabase with pgTAP](https://usebasejump.com/blog/testing-on-supabase-with-pgtap) — exemples `throws_ok()` et `is_empty()` pour tests RLS
- [DEV.to — Enforcing RLS multi-tenant LockIn architecture](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2) — pattern réel multi-tenant RLS

### Tertiary (LOW confidence)

- Aucune source LOW confidence — tous les claims critiques sont vérifiés dans les docs officiels Supabase.

---

## Metadata

**Confidence breakdown:**

- Standard stack : HIGH — Supabase CLI, pgTAP, migrations SQL sont les outils officiels documentés
- Architecture / RLS patterns : HIGH — patterns directement tirés des docs officiels Supabase avec benchmarks
- Trigger PostgreSQL seeding : HIGH — syntaxe standard PostgreSQL, pattern trivial
- Custom Access Token Hook : MEDIUM — documenté mais hors scope Phase 1 (Phase 2 doit trancher entre hook vs trigger pour l'écriture des claims)
- Tests pgTAP : HIGH — `supabase test db` est la commande officielle, syntaxe pgTAP vérifiée

**Research date:** 2026-03-16
**Valid until:** 2026-09-16 (stack stable — Supabase CLI et PostgreSQL RLS bougent peu)
