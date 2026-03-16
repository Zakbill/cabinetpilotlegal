-- Migration 009: Auto-create profile on auth.users INSERT
-- Phase 2 — Authentification & RBAC

-- Fonction trigger : crée un profil minimal (id seulement) à chaque nouvel utilisateur auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;  -- idempotent : si profil déjà présent, ne pas crasher
  return new;
end;
$$;

-- Trigger : après chaque INSERT dans auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

comment on function public.handle_new_user() is 'Crée automatiquement un profil minimal dans public.profiles lors de l''inscription ou invitation d''un utilisateur.';
