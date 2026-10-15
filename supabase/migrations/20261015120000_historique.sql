-- =====================================================================
-- Historique des commandes (espace restaurateur) et protection des données
--
-- 1. Double authentification (code à 6 chiffres sur le téléphone) exigée
--    pour lire l'historique : un mot de passe volé ne suffit pas.
-- 2. Le personnel (rôle « staff ») ne voit plus que les commandes d'hier et
--    d'aujourd'hui. L'historique complet est réservé à l'administrateur
--    connecté avec la double authentification.
-- 3. Conservation : nom, téléphone et remarque du client sont effacés
--    (anonymisation) au bout de 12 mois ; les montants et articles restent
--    10 ans, durée de conservation des pièces comptables (Code de commerce,
--    art. L123-22). Ils sont ensuite supprimés.
-- 4. Fonctions de recherche, de récapitulatif et d'export, sans clé de
--    service : elles s'exécutent avec les droits de l'utilisateur (RLS).
-- 5. Taux de TVA facultatifs (à confirmer avec le comptable) et journal des
--    exports.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Double authentification
-- ---------------------------------------------------------------------
-- Niveau d'authentification de la session : « aal2 » = mot de passe + code.
create or replace function public.has_mfa()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create or replace function public.is_admin_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() and public.has_mfa();
$$;

revoke execute on function public.has_mfa()      from public, anon;
revoke execute on function public.is_admin_mfa() from public, anon;
grant  execute on function public.has_mfa()      to authenticated;
grant  execute on function public.is_admin_mfa() to authenticated;

-- ---------------------------------------------------------------------
-- 2. Lecture des commandes
-- ---------------------------------------------------------------------
drop policy if exists "Personnel lit les commandes" on public.orders;
drop policy if exists "Personnel lit les lignes de commande" on public.order_items;

create policy "Personnel lit les commandes récentes" on public.orders
  for select to authenticated
  using (public.is_staff() and order_date >= (now() at time zone 'Europe/Paris')::date - 1);

create policy "Administrateur (double authentification) lit l'historique" on public.orders
  for select to authenticated
  using (public.is_admin_mfa());

-- Une ligne de commande est visible si sa commande l'est (la RLS de orders s'applique).
create policy "Lignes visibles avec leur commande" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));

-- Changer le statut d'une ancienne commande (oubli de clôture, par exemple)
-- demande aussi l'administrateur avec double authentification.
create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current text;
  v_date date;
  v_anonymized timestamptz;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;
  if p_status not in ('new', 'prep', 'ready', 'done', 'cancelled') then
    raise exception 'INVALID_STATUS';
  end if;
  select status, order_date, anonymized_at into v_current, v_date, v_anonymized
  from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_date < (now() at time zone 'Europe/Paris')::date - 1 and not public.is_admin_mfa() then
    raise exception 'FORBIDDEN';
  end if;
  if v_anonymized is not null then
    raise exception 'ORDER_ARCHIVED';
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

-- ---------------------------------------------------------------------
-- 3. Conservation des données
-- ---------------------------------------------------------------------
alter table public.orders add column if not exists anonymized_at timestamptz;
alter table public.orders alter column customer_phone drop not null;
alter table public.orders drop constraint if exists orders_customer_phone_check;
alter table public.orders add constraint orders_customer_phone_check
  check (customer_phone is null or customer_phone ~ '^0[1-9]( [0-9]{2}){4}$');
alter table public.orders add constraint orders_anonymized_consistency
  check (anonymized_at is null or customer_phone is null);

create index if not exists orders_date_idx on public.orders (order_date, pickup_time);
create index if not exists orders_created_anon_idx on public.orders (created_at) where anonymized_at is null;
create index if not exists order_items_product_idx on public.order_items (product_id);

-- Même nom et même paramètre qu'avant : la tâche planifiée (4 h 15) reste valable.
-- Renvoie le nombre de commandes anonymisées.
create or replace function public.purge_old_orders(p_months integer default 12)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_months < 1 then
    raise exception 'INVALID_MONTHS';
  end if;
  -- Données personnelles : effacées au bout de p_months mois.
  -- Le jeton de suivi est remplacé : l'ancien lien client ne fonctionne plus.
  update public.orders
  set customer_name = 'Client anonymisé',
      customer_phone = null,
      note = '',
      cancel_token = gen_random_uuid(),
      anonymized_at = now()
  where anonymized_at is null
    and created_at < now() - make_interval(months => p_months);
  get diagnostics v_count = row_count;
  -- Données comptables : supprimées au bout de 10 ans.
  delete from public.orders where created_at < now() - interval '10 years';
  delete from public.order_counters where day < (now() at time zone 'Europe/Paris')::date - 7;
  delete from public.admin_audit where created_at < now() - interval '12 months';
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- 5a. Journal des exports et des réglages comptables
-- ---------------------------------------------------------------------
create table if not exists public.admin_audit (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  action     text not null check (action in ('export_summary', 'export_lines', 'set_vat_rates')),
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit enable row level security;
create policy "Administrateur (double authentification) lit le journal" on public.admin_audit
  for select to authenticated using (public.is_admin_mfa());
revoke all on public.admin_audit from anon;
revoke insert, update, delete, truncate on public.admin_audit from authenticated;

-- Fonction recréée après la table, qu'elle référence.
create or replace function public.log_admin_action(p_action text, p_details jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin_mfa() then
    raise exception 'FORBIDDEN';
  end if;
  if p_action not in ('export_summary', 'export_lines') then
    raise exception 'INVALID_ACTION';
  end if;
  if octet_length(coalesce(p_details, '{}'::jsonb)::text) > 500 then
    raise exception 'INVALID_DETAILS';
  end if;
  insert into public.admin_audit (user_id, action, details)
  values (auth.uid(), p_action, coalesce(p_details, '{}'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------
-- 5b. Taux de TVA (facultatifs, vides par défaut)
-- ---------------------------------------------------------------------
alter table public.restaurant_settings
  add column if not exists vat_rate_food   numeric(4,2) check (vat_rate_food   is null or vat_rate_food   in (0, 2.1, 5.5, 10, 20)),
  add column if not exists vat_rate_drinks numeric(4,2) check (vat_rate_drinks is null or vat_rate_drinks in (0, 2.1, 5.5, 10, 20));

create or replace function public.set_vat_rates(p_food numeric, p_drinks numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin_mfa() then
    raise exception 'FORBIDDEN';
  end if;
  if (p_food is not null and p_food not in (0, 2.1, 5.5, 10, 20))
     or (p_drinks is not null and p_drinks not in (0, 2.1, 5.5, 10, 20)) then
    raise exception 'INVALID_RATE';
  end if;
  update public.restaurant_settings set vat_rate_food = p_food, vat_rate_drinks = p_drinks where id = 1;
  insert into public.admin_audit (user_id, action, details)
  values (auth.uid(), 'set_vat_rates', jsonb_build_object('food', p_food, 'drinks', p_drinks));
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Recherche, récapitulatif, export
-- ---------------------------------------------------------------------
-- Groupes de statut : all, done (récupérées), open (non clôturées), cancelled.
create or replace function public.search_orders(
  p_from   date,
  p_to     date,
  p_status text    default 'all',
  p_q      text    default '',
  p_sort   text    default 'date',
  p_desc   boolean default true,
  p_limit  integer default 50,
  p_offset integer default 0
)
returns table (
  id             uuid,
  order_date     date,
  order_number   integer,
  customer_name  text,
  phone_hint     text,
  pickup_time    timestamptz,
  status         text,
  payment_status text,
  total          numeric,
  items          text,
  cancelled_by   text,
  anonymized     boolean,
  total_count    bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_q text := btrim(coalesce(p_q, ''));
  v_like text;
  v_num integer;
begin
  if not public.is_admin_mfa() then
    raise exception 'FORBIDDEN';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 3700 then
    raise exception 'INVALID_RANGE';
  end if;
  if p_status not in ('all', 'done', 'open', 'cancelled') then
    raise exception 'INVALID_STATUS';
  end if;
  if p_sort not in ('date', 'number', 'total', 'name') then
    raise exception 'INVALID_SORT';
  end if;
  if char_length(v_q) > 40 or p_limit not between 1 and 200 or p_offset < 0 then
    raise exception 'INVALID_INPUT';
  end if;
  -- Recherche littérale : % et _ neutralisés
  v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  if v_q ~ '^#?[0-9]{1,6}$' then
    v_num := ltrim(v_q, '#')::integer;
  end if;

  return query
  select o.id, o.order_date, o.order_number, o.customer_name,
         case when o.customer_phone is null then null
              else left(o.customer_phone, 2) || ' •• •• •• ' || right(o.customer_phone, 2) end,
         o.pickup_time, o.status, o.payment_status, o.total,
         (select string_agg(i.quantity || '× ' || i.product_name
                   || coalesce(' (' || i.meat || ')', '')
                   || coalesce(' + ' || i.supplement_name, ''), ', ' order by i.created_at)
            from public.order_items i where i.order_id = o.id),
         o.cancelled_by,
         o.anonymized_at is not null,
         count(*) over ()
  from public.orders o
  where o.order_date between p_from and p_to
    and (p_status = 'all'
         or (p_status = 'done' and o.status = 'done')
         or (p_status = 'cancelled' and o.status = 'cancelled')
         or (p_status = 'open' and o.status in ('new', 'prep', 'ready')))
    and (v_q = ''
         or o.order_number = v_num
         or o.customer_name ilike v_like
         or exists (select 1 from public.order_items i where i.order_id = o.id and i.product_name ilike v_like))
  order by
    case when p_sort = 'date'   and not p_desc then o.pickup_time end asc,
    case when p_sort = 'date'   and p_desc     then o.pickup_time end desc,
    case when p_sort = 'number' and not p_desc then o.order_date end asc,
    case when p_sort = 'number' and p_desc     then o.order_date end desc,
    case when p_sort = 'number' and not p_desc then o.order_number end asc,
    case when p_sort = 'number' and p_desc     then o.order_number end desc,
    case when p_sort = 'total'  and not p_desc then o.total end asc,
    case when p_sort = 'total'  and p_desc     then o.total end desc,
    case when p_sort = 'name'   and not p_desc then lower(o.customer_name) end asc,
    case when p_sort = 'name'   and p_desc     then lower(o.customer_name) end desc,
    o.pickup_time desc, o.id
  limit p_limit offset p_offset;
end;
$$;

-- Récapitulatif d'une période. p_group : 'day' ou 'month'.
-- Le chiffre d'affaires ne compte que les commandes récupérées (statut done).
create or replace function public.order_report(p_from date, p_to date, p_group text default 'month')
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not public.is_admin_mfa() then
    raise exception 'FORBIDDEN';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 3700 then
    raise exception 'INVALID_RANGE';
  end if;
  if p_group not in ('day', 'month') then
    raise exception 'INVALID_GROUP';
  end if;

  with o as (
    select * from public.orders where order_date between p_from and p_to
  ),
  lines as (
    select o.order_date, o.status, i.product_name, p.category, i.quantity, i.line_total
    from o
    join public.order_items i on i.order_id = o.id
    join public.products p on p.id = i.product_id
  ),
  periods as (
    select case when p_group = 'day' then o.order_date else date_trunc('month', o.order_date)::date end as period,
           count(*) filter (where o.status = 'done')                           as done_count,
           coalesce(sum(o.total) filter (where o.status = 'done'), 0)          as done_total,
           count(*) filter (where o.status = 'cancelled')                      as cancelled_count,
           count(*) filter (where o.status in ('new', 'prep', 'ready'))        as open_count,
           coalesce(sum(o.total) filter (where o.status in ('new', 'prep', 'ready')), 0) as open_total
    from o group by 1
  ),
  period_cat as (
    select case when p_group = 'day' then l.order_date else date_trunc('month', l.order_date)::date end as period,
           coalesce(sum(l.line_total) filter (where l.category <> 'boisson'), 0) as food_total,
           coalesce(sum(l.line_total) filter (where l.category = 'boisson'), 0)  as drinks_total
    from lines l where l.status = 'done' group by 1
  )
  select jsonb_build_object(
    'summary', (
      select jsonb_build_object(
        'done_count',      count(*) filter (where status = 'done'),
        'done_total',      coalesce(sum(total) filter (where status = 'done'), 0),
        'cancelled_count', count(*) filter (where status = 'cancelled'),
        'open_count',      count(*) filter (where status in ('new', 'prep', 'ready')),
        'open_total',      coalesce(sum(total) filter (where status in ('new', 'prep', 'ready')), 0),
        'food_total',      (select coalesce(sum(line_total), 0) from lines where status = 'done' and category <> 'boisson'),
        'drinks_total',    (select coalesce(sum(line_total), 0) from lines where status = 'done' and category = 'boisson'),
        'anonymized_count', count(*) filter (where anonymized_at is not null))
      from o),
    'periods', coalesce((
      select jsonb_agg(jsonb_build_object(
               'period', p.period, 'done_count', p.done_count, 'done_total', p.done_total,
               'food_total', coalesce(c.food_total, 0), 'drinks_total', coalesce(c.drinks_total, 0),
               'cancelled_count', p.cancelled_count, 'open_count', p.open_count, 'open_total', p.open_total)
             order by p.period)
      from periods p left join period_cat c on c.period = p.period), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'quantity', q, 'total', t) order by t desc)
      from (select category, sum(quantity) q, sum(line_total) t from lines where status = 'done' group by category) x), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object('name', product_name, 'category', category, 'quantity', q, 'total', t) order by t desc, product_name)
      from (select product_name, category, sum(quantity) q, sum(line_total) t from lines where status = 'done' group by product_name, category) x), '[]'::jsonb)
  ) into v;
  return v;
end;
$$;

-- Détail des ventes, ligne par ligne, SANS donnée personnelle (pour le comptable).
create or replace function public.export_order_lines(p_from date, p_to date)
returns table (
  order_date     date,
  order_number   integer,
  pickup_time    timestamptz,
  status         text,
  product_name   text,
  category       text,
  meat           text,
  supplement     text,
  quantity       integer,
  unit_price     numeric,
  line_total     numeric,
  order_total    numeric,
  line_id        uuid
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin_mfa() then
    raise exception 'FORBIDDEN';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 3700 then
    raise exception 'INVALID_RANGE';
  end if;
  return query
  select o.order_date, o.order_number, o.pickup_time, o.status, i.product_name, p.category,
         i.meat, i.supplement_name, i.quantity, i.unit_price, i.line_total, o.total, i.id
  from public.orders o
  join public.order_items i on i.order_id = o.id
  join public.products p on p.id = i.product_id
  where o.order_date between p_from and p_to
  order by o.order_date, o.order_number, i.created_at, i.id;
end;
$$;

revoke execute on function public.search_orders(date, date, text, text, text, boolean, integer, integer) from public, anon;
revoke execute on function public.order_report(date, date, text)       from public, anon;
revoke execute on function public.export_order_lines(date, date)       from public, anon;
revoke execute on function public.log_admin_action(text, jsonb)        from public, anon;
revoke execute on function public.set_vat_rates(numeric, numeric)      from public, anon;
grant  execute on function public.search_orders(date, date, text, text, text, boolean, integer, integer) to authenticated;
grant  execute on function public.order_report(date, date, text)       to authenticated;
grant  execute on function public.export_order_lines(date, date)       to authenticated;
grant  execute on function public.log_admin_action(text, jsonb)        to authenticated;
grant  execute on function public.set_vat_rates(numeric, numeric)      to authenticated;
