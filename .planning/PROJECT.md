# CabinetPilot

## What This Is

CabinetPilot (`legal.cabinetpilot.io`) est une plateforme SaaS de suivi de missions juridiques pour les cabinets d'expertise comptable français. Elle centralise le suivi des dossiers clients, en commençant par les AGO (Assemblées Générales Ordinaires), avec une synchronisation automatique depuis Pennylane et une architecture multi-tenant construite sur Supabase.

Le produit remplace les workflows N8N + Airtable utilisés aujourd'hui par les cabinets pour suivre leurs obligations légales annuelles. La cible exclusive est le marché français — toute l'UI, les e-mails et les messages d'erreur sont en français.

## Core Value

Un cabinet comptable ouvre CabinetPilot et sait instantanément, pour chacun de ses clients, où en est la mission juridique — qui la gère, quel est son statut, et si une deadline approche.

## Requirements

### Validated

(Aucune — à valider à la livraison)

### Active

#### Landing page
- [ ] Page d'accueil avec hero, sections fonctionnalités, pricing, FAQ et CTA
- [ ] Design Framer-style : fond blanc, gradient indigo dans le hero, mise en page aérée (MarcLou-style)
- [ ] Animations Framer Motion : entrée hero, révélations de sections au scroll
- [ ] Responsive mobile

#### Authentification & Onboarding
- [ ] Inscription / connexion via Supabase Auth (email + mot de passe)
- [ ] Création d'organisation lors de la première connexion
- [ ] Flow d'onboarding : saisie des credentials Pennylane Redshift → configuration des filtres → premier sync manuel
- [ ] Invitation de membres par e-mail (Resend) avec rôle et cabinets assignés

#### Dashboard principal
- [ ] Sidebar gauche collapsible (style Vercel, transition Framer Motion) avec logo, navigation par sections, sélecteur de cabinet, menu utilisateur en bas
- [ ] Table de données (TanStack Table) avec toutes les colonnes AGO : Dossier, Cabinet, SIREN, Forme Juridique, Date Clôture, Date Échéance, Statut, Régime Fiscal, Statut Exercice PL, Commentaires
- [ ] Filtres : par cabinet, par statut, par date d'échéance
- [ ] Side panel coulissant depuis la droite au clic sur une ligne (Framer Motion)
- [ ] Changement de statut depuis le side panel
- [ ] Fil d'activité chronologique dans le side panel : commentaires manuels (auteur, date, texte) + logs automatiques des changements de statut
- [ ] Bouton de sync manuel avec état de retour en temps réel (chargement → succès / erreur)

#### Synchronisation Pennylane
- [ ] Credentials Redshift par organisation stockés chiffrés via Supabase Vault
- [ ] Edge Function `sync-pennylane` : connexion Redshift, exécution de la requête SQL avec filtres dynamiques par org, upsert dans `dossiers` (déduplication par `task_uid`)
- [ ] Filtres configurables par organisation : exclure LMNP, BNC, EI (codes 1000/1), dossiers "situation", codes juridiques personnalisés, seuil de date de début d'exercice
- [ ] pg_cron : déclenchement automatique chaque lundi 6h (plans Pro, Cabinet, Enterprise uniquement)
- [ ] Table `sync_logs` : historique des syncs (timestamp, tâches créées/mises à jour, erreurs)
- [ ] La sync ne modifie jamais le statut des dossiers existants — elle crée uniquement de nouveaux enregistrements

#### Schéma de données extensible
- [ ] Entité centrale `dossiers` avec champ `type` (ex : "AGO", "création de société", "dissolution"...)
- [ ] Champs AGO-spécifiques (`date_cloture`, `date_echeance`, `id_pennylane`) ne contraignent pas les autres types
- [ ] Statuts entièrement personnalisables par organisation (renommer, réordonner, ajouter, supprimer)
- [ ] Statuts par défaut pré-chargés à la création de l'organisation : Non commencé → Rédaction PV → Envoyé au client → PV Signé → PV / Comptes déposés → Attente récépissé → Terminé
- [ ] 6 statuts de sortie terminaux configurables (ex : Fait par avocat, Société en liquidation...)

#### RBAC & Multi-tenant
- [ ] Architecture multi-tenant via Supabase RLS : Organisation → Cabinets → Collaborateurs
- [ ] Rôle `expert-comptable` : accès complet, gestion de l'équipe, configuration Pennylane, facturation
- [ ] Rôle `collaborateur` : accès uniquement aux cabinets assignés
- [ ] Un expert-comptable peut inviter d'autres expert-comptables ou des collaborateurs
- [ ] Isolation stricte des données entre organisations

#### Gestion Cabinet (page dédiée)
- [ ] Liste des membres de l'organisation avec leur rôle
- [ ] Invitation de nouveaux membres (e-mail, rôle, cabinets assignés)
- [ ] Modification des cabinets assignés à un collaborateur
- [ ] Révocation d'accès

#### Abonnements Stripe
- [ ] 4 plans basés sur le nombre de dossiers actifs :
  - Starter : ≤ 400 dossiers — 49 €/mois — sync manuelle uniquement
  - Pro : ≤ 1 200 dossiers — 99 €/mois — sync auto hebdomadaire
  - Cabinet : ≤ 3 500 dossiers — 179 €/mois — sync auto + historique complet + export CSV
  - Enterprise : illimité — tarif sur devis — onboarding dédié + SLA
- [ ] Collaborateurs et cabinets illimités sur tous les plans
- [ ] Page de facturation (plan actuel, usage, upgrade/downgrade)
- [ ] Webhooks Stripe pour gérer les changements d'abonnement en temps réel

### Out of Scope

| Fonctionnalité | Raison |
|----------------|--------|
| Internationalisation (i18n) | Marché exclusivement français — pas de besoin v1 |
| Application mobile native | Web-first, mobile plus tard |
| Mentions / réactions dans les commentaires | Complexité non justifiée en v1 — log simple suffit |
| Pièces jointes aux commentaires | Scope trop large pour v1 |
| Autres missions juridiques (création, dissolution...) | Schema prévu extensible, mais implémentation v2+ |
| Chat temps réel | Hors scope — le fil d'activité couvre le besoin |
| Intégrations autres qu'Pennylane | V2+ |

## Context

**Données de production :** Le premier client (Actuariel, groupe de 3 cabinets) a 920 dossiers AGO actifs. Distribution type : SARL/SARL unipersonnelle (303), SAS/SASU (270), SCI (220), autres (127).

**Architecture remplacée :** N8N + Airtable. La logique de sync existante (requête SQL complète) est documentée et validée — elle sera portée telle quelle dans l'Edge Function avec paramètres dynamiques.

**Source de données :** Pennylane Redshift datashare par organisation (AWS Redshift, eu-west-1). Chaque org a ses propres credentials.

**Approche de développement :** Étape par étape, page par page. Chaque composant UI doit être validé par le product owner avant implémentation. Claude demande systématiquement quel composant utiliser et depuis quelle bibliothèque avant de construire.

## Constraints

- **Tech stack** : React, Node.js, Supabase (Auth, RLS, Edge Functions, Vault, pg_cron), Framer Motion, Stripe, Resend — pas de dérogation sans discussion
- **Design system** : shadcn/ui comme source unique de vérité. Radix UI pour ce que shadcn ne couvre pas. Aucun mélange d'autres bibliothèques de composants
- **Typographie** : Cal Sans (titres) + DM Sans (corps/UI) — chargées via Google Fonts ou auto-hébergées
- **Couleurs** : Indigo (Tailwind indigo-600 pour les CTA), fond Blanc, Zinc pour les neutres. Dark mode supporté via theming shadcn
- **Border radius** : `lg` partout — cohérence totale
- **Animations** : Framer Motion uniquement — sidebar collapse, side panel slide-in, transitions de page, interactions table, changements de badge de statut
- **Langue** : Français — toute l'UI, les messages d'erreur, les toasts, les e-mails
- **Validation** : Le product owner valide chaque page / composant avant que la suivante soit construite
- **Redshift** : AWS eu-west-1 — latence à anticiper dans le design de l'UX de sync

## Key Decisions

| Décision | Raison | Résultat |
|----------|--------|----------|
| Entité centrale `dossiers` avec `type` extensible | AGO est le premier type de mission, d'autres suivront — le schema doit supporter l'extension sans migration destructive | — En attente |
| Supabase Vault pour les credentials Pennylane | Sécurité des données sensibles (credentials Redshift par org) | — En attente |
| Statuts personnalisables par organisation | Chaque cabinet a son propre process interne — rigidité = rejet produit | — En attente |
| Pricing par dossiers actifs (pas par siège) | Les cabinets ont des équipes variables, mais le volume de dossiers reflète la valeur produit réelle | — En attente |
| shadcn/ui comme seule bibliothèque de composants | Cohérence design totale, pas de dette de mixing — validé avec le product owner | — En attente |

---
*Last updated: 2026-03-15 after initialization*
