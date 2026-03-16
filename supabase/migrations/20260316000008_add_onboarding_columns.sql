-- Migration 008: Add onboarding columns to profiles
-- Phase 2 — Authentification & RBAC

alter table public.profiles
  add column is_complete             boolean not null default false,
  add column current_onboarding_step integer not null default 1
    check (current_onboarding_step between 1 and 4);

comment on column public.profiles.is_complete is 'true = profil complété, accès dashboard autorisé. false = redirigé vers /onboarding par le middleware.';
comment on column public.profiles.current_onboarding_step is 'Étape courante du wizard onboarding (1=Profil, 2=Cabinet, 3=Pennylane, 4=Sync). Sauvegardé à chaque étape pour reprise.';
