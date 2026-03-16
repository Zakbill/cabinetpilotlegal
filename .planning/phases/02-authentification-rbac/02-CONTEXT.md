# Phase 2: Authentification & RBAC - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Première phase frontend : mise en place de l'application Next.js + auth Supabase magic link + flow d'onboarding expert-comptable (5 étapes animées) + gate profil obligatoire via middleware + flow d'invitation par e-mail. Aucune fonctionnalité dashboard, aucune synchronisation Pennylane réelle (uniquement le test de connexion dans le wizard).

</domain>

<decisions>
## Implementation Decisions

### Package manager & runtime

- **Bun** — package manager ET runtime pour tout le projet
- Initialisation : `bun create next-app`, commandes : `bun install`, `bun run dev`, `bun run build`
- Bun remplace Node.js/npm sur toutes les phases suivantes — décision transversale

### Setup Next.js

- **App Router** (pas Pages Router) — structure moderne, compatible Server Components
- Dossier `src/` activé — tout le code applicatif sous `src/`
- Structure cible :
  ```
  src/
    app/          # routes App Router
    components/   # composants partagés
    lib/          # utilitaires, clients Supabase
    hooks/        # hooks React custom
  middleware.ts   # à la racine (next à package.json)
  ```

### Clients Supabase

- **Deux clients distincts** :
  - `createBrowserClient` (depuis `@supabase/ssr`) → pour les Client Components
  - `createServerClient` (depuis `@supabase/ssr`) → pour les Server Components, Server Actions, middleware
- Aucun usage de `createClient` de `@supabase/supabase-js` directement — toujours passer par `@supabase/ssr`
- Variables d'env : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Middleware auth

- `middleware.ts` à la racine du projet (pas dans `src/`)
- Vérifie la session Supabase sur chaque requête vers une route protégée
- Rafraîchit les tokens automatiquement (pattern Supabase SSR)
- Redirige vers `/login` si pas de session, vers `/onboarding` si `profiles.is_complete = false`
- Routes publiques : `/login`, `/auth/callback`, `/`

### Page de login

- **Split-screen** (style Arcade login) :
  - Côté gauche : logo CabinetPilot, champ email, bouton "Recevoir mon lien de connexion", texte "Pas de mot de passe — connexion sécurisée par lien e-mail"
  - Côté droit : gradient indigo doux (Tailwind `indigo-500/20` → `indigo-700/40`), proposition de valeur texte (2-3 lignes, DM Sans, blanc/indigo)
- Après envoi du magic link → écran de confirmation dans la même page : "Vérifiez votre boîte mail — Un lien de connexion a été envoyé à [email]. Le lien expire dans 1 heure."
- Gestion d'erreurs en français : e-mail invalide, rate limit ("Trop de tentatives, réessayez dans quelques minutes"), lien expiré
- Callback route : `src/app/auth/callback/route.ts` — échange le code PKCE, redirige vers `/onboarding` ou `/dashboard` selon `is_complete`

### Onboarding wizard

- **Page unique** `/onboarding` avec étapes animées — pas de pages séparées
- **Framer Motion AnimatePresence** pour les transitions entre étapes (slide left/right)
- **Step indicator** en haut de la page : 5 cercles numérotés ou barre de progression — étape courante surlignée en indigo
- **5 étapes dans l'ordre** :
  1. **Profil** — Prénom, Nom, Téléphone, Photo de profil (upload Supabase Storage)
  2. **Groupe** — Nom de l'organisation (ex : "Cabinet Dupont & Associés")
  3. **Pennylane** — Credentials Redshift (host, port, dbname, user, password) + bouton "Tester la connexion"
  4. **Filtres de sync** — Exclusions : LMNP, BNC, EI, dossiers "situation", codes juridiques custom, seuil date début exercice
  5. **Première sync** — Bouton "Synchroniser maintenant" avec feedback temps réel (chargement → résumé ou erreur)
- **Progress sauvegardé en DB à chaque étape** — si l'utilisateur quitte et revient, il reprend à l'étape où il s'est arrêté
- Champ `current_onboarding_step` (integer 1-5) dans `profiles` ou `organizations` — à décider par le planner
- L'étape 3 (Pennylane) peut être passée ("Configurer plus tard") — le bouton skip est visible mais discret
- L'étape 5 (sync) peut aussi être passée — les étapes 1 et 2 sont obligatoires
- À la complétion : `profiles.is_complete = true`, JWT claims mis à jour (`org_id`, `role`), redirect vers `/dashboard`

### Gate profil obligatoire (AUTH-03)

- **Middleware redirect** — `profiles.is_complete = false` → redirect vers `/onboarding` quelle que soit la route tentée
- **Pas de modal** — page complète, aucune route accessible tant que le profil n'est pas complet
- Champ booléen `is_complete` dans la table `profiles` (déjà nullable en Phase 1 — à confirmer par le planner)
- Les invités (nouveaux membres invités) passent par le même flow : magic link → callback → `/onboarding` (étape 1 : profil) → dashboard

### Flow d'invitation

- **Côté expert-comptable** : modal dans la page "Gestion Cabinet" (Phase 6 pour la page complète, mais l'action d'invitation est déclenchée dès Phase 2)
  - Champs : E-mail, Rôle (expert-comptable / collaborateur), Cabinets assignés (multi-select, optionnel pour expert-comptable)
  - Bouton "Envoyer l'invitation"
- **E-mail envoyé via Resend** : e-mail branded CabinetPilot en français, lien magic link Supabase avec métadonnées (`invited_by`, `organization_id`, `role`, `cabinet_ids`)
- **Côté invité** : clic sur le lien → callback route → détecte les métadonnées d'invitation → pré-assigne l'org, le rôle, et les cabinets → redirige vers `/onboarding` (étape profil uniquement pour les invités — pas de setup organisation)
- **Table `invitations`** (ou usage de `auth.users` metadata) pour tracker les invitations en attente — le planner décidera de l'approche

### Claude's Discretion

- Nommage exact des routes (`/auth/callback`, `/onboarding`, `/dashboard`)
- Design exact du step indicator (cercles numérotés vs barre horizontale)
- Implémentation du résumé de sync à l'étape 5 (polling, realtime subscription, ou Server-Sent Events)
- Approche technique pour passer les métadonnées d'invitation dans le magic link (state param ou table `invitations`)
- Upload photo de profil : gestion de la compression/resize avant upload

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth & RBAC requirements
- `.planning/REQUIREMENTS.md` §Authentification & Onboarding — AUTH-01 à AUTH-05 : critères d'acceptation complets (magic link, onboarding, profil, invitations, données affichées)
- `.planning/REQUIREMENTS.md` §RBAC & Multi-tenant — RBAC-01 à RBAC-03 : rôles, isolation, multi-groupes
- `.planning/ROADMAP.md` §Phase 2 — Success Criteria : 5 critères vérifiables à satisfaire

### Schéma base de données (Phase 1 — fondation)
- `.planning/phases/01-fondation-sch-ma-rls/01-CONTEXT.md` §Implementation Decisions — Structure des tables (`profiles`, `organizations`, `cabinets`, `user_cabinet_assignments`), JWT custom claims, politiques RLS
- `supabase/migrations/` — migrations existantes à lire pour comprendre l'état exact du schéma avant d'ajouter des colonnes (ex : `is_complete`, `current_onboarding_step`)

### Contraintes techniques
- `.planning/PROJECT.md` §Constraints — Tech stack (Supabase Auth, shadcn/ui, Framer Motion, Resend, Bun), design system (indigo/white/zinc, Cal Sans/DM Sans, border-radius lg)
- `.planning/PROJECT.md` §Key Decisions — Décisions architecturales validées

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- Aucun composant frontend existant — Phase 2 initialise le projet Next.js from scratch
- Migrations Supabase existantes dans `supabase/migrations/` — schéma complet (tables, RLS, helpers) posé en Phase 1

### Established Patterns

- **Supabase RLS** via fonctions helper (`get_my_org_id()`, `get_my_role()`, `get_my_cabinet_ids()`) dans schéma `private` — Phase 2 s'appuie sur ces politiques sans les modifier
- **JWT custom claims** (`org_id`, `role` dans `app_metadata`) — Phase 2 est responsable de les setter lors de l'onboarding et des invitations
- **Migrations SQL versionnées** dans `supabase/migrations/` — tout changement de schéma (ajout colonne `is_complete`, `current_onboarding_step`) suit ce pattern

### Integration Points

- `auth.users` → `profiles` via trigger ou onboarding manuel — la liaison se fait en Phase 2
- JWT claims mis à jour après création d'organisation → RLS activée immédiatement pour la session
- Phase 3 (Dashboard) consomme directement la session Supabase et les JWT claims posés ici

</code_context>

<specifics>
## Specific Ideas

- Login page split-screen : "style Arcade login" — gauche form, droite gradient indigo avec value prop
- Onboarding : style AnimatePresence Framer Motion avec slide left/right entre étapes (pas de fade simple)
- Les étapes 3 (Pennylane) et 5 (sync) sont passables — les étapes 1 (profil) et 2 (groupe) sont obligatoires
- L'invité (collaborateur ou autre expert-comptable) voit uniquement l'étape profil dans l'onboarding — pas le setup organisation

</specifics>

<deferred>
## Deferred Ideas

- Page "Gestion Cabinet" complète (liste membres, modification cabinets assignés, révocation) — Phase 6
- Modal d'invitation dans l'UI "Gestion Cabinet" côté Phase 6 — Phase 2 pose uniquement la logique d'invitation (backend + e-mail)

</deferred>

---

*Phase: 02-authentification-rbac*
*Context gathered: 2026-03-16*
