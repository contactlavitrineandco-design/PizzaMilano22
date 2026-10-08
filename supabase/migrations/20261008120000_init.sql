-- =====================================================================
-- Pizza Milano : schéma initial
-- Tables : products, supplements, restaurant_settings, staff,
--          orders, order_items, order_counters
-- Sécurité : RLS sur toutes les tables, écriture des commandes
--            uniquement via create_order() (rôle service, côté serveur).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Fonctions utilitaires
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Vérifie la forme des horaires :
-- {"monday":[{"open":"11:00","close":"14:00"}, ...], ..., "sunday":[]}
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
         or (v_range ->> 'open')::time >= (v_range ->> 'close')::time then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- Produits
-- ---------------------------------------------------------------------
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  category    text not null check (category in ('tomate', 'creme', 'souffle', 'boisson')),
  price       numeric(6,2) not null check (price >= 0),
  available   boolean not null default true,
  sort_order  integer not null default 0,
  tag         text check (tag is null or char_length(tag) <= 30),  -- badge affiché sur la carte (ex. « Maison »)
  to_confirm  boolean not null default false,                        -- donnée à valider avec le restaurant
  created_at  timestamptz not null default now()
);
create index products_category_sort_idx on public.products (category, sort_order);

-- ---------------------------------------------------------------------
-- Suppléments
-- ---------------------------------------------------------------------
create table public.supplements (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 1 and 60),
  price       numeric(6,2) not null check (price >= 0),
  available   boolean not null default true,
  applies_to  text[] not null default array['tomate','creme']
              check (cardinality(applies_to) > 0
                     and applies_to <@ array['tomate','creme','souffle','boisson']),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Réglages du restaurant (une seule ligne, id = 1)
-- ---------------------------------------------------------------------
create table public.restaurant_settings (
  id                        smallint primary key default 1 check (id = 1),
  restaurant_name           text not null default 'Pizza Milano',
  address                   text,
  phone                     text,
  -- Interrupteur manuel : false = commandes en ligne fermées, quels que soient les horaires
  online_orders_open        boolean not null default true,
  opening_hours             jsonb not null check (public.is_valid_opening_hours(opening_hours)),
  opening_hours_provisional boolean not null default true,
  min_prep_minutes          integer not null default 20 check (min_prep_minutes between 5 and 180),
  slot_interval_minutes     integer not null default 10 check (slot_interval_minutes in (5, 10, 15, 20, 30)),
  updated_at                timestamptz not null default now()
);
create trigger restaurant_settings_updated_at
  before update on public.restaurant_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Personnel autorisé à l'espace pizzeria
-- ---------------------------------------------------------------------
create table public.staff (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  role       text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Commandes
-- ---------------------------------------------------------------------
create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_date     date not null default ((now() at time zone 'Europe/Paris')::date),
  order_number   integer not null check (order_number > 0),
  customer_name  text not null check (char_length(customer_name) between 1 and 40),
  customer_phone text not null check (customer_phone ~ '^0[1-9]( [0-9]{2}){4}$'),
  pickup_time    timestamptz not null,
  note           text not null default '' check (char_length(note) <= 200),
  status         text not null default 'new' check (status in ('new', 'prep', 'ready', 'done')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  total          numeric(8,2) not null default 0 check (total >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint orders_number_per_day_unique unique (order_date, order_number)
);
create index orders_day_status_idx on public.orders (order_date, status);
create index orders_phone_created_idx on public.orders (customer_phone, created_at);
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  product_id       uuid not null references public.products (id) on delete restrict,
  product_name     text not null,                 -- copie au moment de la commande
  quantity         integer not null check (quantity between 1 and 20),
  unit_price       numeric(6,2) not null check (unit_price >= 0),  -- prix produit + supplément
  supplement_id    uuid references public.supplements (id) on delete restrict,
  supplement_name  text,                           -- copie au moment de la commande
  supplement_price numeric(6,2) check (supplement_price is null or supplement_price >= 0),
  meat             text check (meat is null or meat in ('Viande hachée', 'Poulet', 'Merguez', 'Jambon')),
  line_total       numeric(8,2) generated always as (unit_price * quantity) stored,
  created_at       timestamptz not null default now(),
  constraint order_items_supplement_consistency
    check ((supplement_id is null) = (supplement_name is null)
           and (supplement_id is null) = (supplement_price is null))
);
create index order_items_order_idx on public.order_items (order_id);

-- Compteur de numéros de commande, remis à zéro chaque jour (Europe/Paris)
create table public.order_counters (
  day         date primary key,
  last_number integer not null check (last_number > 0)
);

-- ---------------------------------------------------------------------
-- Rôles
-- ---------------------------------------------------------------------
create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.role from public.staff s where s.user_id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role = 'admin');
$$;

-- ---------------------------------------------------------------------
-- Contrôle horaires / délai de retrait.
-- Renvoie null si tout est bon, sinon un code d'erreur.
-- ---------------------------------------------------------------------
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
  v_now_local  timestamp := p_now at time zone 'Europe/Paris';
  v_pick_local timestamp := p_pickup at time zone 'Europe/Paris';
  v_key        text := (array['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])
                       [extract(isodow from v_now_local)::int];
  v_range      jsonb;
  v_open_now   boolean := false;
  v_pick_ok    boolean := false;
begin
  if not p_settings.online_orders_open then
    return 'ORDERS_CLOSED';
  end if;
  if v_pick_local::date <> v_now_local::date then
    return 'PICKUP_NOT_TODAY';
  end if;
  -- 2 minutes de tolérance pour l'écart entre le serveur web et la base
  if p_pickup < p_now + make_interval(mins => p_settings.min_prep_minutes - 2) then
    return 'PICKUP_TOO_SOON';
  end if;
  for v_range in select * from jsonb_array_elements(coalesce(p_settings.opening_hours -> v_key, '[]'::jsonb)) loop
    if v_now_local::time >= (v_range ->> 'open')::time and v_now_local::time < (v_range ->> 'close')::time then
      v_open_now := true;
    end if;
    if v_pick_local::time >= (v_range ->> 'open')::time and v_pick_local::time <= (v_range ->> 'close')::time then
      v_pick_ok := true;
    end if;
  end loop;
  if not v_open_now then
    return 'OUTSIDE_OPENING_HOURS';
  end if;
  if not v_pick_ok then
    return 'PICKUP_OUTSIDE_HOURS';
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- Création d'une commande (transaction unique).
-- Appelée uniquement par le serveur Next.js avec la clé service.
-- Les prix sont relus en base : rien de ce qui vient du navigateur
-- n'est utilisé pour le calcul.
-- p_items : [{"product_id": uuid, "quantity": int, "supplement_id": uuid|null, "meat": text|null}]
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
  v_day        date := (now() at time zone 'Europe/Paris')::date;
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

-- ---------------------------------------------------------------------
-- Actions du personnel (vérifient le rôle avant d'agir)
-- ---------------------------------------------------------------------
create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;
  if p_status not in ('new', 'prep', 'ready', 'done') then
    raise exception 'INVALID_STATUS';
  end if;
  update public.orders set status = p_status where id = p_order_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
end;
$$;

create or replace function public.set_product_availability(p_product_id uuid, p_available boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;
  update public.products set available = p_available where id = p_product_id;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;
end;
$$;

create or replace function public.set_supplement_availability(p_supplement_id uuid, p_available boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;
  update public.supplements set available = p_available where id = p_supplement_id;
  if not found then
    raise exception 'SUPPLEMENT_NOT_FOUND';
  end if;
end;
$$;

create or replace function public.set_online_orders_open(p_open boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;
  update public.restaurant_settings set online_orders_open = p_open where id = 1;
end;
$$;

-- ---------------------------------------------------------------------
-- Droits d'exécution des fonctions
-- (par défaut Postgres autorise EXECUTE à PUBLIC : on retire)
-- ---------------------------------------------------------------------
revoke execute on function public.create_order(text, text, timestamptz, text, jsonb) from public, anon, authenticated;
grant  execute on function public.create_order(text, text, timestamptz, text, jsonb) to service_role;

revoke execute on function public.check_order_window(public.restaurant_settings, timestamptz, timestamptz) from public, anon, authenticated;
grant  execute on function public.check_order_window(public.restaurant_settings, timestamptz, timestamptz) to service_role;

revoke execute on function public.current_staff_role() from public, anon;
revoke execute on function public.is_staff()           from public, anon;
revoke execute on function public.is_admin()           from public, anon;
revoke execute on function public.set_order_status(uuid, text)                from public, anon;
revoke execute on function public.set_product_availability(uuid, boolean)     from public, anon;
revoke execute on function public.set_supplement_availability(uuid, boolean)  from public, anon;
revoke execute on function public.set_online_orders_open(boolean)             from public, anon;
grant  execute on function public.current_staff_role() to authenticated;
grant  execute on function public.is_staff()           to authenticated;
grant  execute on function public.is_admin()           to authenticated;
grant  execute on function public.set_order_status(uuid, text)                to authenticated;
grant  execute on function public.set_product_availability(uuid, boolean)     to authenticated;
grant  execute on function public.set_supplement_availability(uuid, boolean)  to authenticated;
grant  execute on function public.set_online_orders_open(boolean)             to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.products            enable row level security;
alter table public.supplements         enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.staff               enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.order_counters      enable row level security;

-- Carte : lisible par tous (les produits en rupture restent affichés grisés)
create policy "Carte lisible par tous" on public.products
  for select to anon, authenticated using (true);
create policy "Admin gère les produits" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Suppléments lisibles par tous" on public.supplements
  for select to anon, authenticated using (true);
create policy "Admin gère les suppléments" on public.supplements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Réglages : lisibles par tous (nom, horaires, ouverture), modifiables par l'admin
create policy "Réglages lisibles par tous" on public.restaurant_settings
  for select to anon, authenticated using (true);
create policy "Admin modifie les réglages" on public.restaurant_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Personnel : chacun voit sa propre ligne, l'admin gère la liste
create policy "Voir sa ligne staff" on public.staff
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Admin gère le personnel" on public.staff
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Commandes : lecture réservée au personnel. Aucune écriture directe :
-- création via create_order() (serveur), statut via set_order_status().
create policy "Personnel lit les commandes" on public.orders
  for select to authenticated using (public.is_staff());
create policy "Personnel lit les lignes de commande" on public.order_items
  for select to authenticated using (public.is_staff());
-- order_counters : aucune policy, donc aucun accès hors service_role.

-- Droits de table (en plus de RLS, défense en profondeur)
revoke all on public.orders, public.order_items, public.order_counters, public.staff from anon;
revoke insert, update, delete, truncate on public.orders, public.order_items, public.order_counters from authenticated;
revoke all on public.order_counters from authenticated;
revoke insert, update, delete, truncate on public.products, public.supplements, public.restaurant_settings from anon;

-- ---------------------------------------------------------------------
-- Temps réel : la tablette reçoit les nouvelles commandes
-- (Realtime applique les policies SELECT ci-dessus)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;
