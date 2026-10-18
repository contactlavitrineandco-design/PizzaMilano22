-- =====================================================================
-- Espace gérant : modifier le site avec un code d'accès
--
-- Le gérant ouvre /gerant et saisit son code. Le site vérifie le code ici,
-- en base, puis lui ouvre une session de 12 h (cookie signé côté serveur).
-- Toutes les modifications passent ensuite par le serveur Next.js avec la
-- clé de service ; rien n'est modifiable avec la clé publique.
--
-- - Le code est stocké chiffré (bcrypt), jamais en clair.
-- - 5 erreurs en 15 minutes depuis un même appareil, ou 30 au total,
--   bloquent les essais pendant 15 minutes.
-- - Changer le code ferme toutes les sessions ouvertes (version).
-- - Code initial : 220000. Le site affiche un rappel tant qu'il n'est pas changé.
--
-- L'ancien espace restaurant (comptes Supabase + table staff) n'est plus
-- utilisé par le site ; la table staff reste pour les règles d'accès existantes.
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.admin_access (
  id         smallint primary key default 1 check (id = 1),
  code_hash  text not null,
  is_default boolean not null default true,
  version    integer not null default 1,
  updated_at timestamptz not null default now()
);

create table public.admin_login_attempts (
  id           bigint generated always as identity primary key,
  client       text not null check (char_length(client) between 1 and 64),
  attempted_at timestamptz not null default now()
);
create index admin_login_attempts_client_idx on public.admin_login_attempts (client, attempted_at);
create index admin_login_attempts_time_idx on public.admin_login_attempts (attempted_at);

-- Aucune policy : ces tables ne sont lisibles qu'à travers les fonctions ci-dessous.
alter table public.admin_access enable row level security;
alter table public.admin_login_attempts enable row level security;
revoke all on public.admin_access, public.admin_login_attempts from anon, authenticated;

insert into public.admin_access (id, code_hash)
values (1, extensions.crypt('220000', extensions.gen_salt('bf', 10)))
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Vérification du code. p_client : empreinte de l'appareil (calculée par le serveur).
-- Renvoie {"status": "OK"|"WRONG"|"LOCKED", "remaining": n, "version": v}
-- ---------------------------------------------------------------------
create or replace function public.verify_admin_code(p_code text, p_client text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_access  public.admin_access;
  v_client  integer;
  v_global  integer;
begin
  if p_client is null or char_length(p_client) not between 1 and 64 then
    raise exception 'INVALID_CLIENT';
  end if;
  delete from public.admin_login_attempts where attempted_at < now() - interval '1 day';

  select count(*) into v_client from public.admin_login_attempts
  where client = p_client and attempted_at > now() - interval '15 minutes';
  select count(*) into v_global from public.admin_login_attempts
  where attempted_at > now() - interval '15 minutes';
  if v_client >= 5 or v_global >= 30 then
    return jsonb_build_object('status', 'LOCKED');
  end if;

  select * into v_access from public.admin_access where id = 1;
  if v_access.code_hash is null or p_code is null or p_code !~ '^[0-9]{6,12}$'
     or extensions.crypt(p_code, v_access.code_hash) <> v_access.code_hash then
    insert into public.admin_login_attempts (client) values (p_client);
    if v_client + 1 >= 5 then
      return jsonb_build_object('status', 'LOCKED');
    end if;
    return jsonb_build_object('status', 'WRONG', 'remaining', 4 - v_client);
  end if;

  delete from public.admin_login_attempts where client = p_client;
  return jsonb_build_object('status', 'OK', 'version', v_access.version, 'is_default', v_access.is_default);
end;
$$;

-- Version actuelle du code (une session ouverte avant un changement de code n'est plus valable).
create or replace function public.admin_code_state()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('version', version, 'is_default', is_default) from public.admin_access where id = 1;
$$;

-- Changer le code : il faut l'ancien. Renvoie OK, WRONG ou INVALID.
create or replace function public.set_admin_code(p_current text, p_new text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
begin
  if p_new is null or p_new !~ '^[0-9]{6,12}$' then
    return 'INVALID';
  end if;
  select code_hash into v_hash from public.admin_access where id = 1 for update;
  if p_current is null or extensions.crypt(p_current, v_hash) <> v_hash then
    return 'WRONG';
  end if;
  if p_new = p_current then
    return 'INVALID';
  end if;
  update public.admin_access
  set code_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 10)),
      is_default = false,
      version = version + 1,
      updated_at = now()
  where id = 1;
  return 'OK';
end;
$$;

revoke execute on function public.verify_admin_code(text, text) from public, anon, authenticated;
revoke execute on function public.admin_code_state()            from public, anon, authenticated;
revoke execute on function public.set_admin_code(text, text)    from public, anon, authenticated;
grant  execute on function public.verify_admin_code(text, text) to service_role;
grant  execute on function public.admin_code_state()            to service_role;
grant  execute on function public.set_admin_code(text, text)    to service_role;
