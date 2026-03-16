-- Migration 003: Create user_cabinet_assignments join table
-- Phase 1 — Fondation : Schéma & RLS
-- Table pivot clé pour la RLS collaborateur — get_my_cabinet_ids() la lit

create table public.user_cabinet_assignments (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  cabinet_id  uuid not null references public.cabinets(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (user_id, cabinet_id)
);

-- Index pour la fonction helper get_my_cabinet_ids() — filtre sur user_id
create index idx_user_cabinet_assignments_user_id on public.user_cabinet_assignments(user_id);
create index idx_user_cabinet_assignments_cabinet_id on public.user_cabinet_assignments(cabinet_id);

comment on table public.user_cabinet_assignments is 'Assignation collaborateur → cabinets — lue par la fonction RLS get_my_cabinet_ids()';
