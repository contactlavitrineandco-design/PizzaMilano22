-- =====================================================================
-- Pizza Milano : coordonnées structurées pour le référencement local
-- (données structurées Schema.org, pied de page, fiche Google).
-- address existant = numéro et rue. Rien n'est rempli ici : ces
-- informations doivent venir du restaurant (voir README).
-- =====================================================================
alter table public.restaurant_settings
  add column postal_code     text check (postal_code is null or postal_code ~ '^[0-9]{5}$'),
  add column city            text check (city is null or char_length(city) between 1 and 80),
  add column google_maps_url text check (google_maps_url is null or google_maps_url ~ '^https://'),
  add column latitude        numeric(9,6) check (latitude is null or latitude between -90 and 90),
  add column longitude       numeric(9,6) check (longitude is null or longitude between -180 and 180),
  add constraint restaurant_settings_address_length check (address is null or char_length(address) between 1 and 120),
  add constraint restaurant_settings_phone_format check (phone is null or phone ~ '^0[1-9]( [0-9]{2}){4}$');
