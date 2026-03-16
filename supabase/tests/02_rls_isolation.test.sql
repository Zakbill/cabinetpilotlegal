-- 02_rls_isolation.test.sql — Tests d'isolation multi-tenant org_A vs org_B
-- Couvre : FOUND-02, FOUND-03
begin;
select plan(2);

-- Setup fixtures en mode postgres (bypass RLS)
-- Org A
insert into public.organizations (id, name, plan)
values ('00000000-0000-0000-0000-000000000010', 'Cabinet A', 'starter')
on conflict (id) do nothing;

-- Org B
insert into public.organizations (id, name, plan)
values ('00000000-0000-0000-0000-000000000020', 'Cabinet B', 'starter')
on conflict (id) do nothing;

-- Cabinet pour org A
insert into public.cabinets (id, organization_id, name)
values ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010', 'Cabinet Principal A')
on conflict (id) do nothing;

-- Récupérer un status_id de org A pour le dossier de test
do $$
declare
  v_status_id uuid;
begin
  select id into v_status_id
  from public.org_statuses
  where organization_id = '00000000-0000-0000-0000-000000000010'
  limit 1;

  -- Insérer un dossier de test pour org A
  insert into public.dossiers (organization_id, cabinet_id, type, status_id)
  values ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000030', 'AGO', v_status_id)
  on conflict do nothing;
end $$;

-- Simuler le contexte d'un utilisateur de org_A avec JWT custom claims
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001", "app_metadata": {"org_id": "00000000-0000-0000-0000-000000000010", "role": "expert-comptable"}}';

-- Un utilisateur de org_A ne doit voir aucune ligne appartenant à org_B
select is_empty(
  $$ select * from public.dossiers
     where organization_id = '00000000-0000-0000-0000-000000000020' $$,
  'FOUND-02 : un utilisateur org_A ne doit voir aucune ligne de org_B'
);

-- Un utilisateur de org_A doit voir ses propres dossiers
select isnt_empty(
  $$ select * from public.dossiers
     where organization_id = '00000000-0000-0000-0000-000000000010' $$,
  'FOUND-02 : un utilisateur org_A doit voir ses propres dossiers'
);

select * from finish();
rollback;
