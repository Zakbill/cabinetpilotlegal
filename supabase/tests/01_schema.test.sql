-- 01_schema.test.sql — Tests de structure du schéma
-- Couvre : FOUND-01 (champs AGO nullables), FOUND-05 (ON DELETE RESTRICT via colonnes)
begin;
select plan(11);

-- FOUND-01 : la table dossiers existe avec les bonnes colonnes
select has_table('public', 'dossiers', 'La table dossiers doit exister');
select has_column('public', 'dossiers', 'type', 'dossiers doit avoir un champ type');
select has_column('public', 'dossiers', 'task_uid', 'dossiers doit avoir un champ task_uid');
select col_is_null('public', 'dossiers', 'date_cloture', 'date_cloture doit être nullable (champ AGO-spécifique)');
select col_is_null('public', 'dossiers', 'date_echeance', 'date_echeance doit être nullable (champ AGO-spécifique)');
select col_is_null('public', 'dossiers', 'forme_juridique', 'forme_juridique doit être nullable (champ AGO-spécifique)');
select col_is_null('public', 'dossiers', 'siren', 'siren doit être nullable (champ AGO-spécifique)');
select col_is_null('public', 'dossiers', 'id_pennylane', 'id_pennylane doit être nullable (champ AGO-spécifique)');
select col_is_null('public', 'dossiers', 'regime_fiscal', 'regime_fiscal doit être nullable (champ AGO-spécifique)');
select col_is_null('public', 'dossiers', 'statut_exercice_pl', 'statut_exercice_pl doit être nullable (champ AGO-spécifique)');

-- FOUND-05 : la FK status_id référence org_statuses
select col_is_fk('public', 'dossiers', 'status_id', 'dossiers.status_id doit être une FK vers org_statuses');

select * from finish();
rollback;
