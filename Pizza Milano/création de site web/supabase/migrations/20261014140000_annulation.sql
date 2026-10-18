-- =====================================================================
-- Annulation d'une commande par le client
--
-- Chaque commande reçoit un jeton secret (cancel_token), donné uniquement
-- au client qui l'a passée (écran de confirmation + lien de suivi).
-- Avec ce jeton, le client peut suivre sa commande et l'annuler tant que
-- le pizzaïolo ne l'a pas lancée (statut « new »). Ensuite, il faut appeler.
-- Le jeton n'est jamais lisible par la clé publique (RLS + droits de table).
-- =====================================================================

alter table public.orders
  add column cancel_token uuid not null default gen_random_uuid(),
  add column cancelled_at timestamptz,
  add column cancelled_by text check (cancelled_by is null or cancelled_by in ('client', 'restaurant'));

create unique index orders_cancel_token_idx on public.orders (cancel_token);

alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('new', 'prep', 'ready', 'done', 'cancelled'));

-- ---------------------------------------------------------------------
-- Annulation par le client (appelée par le serveur Next.js, clé service)
-- Renvoie : CANCELLED | ALREADY_CANCELLED | TOO_LATE | NOT_FOUND
-- ---------------------------------------------------------------------
create or replace function public.cancel_order_by_token(p_token uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select o.status into v_status from public.orders o where o.cancel_token = p_token for update;
  if not found then
    return 'NOT_FOUND';
  end if;
  if v_status = 'cancelled' then
    return 'ALREADY_CANCELLED';
  end if;
  if v_status <> 'new' then
    return 'TOO_LATE';
  end if;
  update public.orders
  set status = 'cancelled', cancelled_at = now(), cancelled_by = 'client'
  where cancel_token = p_token;
  return 'CANCELLED';
end;
$$;

revoke execute on function public.cancel_order_by_token(uuid) from public, anon, authenticated;
grant  execute on function public.cancel_order_by_token(uuid) to service_role;

-- ---------------------------------------------------------------------
-- Statuts côté restaurant : le personnel peut aussi annuler (client au
-- téléphone), mais une commande annulée ne repart pas en cuisine.
-- ---------------------------------------------------------------------
create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current text;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;
  if p_status not in ('new', 'prep', 'ready', 'done', 'cancelled') then
    raise exception 'INVALID_STATUS';
  end if;
  select status into v_current from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_current = 'cancelled' then
    raise exception 'ORDER_CANCELLED';
  end if;
  update public.orders
  set status = p_status,
      cancelled_at = case when p_status = 'cancelled' then now() else null end,
      cancelled_by = case when p_status = 'cancelled' then 'restaurant' else null end
  where id = p_order_id;
end;
$$;
