-- Migration 006: Create RLS helper functions in private schema
-- Phase 1 — Fondation : Schéma & RLS
-- FOUND-02 : isolation multi-tenant + FOUND-03 : JWT custom claims via app_metadata
--
-- Toutes les fonctions sont :
--   - SECURITY DEFINER : s'exécutent avec les droits du créateur (bypass RLS sur tables internes)
--   - STABLE : PostgreSQL peut les mettre en cache (optimisation initPlan)
--   - Dans schéma private : non exposées via PostgREST — empêche l'appel direct par les clients
--
-- Usage dans les politiques RLS : toujours avec (select private.fn()) pour forcer le cache initPlan
-- Benchmark Supabase : jusqu'à 95% d'amélioration vs appel direct sans wrapping select

-- Créer le schéma private (non exposé via PostgREST par défaut)
create schema if not exists private;

-- Fonction 1 : retourne l'org_id de l'utilisateur courant depuis JWT app_metadata
-- Retourne NULL si le JWT est absent, malformé, ou si le claim org_id est manquant
create or replace function private.get_my_org_id()
returns uuid
language sql
security definer
stable
as $$
  select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
$$;

-- Fonction 2 : retourne le role de l'utilisateur courant depuis JWT app_metadata
-- Valeurs attendues : 'expert-comptable' ou 'collaborateur'
-- Retourne NULL si le JWT est absent ou si le claim role est manquant
create or replace function private.get_my_role()
returns text
language sql
security definer
stable
as $$
  select auth.jwt() -> 'app_metadata' ->> 'role'
$$;

-- Fonction 3 : retourne le tableau des cabinet_id assignés à l'utilisateur courant
-- Lit public.user_cabinet_assignments via SECURITY DEFINER (bypass RLS sur cette table)
-- Le wrapping (select auth.uid()) force le cache initPlan pour auth.uid()
-- Retourne un tableau vide (pas NULL) si aucun cabinet assigné
create or replace function private.get_my_cabinet_ids()
returns uuid[]
language sql
security definer
stable
as $$
  select coalesce(array_agg(cabinet_id), '{}')
  from public.user_cabinet_assignments
  where user_id = (select auth.uid())
$$;

comment on function private.get_my_org_id() is 'RLS helper — lit org_id depuis JWT app_metadata. Usage : (select private.get_my_org_id())';
comment on function private.get_my_role() is 'RLS helper — lit role depuis JWT app_metadata. Usage : (select private.get_my_role())';
comment on function private.get_my_cabinet_ids() is 'RLS helper — retourne uuid[] des cabinets assignés. Usage : cabinet_id = any(select private.get_my_cabinet_ids())';
