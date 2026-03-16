# Phase 2: Authentification & RBAC - Research

**Researched:** 2026-03-16
**Domain:** Next.js 14 App Router + Supabase Auth (magic link) + RBAC + Onboarding wizard + Resend
**Confidence:** HIGH (core patterns), MEDIUM (invitation metadata approach)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Package manager & runtime**
- Bun — package manager ET runtime pour tout le projet
- Initialisation : `bun create next-app`, commandes : `bun install`, `bun run dev`, `bun run build`
- Bun remplace Node.js/npm sur toutes les phases suivantes — décision transversale

**Setup Next.js**
- App Router (pas Pages Router) — structure moderne, compatible Server Components
- Dossier `src/` activé — tout le code applicatif sous `src/`
- Structure cible : `src/app/`, `src/components/`, `src/lib/`, `src/hooks/`, `src/styles/`, `middleware.ts` à la racine

**Design tokens — source unique de vérité**
- Fichier obligatoire : `src/lib/design-tokens.ts` — copier `.planning/artifacts/design-tokens.ts` verbatim
- Règle absolue : aucun composant ne hardcode couleur, police, ou spacing directement

**Clients Supabase**
- `createBrowserClient` (depuis `@supabase/ssr`) pour Client Components
- `createServerClient` (depuis `@supabase/ssr`) pour Server Components, Server Actions, middleware
- Jamais `createClient` de `@supabase/supabase-js` directement

**Middleware auth**
- `middleware.ts` à la racine du projet (pas dans `src/`)
- Rafraîchit les tokens automatiquement (pattern Supabase SSR)
- Redirige vers `/login` si pas de session, vers `/onboarding` si `profiles.is_complete = false`
- Routes publiques : `/login`, `/auth/callback`, `/`

**Page de login**
- Split-screen style Arcade login : gauche (formulaire), droite (gradient indigo)
- Après envoi magic link → écran de confirmation dans la même page (pas de navigation)
- Gestion d'erreurs en français

**Onboarding wizard**
- Page unique `/onboarding` avec étapes animées — Framer Motion AnimatePresence, mode="wait"
- 4 étapes : Profil (obligatoire) → Cabinet (obligatoire) → Pennylane (passable) → Sync (passable)
- Progress sauvegardé en DB à chaque étape
- À la complétion : `profiles.is_complete = true`, JWT claims mis à jour, redirect → `/dashboard`

**Gate profil obligatoire (AUTH-03)**
- Middleware redirect — `profiles.is_complete = false` → `/onboarding` quelle que soit la route
- Pas de modal — page complète

**Flow d'invitation**
- Côté expert-comptable : modal de saisie (email, rôle, cabinets)
- E-mail envoyé via Resend avec lien magic link Supabase
- L'invité : callback → profil détecté → étape profil uniquement dans onboarding

### Claude's Discretion

- Nommage exact des routes (`/auth/callback`, `/onboarding`, `/dashboard`)
- Design exact du step indicator (cercles numérotés vs barre horizontale) — défini par UI-SPEC : 4 cercles numérotés
- Implémentation du résumé de sync à l'étape 4 (polling, realtime subscription, ou SSE)
- Approche technique pour passer les métadonnées d'invitation dans le magic link (state param ou table `invitations`)
- Upload photo de profil : gestion de la compression/resize avant upload
- Champ `current_onboarding_step` dans `profiles` ou `organizations`

### Deferred Ideas (OUT OF SCOPE)

- Page "Gestion Cabinet" complète (liste membres, modification cabinets assignés, révocation) — Phase 6
- Modal d'invitation dans l'UI "Gestion Cabinet" côté Phase 6 — Phase 2 pose uniquement la logique (backend + e-mail)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Magic link uniquement — aucun mot de passe, aucun OAuth | `signInWithOtp` avec `emailRedirectTo`, désactiver password dans Supabase Dashboard |
| AUTH-02 | Onboarding 4 étapes enchaînées : profil → cabinet → Pennylane → sync | `current_onboarding_step` en DB, AnimatePresence slide, sauvegarde à chaque étape |
| AUTH-03 | Gate profil obligatoire — `profiles.is_complete = false` bloque toutes les routes | Middleware `updateSession` + redirect logic sur `is_complete` |
| AUTH-04 | Invitation par e-mail avec rôle et cabinets assignés — invité atterrit dans le bon groupe | `auth.admin.inviteUserByEmail` + `user_metadata` + Resend branded email |
| AUTH-05 | Données profil (prénom, nom) affichées partout — aucun utilisateur anonyme | `profiles` table déjà en place Phase 1, profil complété avant accès dashboard |
| RBAC-01 | Rôle `expert-comptable` — accès complet + gestion équipe + config Pennylane | JWT claims `role=expert-comptable` dans `app_metadata`, RLS déjà en place |
| RBAC-02 | Rôle `collaborateur` — accès uniquement aux cabinets assignés via RLS | JWT claims `role=collaborateur`, `user_cabinet_assignments` rempli à l'invitation |
| RBAC-03 | Expert-comptable peut appartenir à plusieurs groupes | Sélecteur de groupe en sidebar (Phase 3) — Phase 2 pose le multi-org dans `profiles` |
</phase_requirements>

---

## Summary

Phase 2 initialise l'application Next.js complète depuis zéro : bootstrap projet, design system, authentification magic link, onboarding wizard 4 étapes, gate middleware, et logique d'invitation. Le schéma Supabase (Phase 1) est déjà en place — Phase 2 ne modifie pas les politiques RLS mais ajoute des colonnes (`is_complete`, `current_onboarding_step`) via nouvelles migrations, et pose les JWT custom claims (`org_id`, `role`) lors de l'onboarding.

L'architecture core repose sur `@supabase/ssr` pour la gestion des sessions côté serveur, avec un `middleware.ts` central qui rafraîchit les tokens et redirige selon l'état du profil. Le flow d'invitation utilise `auth.admin.inviteUserByEmail` avec `user_metadata` pour passer les métadonnées (`organization_id`, `role`, `cabinet_ids`), puis un callback route qui détecte ces métadonnées pour pré-configurer le profil de l'invité.

Le wizard onboarding est un Client Component avec Framer Motion AnimatePresence — les transitions slide gauche/droite nécessitent `"use client"` et un wrapper approprié pour coexister avec l'App Router. Framer Motion fonctionne en App Router à condition d'isoler les composants animés dans des Client Components dédiés.

**Primary recommendation:** Suivre rigoureusement le pattern Supabase SSR officiel (`getAll`/`setAll` uniquement, jamais `get`/`set`/`remove`), utiliser `auth.admin.inviteUserByEmail` avec `user_metadata` pour les métadonnées d'invitation, et stocker `current_onboarding_step` dans `profiles` pour simplicité.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14+ (latest) | Framework App Router | Décision verrouillée |
| @supabase/ssr | latest | Session SSR, cookie management | Remplacement officiel de auth-helpers — seul package supporté |
| @supabase/supabase-js | latest | Supabase client base | Dépendance de @supabase/ssr |
| framer-motion | 11+ | Wizard step transitions, page entrance | Décision verrouillée |
| resend | latest | E-mails transactionnels invitation | Décision verrouillée |
| @react-email/components | latest | Templates HTML d'e-mails React | Standard ecosystem Resend |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | 7+ | Gestion des formulaires onboarding | shadcn Form l'intègre nativement |
| zod | 3+ | Validation des schémas de formulaire | Couplé react-hook-form + shadcn Form |
| @hookform/resolvers | 3+ | Pont zod ↔ react-hook-form | Requis pour validation zod dans RHF |
| lucide-react | latest | Icons (bundled shadcn) | Inclus dans shadcn — ne pas installer séparément |
| next-themes | latest | Dark mode via CSS variables | Pattern standard shadcn dark mode |

### shadcn Components à installer
| Component | Usage |
|-----------|-------|
| Button | CTA partout |
| Input | Champs formulaires |
| Label | Labels accessibles |
| Form | Intégration react-hook-form |
| Avatar | Photo de profil preview |
| Separator | Visuels dividers |

### Alternatives Considérées
| Standard | Alternative | Tradeoff |
|----------|-------------|----------|
| `@supabase/ssr` | `@supabase/auth-helpers-nextjs` | auth-helpers est déprécié depuis 2024 — ne pas utiliser |
| `auth.admin.inviteUserByEmail` | table `invitations` custom | Plus simple, moins de tables — mais métadonnées dans `user_metadata` uniquement |
| `current_onboarding_step` dans `profiles` | champ dans `organizations` | `profiles` est la bonne table — lié à l'utilisateur, pas à l'org |

### Installation
```bash
bun create next-app cabinetpilot --ts --tailwind --src-dir --app --use-bun
cd cabinetpilot
bun add @supabase/ssr @supabase/supabase-js framer-motion resend @react-email/components
bun add react-hook-form @hookform/resolvers zod next-themes
bunx shadcn@latest init
bunx shadcn@latest add button input label form avatar separator
```

---

## Architecture Patterns

### Recommended Project Structure
```
cabinetpilot/
├── middleware.ts            # Supabase session refresh + redirects (racine)
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout (font loading, ThemeProvider)
│   │   ├── page.tsx         # Landing redirect → /login ou /dashboard
│   │   ├── login/
│   │   │   └── page.tsx     # Login split-screen (magic link form)
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts # PKCE code exchange + redirect
│   │   ├── onboarding/
│   │   │   └── page.tsx     # Wizard wrapper (Server Component)
│   │   └── dashboard/
│   │       └── page.tsx     # Protected — Phase 3 stub
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx         # Client Component — magic link form
│   │   │   └── ConfirmationScreen.tsx # In-page confirmation after OTP send
│   │   ├── onboarding/
│   │   │   ├── OnboardingWizard.tsx  # "use client" — AnimatePresence wrapper
│   │   │   ├── StepIndicator.tsx     # 4 circles, animated states
│   │   │   ├── steps/
│   │   │   │   ├── StepProfil.tsx
│   │   │   │   ├── StepCabinet.tsx
│   │   │   │   ├── StepPennylane.tsx
│   │   │   │   └── StepSync.tsx
│   │   └── ui/                       # shadcn generated components
│   ├── lib/
│   │   ├── design-tokens.ts  # Copié depuis .planning/artifacts/design-tokens.ts
│   │   └── supabase/
│   │       ├── client.ts     # createBrowserClient (Client Components)
│   │       ├── server.ts     # createServerClient (Server Components / Actions)
│   │       └── middleware.ts # updateSession helper
│   ├── hooks/
│   │   └── useOnboardingStep.ts  # Hook client pour navigation wizard
│   └── styles/
│       └── globals.css       # Tailwind directives + CSS variables tokens
```

### Pattern 1: Supabase SSR — Client Utility Files

**Ce qu'il faut:** Deux clients distincts, jamais un client global singleton côté serveur.

```typescript
// src/lib/supabase/client.ts — Client Components uniquement
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// src/lib/supabase/server.ts — Server Components, Server Actions, Route Handlers
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {
            // Server Component — middleware s'occupe de persister
          }
        },
      },
    }
  )
}
```

```typescript
// src/lib/supabase/middleware.ts — updateSession helper
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // CRITIQUE : toujours getUser() dans le middleware, jamais getSession()
  const { data: { user } } = await supabase.auth.getUser()

  return { supabase, response, user }
}
```

### Pattern 2: Middleware avec Redirects Profil

```typescript
// middleware.ts (racine du projet, pas dans src/)
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_ROUTES = ['/login', '/auth/callback', '/']

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)

  const pathname = request.nextUrl.pathname

  // Routes publiques — pas de vérification
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return response
  }

  // Pas de session → login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Session existante mais profil incomplet → onboarding
  // Note: vérifier is_complete via DB query dans middleware (voir pitfall)
  if (pathname !== '/onboarding') {
    // Vérifier profiles.is_complete ici
    // Si false → redirect /onboarding
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Note sur `is_complete` dans le middleware:** Le middleware ne peut pas faire une requête DB directe sans alourdir chaque requête. Deux approches valides:
1. Stocker `is_complete` dans les JWT claims (via Custom Access Token Hook) → lu localement, zéro DB
2. Faire une requête Supabase `profiles` dans le middleware — acceptable car le token est déjà validé par `getUser()`

**Recommandation:** Approche 2 (requête `profiles`) pour Phase 2 — la cohérence avec les JWT claims sera optimisée si nécessaire. Ajouter `is_complete` aux JWT custom claims serait l'optimisation Phase suivante.

### Pattern 3: Auth Callback Route (PKCE)

```typescript
// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Vérifier is_complete pour rediriger vers onboarding ou dashboard
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_complete')
          .eq('id', user.id)
          .single()

        if (!profile?.is_complete) {
          return NextResponse.redirect(new URL('/onboarding', origin))
        }
      }
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
}
```

### Pattern 4: Magic Link — signInWithOtp

```typescript
// Dans LoginForm.tsx (Client Component)
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: true,  // true = inscription auto si utilisateur inconnu
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
})
```

**Note:** `signInWithOtp` envoie un magic link par défaut (pas un code OTP à 6 chiffres) — la distinction dépend du template email configuré dans Supabase Dashboard.

### Pattern 5: Mise à jour JWT Claims (org_id, role)

Les JWT claims sont dans `auth.users.raw_app_meta_data`. La mise à jour se fait via `auth.admin.updateUserById` avec le Service Role Key (jamais exposé côté client) :

```typescript
// Server Action ou Route Handler uniquement
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // secret — jamais NEXT_PUBLIC_
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Après création de l'organisation (étape 2 onboarding)
await supabaseAdmin.auth.admin.updateUserById(userId, {
  app_metadata: {
    org_id: organizationId,
    role: 'expert-comptable',
  }
})

// Puis forcer le rafraîchissement de la session côté client
// Via supabase.auth.refreshSession() dans le Client Component
```

**Limitation importante:** Les JWT claims ne se mettent pas à jour automatiquement dans la session en cours. Après `updateUserById`, le client doit appeler `supabase.auth.refreshSession()` pour obtenir un nouveau JWT avec les claims mis à jour. La RLS sera alors immédiatement effective.

### Pattern 6: Flow d'Invitation

```typescript
// Route Handler : src/app/api/invite/route.ts (POST, Server-side)
// Requiert Service Role Key — jamais exposé

const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
  inviteeEmail,
  {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    data: {
      // user_metadata — accessible côté invité dans auth.users.raw_user_meta_data
      invited_by: inviterId,
      organization_id: orgId,
      role: 'collaborateur',
      cabinet_ids: cabinetIds,  // uuid[]
    }
  }
)
```

Dans le callback (`/auth/callback`), détecter les métadonnées d'invitation et pré-configurer l'utilisateur :
```typescript
// Lire user_metadata après exchange
const { data: { user } } = await supabase.auth.getUser()
const inviteMeta = user?.user_metadata // contient invited_by, organization_id, etc.

if (inviteMeta?.organization_id) {
  // Pré-assigner org + role dans profiles
  // Pré-assigner cabinets dans user_cabinet_assignments
  // Mettre à jour JWT claims via admin client
}
```

**Approche alternative (table `invitations`):** Si `user_metadata` s'avère insuffisant ou pose des problèmes de sécurité, une table `public.invitations` (token, email, org_id, role, cabinet_ids, expires_at, used_at) est plus robuste mais ajoute une migration. Le planner tranchera.

### Pattern 7: Framer Motion dans App Router

```typescript
// OnboardingWizard.tsx — "use client" obligatoire
"use client"
import { AnimatePresence, motion } from 'framer-motion'

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
}

// Dans le JSX :
<AnimatePresence mode="wait" custom={direction}>
  <motion.div
    key={currentStep}
    custom={direction}
    variants={slideVariants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{ duration: 0.25, ease: 'easeInOut' }}
  >
    {/* Contenu de l'étape */}
  </motion.div>
</AnimatePresence>
```

**Important:** La page `/onboarding` peut être un Server Component wrapper qui importe `OnboardingWizard` (Client Component). Le server component charge les données initiales (step courant depuis DB) et les passe en props.

### Pattern 8: Resend avec React Email

```typescript
// src/app/api/invite/route.ts — Route Handler
import { Resend } from 'resend'
import { InvitationEmail } from '@/components/emails/InvitationEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'CabinetPilot <noreply@cabinetpilot.io>',
  to: [inviteeEmail],
  subject: `Vous êtes invité à rejoindre ${orgName} sur CabinetPilot`,
  react: InvitationEmail({ orgName, magicLink, inviterName }), // Fonction, pas JSX
})
```

### Pattern 9: Upload Avatar Supabase Storage

```typescript
// Client Component — StepProfil.tsx
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file, {
    cacheControl: '3600',
    upsert: true,
  })

// Récupérer URL publique
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.jpg`)

// Mettre à jour profiles.avatar_url
await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
```

**Bucket:** Créer le bucket `avatars` (public) via migration Supabase ou via dashboard. Policy RLS : utilisateur peut uploader dans son propre dossier `{userId}/`.

### Anti-Patterns à Éviter

- **Ne jamais appeler `supabase.auth.getSession()` dans le middleware** — non fiable côté serveur. Toujours `getUser()`.
- **Ne jamais utiliser `get`, `set`, `remove` dans les cookies handlers de `@supabase/ssr`** — seulement `getAll` et `setAll`.
- **Ne jamais créer le client Supabase admin (`service_role`) dans un Client Component** — toujours Server Action ou Route Handler.
- **Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` avec préfixe `NEXT_PUBLIC_`** — serait visible dans le bundle client.
- **Ne pas importer Framer Motion dans des Server Components** — utiliser `"use client"` sur les composants animés.
- **Ne pas utiliser `@supabase/auth-helpers-nextjs`** — déprécié en 2024, remplacé par `@supabase/ssr`.

---

## Don't Hand-Roll

| Problem | Ne pas construire | Utiliser à la place | Pourquoi |
|---------|-------------------|---------------------|----------|
| Magic link sending | Appel SMTP custom | `supabase.auth.signInWithOtp()` | Gestion des tokens, PKCE, rate limiting intégrés |
| Session cookie refresh | Cookie management manuel | `@supabase/ssr` + `updateSession` | Edge cases complexes, sécurité JWT rotation |
| Form validation | Validation native HTML | `react-hook-form` + `zod` | Gestion des erreurs async, dirty state, submit disabled states |
| Email templates | HTML inline style | `@react-email/components` | Compatibilité clients email, dark mode, responsive |
| Avatar resize | Canvas API custom | `sharp` côté serveur OU Supabase Storage transform | Sharp = précis, Supabase transform = CDN-side, moins de code |
| RBAC checks in UI | `if (role === 'expert-comptable')` dans les composants | RLS déjà configurée + JWT claims dans middleware | La RLS bloque au niveau DB — l'UI peut faire confiance aux données reçues |

---

## Common Pitfalls

### Pitfall 1: `getSession()` vs `getUser()` dans le middleware
**What goes wrong:** Utiliser `supabase.auth.getSession()` dans le middleware renvoie la session depuis le cookie sans revalidation serveur — une session expirée ou révoquée serait acceptée.
**Why it happens:** `getSession()` est rapide (pas de réseau) donc intuitif, mais pas sécurisé côté serveur.
**How to avoid:** Toujours `supabase.auth.getUser()` dans le middleware — fait une requête au serveur Supabase pour revalider le token.
**Warning signs:** Accès non bloqué après logout, tests d'expiration de session échouent.

### Pitfall 2: JWT claims non mis à jour après `updateUserById`
**What goes wrong:** L'utilisateur crée son organisation (étape 2 onboarding), les JWT claims sont mis à jour via admin, mais les RLS bloquent encore car le JWT en session est l'ancien.
**Why it happens:** La session client a un JWT signé avec les anciens claims — jusqu'au prochain refresh.
**How to avoid:** Après `updateUserById`, appeler `supabase.auth.refreshSession()` dans le Client Component pour forcer l'émission d'un nouveau JWT.
**Warning signs:** RLS errors (406/403) immédiatement après création d'organisation.

### Pitfall 3: `profiles.is_complete` non détectable dans le middleware sans DB query
**What goes wrong:** Le middleware ne peut pas savoir si le profil est complet sans consulter la DB (pas dans le JWT).
**Why it happens:** `is_complete` est dans `profiles`, pas dans les JWT claims.
**How to avoid:** Soit ajouter `is_complete` aux JWT claims via Custom Access Token Hook (plus performant), soit accepter une requête DB dans le middleware (simple pour Phase 2). Si requête DB : scope SELECT minimal (`SELECT is_complete FROM profiles WHERE id = $1`).
**Warning signs:** Middleware lent, trop de requêtes DB sur chaque page.

### Pitfall 4: Framer Motion avec Server Components
**What goes wrong:** `motion.div` ou `AnimatePresence` dans un Server Component — crash au build (`You're importing a component that needs createContext`).
**Why it happens:** Framer Motion utilise des hooks React (useState, useEffect, createContext) incompatibles avec les Server Components.
**How to avoid:** Tout composant avec Framer Motion doit avoir `"use client"` en première ligne. Les pages peuvent rester Server Components si elles délèguent l'animation à un Client Component importé.
**Warning signs:** Build error `createContext is not a function` ou `Hooks can only be called inside a function component`.

### Pitfall 5: Cookies `get`/`set`/`remove` dans `@supabase/ssr`
**What goes wrong:** Utiliser les anciennes méthodes `get`, `set`, `remove` dans les cookie handlers — warning de dépréciation ou comportement imprévisible.
**Why it happens:** L'API a changé — seules `getAll` et `setAll` sont supportées.
**How to avoid:** Toujours suivre le pattern officiel avec `getAll()` et `setAll()`.

### Pitfall 6: `shouldCreateUser: false` pour les invités
**What goes wrong:** Utiliser `signInWithOtp({ shouldCreateUser: false })` pour un e-mail d'invité qui n'est pas encore dans `auth.users` — Supabase retourne une erreur silencieuse (ne crée pas l'utilisateur).
**Why it happens:** `shouldCreateUser: false` empêche la création automatique de l'utilisateur.
**How to avoid:** Pour l'invitation, utiliser `auth.admin.inviteUserByEmail` (créé l'utilisateur avec statut `invited`), pas `signInWithOtp`. Pour le login classique, laisser `shouldCreateUser: true` (défaut).

### Pitfall 7: `SUPABASE_SERVICE_ROLE_KEY` exposé côté client
**What goes wrong:** Variable d'env avec `NEXT_PUBLIC_` préfixe → embarquée dans le bundle client.
**How to avoid:** `SUPABASE_SERVICE_ROLE_KEY` (sans `NEXT_PUBLIC_`) — accessible uniquement dans Server Actions, Route Handlers, et middleware.

### Pitfall 8: `profiles.organization_id = NULL` au premier login
**What goes wrong:** Un utilisateur vient de s'inscrire, son profil existe (créé par trigger ou manuellement) mais `organization_id` est NULL — les RLS SELECT sur `organizations`, `cabinets`, etc. retournent 0 lignes (car `get_my_org_id()` retourne NULL).
**Why it happens:** Phase 1 décide que `organization_id` est nullable jusqu'à l'onboarding.
**How to avoid:** Le middleware et le callback doivent détecter `organization_id IS NULL` → `/onboarding`. La page onboarding elle-même ne dépend pas des RLS pour charger — elle crée l'organisation.
**Warning signs:** Page onboarding blanche, errors 406 sur les tables avec RLS.

---

## Schéma — Colonnes à Ajouter (Phase 2)

Le schéma Phase 1 ne contient pas `is_complete` ni `current_onboarding_step`. Ces colonnes doivent être ajoutées via une migration Phase 2.

### État actuel de `profiles` (Phase 1)
```sql
-- 20260316000002_create_profiles_cabinets.sql
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  role            public.user_role,  -- NULL avant onboarding
  first_name      text,
  last_name       text,
  phone           text,
  avatar_url      text,
  created_at      timestamptz not null default now()
);
```

### Migration Phase 2 nécessaire
```sql
-- Nouvelle migration : 20260316000008_add_onboarding_columns.sql
alter table public.profiles
  add column is_complete          boolean not null default false,
  add column current_onboarding_step integer not null default 1 check (current_onboarding_step between 1 and 4);
```

**Note:** `current_onboarding_step` dans `profiles` (pas `organizations`) — lié à l'utilisateur, pas à l'organisation. Un invité aura `current_onboarding_step = 1` (profil seulement).

### Trigger `profiles` au premier login

`auth.users` existe dès le magic link. `profiles` doit être créé. Options:
1. **Trigger AFTER INSERT sur `auth.users`** → crée `profiles` automatiquement (pattern Supabase recommandé)
2. **Création manuelle dans le callback** → moins robuste

Le trigger est préférable car il garantit l'existence du profil avant que le callback ne tente de le lire.

```sql
-- Trigger à ajouter en Phase 2
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## Code Examples

### Magic Link Send (Server Action)
```typescript
// src/app/login/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function sendMagicLink(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })
  if (error) return { error: error.message }
  return { success: true }
}
```

### Onboarding Step Save (Server Action)
```typescript
// src/app/onboarding/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function saveProfilStep(data: {
  first_name: string
  last_name: string
  phone?: string
  avatar_url?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  await supabase.from('profiles').update({
    ...data,
    current_onboarding_step: 2,
  }).eq('id', user.id)
}

export async function saveCabinetStep(orgName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Créer organisation
  const { data: org } = await supabase
    .from('organizations')
    .insert({ name: orgName })
    .select()
    .single()

  // Mettre à jour JWT claims via admin client
  const supabaseAdmin = /* admin client */ null
  await supabaseAdmin!.auth.admin.updateUserById(user.id, {
    app_metadata: { org_id: org!.id, role: 'expert-comptable' }
  })

  // Mettre à jour profile
  await supabase.from('profiles').update({
    organization_id: org!.id,
    role: 'expert-comptable',
    current_onboarding_step: 3,
  }).eq('id', user.id)
}

export async function completeOnboarding() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  await supabase.from('profiles').update({
    is_complete: true,
    current_onboarding_step: 4,
  }).eq('id', user.id)
}
```

---

## Variables d'Environnement

```bash
# .env.local (jamais commité)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx  # anon key (safe côté client)
SUPABASE_SERVICE_ROLE_KEY=eyJxxx       # service_role — JAMAIS NEXT_PUBLIC_
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Production: https://cabinetpilot.io
RESEND_API_KEY=re_xxx
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | auth-helpers déprécié — ne pas utiliser |
| `supabase.auth.getSession()` côté serveur | `supabase.auth.getUser()` | 2024 | getSession non fiable en SSR |
| Cookie handlers `get`/`set`/`remove` | `getAll`/`setAll` uniquement | 2024 | API @supabase/ssr v0.4+ |
| Custom JWT via PostgreSQL fonction | Custom Access Token Hook | 2024 | Hook officiel = plus simple, plus fiable |
| `SUPABASE_ANON_KEY` naming | `SUPABASE_PUBLISHABLE_KEY` (nouveau) | 2025 | Les deux fonctionnent — préférer `ANON_KEY` pour compatibilité |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs` : déprécié, remplacé par `@supabase/ssr`
- `supabase.auth.session()` : supprimé
- Pattern `onAuthStateChange` pour la gestion session SSR : remplacé par middleware cookie

---

## Open Questions

1. **Approche pour `is_complete` dans le middleware**
   - What we know: Une requête DB par requête middleware est fonctionnelle mais pas optimale
   - What's unclear: Est-ce que le Custom Access Token Hook est configuré dans le projet Supabase (dashboard) ?
   - Recommendation: Commencer avec requête DB dans le middleware pour Phase 2. Migrer vers JWT claims si performances insuffisantes.

2. **Approche invitation : `user_metadata` vs table `invitations`**
   - What we know: `auth.admin.inviteUserByEmail` avec `data` passe en `user_metadata` (modifiable par l'utilisateur). Une table `invitations` est plus sécurisée mais ajoute de la complexité.
   - What's unclear: Les métadonnées `user_metadata` sont-elles suffisamment sécurisées pour ce cas (org_id, role) sachant que la vraie sécurité est dans les JWT `app_metadata` posés côté serveur dans le callback ?
   - Recommendation: Utiliser `user_metadata` + validation stricte dans le callback. Le callback vérifie que l'`organization_id` reçu est légitime avant de l'assigner. Si table `invitations` décidée : migration `20260316000009_create_invitations.sql`.

3. **Trigger `profiles` sur `auth.users` INSERT**
   - What we know: Phase 1 n'a pas créé ce trigger
   - What's unclear: La RLS sur `profiles` autorise-t-elle un trigger `security definer` à insérer sans `organization_id` (NULL) ?
   - Recommendation: Le trigger `handle_new_user` crée juste `profiles(id)` — les RLS INSERT existantes vérifient `id = auth.uid()` ce qui est compatible (le trigger agit avec `security definer`).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pgTAP (Supabase natif) — pour les migrations SQL. Tests E2E Phase non couverts (Playwright hors scope Phase 2) |
| Config file | `supabase/tests/*.test.sql` (pattern établi Phase 1) |
| Quick run command | `supabase test db` |
| Full suite command | `supabase test db` |

**Note:** Phase 2 est la première phase frontend. Les tests unitaires React (jest/vitest) ne sont pas configurés. La validation se fait via test manuel des flows (middleware redirect, magic link, onboarding) et pgTAP pour les migrations.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | `profiles` créés au premier login (trigger) | pgTAP SQL | `supabase test db` | ❌ Wave 0 |
| AUTH-02 | `is_complete` et `current_onboarding_step` existent dans `profiles` | pgTAP SQL | `supabase test db` | ❌ Wave 0 |
| AUTH-03 | Middleware redirige vers `/onboarding` si `is_complete = false` | Manual smoke | n/a | n/a |
| AUTH-04 | `user_cabinet_assignments` rempli après invitation | pgTAP SQL | `supabase test db` | ❌ Wave 0 |
| AUTH-05 | `profiles.first_name` et `last_name` non NULL après onboarding | pgTAP SQL | `supabase test db` | ❌ Wave 0 |
| RBAC-01 | JWT claims `role=expert-comptable`, `org_id` posés après onboarding | Manual smoke | n/a | n/a |
| RBAC-02 | Collaborateur ne voit que ses cabinets via RLS (déjà testé Phase 1) | pgTAP SQL (existant) | `supabase test db` | ✅ Phase 1 |
| RBAC-03 | Expert-comptable peut avoir plusieurs `organization_id` (via profiles) | pgTAP SQL | `supabase test db` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `supabase test db` (migrations uniquement)
- **Per wave merge:** `supabase test db` + smoke test manuel des flows auth
- **Phase gate:** Smoke test complet (login, onboarding, invitation) avant `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `supabase/tests/02_onboarding_columns.test.sql` — vérifie `is_complete`, `current_onboarding_step` dans `profiles`
- [ ] `supabase/tests/02_profiles_trigger.test.sql` — vérifie que le trigger `on_auth_user_created` crée bien un profil
- [ ] `supabase/tests/02_invitations_flow.test.sql` — si table `invitations` décidée
- Migration Supabase : `supabase/migrations/20260316000008_add_onboarding_columns.sql`
- Bucket Storage : `avatars` (public) — créé via migration ou dashboard

---

## Sources

### Primary (HIGH confidence)
- Supabase SSR official docs — patterns createServerClient, getAll/setAll, getUser vs getSession
- Supabase official docs — signInWithOtp, inviteUserByEmail, admin.updateUserById
- Resend official docs — resend.emails.send, react email pattern, API key setup
- Bun official docs — `bun create next-app`, `bun --bun run dev`
- shadcn/ui official docs — `bunx shadcn@latest init`, component installation

### Secondary (MEDIUM confidence)
- [Ryan Katayi — Server-Side Auth in Next.js with Supabase](https://www.ryankatayi.com/blog/server-side-auth-in-next-js-with-supabase-my-setup) — patterns middleware.ts et server.ts vérifiés contre docs officielles
- [Supabase Advanced SSR Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide) — getUser vs getSession, PKCE flow
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — hook signature et timing

### Tertiary (LOW confidence)
- Framer Motion AnimatePresence `mode="wait"` avec Next.js App Router — pattern documenté dans plusieurs articles communautaires, non testé dans ce projet spécifique. Risque connu : l'implémentation peut nécessiter un `template.tsx` plutôt qu'un wrapper si les transitions ne fonctionnent pas comme attendu.
- `generateLink` avec type `invite` + métadonnées — documentation officielle parcellaire sur ce point spécifique.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages officiels vérifiés, versions confirmées
- Architecture / patterns Supabase SSR: HIGH — vérifiés contre docs officielles 2025
- JWT claims update pattern: HIGH — pattern documenté officiellement
- Invitation metadata via user_metadata: MEDIUM — fonctionnel mais nécessite validation stricte dans callback
- Framer Motion App Router: MEDIUM — fonctionne avec "use client" mais template.tsx peut être nécessaire
- pgTAP tests pour Phase 2: HIGH — pattern établi Phase 1

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable — Supabase SSR API stable, shadcn stable)
