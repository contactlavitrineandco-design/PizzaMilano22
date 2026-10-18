-- =====================================================================
-- Horaires réels (plage de nuit le dimanche) et Instagram
--
-- 1. Horaires repris du compte Instagram @milanopizza22 (15/10/2026) :
--    lundi fermé ; mardi au samedi 11 h – 15 h et 18 h – 23 h 30 ;
--    dimanche 18 h – 2 h. Une plage dont la fermeture est plus tôt que
--    l'ouverture se termine le lendemain (dimanche 18:00 → lundi 02:00).
-- 2. « Journée de service » : elle se termine à 6 h du matin. Une commande
--    passée à 1 h dans la nuit de dimanche compte pour le dimanche
--    (numéro de commande, tableau du jour) : pas de doublon de numéro.
-- 3. Lien Instagram.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 2. Journée de service
-- ---------------------------------------------------------------------
create or replace function public.business_date(p_at timestamptz default now())
returns date
language sql
stable
set search_path = ''
as $$
  select case when (p_at at time zone 'Europe/Paris')::time < time '06:00'
              then (p_at at time zone 'Europe/Paris')::date - 1
              else (p_at at time zone 'Europe/Paris')::date end;
$$;
grant execute on function public.business_date(timestamptz) to anon, authenticated, service_role;

alter table public.orders alter column order_date set default public.business_date(now());

-- ---------------------------------------------------------------------
-- 1. Plages qui passent minuit
-- ---------------------------------------------------------------------
create or replace function public.is_valid_opening_hours(p jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_day text;
  v_range jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    return false;
  end if;
  foreach v_day in array array['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] loop
    if not (p ? v_day) or jsonb_typeof(p -> v_day) <> 'array' then
      return false;
    end if;
    for v_range in select * from jsonb_array_elements(p -> v_day) loop
      if jsonb_typeof(v_range) <> 'object'
         or coalesce(v_range ->> 'open', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
         or coalesce(v_range ->> 'close', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
         or (v_range ->> 'open') = (v_range ->> 'close')
         -- une plage de nuit doit finir au plus tard à 6 h (fin de la journée de service)
         or ((v_range ->> 'close')::time < (v_range ->> 'open')::time and (v_range ->> 'close')::time > time '06:00') then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end;
$$;

-- On peut commander pendant une plage ouverte (celles de la veille qui passent
-- minuit comptent). Le retrait doit tomber dans une plage de la même journée
-- de service, au moins min_prep_minutes après maintenant.
create or replace function public.check_order_window(
  p_settings public.restaurant_settings,
  p_now      timestamptz,
  p_pickup   timestamptz
)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_now   timestamp := p_now at time zone 'Europe/Paris';
  v_pick  timestamp := p_pickup at time zone 'Europe/Paris';
  v_keys  text[] := array['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  v_d     date;
  v_range jsonb;
  v_start timestamp;
  v_end   timestamp;
  v_service date;
  v_pick_ok boolean := false;
begin
  if not p_settings.online_orders_open then
    return 'ORDERS_CLOSED';
  end if;
  -- 2 minutes de tolérance pour l'écart entre le serveur web et la base
  if p_pickup < p_now + make_interval(mins => p_settings.min_prep_minutes - 2) then
    return 'PICKUP_TOO_SOON';
  end if;
  foreach v_d in array array[v_now::date - 1, v_now::date] loop
    for v_range in select * from jsonb_array_elements(coalesce(p_settings.opening_hours -> v_keys[extract(isodow from v_d)::int], '[]'::jsonb)) loop
      v_start := v_d + (v_range ->> 'open')::time;
      v_end := v_d + (v_range ->> 'close')::time;
      if v_end <= v_start then v_end := v_end + interval '1 day'; end if;
      if v_now >= v_start and v_now < v_end then
        v_service := v_d;
      end if;
    end loop;
  end loop;
  if v_service is null then
    return 'OUTSIDE_OPENING_HOURS';
  end if;
  for v_range in select * from jsonb_array_elements(coalesce(p_settings.opening_hours -> v_keys[extract(isodow from v_service)::int], '[]'::jsonb)) loop
    v_start := v_service + (v_range ->> 'open')::time;
    v_end := v_service + (v_range ->> 'close')::time;
    if v_end <= v_start then v_end := v_end + interval '1 day'; end if;
    if v_pick >= v_start and v_pick <= v_end then
      v_pick_ok := true;
    end if;
  end loop;
  if not v_pick_ok then
    return 'PICKUP_OUTSIDE_HOURS';
  end if;
  return null;
end;
$$;

update public.restaurant_settings set
  opening_hours = '{
    "monday":    [],
    "tuesday":   [{"open": "11:00", "close": "15:00"}, {"open": "18:00", "close": "23:30"}],
    "wednesday": [{"open": "11:00", "close": "15:00"}, {"open": "18:00", "close": "23:30"}],
    "thursday":  [{"open": "11:00", "close": "15:00"}, {"open": "18:00", "close": "23:30"}],
    "friday":    [{"open": "11:00", "close": "15:00"}, {"open": "18:00", "close": "23:30"}],
    "saturday":  [{"open": "11:00", "close": "15:00"}, {"open": "18:00", "close": "23:30"}],
    "sunday":    [{"open": "18:00", "close": "02:00"}]
  }'::jsonb,
  opening_hours_provisional = false,
  instagram_url = 'https://www.instagram.com/milanopizza22/'
where id = 1;

-- ---------------------------------------------------------------------
-- Création de commande : numéro et date selon la journée de service
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_customer_name  text,
  p_customer_phone text,
  p_pickup_time    timestamptz,
  p_note           text,
  p_items          jsonb
)
returns table (order_number integer, total numeric, pickup_time timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings   public.restaurant_settings;
  v_day        date := public.business_date(now());
  v_error      text;
  v_number     integer;
  v_order_id   uuid;
  v_total      numeric(8,2) := 0;
  v_item       jsonb;
  v_qty        integer;
  v_product    public.products;
  v_supp       public.supplements;
  v_supp_id    uuid;
  v_unit       numeric(6,2);
  v_meat       text;
  v_total_qty  integer := 0;
begin
  -- Réglages verrouillés en lecture pendant la transaction
  select * into v_settings from public.restaurant_settings where id = 1 for share;
  if not found then
    raise exception 'ORDERS_CLOSED';
  end if;

  v_error := public.check_order_window(v_settings, now(), p_pickup_time);
  if v_error is not null then
    raise exception '%', v_error;
  end if;

  if p_customer_name is null or char_length(btrim(p_customer_name)) not between 1 and 40 then
    raise exception 'INVALID_NAME';
  end if;
  if p_customer_phone is null or p_customer_phone !~ '^0[1-9]( [0-9]{2}){4}$' then
    raise exception 'INVALID_PHONE';
  end if;
  if char_length(coalesce(p_note, '')) > 200 then
    raise exception 'INVALID_NOTE';
  end if;

  -- Limite anti-abus : 3 commandes max par numéro sur 15 minutes
  if (select count(*) from public.orders o
      where o.customer_phone = p_customer_phone
        and o.created_at > now() - interval '15 minutes') >= 3 then
    raise exception 'TOO_MANY_ORDERS';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'INVALID_CART';
  end if;

  -- Numéro du jour : la ligne du compteur est verrouillée jusqu'à la fin
  -- de la transaction, deux commandes simultanées ne peuvent pas obtenir
  -- le même numéro. En cas d'erreur plus bas, l'incrément est annulé.
  insert into public.order_counters as c (day, last_number)
  values (v_day, 1)
  on conflict (day) do update set last_number = c.last_number + 1
  returning c.last_number into v_number;

  insert into public.orders (order_date, order_number, customer_name, customer_phone, pickup_time, note, total)
  values (v_day, v_number, btrim(p_customer_name), p_customer_phone, p_pickup_time, coalesce(btrim(p_note), ''), 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
       or jsonb_typeof(v_item -> 'quantity') <> 'number'
       or jsonb_typeof(v_item -> 'product_id') <> 'string' then
      raise exception 'INVALID_CART';
    end if;

    v_qty := (v_item ->> 'quantity')::numeric::integer;
    if (v_item ->> 'quantity')::numeric <> v_qty or v_qty < 1 or v_qty > 20 then
      raise exception 'INVALID_QUANTITY';
    end if;
    v_total_qty := v_total_qty + v_qty;
    if v_total_qty > 50 then
      raise exception 'CART_TOO_LARGE';
    end if;

    begin
      select * into v_product from public.products p
      where p.id = (v_item ->> 'product_id')::uuid
      for share;
    exception when invalid_text_representation then
      raise exception 'PRODUCT_NOT_FOUND';
    end;
    if not found then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;
    if not v_product.available then
      raise exception 'PRODUCT_UNAVAILABLE' using detail = v_product.name;
    end if;

    v_unit := v_product.price;

    -- Supplément
    v_supp_id := null;
    if v_item ? 'supplement_id' and jsonb_typeof(v_item -> 'supplement_id') <> 'null' then
      begin
        v_supp_id := (v_item ->> 'supplement_id')::uuid;
      exception when invalid_text_representation then
        raise exception 'SUPPLEMENT_INVALID';
      end;
      select * into v_supp from public.supplements s where s.id = v_supp_id for share;
      if not found or not (v_product.category = any (v_supp.applies_to)) then
        raise exception 'SUPPLEMENT_INVALID';
      end if;
      if not v_supp.available then
        raise exception 'SUPPLEMENT_UNAVAILABLE' using detail = v_supp.name;
      end if;
      v_unit := v_unit + v_supp.price;
    end if;

    -- Viande : obligatoire pour les soufflés, interdite ailleurs
    v_meat := nullif(btrim(coalesce(v_item ->> 'meat', '')), '');
    if v_product.category = 'souffle' then
      if v_meat is null or v_meat not in ('Viande hachée', 'Poulet', 'Merguez', 'Jambon') then
        raise exception 'MEAT_REQUIRED' using detail = v_product.name;
      end if;
    elsif v_meat is not null then
      raise exception 'MEAT_NOT_ALLOWED' using detail = v_product.name;
    end if;

    insert into public.order_items
      (order_id, product_id, product_name, quantity, unit_price,
       supplement_id, supplement_name, supplement_price, meat)
    values
      (v_order_id, v_product.id, v_product.name, v_qty, v_unit,
       v_supp_id,
       case when v_supp_id is null then null else v_supp.name end,
       case when v_supp_id is null then null else v_supp.price end,
       v_meat);

    v_total := v_total + v_unit * v_qty;
  end loop;

  update public.orders o set total = v_total where o.id = v_order_id;

  return query select v_number, v_total, p_pickup_time;
end;
$$;
