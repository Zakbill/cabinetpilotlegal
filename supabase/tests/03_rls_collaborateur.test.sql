-- 03_rls_collaborateur.test.sql — Tests restriction collaborateur aux cabinets assignés
-- Couvre : FOUND-02 (niveau utilisateur), FOUND-03 (JWT claims lus dans RLS)
begin;
select plan(2);

-- Setup fixtures en mode postgres (bypass RLS)
-- Org A
insert into public.organizations (id, name, plan)
values ('00000000-0000-0000-0000-000000000010', 'Cabinet A', 'starter')
on conflict (id) do nothing;

-- Cabinet assigné au collaborateur (cabinet_A)
insert into public.cabinets (id, organization_id, name)
values ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010', 'Cabinet Principal A')
on conflict (id) do nothing;

-- Cabinet NON assigné au collaborateur (cabinet_B, même org)
insert into public.cabinets (id, organization_id, name)
values ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000010', 'Cabinet Secondaire A')
on conflict (id) do nothing;

-- Profile du collaborateur
insert into public.profiles (id, organization_id, role)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'collaborateur')
on conflict (id) do nothing;

-- Assignment : collaborateur → cabinet_A seulement (pas cabinet_B)
insert into public.user_cabinet_assignments (user_id, cabinet_id)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000030')
on conflict do nothing;

-- Dossiers de test
do $$
declare
  v_status_id uuid;
begin
  select id into v_status_id
  from public.org_statuses
  where organization_id = '00000000-0000-0000-0000-000000000010'
  limit 1;

  -- Dossier dans cabinet_A (assigné)
  insert into public.dossiers (organization_id, cabinet_id, type, status_id)
  values ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000030', 'AGO', v_status_id)
  on conflict do nothing;

  -- Dossier dans cabinet_B (non assigné)
  insert into public.dossiers (organization_id, cabinet_id, type, status_id)
  values ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000031', 'AGO', v_status_id)
  on conflict do nothing;
end $$;

-- Simuler un collaborateur avec accès uniquement au cabinet_A (pas cabinet_B)
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000002", "app_metadata": {"org_id": "00000000-0000-0000-0000-000000000010", "role": "collaborateur"}}';

-- Le collaborateur ne doit pas voir les dossiers d'un cabinet non assigné
select is_empty(
  $$ select * from public.dossiers
     where cabinet_id = '00000000-0000-0000-0000-000000000031' $$,
  'FOUND-02/03 : collaborateur ne doit pas voir les dossiers d''un cabinet non assigné'
);

-- Le collaborateur doit voir les dossiers de son cabinet assigné
select isnt_empty(
  $$ select * from public.dossiers
     where cabinet_id = '00000000-0000-0000-0000-000000000030' $$,
  'FOUND-02/03 : collaborateur doit voir les dossiers de ses cabinets assignés'
);

select * from finish();
rollback;
