---
plan: 02-05
phase: 02-authentification-rbac
status: complete
date: 2026-03-16
---

# Summary — 02-05: Login Page Split-Screen + Magic Link + Border Beam

## What was done

**Task 1 — Server Action + page layout:**
- `src/app/login/actions.ts`: `sendMagicLink` Server Action → `signInWithOtp` with `shouldCreateUser: true` and `emailRedirectTo: NEXT_PUBLIC_SITE_URL/auth/callback`. French error messages for rate limit and invalid email.
- `src/app/login/page.tsx`: split-screen layout — left panel `bg-zinc-50` (soft) with login card, right panel `var(--gradient-login-panel)` hidden below `md`. Login card has animated border beam (conic-gradient rotation 4s linear). Logo "CabinetPilot" in Cal Sans 18px above card. Right panel: Cal Sans 32px headline + DM Sans body at 80% white opacity. All copy from UI-SPEC Copywriting Contract.

**Task 2 — Client Components:**
- `src/components/auth/LoginForm.tsx`: `react-hook-form` + `zodResolver` + Zod schema. Email input `h-12` (48px WCAG) with `focus-visible:ring-2 focus-visible:ring-indigo-600/20`. Button `h-12 bg-indigo-600 hover:bg-indigo-700`. In-page state transition to ConfirmationScreen on success (no navigation). Server errors displayed with `role="alert"`.
- `src/components/auth/ConfirmationScreen.tsx`: Mail icon in indigo-50 circle (32px icon). Heading "Vérifiez votre boîte mail". Resend link in indigo-600. Back link in zinc-500. French copy verbatim from UI-SPEC.

## Design decisions (UI-SPEC compliant + user enhancements)

- **Soft background**: left panel uses `bg-zinc-50` instead of flat white — matches "soft background" request, provides contrast for the white card
- **Border beam**: conic-gradient rotating animation (`border-beam 4s linear infinite`) on the 360px login card — `@keyframes border-beam` added to `globals.css`
- **Card**: 1.5px padding "border" via `p-[1.5px]` + inner `bg-white rounded-[10px]` creates clean layered card

## Acceptance criteria met

- [x] `'use server'` in actions.ts
- [x] `signInWithOtp`, `shouldCreateUser: true`, `NEXT_PUBLIC_SITE_URL`
- [x] `Trop de tentatives` French error
- [x] `LoginForm` in page
- [x] `var(--gradient-login-panel)` in page
- [x] `var(--size-login-max)` in page
- [x] `border-beam` animation in page
- [x] `'use client'` in LoginForm
- [x] `zodResolver`, `sendMagicLink`, `ConfirmationScreen`
- [x] `Recevoir mon lien de connexion` (exact copy)
- [x] `h-12` on input and button (48px WCAG 2.5.5)
- [x] `focus-visible:ring` on all interactive elements
- [x] `Vérifiez votre boîte mail`, `Renvoyer le lien`, `Modifier l'adresse e-mail` in ConfirmationScreen
- [x] `bun run build` clean
