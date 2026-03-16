---
phase: 2
slug: authentification-rbac
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pgTAP (migrations SQL) — pattern établi Phase 1 |
| **Config file** | `supabase/tests/*.test.sql` |
| **Quick run command** | `supabase test db` |
| **Full suite command** | `supabase test db` |
| **Estimated runtime** | ~10 seconds |

**Note:** Phase 2 est la première phase frontend. Tests unitaires React (vitest) non configurés en Phase 2 — validation frontend via smoke tests manuels. pgTAP couvre uniquement les migrations Supabase.

---

## Sampling Rate

- **After every task commit:** Run `supabase test db`
- **After every plan wave:** Run `supabase test db` + smoke test manuel des flows auth
- **Before `/gsd:verify-work`:** Full suite doit être verte + smoke test complet (login, onboarding 4 étapes, invitation)
- **Max feedback latency:** ~10 seconds (pgTAP)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | AUTH-01, AUTH-02 | pgTAP SQL | `supabase test db` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 0 | AUTH-01, AUTH-02 | pgTAP SQL | `supabase test db` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 0 | AUTH-04 | pgTAP SQL | `supabase test db` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | AUTH-01, AUTH-02 | pgTAP SQL | `supabase test db` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 1 | AUTH-03 | Manual smoke | n/a | n/a | ⬜ pending |
| 02-04-01 | 04 | 2 | AUTH-02, AUTH-05 | Manual smoke | n/a | n/a | ⬜ pending |
| 02-05-01 | 05 | 2 | AUTH-04, RBAC-01, RBAC-02 | pgTAP SQL | `supabase test db` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/02_onboarding_columns.test.sql` — vérifie `is_complete` (boolean not null default false) et `current_onboarding_step` (integer 1-4 not null default 1) dans `profiles`
- [ ] `supabase/tests/02_profiles_trigger.test.sql` — vérifie que le trigger `on_auth_user_created` crée un profil lors d'un INSERT dans `auth.users`
- [ ] `supabase/tests/02_invitation_assignments.test.sql` — vérifie que `user_cabinet_assignments` est rempli correctement après flow d'invitation (si table `invitations` décidée)
- [ ] Migration Supabase : `supabase/migrations/20260316000008_add_onboarding_columns.sql` — ajoute `is_complete` et `current_onboarding_step` à `profiles`

*Si infrastructure existante couvre déjà: "Existing pgTAP infrastructure covers Phase 1 patterns — Wave 0 adds Phase 2 stubs."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Middleware redirige vers `/onboarding` si `is_complete = false` | AUTH-03 | Pas de test E2E automatisé Phase 2 (Playwright hors scope) | 1. Se connecter avec magic link → vérifier redirect vers `/onboarding` 2. Compléter profil → vérifier accès `/dashboard` 3. Tenter `/dashboard` avant complétion → vérifier redirect |
| JWT claims `role=expert-comptable` + `org_id` posés après étape 2 | RBAC-01 | Claims dans JWT runtime — pas testable en pgTAP | Après étape 2 onboarding: ouvrir DevTools → Application → Cookies → décoder le JWT → vérifier `app_metadata.org_id` et `app_metadata.role` |
| Invité atterrit dans le bon groupe après clic lien | AUTH-04 | Flow multi-service (Supabase Auth + Resend + callback) | 1. Expert-comptable invite email test 2. Cliquer lien dans l'email 3. Vérifier que `profiles.organization_id` = org de l'expert-comptable invitant |
| Collaborateur ne voit que ses cabinets assignés | RBAC-02 | Déjà testé Phase 1 via RLS — smoke test UI requis | Connecter en tant que collaborateur → vérifier que seuls les cabinets assignés apparaissent (Phase 3 UI, mais logique posée ici) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
