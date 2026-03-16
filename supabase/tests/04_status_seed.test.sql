-- 04_status_seed.test.sql — Tests du trigger de pré-chargement des 13 statuts
-- Couvre : FOUND-04
--
-- NOTE SYNTAXE : pgTAP s'exécute en contexte SQL pur — DECLARE et RETURNING...INTO
-- ne sont valides qu'à l'intérieur d'un bloc DO $$. Pour éviter cette erreur, toutes
-- les assertions utilisent un sous-SELECT sur le nom de l'organisation au lieu d'une
-- variable locale.
begin;
select plan(16);

-- Insérer une nouvelle organisation — le trigger doit pré-charger 13 statuts
insert into public.organizations (name, plan)
values ('Test Org Statuses', 'starter');

-- Vérifier le compte total : exactement 13 statuts
select is(
  (select count(*)::int from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')),
  13,
  'FOUND-04 : le trigger doit créer exactement 13 statuts par organisation'
);

-- Vérifier le compte des statuts normaux : 7
select is(
  (select count(*)::int from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')
     and type = 'normal'),
  7,
  'FOUND-04 : 7 statuts normaux doivent être créés'
);

-- Vérifier le compte des statuts terminaux : 6
select is(
  (select count(*)::int from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')
     and type = 'terminal'),
  6,
  'FOUND-04 : 6 statuts terminaux doivent être créés'
);

-- Vérifier les labels exacts et display_order des 7 statuts normaux
select is(
  (select label from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')
     and display_order = 1),
  'Non commencé',
  'FOUND-04 : statut order 1 = Non commencé'
);
select is(
  (select label from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')
     and display_order = 2),
  'Rédaction PV',
  'FOUND-04 : statut order 2 = Rédaction PV'
);
select is(
  (select label from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')
     and display_order = 3),
  'Envoyé au client',
  'FOUND-04 : statut order 3 = Envoyé au client'
);
select is(
  (select label from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')
     and display_order = 4),
  'PV Signé',
  'FOUND-04 : statut order 4 = PV Signé'
);
select is(
  (select label from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')
     and display_order = 5),
  'PV / Comptes déposés',
  'FOUND-04 : statut order 5 = PV / Comptes déposés'
);
select is(
  (select label from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')
     and display_order = 6),
  'Attente récépissé',
  'FOUND-04 : statut order 6 = Attente récépissé'
);
select is(
  (select label from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')
     and display_order = 7),
  'Terminé',
  'FOUND-04 : statut order 7 = Terminé (dernier normal)'
);

-- Vérifier les labels exacts des 6 statuts terminaux
select is(
  (select label from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')
     and display_order = 8),
  'Non déposé (à la demande du client)',
  'FOUND-04 : statut order 8 = Non déposé (à la demande du client)'
);
select is(
  (select label from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')
     and display_order = 9),
  'Fait par avocat',
  'FOUND-04 : statut order 9 = Fait par avocat'
);
select is(
  (select label from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')
     and display_order = 10),
  'Fait par ancien cabinet',
  'FOUND-04 : statut order 10 = Fait par ancien cabinet'
);
select is(
  (select label from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')
     and display_order = 11),
  'Dépôt non obligatoire (Société civile)',
  'FOUND-04 : statut order 11 = Dépôt non obligatoire (Société civile)'
);
select is(
  (select label from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')
     and display_order = 12),
  'Société en liquidation',
  'FOUND-04 : statut order 12 = Société en liquidation'
);
select is(
  (select label from public.org_statuses
   where organization_id = (select id from public.organizations where name = 'Test Org Statuses')
     and display_order = 13),
  'Absence mission juridique',
  'FOUND-04 : statut order 13 = Absence mission juridique'
);

select * from finish();
rollback;
