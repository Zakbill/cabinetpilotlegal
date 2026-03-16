-- Migration 004: Create org_statuses table + trigger seed
-- Phase 1 — Fondation : Schéma & RLS
-- FOUND-04 : statuts pré-chargés à la création de l'organisation (13 statuts)
-- FOUND-05 : FK dossiers.status_id → org_statuses(id) ON DELETE RESTRICT (dans Migration 005)

-- Enum pour le type de statut
create type public.status_type as enum ('normal', 'terminal');

-- Table org_statuses : statuts personnalisables par organisation
create table public.org_statuses (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label           text not null,
  type            public.status_type not null default 'normal',
  display_order   integer not null,
  created_at      timestamptz not null default now(),
  -- Contrainte d'unicité : un display_order unique par organisation
  unique (organization_id, display_order)
);

-- Index pour les politiques RLS
create index idx_org_statuses_organization_id on public.org_statuses(organization_id);

comment on table public.org_statuses is 'Statuts personnalisables par organisation — FOUND-04/FOUND-05';
comment on column public.org_statuses.display_order is 'Ordre d''affichage — unique par org, 1-13 pour les statuts pré-chargés';

-- Fonction trigger : pré-charge les 13 statuts par défaut à la création d'une organisation
-- Labels et ordre EXACTS prescrits par CONTEXT.md — ne pas modifier
create or replace function public.seed_default_statuses()
returns trigger
language plpgsql
as $$
begin
  insert into public.org_statuses (organization_id, label, type, display_order)
  values
    -- 7 statuts normaux
    (NEW.id, 'Non commencé',                           'normal',   1),
    (NEW.id, 'Rédaction PV',                            'normal',   2),
    (NEW.id, 'Envoyé au client',                        'normal',   3),
    (NEW.id, 'PV Signé',                                'normal',   4),
    (NEW.id, 'PV / Comptes déposés',                   'normal',   5),
    (NEW.id, 'Attente récépissé',                       'normal',   6),
    (NEW.id, 'Terminé',                                 'normal',   7),
    -- 6 statuts terminaux
    (NEW.id, 'Non déposé (à la demande du client)',     'terminal', 8),
    (NEW.id, 'Fait par avocat',                         'terminal', 9),
    (NEW.id, 'Fait par ancien cabinet',                 'terminal', 10),
    (NEW.id, 'Dépôt non obligatoire (Société civile)',  'terminal', 11),
    (NEW.id, 'Société en liquidation',                  'terminal', 12),
    (NEW.id, 'Absence mission juridique',               'terminal', 13);
  return NEW;
end;
$$;

-- Trigger AFTER INSERT sur organizations — atomique, garantit que chaque org a ses statuts
create trigger trg_seed_org_statuses
after insert on public.organizations
for each row execute function public.seed_default_statuses();
