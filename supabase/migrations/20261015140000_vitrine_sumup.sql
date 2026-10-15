-- =====================================================================
-- Le site devient une vitrine ; les commandes passent par SumUp
--
-- Le restaurant encaisse avec la caisse SumUp. Les commandes en ligne
-- passent désormais par la commande en ligne de SumUp (« Order & Pay »),
-- qui les envoie directement sur la caisse. Le site affiche la carte, les
-- photos, les horaires et un bouton « Commander » vers la page SumUp.
--
-- Cette migration :
-- 1. ajoute le lien de commande SumUp (order_url) ;
-- 2. accepte les plages horaires qui passent minuit (dimanche 18 h – 2 h) ;
-- 3. enregistre les horaires (compte Instagram @milanopizza22, 15/10/2026)
--    et le lien Instagram ;
-- 4. supprime la prise de commande du site (commandes, numéros, suivi,
--    annulation, espace pizzeria). Par sécurité, elle s'arrête si la table
--    des commandes contient déjà des commandes réelles.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 4a. Garde-fou : ne jamais effacer de vraies commandes
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.orders') is not null and exists (select 1 from public.orders) then
    raise exception 'La table orders contient des commandes : exportez-les avant de lancer cette migration (voir README, section « Commandes : SumUp »).';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Lien de commande SumUp
-- ---------------------------------------------------------------------
alter table public.restaurant_settings
  add column if not exists order_url text
  check (order_url is null or order_url ~ '^https://[A-Za-z0-9.-]+(/[A-Za-z0-9._~:/?#@!$&''()*+,;=%-]*)?$');

-- ---------------------------------------------------------------------
-- 2. Plages qui passent minuit : fermeture plus tôt que l'ouverture = le lendemain
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
         -- une plage de nuit doit finir au plus tard à 6 h
         or ((v_range ->> 'close')::time < (v_range ->> 'open')::time and (v_range ->> 'close')::time > time '06:00') then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Horaires et Instagram (base déjà en place ; une nouvelle base les reçoit par seed.sql)
-- ---------------------------------------------------------------------
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
-- 4b. Suppression de la prise de commande du site
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname) from cron.job
    where jobname in ('purge-commandes', 'purge-acces-historique');
  end if;
exception when others then
  raise notice 'Tâches planifiées non retirées (%). Retirez « purge-commandes » dans Supabase > Integrations > Cron.', sqlerrm;
end;
$$;

drop function if exists public.create_order(text, text, timestamptz, text, jsonb);
drop function if exists public.check_order_window(public.restaurant_settings, timestamptz, timestamptz);
drop function if exists public.set_order_status(uuid, text);
drop function if exists public.set_product_availability(uuid, boolean);
drop function if exists public.set_supplement_availability(uuid, boolean);
drop function if exists public.set_online_orders_open(boolean);
drop function if exists public.cancel_order_by_token(uuid);
drop function if exists public.purge_old_orders(integer);
-- Objets de l'historique (si une version précédente du projet les a créés)
drop function if exists public.search_orders(date, date, text, text, text, boolean, integer, integer);
drop function if exists public.order_report(date, date, text);
drop function if exists public.export_order_lines(date, date);
drop function if exists public.log_admin_action(text, jsonb);
drop function if exists public.set_vat_rates(numeric, numeric);
drop function if exists public.unlock_history(text);
drop function if exists public.lock_history();
drop function if exists public.set_history_code(text, text);
drop function if exists public.purge_history_access();
drop function if exists public.is_admin_mfa();
drop function if exists public.has_mfa();
drop function if exists public.current_session_id();
drop function if exists public.business_date(timestamptz);

drop table if exists public.history_unlocks;
drop table if exists public.history_code_attempts;
drop table if exists public.history_access;
drop table if exists public.admin_audit;
drop table if exists public.order_items;
drop table if exists public.orders;
drop table if exists public.order_counters;

alter table public.restaurant_settings
  drop column if exists online_orders_open,
  drop column if exists min_prep_minutes,
  drop column if exists slot_interval_minutes,
  drop column if exists vat_rate_food,
  drop column if exists vat_rate_drinks;
