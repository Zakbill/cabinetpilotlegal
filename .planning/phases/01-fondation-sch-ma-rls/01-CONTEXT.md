# Phase 1: Fondation — Schéma & RLS - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Infrastructure base de données Supabase complète : schéma multi-tenant (organisations → cabinets → utilisateurs → dossiers), politiques RLS à 3 niveaux, JWT custom claims, et table `org_statuses` avec pré-chargement automatique. Aucun code frontend, aucune Edge Function, aucune logique d'authentification — tout cela relève des phases suivantes.

</domain>

<decisions>
## Implementation Decisions

### Outil de migrations
- Supabase CLI exclusivement — toutes les migrations comme fichiers `.sql` versionnnés dans `supabase/migrations/`
- Jamais le dashboard SQL editor pour les changements de schéma — le schéma doit être reproductible et versionné dans le repo
- Les fichiers de migration portent le timestamp Supabase CLI standard

### Structure des tables

**`organizations`**
- id, name, created_at, plan (enum: starter/pro/cabinet/enterprise), active_dossiers_count (mise à jour par trigger)

**`cabinets`**
- id, organization_id, name (required), code (optional, référence interne libre), created_at
- RLS : un cabinet appartient à une organisation, visible uniquement par les membres de cette organisation

**`profiles`** (étend auth.users)
- id (= auth.users.id), organization_id, role (enum: expert-comptable/collaborateur), first_name, last_name, phone, avatar_url, created_at

**`user_cabinet_assignments`** (table de jonction)
- user_id, cabinet_id, assigned_at
- Utilisée par la RLS collaborateur : un collaborateur ne voit que les dossiers des cabinets dans cette table

**`dossiers`**
- id, organization_id, cabinet_id, type (text, ex : "AGO"), task_uid (unique, clé de déduplication Pennylane), status_id (FK → org_statuses, ON DELETE RESTRICT), created_at, updated_at
- Champs AGO-spécifiques (nullables, sans contrainte sur les autres types) : date_cloture, date_echeance, id_pennylane, forme_juridique, siren, regime_fiscal, statut_exercice_pl

**`org_statuses`**
- id, organization_id, label, type (enum: normal/terminal), display_order (integer), created_at
- FK depuis `dossiers.status_id` avec ON DELETE RESTRICT (blocage DB si statut en cours d'utilisation)

### Statuts pré-chargés à la création d'une organisation

**7 statuts normaux (type = 'normal') :**
1. Non commencé (order 1)
2. Rédaction PV (order 2)
3. Envoyé au client (order 3)
4. PV Signé (order 4)
5. PV / Comptes déposés (order 5)
6. Attente récépissé (order 6)
7. Terminé (order 7)

**6 statuts terminaux (type = 'terminal') :**
8. Non déposé (à la demande du client) (order 8)
9. Fait par avocat (order 9)
10. Fait par ancien cabinet (order 10)
11. Dépôt non obligatoire (Société civile) (order 11)
12. Société en liquidation (order 12)
13. Absence mission juridique (order 13)

### Pré-chargement des statuts
- Trigger PostgreSQL sur `organizations` INSERT — insère automatiquement les 13 statuts par défaut dans `org_statuses` à la création de chaque organisation
- Aucun code applicatif — le trigger garantit qu'aucune organisation ne peut être créée sans statuts

### JWT Custom Claims
- `org_id` et `role` stockés dans `auth.users.raw_app_meta_data` (champ `app_metadata`)
- Lus via `auth.jwt()->'app_metadata'` dans les politiques RLS pour éviter les appels DB supplémentaires
- Mise à jour via trigger ou fonction appelée lors de l'onboarding (Phase 2)

### Politiques RLS
- Utiliser des fonctions helper (`get_my_org_id()`, `get_my_role()`, `get_my_cabinet_ids()`) pour encapsuler la lecture des JWT claims et la jointure `user_cabinet_assignments` — performance et lisibilité
- Politique `dossiers` pour collaborateur : `cabinet_id = ANY(get_my_cabinet_ids())`
- Politique `dossiers` pour expert-comptable : `organization_id = get_my_org_id()`
- Isolation totale entre organisations sur toutes les tables (organization_id = get_my_org_id())

### Claude's Discretion
- Nommage exact des fonctions helper RLS
- Index supplémentaires au-delà des FK (ex : index sur dossiers.organization_id, cabinet_id, status_id)
- Détail des colonnes `organizations` (ex : champs billing liés à Stripe — ajoutés en Phase 7 ou préparés maintenant ?)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schéma & RLS
- `.planning/REQUIREMENTS.md` §Foundation — Schema & RLS — FOUND-01 à FOUND-05 : critères d'acceptation complets (isolation multi-tenant, JWT claims, statuts, ON DELETE RESTRICT)
- `.planning/ROADMAP.md` §Phase 1 — Success Criteria : 5 critères vérifiables à satisfaire

### Contraintes techniques
- `.planning/PROJECT.md` §Constraints — Tech stack non-négociable (Supabase Auth, RLS, Vault)
- `.planning/PROJECT.md` §Key Decisions — Décisions architecturales déjà validées

No external specs — requirements fully captured in decisions above and referenced files.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Aucun — projet vide, première phase

### Established Patterns
- Aucun pattern existant — cette phase établit les conventions de base (CLI migrations, RLS via fonctions helper)

### Integration Points
- `supabase/migrations/` — répertoire à créer, toutes les migrations de cette phase s'y trouvent
- `auth.users` (Supabase géré) — les triggers JWT claims écrivent dans `raw_app_meta_data`
- Phase 2 (Auth & RBAC) consomme directement les politiques RLS et les JWT claims posés ici

</code_context>

<specifics>
## Specific Ideas

- La table `user_cabinet_assignments` est la clé de la RLS collaborateur — la jointure se fait dans la fonction helper `get_my_cabinet_ids()` pour que les politiques restent lisibles
- Les champs AGO-spécifiques dans `dossiers` sont tous **nullables** — un dossier de type "création de société" (v2) peut être inséré sans contrainte
- Le trigger de pré-chargement des statuts doit insérer exactement les 13 statuts dans l'ordre défini ci-dessus — l'ordre d'affichage est prescrit, pas aléatoire

</specifics>

<deferred>
## Deferred Ideas

- Colonnes Stripe (plan, subscription_id, customer_id) dans `organizations` — à décider si on les prépare maintenant ou en Phase 7. À trancher en Phase 7.
- Table `sync_logs` mentionnée dans SYNC-05 — scope Phase 5, pas Phase 1

</deferred>

---

*Phase: 01-fondation-sch-ma-rls*
*Context gathered: 2026-03-16*
