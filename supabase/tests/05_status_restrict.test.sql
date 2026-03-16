-- 05_status_restrict.test.sql — Test ON DELETE RESTRICT (FOUND-05)
begin;
select plan(1);

-- Setup : créer une org, un statut, un dossier qui référence ce statut
-- puis tenter de supprimer le statut — doit lever une erreur FK 23503

do $$
declare
  v_org_id uuid;
  v_status_id uuid;
  v_dossier_id uuid;
begin
  -- Insérer une organisation de test
  insert into public.organizations (name, plan)
  values ('Test Org Restrict', 'starter')
  returning id into v_org_id;

  -- Récupérer un statut créé par le trigger
  select id into v_status_id
  from public.org_statuses
  where organization_id = v_org_id
  limit 1;

  -- Insérer un cabinet pour cette organisation
  insert into public.cabinets (organization_id, name)
  values (v_org_id, 'Cabinet Test');

  -- Insérer un dossier qui référence ce statut
  insert into public.dossiers (organization_id, cabinet_id, type, status_id)
  select v_org_id, id, 'AGO', v_status_id
  from public.cabinets
  where organization_id = v_org_id
  limit 1
  returning id into v_dossier_id;
end $$;

-- Tenter de supprimer un statut utilisé — doit lever 23503
select throws_ok(
  $$ delete from public.org_statuses
     where id = (
       select status_id from public.dossiers limit 1
     ) $$,
  '23503',
  null,
  'La suppression d''un statut référencé par un dossier doit lever foreign_key_violation (23503)'
);

select * from finish();
rollback;
