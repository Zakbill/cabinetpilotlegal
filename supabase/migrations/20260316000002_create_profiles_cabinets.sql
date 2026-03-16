-- Migration 002: Create profiles and cabinets tables
-- Phase 1 — Fondation : Schéma & RLS

-- Enum pour le rôle utilisateur
create type public.user_role as enum ('expert-comptable', 'collaborateur');

-- Table profiles : étend auth.users avec les données métier
-- profiles.id = auth.users.id (FK, pas une PK générée)
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  role            public.user_role,
  first_name      text,
  last_name       text,
  phone           text,
  avatar_url      text,
  created_at      timestamptz not null default now()
);

-- Index pour les politiques RLS (colonnes filtrées fréquemment)
create index idx_profiles_organization_id on public.profiles(organization_id);
create index idx_profiles_id on public.profiles(id);

comment on table public.profiles is 'Extension de auth.users — données métier utilisateur';
comment on column public.profiles.organization_id is 'NULL avant que l''utilisateur complète son profil (Phase 2)';
comment on column public.profiles.role is 'NULL avant onboarding — assigné lors de la création org ou de l''invitation (Phase 2)';

-- Table cabinets : sous-entité organisationnelle d'un groupe comptable
create table public.cabinets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  code            text,           -- référence interne libre, optionnelle
  created_at      timestamptz not null default now()
);

-- Index pour les politiques RLS
create index idx_cabinets_organization_id on public.cabinets(organization_id);

comment on table public.cabinets is 'Entité cabinet/bureau dans une organisation';
comment on column public.cabinets.code is 'Référence interne libre (optionnelle) — ex : code Pennylane';
