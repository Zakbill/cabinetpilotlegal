-- pgTAP tests: onboarding columns in profiles
-- Phase 2 — AUTH-01, AUTH-02

begin;
select plan(4);

-- Test 1: is_complete column exists with correct type
select col_type_is(
  'public', 'profiles', 'is_complete',
  'boolean',
  'profiles.is_complete est de type boolean'
);

-- Test 2: is_complete default is false
select col_default_is(
  'public', 'profiles', 'is_complete',
  'false',
  'profiles.is_complete a pour défaut false'
);

-- Test 3: current_onboarding_step column exists with correct type
select col_type_is(
  'public', 'profiles', 'current_onboarding_step',
  'integer',
  'profiles.current_onboarding_step est de type integer'
);

-- Test 4: current_onboarding_step default is 1
select col_default_is(
  'public', 'profiles', 'current_onboarding_step',
  '1',
  'profiles.current_onboarding_step a pour défaut 1'
);

select * from finish();
rollback;
