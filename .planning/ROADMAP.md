# Roadmap: CabinetPilot

## Overview

CabinetPilot se construit en 9 phases ordonnées par dépendances strictes : la fondation multi-tenant (schéma + RLS) précède tout, l'authentification débloque les données, le dashboard livre la valeur quotidienne, la synchronisation Pennylane l'alimente, la facturation Stripe la monétise, et la landing page convertit les prospects. Les phases 4 et 8 sont délibérément fines — elles isolent les surfaces d'interaction complexes (side panel + fil d'activité) et l'automatisation cron pour permettre une validation indépendante.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Fondation — Schéma & RLS** - Schéma Supabase complet + politiques RLS à 3 niveaux + statuts configurables
- [ ] **Phase 2: Authentification & RBAC** - Magic link, onboarding organisation, invitations, profils utilisateurs, isolation multi-tenant
- [ ] **Phase 3: Dashboard — Table, Filtres & KPI** - Table TanStack avec pagination server-side, filtres persistants, KPI réactifs, sidebar collapsible
- [ ] **Phase 4: Dashboard — Side Panel & Fil d'Activité** - Side panel coulissant, changement de statut, commentaires manuels, logs automatiques
- [ ] **Phase 5: Synchronisation Pennylane Manuelle** - Edge Function sync-pennylane, Vault, filtres de sync, logs, bouton test connexion
- [ ] **Phase 6: Gestion Cabinet & Paramètres** - Page membres, invitations, cabinets, paramètres profil/Pennylane/statuts
- [ ] **Phase 7: Abonnements Stripe** - Plans, facturation, webhooks idempotents, gating fonctionnalités
- [ ] **Phase 8: Synchronisation Automatique — pg_cron** - Sync hebdomadaire via queue + pg_cron, alertes d'échec, architecture anti-storm
- [ ] **Phase 9: Landing Page** - Hero, preuve sociale, fonctionnalités, pricing, FAQ, footer

## Phase Details

### Phase 1: Fondation — Schéma & RLS
**Goal**: La base de données Supabase est opérationnelle avec un isolement multi-tenant complet — aucune donnée d'organisation ne peut fuir vers une autre, aucun statut en cours d'utilisation ne peut être supprimé
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05
**Success Criteria** (what must be TRUE):
  1. Une requête SELECT sur `dossiers` depuis le contexte d'un utilisateur org_A ne retourne aucune ligne appartenant à org_B
  2. Une requête SELECT sur `dossiers` depuis le contexte d'un collaborateur ne retourne que les dossiers des cabinets qui lui sont assignés
  3. La table `dossiers` contient un champ `type` et les champs AGO-spécifiques n'empêchent pas l'insertion d'un dossier de type différent
  4. La table `org_statuses` existe avec statuts pré-chargés (7 normaux + terminaux) à la création d'une organisation
  5. Tenter de supprimer un statut référencé par un dossier retourne une erreur de contrainte DB (ON DELETE RESTRICT)
**Plans**: TBD

### Phase 2: Authentification & RBAC
**Goal**: Un expert-comptable peut créer son organisation, configurer ses credentials Pennylane et inviter son équipe — chaque utilisateur accède uniquement aux données auxquelles son rôle lui donne droit
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, RBAC-01, RBAC-02, RBAC-03
**Success Criteria** (what must be TRUE):
  1. Un utilisateur peut s'inscrire et se connecter uniquement via magic link (e-mail, pas de mot de passe)
  2. Après sa première connexion, l'expert-comptable complète le flow d'onboarding (nom du groupe → credentials Pennylane → filtres → sync test) en une seule session
  3. Tout nouvel utilisateur (inscription ou invitation) est bloqué sur la page de complétion de profil (prénom, nom, photo) avant d'accéder au dashboard
  4. L'expert-comptable peut inviter un collaborateur ou un autre expert-comptable par e-mail — l'invité reçoit un magic link et atterrit dans le bon groupe après complétion de son profil
  5. Un collaborateur connecté ne peut accéder qu'aux dossiers de ses cabinets assignés (transparentement, sans configuration côté UI)
**Plans**: TBD

### Phase 3: Dashboard — Table, Filtres & KPI
**Goal**: Un expert-comptable ou collaborateur ouvre le dashboard et voit instantanément l'état de sa mission juridique — liste filtrée, KPI réactifs, deadlines colorées, sidebar et bouton de sync
**Depends on**: Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-06, DASH-07, DASH-08
**Success Criteria** (what must be TRUE):
  1. La table affiche tous les dossiers avec les colonnes AGO complètes, pagination server-side, et colonnes triables
  2. Les filtres (cabinet, statut, plage de dates) persistent dans l'URL — rechargement ou partage de lien restaure exactement la vue
  3. La ligne KPI (total, Non commencé, En cours, Terminés, En retard) se met à jour en réponse aux filtres actifs
  4. Les dates d'échéance affichent un badge rouge/orange/vert selon l'urgence, et les lignes critiques sont visuellement mises en évidence
  5. La sidebar gauche est collapsible avec transition Framer Motion — logo, navigation, sélecteur de groupe, menu utilisateur en bas
**Plans**: TBD

### Phase 4: Dashboard — Side Panel & Fil d'Activité
**Goal**: Un collaborateur clique sur un dossier et peut modifier son statut et ajouter un commentaire sans quitter la table — tout changement est tracé chronologiquement avec auteur et horodatage
**Depends on**: Phase 3
**Requirements**: DASH-05
**Success Criteria** (what must be TRUE):
  1. Cliquer sur une ligne ouvre un side panel coulissant depuis la droite (Framer Motion AnimatePresence) sans navigation de page
  2. Le statut du dossier est modifiable via dropdown depuis le side panel — le badge dans la table se met à jour immédiatement (optimistic UI)
  3. Le fil d'activité affiche chronologiquement les commentaires manuels (auteur, date, texte) et les logs automatiques de changements de statut
  4. Ajouter un commentaire manuel crée une entrée dans le fil avec prénom, nom et timestamp de l'auteur
**Plans**: TBD

### Phase 5: Synchronisation Pennylane Manuelle
**Goal**: Un expert-comptable peut déclencher une synchronisation depuis Pennylane Redshift et voir en temps réel combien de dossiers ont été créés ou mis à jour — les filtres d'exclusion sont configurables par organisation
**Depends on**: Phase 2
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-05, SYNC-06, SYNC-07
**Success Criteria** (what must be TRUE):
  1. Les credentials Redshift sont stockés chiffrés dans Supabase Vault — ils ne sont jamais exposés au client
  2. Le bouton "Tester la connexion" dans les Paramètres valide les credentials en direct et affiche un message de succès ou d'erreur explicite
  3. Déclencher une sync manuelle affiche un état de chargement, puis un résumé (X dossiers créés, Y mis à jour) ou une erreur en français
  4. La sync ne modifie jamais le statut des dossiers existants — elle crée uniquement de nouveaux enregistrements
  5. Lorsque la limite de dossiers du plan est atteinte, la sync s'arrête et l'expert-comptable reçoit un e-mail + voit un bandeau d'upgrade dans le dashboard
**Plans**: TBD

### Phase 6: Gestion Cabinet & Paramètres
**Goal**: Un expert-comptable peut gérer son équipe (invitations, rôles, cabinets assignés, révocations) et configurer tous les paramètres de l'organisation depuis une interface dédiée
**Depends on**: Phase 2
**Requirements**: TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05, SETT-01, SETT-02, SETT-03, SETT-04, SETT-05
**Success Criteria** (what must be TRUE):
  1. La page Gestion Cabinet liste tous les membres avec prénom, nom, rôle, cabinets assignés et statut (actif / invitation en attente)
  2. L'expert-comptable peut créer un cabinet, inviter un membre (e-mail + rôle + cabinets), modifier les cabinets assignés d'un collaborateur, et révoquer un accès
  3. La page Paramètres est accessible depuis la sidebar avec les sections Profil, Pennylane, Filtres de sync, Statuts, Facturation — chaque section visible selon le rôle
  4. Un collaborateur peut modifier son profil (prénom, nom, téléphone, photo) depuis la section Profil
  5. L'expert-comptable peut personnaliser les statuts (renommer, réordonner par glisser-déposer, ajouter, supprimer avec blocage si statut en cours d'utilisation)
**Plans**: TBD

### Phase 7: Abonnements Stripe
**Goal**: Un expert-comptable peut souscrire, consulter et modifier son abonnement — les fonctionnalités sont gatées par plan avec messages explicatifs, et les changements d'abonnement Stripe sont reflétés immédiatement
**Depends on**: Phase 5
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05
**Success Criteria** (what must be TRUE):
  1. La page Facturation affiche le plan actuel, un compteur de dossiers actifs avec barre de progression, la prochaine date de facturation, et un bouton vers le Stripe Customer Portal
  2. Les 4 plans (Starter, Pro, Cabinet, Enterprise) sont disponibles avec les bonnes limites de dossiers et prix en euros
  3. Un changement d'abonnement dans Stripe (upgrade, downgrade, annulation) est reflété dans le dashboard en temps réel via webhook idempotent
  4. La sync manuelle est désactivée avec tooltip "Disponible à partir du plan Pro" sur Starter — l'export CSV est désactivé avec tooltip "Disponible à partir du plan Cabinet" sur les plans inférieurs
  5. Atteindre la limite de dossiers affiche un bandeau dans le dashboard et déclenche un e-mail à l'expert-comptable
**Plans**: TBD

### Phase 8: Synchronisation Automatique — pg_cron
**Goal**: Les organisations sur plan Pro et supérieur reçoivent une synchronisation Pennylane automatique chaque lundi matin sans aucune action manuelle — l'architecture queue-based prévient les surcharges Redshift
**Depends on**: Phase 7
**Requirements**: SYNC-04
**Success Criteria** (what must be TRUE):
  1. Un pg_cron job s'exécute chaque lundi à 6h UTC et insère dans `sync_queue` uniquement les organisations éligibles par plan (Pro, Cabinet, Enterprise)
  2. Les syncs s'exécutent en batches staggerés — pas de connexions Redshift simultanées pour toutes les organisations
  3. Un échec de sync automatique déclenche un e-mail de notification à l'expert-comptable concerné avec le message d'erreur
**Plans**: TBD

### Phase 9: Landing Page
**Goal**: Un visiteur arrivant sur cabinetpilot.io comprend immédiatement la proposition de valeur, voit les plans tarifaires et peut démarrer une inscription ou demander une démo
**Depends on**: Phase 7
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, LAND-06
**Success Criteria** (what must be TRUE):
  1. Le hero affiche titre (Cal Sans), sous-titre (DM Sans), deux CTA (inscription / démo), gradient indigo et mockup du dashboard — les animations Framer Motion se déclenchent à l'entrée
  2. Les sections Fonctionnalités, Pricing et FAQ sont visibles avec animations au scroll (Framer Motion) et layout responsive mobile
  3. La section Pricing affiche les 4 plans avec limites, prix en euros, comparatif fonctionnalités et plan Pro visuellement mis en avant
  4. La section FAQ répond aux 6-8 questions clés (sync Pennylane, sécurité, invitation, changement de plan, dépassement de limite)
  5. Le footer contient les liens CGU, Politique de confidentialité et Contact — tout en français
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fondation — Schéma & RLS | 0/TBD | Not started | - |
| 2. Authentification & RBAC | 0/TBD | Not started | - |
| 3. Dashboard — Table, Filtres & KPI | 0/TBD | Not started | - |
| 4. Dashboard — Side Panel & Fil d'Activité | 0/TBD | Not started | - |
| 5. Synchronisation Pennylane Manuelle | 0/TBD | Not started | - |
| 6. Gestion Cabinet & Paramètres | 0/TBD | Not started | - |
| 7. Abonnements Stripe | 0/TBD | Not started | - |
| 8. Synchronisation Automatique — pg_cron | 0/TBD | Not started | - |
| 9. Landing Page | 0/TBD | Not started | - |
