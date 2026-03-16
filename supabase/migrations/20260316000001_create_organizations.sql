-- Migration 001: Create organizations table
-- Phase 1 — Fondation : Schéma & RLS
-- Colonnes Stripe (subscription_id, customer_id) sont hors scope — voir Phase 7

-- Enum pour le plan d'abonnement
create type public.plan_type as enum ('starter', 'pro', 'cabinet', 'enterprise');

-- Table organizations : entité racine du multi-tenant
create table public.organizations (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  plan                public.plan_type not null default 'starter',
  active_dossiers_count integer not null default 0,
  created_at          timestamptz not null default now()
);

-- Index pour les requêtes RLS (colonnes filtrées fréquemment)
create index idx_organizations_id on public.organizations(id);

comment on table public.organizations is 'Entité racine multi-tenant — un groupe comptable';
comment on column public.organizations.active_dossiers_count is 'Mise à jour par trigger (Phase 5/7) — initialisé à 0';
comment on column public.organizations.plan is 'Plan actuel — starter par défaut, modifié par les webhooks Stripe (Phase 7)';
