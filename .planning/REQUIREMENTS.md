# Requirements: CabinetPilot

**Defined:** 2026-03-16
**Core Value:** Un cabinet comptable ouvre CabinetPilot et sait instantanément, pour chacun de ses clients, où en est la mission juridique — qui la gère, quel est son statut, et si une deadline approche.

---

## v1 Requirements

### Foundation — Schema & RLS

- [ ] **FOUND-01**: Le schéma central `dossiers` expose un champ `type` extensible (ex : "AGO", "création de société") — les champs AGO-spécifiques (`date_cloture`, `date_echeance`, `id_pennylane`) ne contraignent pas les autres types de missions
- [ ] **FOUND-02**: Isolation multi-tenant en 3 niveaux via Supabase RLS : organisation (groupe) → cabinets → utilisateurs
- [ ] **FOUND-03**: JWT custom claims (`org_id`, `role`) stockés dans `auth.users.raw_app_meta_data` et lus via `auth.jwt()->'app_metadata'` pour des politiques RLS performantes
- [ ] **FOUND-04**: Statuts entièrement personnalisables par organisation — table `org_statuses` avec ordre, labels, type (`normal` ou `terminal`). Statuts pré-chargés à la création du groupe : Non commencé → Rédaction PV → Envoyé au client → PV Signé → PV / Comptes déposés → Attente récépissé → Terminé + 6 statuts terminaux par défaut
- [ ] **FOUND-05**: Suppression d'un statut en cours d'utilisation bloquée au niveau DB (`ON DELETE RESTRICT`) avec message d'erreur clair dans l'UI

### Authentification & Onboarding

- [ ] **AUTH-01**: L'utilisateur peut s'inscrire et se connecter uniquement par magic link (e-mail → lien de connexion via Resend) — aucun mot de passe, aucun OAuth
- [ ] **AUTH-02**: À la première connexion, l'expert-comptable crée son groupe (organisation) — le flow d'onboarding enchaîne : nom du groupe → credentials Pennylane Redshift → configuration des filtres de sync → premier sync manuel
- [ ] **AUTH-03**: Tout nouvel utilisateur (inscription ou invitation) doit compléter son profil avant d'accéder au dashboard : prénom, nom, téléphone, photo de profil (upload via Supabase Storage) — étape obligatoire, non passable
- [ ] **AUTH-04**: L'expert-comptable peut inviter un collaborateur ou un autre expert-comptable par e-mail (Resend) en spécifiant le rôle et les cabinets assignés — l'invité reçoit un magic link et atterrit dans le groupe après la complétion de son profil
- [ ] **AUTH-05**: Les données de profil (prénom, nom) sont affichées partout : fil d'activité, page Gestion Cabinet, e-mails d'invitation, menu utilisateur dans la sidebar — aucun utilisateur anonyme

### Dashboard Principal

- [ ] **DASH-01**: Table de données (TanStack Table, pagination server-side) avec les colonnes AGO complètes : Dossier, Cabinet, Forme Juridique, SIREN, Date Clôture, Date Échéance, Statut, Régime Fiscal, Statut Exercice PL, Commentaires — colonnes triables
- [ ] **DASH-02**: Barre de filtres persistante (URL params) : sélecteur de cabinets (multi-select), filtre de statut, sélecteur de plage de dates d'échéance — les filtres survivent au rechargement de page et permettent le partage de vue
- [ ] **DASH-03**: Ligne KPI au-dessus de la table : total dossiers, Non commencé, En cours, Terminés, En retard — réactive aux filtres actifs (cabinet ou autre)
- [ ] **DASH-04**: Badge visuel sur la Date Échéance : rouge si dépassée ou < 30 jours, orange si 30–60 jours, vert si > 60 jours. Mise en évidence subtile de la ligne pour les dossiers critiques
- [ ] **DASH-05**: Clic sur une ligne → side panel coulissant depuis la droite (Framer Motion) avec : détails complets du dossier, statut modifiable via dropdown, fil d'activité chronologique (commentaires manuels + logs automatiques de changements de statut avec auteur et timestamp) — aucune navigation de page
- [ ] **DASH-06**: Bouton d'export CSV dans la barre de filtres — exporte les dossiers filtrés uniquement, disponible sur les plans Cabinet et supérieur (désactivé avec tooltip "Disponible à partir du plan Cabinet" sur les plans inférieurs)
- [ ] **DASH-07**: Sidebar gauche collapsible (style Vercel, transition Framer Motion) avec : logo, navigation par sections, sélecteur de groupe (pour les expert-comptables appartenant à plusieurs groupes), menu utilisateur en bas
- [ ] **DASH-08**: Bouton de sync manuelle dans le dashboard — disponible sur les plans Pro et Enterprise uniquement (désactivé avec tooltip "Disponible à partir du plan Pro" sur Starter). Feedback temps réel : état de chargement → succès (X nouveaux dossiers créés, Y mis à jour) → erreur avec message

### Synchronisation Pennylane

- [ ] **SYNC-01**: Credentials Redshift stockés par organisation dans Supabase Vault (chiffrés) — saisis lors de l'onboarding, modifiables dans les Paramètres
- [ ] **SYNC-02**: Edge Function `sync-pennylane` : connexion à Redshift via `npm:pg`, exécution de la requête SQL AGO avec filtres dynamiques injectés depuis `organization_settings`, upsert dans `dossiers` avec déduplication par `task_uid` — la sync ne modifie jamais le statut des dossiers existants
- [ ] **SYNC-03**: Filtres de sync configurables par organisation : exclusion LMNP, exclusion BNC, exclusion EI (codes 1000/1), exclusion dossiers "situation", liste noire de codes juridiques personnalisés, seuil de date de début d'exercice fiscal
- [ ] **SYNC-04**: Sync automatique hebdomadaire (pg_cron, chaque lundi 6h UTC) pour toutes les organisations, tous plans confondus — architecture queue-based pour éviter les connection storms sur Redshift
- [ ] **SYNC-05**: Table `sync_logs` : historique par organisation (timestamp, dossiers créés, dossiers mis à jour, erreurs) — affiché dans les Paramètres (expert-comptable uniquement)
- [ ] **SYNC-06**: Bouton "Tester la connexion" dans les Paramètres — valide les credentials Redshift en direct avant sauvegarde
- [ ] **SYNC-07**: Lorsque la limite de dossiers du plan est atteinte, la sync ne crée pas de nouveaux dossiers — l'expert-comptable reçoit un e-mail de notification et voit un bandeau dans le dashboard invitant à upgrader

### RBAC & Multi-tenant

- [ ] **RBAC-01**: Rôle `expert-comptable` — accès complet à tous les cabinets du groupe, gestion de l'équipe, configuration Pennylane, facturation. Peut inviter des collaborateurs et d'autres expert-comptables
- [ ] **RBAC-02**: Rôle `collaborateur` — accès uniquement aux cabinets qui lui sont assignés, appliqué transparentement au niveau DB via RLS (aucune configuration côté UI nécessaire de son côté)
- [ ] **RBAC-03**: Un expert-comptable peut appartenir à plusieurs groupes — la sidebar affiche un sélecteur de groupe pour switcher entre eux (isolation RLS totale entre groupes)

### Page Gestion Cabinet

- [ ] **TEAM-01**: Liste des membres de l'organisation avec : prénom, nom, rôle, cabinets assignés, statut (actif / invitation en attente)
- [ ] **TEAM-02**: Invitation de nouveaux membres par e-mail avec choix du rôle et des cabinets assignés — e-mail envoyé via Resend avec magic link
- [ ] **TEAM-03**: Modification des cabinets assignés à un collaborateur par l'expert-comptable
- [ ] **TEAM-04**: Révocation d'accès d'un membre
- [ ] **TEAM-05**: Création et renommage de cabinets par l'expert-comptable — les noms de cabinets apparaissent comme options dans la barre de filtres du dashboard

### Paramètres

- [ ] **SETT-01**: Page Paramètres accessible depuis la sidebar — sections : Profil utilisateur, Pennylane (expert-comptable uniquement), Filtres de sync (expert-comptable uniquement), Statuts (expert-comptable uniquement), Facturation (expert-comptable uniquement)
- [ ] **SETT-02**: Section Profil — modification du prénom, nom, téléphone, photo de profil (accessible à tous les rôles)
- [ ] **SETT-03**: Section Pennylane — saisie/modification des credentials Redshift avec bouton "Tester la connexion" et affichage du statut du dernier sync (date, dossiers créés, dossiers mis à jour, erreurs)
- [ ] **SETT-04**: Section Filtres de sync — configuration des filtres d'exclusion par organisation
- [ ] **SETT-05**: Section Statuts — personnalisation des statuts de l'org : renommer, réordonner (glisser-déposer), ajouter, supprimer (avec blocage si statut en cours d'utilisation). Deux types : `normal` et `terminal`

### Abonnements Stripe

- [ ] **BILL-01**: 4 plans basés sur le nombre de dossiers actifs — Starter ≤400 (49 €/mois), Pro ≤1 200 (99 €/mois), Cabinet ≤3 500 (179 €/mois), Enterprise illimité (tarif sur devis) — collaborateurs et cabinets illimités sur tous les plans
- [ ] **BILL-02**: Page de facturation (expert-comptable uniquement) : plan actuel, compteur de dossiers actifs avec barre de progression, prochaine date de facturation, bouton upgrade/downgrade via Stripe Customer Portal
- [ ] **BILL-03**: Webhooks Stripe idempotents pour `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` — table de déduplication des événements. Statut du plan synchronisé en temps réel dans la table `organizations`
- [ ] **BILL-04**: Gating des fonctionnalités par plan avec UX claire : sync manuelle (Pro+), export CSV (Cabinet+) — désactivés avec tooltip explicatif sur les plans inférieurs
- [ ] **BILL-05**: Bandeau de dépassement de limite affiché dans le dashboard + e-mail de notification à l'expert-comptable lorsque la limite de dossiers est atteinte

### Landing Page

- [ ] **LAND-01**: Section Hero — titre (Cal Sans), sous-titre (DM Sans), CTA principal "Commencer gratuitement", CTA secondaire "Voir une démo", gradient indigo doux (Arcade-style), mockup/screenshot du dashboard
- [ ] **LAND-02**: Barre de preuve sociale / confiance entre Hero et Features — "Utilisé par X cabinets" + logos ou témoignages
- [ ] **LAND-03**: Section Fonctionnalités — 3 à 4 features clés en layout alterné texte + visuel, espacement aéré (MarcLou-style), animations Framer Motion au scroll
- [ ] **LAND-04**: Section Pricing — 4 plans avec limites de dossiers, prix, comparatif des fonctionnalités, CTA par plan — plan Pro visuellement mis en avant ("Plus populaire")
- [ ] **LAND-05**: Section FAQ — 6 à 8 questions couvrant : qu'est-ce que CabinetPilot, comment fonctionne la sync Pennylane, sécurité des données, invitation des utilisateurs, changement de plan, que se passe-t-il en cas de dépassement de limite
- [ ] **LAND-06**: Footer — liens CGU, Politique de confidentialité, Contact — tout en français

---

## v2 Requirements

### Missions supplémentaires

- **MISS-01**: Création de société — dossier de type "création" avec champs spécifiques
- **MISS-02**: Modifications statutaires — dossier de type "modification"
- **MISS-03**: Dissolution / liquidation — dossier de type "dissolution"
- **MISS-04**: Types de missions personnalisés définis par le cabinet

### Notifications & Alertes

- **NOTIF-01**: Rappels e-mail automatiques pour les dossiers dont la date d'échéance approche (configurable : 30j / 60j avant)
- **NOTIF-02**: Digest hebdomadaire par e-mail pour l'expert-comptable (dossiers en retard, dossiers sans activité récente)

### Fonctionnalités avancées

- **ADV-01**: Historique complet des syncs (plus de 30 jours) — plans Cabinet+
- **ADV-02**: Tableau de bord analytique (taux de complétion par cabinet, temps moyen par statut)
- **ADV-03**: Mentions (@utilisateur) dans le fil d'activité

---

## Out of Scope

| Fonctionnalité | Raison |
|----------------|--------|
| Authentification par mot de passe | Magic link uniquement — décision produit v1 |
| OAuth (Google, Microsoft) | Non nécessaire pour le marché cible en v1 |
| Application mobile native | Web-first, mobile plus tard |
| Chat temps réel entre membres | Le fil d'activité par dossier couvre le besoin |
| Pièces jointes dans les commentaires | Complexité stockage/sécurité non justifiée en v1 |
| Mentions / réactions dans les commentaires | V2+ |
| Internationalisation (i18n) | Marché exclusivement français |
| Intégrations autres qu'Pennylane | V2+ |
| Client portal (accès direct client final) | Hors scope — outil interne cabinet |
| Kanban / vue alternative à la table | La table avec side panel couvre le workflow |
| Vue Gantt ou timeline | Hors scope v1 |
| Drafting IA de PV | Complexité IA non justifiée en v1 |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 — Fondation : Schéma & RLS | Pending |
| FOUND-02 | Phase 1 — Fondation : Schéma & RLS | Pending |
| FOUND-03 | Phase 1 — Fondation : Schéma & RLS | Pending |
| FOUND-04 | Phase 1 — Fondation : Schéma & RLS | Pending |
| FOUND-05 | Phase 1 — Fondation : Schéma & RLS | Pending |
| AUTH-01 | Phase 2 — Authentification & RBAC | Pending |
| AUTH-02 | Phase 2 — Authentification & RBAC | Pending |
| AUTH-03 | Phase 2 — Authentification & RBAC | Pending |
| AUTH-04 | Phase 2 — Authentification & RBAC | Pending |
| AUTH-05 | Phase 2 — Authentification & RBAC | Pending |
| RBAC-01 | Phase 2 — Authentification & RBAC | Pending |
| RBAC-02 | Phase 2 — Authentification & RBAC | Pending |
| RBAC-03 | Phase 2 — Authentification & RBAC | Pending |
| DASH-01 | Phase 3 — Dashboard : Table, Filtres & KPI | Pending |
| DASH-02 | Phase 3 — Dashboard : Table, Filtres & KPI | Pending |
| DASH-03 | Phase 3 — Dashboard : Table, Filtres & KPI | Pending |
| DASH-04 | Phase 3 — Dashboard : Table, Filtres & KPI | Pending |
| DASH-06 | Phase 3 — Dashboard : Table, Filtres & KPI | Pending |
| DASH-07 | Phase 3 — Dashboard : Table, Filtres & KPI | Pending |
| DASH-08 | Phase 3 — Dashboard : Table, Filtres & KPI | Pending |
| DASH-05 | Phase 4 — Dashboard : Side Panel & Fil d'Activité | Pending |
| SYNC-01 | Phase 5 — Synchronisation Pennylane Manuelle | Pending |
| SYNC-02 | Phase 5 — Synchronisation Pennylane Manuelle | Pending |
| SYNC-03 | Phase 5 — Synchronisation Pennylane Manuelle | Pending |
| SYNC-05 | Phase 5 — Synchronisation Pennylane Manuelle | Pending |
| SYNC-06 | Phase 5 — Synchronisation Pennylane Manuelle | Pending |
| SYNC-07 | Phase 5 — Synchronisation Pennylane Manuelle | Pending |
| TEAM-01 | Phase 6 — Gestion Cabinet & Paramètres | Pending |
| TEAM-02 | Phase 6 — Gestion Cabinet & Paramètres | Pending |
| TEAM-03 | Phase 6 — Gestion Cabinet & Paramètres | Pending |
| TEAM-04 | Phase 6 — Gestion Cabinet & Paramètres | Pending |
| TEAM-05 | Phase 6 — Gestion Cabinet & Paramètres | Pending |
| SETT-01 | Phase 6 — Gestion Cabinet & Paramètres | Pending |
| SETT-02 | Phase 6 — Gestion Cabinet & Paramètres | Pending |
| SETT-03 | Phase 6 — Gestion Cabinet & Paramètres | Pending |
| SETT-04 | Phase 6 — Gestion Cabinet & Paramètres | Pending |
| SETT-05 | Phase 6 — Gestion Cabinet & Paramètres | Pending |
| BILL-01 | Phase 7 — Abonnements Stripe | Pending |
| BILL-02 | Phase 7 — Abonnements Stripe | Pending |
| BILL-03 | Phase 7 — Abonnements Stripe | Pending |
| BILL-04 | Phase 7 — Abonnements Stripe | Pending |
| BILL-05 | Phase 7 — Abonnements Stripe | Pending |
| SYNC-04 | Phase 8 — Synchronisation Automatique : pg_cron | Pending |
| LAND-01 | Phase 9 — Landing Page | Pending |
| LAND-02 | Phase 9 — Landing Page | Pending |
| LAND-03 | Phase 9 — Landing Page | Pending |
| LAND-04 | Phase 9 — Landing Page | Pending |
| LAND-05 | Phase 9 — Landing Page | Pending |
| LAND-06 | Phase 9 — Landing Page | Pending |

**Coverage:**
- v1 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after roadmap creation*
