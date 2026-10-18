-- =====================================================================
-- Coordonnées de la pizzeria, d'après sa fiche Google Maps (« Milano pizza »)
-- relevée le 14/10/2026. Ne remplace pas une valeur déjà saisie.
-- Horaires NON repris : ceux de la fiche Google semblent erronés (voir README).
-- =====================================================================
update public.restaurant_settings set
  address         = coalesce(address, '3 rue du Maréchal Foch'),
  postal_code     = coalesce(postal_code, '22000'),
  city            = coalesce(city, 'Saint-Brieuc'),
  phone           = coalesce(phone, '06 50 64 73 89'),
  latitude        = coalesce(latitude, 48.515201),
  longitude       = coalesce(longitude, -2.761540),
  google_maps_url = coalesce(google_maps_url,
    'https://www.google.com/maps/search/?api=1&query=Milano%20pizza&query_place_id=ChIJT6U7b0IdDkgRZO3uOmvx_Lg')
where id = 1;

-- Galerie : le néon laisse la place à une vraie pizza du restaurant
delete from public.gallery_photos where image_path = '/photos/etablissement/neon-chef.webp';
insert into public.gallery_photos (section, image_path, alt, caption, source, sort_order)
select 'pizzas', '/photos/carte/neptune.webp',
       'Pizza Neptune du restaurant : thon, poivrons, oignons rouges et olives noires, devant le mur en lattes de bois',
       'Tout juste sortie du four', 'restaurant', 10
where not exists (select 1 from public.gallery_photos where image_path = '/photos/carte/neptune.webp');
