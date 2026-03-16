-- pgTAP tests: profiles trigger on auth.users insert
-- Phase 2 — AUTH-01

begin;
select plan(2);

-- Test 1: trigger exists
select trigger_is(
  'auth', 'users', 'on_auth_user_created',
  'public', 'handle_new_user',
  'trigger on_auth_user_created existe sur auth.users'
);

-- Test 2: inserting into auth.users creates a profile
do $$
declare
  v_user_id uuid := gen_random_uuid();
begin
  -- Insérer un utilisateur minimal dans auth.users
  insert into auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, aud, role
  ) values (
    v_user_id, 'test-trigger@cabinetpilot.test', '', now(),
    '{}'::jsonb, '{}'::jsonb,
    now(), now(), 'authenticated', 'authenticated'
  );
end;
$$;

select results_eq(
  'select count(*)::int from public.profiles where id = (select id from auth.users where email = ''test-trigger@cabinetpilot.test'')',
  array[1],
  'le trigger crée automatiquement un profil dans public.profiles'
);

select * from finish();
rollback;
