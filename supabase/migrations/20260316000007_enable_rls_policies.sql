-- Migration 007: Enable RLS and create policies on all tables
-- Phase 1 — Fondation : Schéma & RLS
-- FOUND-02 : isolation multi-tenant 3 niveaux
-- FOUND-03 : JWT custom claims lus via private.get_my_org_id() / private.get_my_role()
--
-- RÈGLE CRITIQUE : activation RLS et politique dans la même migration (Pitfall 1)
-- Une table avec RLS activée mais sans politique retourne 0 lignes silencieusement
--
-- PATTERN PERFORMANCE : toujours (select private.fn()) — jamais private.fn() directement
-- Le wrapping (select ...) force le cache initPlan PostgreSQL (~95% d'amélioration)
--
-- CLAUSE TO : toujours "TO authenticated" — évite évaluation pour anon (99.78% d'amélioration)

-- ============================================================
-- 1. ACTIVER RLS SUR TOUTES LES TABLES
-- ============================================================
alter table public.organizations          enable row level security;
alter table public.profiles               enable row level security;
alter table public.cabinets               enable row level security;
alter table public.user_cabinet_assignments enable row level security;
alter table public.org_statuses           enable row level security;
alter table public.dossiers               enable row level security;

-- ============================================================
-- 2. POLITIQUES : organizations
-- Un utilisateur voit uniquement son organisation
-- ============================================================

create policy "organizations_select"
on public.organizations
for select
to authenticated
using (
  id = (select private.get_my_org_id())
);

create policy "organizations_insert"
on public.organizations
for insert
to authenticated
with check (
  id = (select private.get_my_org_id())
);

create policy "organizations_update"
on public.organizations
for update
to authenticated
using (
  id = (select private.get_my_org_id())
)
with check (
  id = (select private.get_my_org_id())
);

-- Pas de DELETE policy sur organizations — la suppression d'une org est une opération admin

-- ============================================================
-- 3. POLITIQUES : profiles
-- Un utilisateur voit les profils de son organisation
-- ============================================================

create policy "profiles_select"
on public.profiles
for select
to authenticated
using (
  organization_id = (select private.get_my_org_id())
);

create policy "profiles_insert"
on public.profiles
for insert
to authenticated
with check (
  id = (select auth.uid())
);

create policy "profiles_update"
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
)
with check (
  id = (select auth.uid())
);

-- ============================================================
-- 4. POLITIQUES : cabinets
-- Un utilisateur voit les cabinets de son organisation
-- Expert-comptable peut créer/modifier, collaborateur lecture seule
-- ============================================================

create policy "cabinets_select"
on public.cabinets
for select
to authenticated
using (
  organization_id = (select private.get_my_org_id())
);

create policy "cabinets_insert"
on public.cabinets
for insert
to authenticated
with check (
  organization_id = (select private.get_my_org_id())
  and (select private.get_my_role()) = 'expert-comptable'
);

create policy "cabinets_update"
on public.cabinets
for update
to authenticated
using (
  organization_id = (select private.get_my_org_id())
  and (select private.get_my_role()) = 'expert-comptable'
)
with check (
  organization_id = (select private.get_my_org_id())
);

-- ============================================================
-- 5. POLITIQUES : user_cabinet_assignments
-- Un utilisateur voit ses propres assignations
-- Expert-comptable peut gérer les assignations de son org
-- ============================================================

create policy "user_cabinet_assignments_select"
on public.user_cabinet_assignments
for select
to authenticated
using (
  cabinet_id in (
    select id from public.cabinets
    where organization_id = (select private.get_my_org_id())
  )
);

create policy "user_cabinet_assignments_insert"
on public.user_cabinet_assignments
for insert
to authenticated
with check (
  cabinet_id in (
    select id from public.cabinets
    where organization_id = (select private.get_my_org_id())
  )
  and (select private.get_my_role()) = 'expert-comptable'
);

create policy "user_cabinet_assignments_delete"
on public.user_cabinet_assignments
for delete
to authenticated
using (
  cabinet_id in (
    select id from public.cabinets
    where organization_id = (select private.get_my_org_id())
  )
  and (select private.get_my_role()) = 'expert-comptable'
);

-- ============================================================
-- 6. POLITIQUES : org_statuses
-- Tous les membres voient les statuts de leur organisation
-- Expert-comptable peut créer/modifier/supprimer (si pas utilisé — bloqué par FK RESTRICT)
-- ============================================================

create policy "org_statuses_select"
on public.org_statuses
for select
to authenticated
using (
  organization_id = (select private.get_my_org_id())
);

create policy "org_statuses_insert"
on public.org_statuses
for insert
to authenticated
with check (
  organization_id = (select private.get_my_org_id())
  and (select private.get_my_role()) = 'expert-comptable'
);

create policy "org_statuses_update"
on public.org_statuses
for update
to authenticated
using (
  organization_id = (select private.get_my_org_id())
  and (select private.get_my_role()) = 'expert-comptable'
)
with check (
  organization_id = (select private.get_my_org_id())
);

create policy "org_statuses_delete"
on public.org_statuses
for delete
to authenticated
using (
  organization_id = (select private.get_my_org_id())
  and (select private.get_my_role()) = 'expert-comptable'
);
-- Note : la FK ON DELETE RESTRICT sur dossiers.status_id bloque la suppression si le statut est utilisé

-- ============================================================
-- 7. POLITIQUES : dossiers — TABLE CENTRALE
-- Expert-comptable : voit TOUS les dossiers de son org
-- Collaborateur : voit UNIQUEMENT les dossiers de ses cabinets assignés
-- ============================================================

create policy "dossiers_select_expert_comptable"
on public.dossiers
for select
to authenticated
using (
  (select private.get_my_role()) = 'expert-comptable'
  and organization_id = (select private.get_my_org_id())
);

create policy "dossiers_select_collaborateur"
on public.dossiers
for select
to authenticated
using (
  (select private.get_my_role()) = 'collaborateur'
  and cabinet_id = any(select private.get_my_cabinet_ids())
);

create policy "dossiers_insert"
on public.dossiers
for insert
to authenticated
with check (
  organization_id = (select private.get_my_org_id())
);

create policy "dossiers_update"
on public.dossiers
for update
to authenticated
using (
  organization_id = (select private.get_my_org_id())
)
with check (
  organization_id = (select private.get_my_org_id())
);

-- Pas de DELETE policy sur dossiers — suppression = opération admin ou via CASCADE uniquement
