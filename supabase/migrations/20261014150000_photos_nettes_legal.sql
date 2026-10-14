-- =====================================================================
-- 1. Photos de la carte retravaillées (Real-ESRGAN, 1200 × 900, style uniforme)
--    Ne touche qu'aux photos livrées avec le site, jamais à une photo envoyée
--    depuis l'espace photos.
-- =====================================================================
update public.products p
set image_path = v.new_path, image_updated_at = now()
from (values
  ('/photos/pizzas/raclette.webp',  '/photos/carte/raclette.webp'),  ('/photos/pizzas/raclette-hd.webp',  '/photos/carte/raclette.webp'),
  ('/photos/pizzas/saumon.webp',    '/photos/carte/saumon.webp'),    ('/photos/pizzas/saumon-hd.webp',    '/photos/carte/saumon.webp'),
  ('/photos/pizzas/chorizo.webp',   '/photos/carte/chorizo.webp'),   ('/photos/pizzas/chorizo-hd.webp',   '/photos/carte/chorizo.webp'),
  ('/photos/pizzas/neptune.webp',   '/photos/carte/neptune.webp'),   ('/photos/pizzas/neptune-hd.webp',   '/photos/carte/neptune.webp'),
  ('/photos/pizzas/cannibale.webp', '/photos/carte/cannibale.webp'), ('/photos/pizzas/cannibale-hd.webp', '/photos/carte/cannibale.webp'),
  ('/photos/pizzas-ia/margherita.webp', '/photos/carte/margherita.webp'),
  ('/photos/pizzas-ia/milano.webp',     '/photos/carte/milano.webp'),
  ('/photos/pizzas-ia/reine.webp',      '/photos/carte/reine.webp'),
  ('/photos/pizzas-ia/boursalino.webp', '/photos/carte/boursalino.webp'),
  ('/photos/pizzas-ia/4-saisons.webp',  '/photos/carte/4-saisons.webp'),
  ('/photos/pizzas-ia/mexicaine.webp',  '/photos/carte/mexicaine.webp'),
  ('/photos/pizzas-ia/chicken.webp',    '/photos/carte/chicken.webp')
) as v(old_path, new_path)
where p.image_path = v.old_path;

-- Photo de la salle retirée de la galerie (à remplacer par la devanture)
delete from public.gallery_photos where image_path = '/photos/etablissement/salle-comptoir.webp';

-- =====================================================================
-- 2. Lien Instagram affiché en bas de page
-- =====================================================================
alter table public.restaurant_settings
  add column instagram_url text check (instagram_url is null or instagram_url ~ '^https://(www\.)?instagram\.com/[A-Za-z0-9._]+/?$');

-- =====================================================================
-- 3. RGPD : suppression automatique des commandes anciennes
--    Durée annoncée dans la politique de confidentialité (12 mois par défaut).
-- =====================================================================
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
  delete from public.orders where created_at < now() - make_interval(months => p_months);
  get diagnostics v_count = row_count;
  delete from public.order_counters where day < (now() at time zone 'Europe/Paris')::date - 7;
  return v_count;
end;
$$;

revoke execute on function public.purge_old_orders(integer) from public, anon, authenticated;
grant  execute on function public.purge_old_orders(integer) to service_role;

-- Planification quotidienne (4 h 15) si l'extension pg_cron est disponible (c'est le cas sur Supabase).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('purge-commandes', '15 4 * * *', 'select public.purge_old_orders(12)');
  else
    raise notice 'pg_cron indisponible : lancer select public.purge_old_orders(12) régulièrement.';
  end if;
exception when others then
  raise notice 'Planification non créée (%). Activez pg_cron dans Supabase > Database > Extensions puis relancez ce bloc.', sqlerrm;
end;
$$;
