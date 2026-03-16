-- Migration 005: Create dossiers table
-- Phase 1 — Fondation : Schéma & RLS
-- FOUND-01 : champs AGO-spécifiques nullables — un dossier de type différent peut être inséré sans ces champs
-- FOUND-05 : status_id FK avec ON DELETE RESTRICT (pas NO ACTION) — immédiat, non-différable

create table public.dossiers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cabinet_id      uuid not null references public.cabinets(id) on delete cascade,
  type            text not null,           -- ex : 'AGO', 'création de société' (extensible, pas d'enum)
  task_uid        text unique,             -- clé de déduplication Pennylane — UNIQUE, nullable pour dossiers manuels
  status_id       uuid not null references public.org_statuses(id) on delete restrict,
  -- Champs AGO-spécifiques : TOUS NULLABLES — n'empêchent pas l'insertion d'autres types de missions
  date_cloture        date,
  date_echeance       date,
  id_pennylane        text,
  forme_juridique     text,
  siren               text,
  regime_fiscal       text,
  statut_exercice_pl  text,
  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Index pour les politiques RLS (colonnes filtrées dans chaque politique)
create index idx_dossiers_organization_id on public.dossiers(organization_id);
create index idx_dossiers_cabinet_id      on public.dossiers(cabinet_id);
create index idx_dossiers_status_id       on public.dossiers(status_id);

-- Trigger pour updated_at automatique
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

create trigger trg_dossiers_updated_at
before update on public.dossiers
for each row execute function public.update_updated_at();

comment on table public.dossiers is 'Entité centrale — une mission juridique (AGO ou autre type)';
comment on column public.dossiers.type is 'Type de mission — non contraint par enum pour extensibilité v2 (FOUND-01)';
comment on column public.dossiers.task_uid is 'Clé de déduplication Pennylane — UNIQUE, nullable pour dossiers créés manuellement';
comment on column public.dossiers.status_id is 'FK avec ON DELETE RESTRICT — suppression d''un statut utilisé bloquée au niveau DB (FOUND-05)';
comment on column public.dossiers.date_cloture is 'Champ AGO-spécifique nullable — FOUND-01';
comment on column public.dossiers.date_echeance is 'Champ AGO-spécifique nullable — deadline affichée avec badge urgence en Phase 3';
