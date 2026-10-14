-- =====================================================================
-- Pizza Milano : données initiales
-- Produits et prix repris de la maquette (menu papier + caisse SumUp).
-- Les lignes marquées to_confirm = true sont à valider avec le restaurant
-- (liste complète dans le README, section « À confirmer »).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Réglages : HORAIRES PROVISOIRES, non communiqués par le restaurant.
-- Tous les jours 11:00-14:00 et 18:00-22:30. À remplacer avant la mise en ligne.
-- ---------------------------------------------------------------------
insert into public.restaurant_settings
  (id, restaurant_name, address, phone, online_orders_open, opening_hours,
   opening_hours_provisional, min_prep_minutes, slot_interval_minutes)
values (
  1, 'Pizza Milano', '3 rue du Maréchal Foch', '06 50 64 73 89', true,
  '{
    "monday":    [{"open": "11:00", "close": "14:00"}, {"open": "18:00", "close": "22:30"}],
    "tuesday":   [{"open": "11:00", "close": "14:00"}, {"open": "18:00", "close": "22:30"}],
    "wednesday": [{"open": "11:00", "close": "14:00"}, {"open": "18:00", "close": "22:30"}],
    "thursday":  [{"open": "11:00", "close": "14:00"}, {"open": "18:00", "close": "22:30"}],
    "friday":    [{"open": "11:00", "close": "14:00"}, {"open": "18:00", "close": "22:30"}],
    "saturday":  [{"open": "11:00", "close": "14:00"}, {"open": "18:00", "close": "22:30"}],
    "sunday":    [{"open": "11:00", "close": "14:00"}, {"open": "18:00", "close": "22:30"}]
  }'::jsonb,
  true, 20, 10
)
on conflict (id) do nothing;

-- Coordonnées d'après la fiche Google Maps « Milano pizza » (14/10/2026)
update public.restaurant_settings set
  postal_code = coalesce(postal_code, '22000'),
  city = coalesce(city, 'Saint-Brieuc'),
  latitude = coalesce(latitude, 48.515201),
  longitude = coalesce(longitude, -2.761540),
  google_maps_url = coalesce(google_maps_url,
    'https://www.google.com/maps/search/?api=1&query=Milano%20pizza&query_place_id=ChIJT6U7b0IdDkgRZO3uOmvx_Lg')
where id = 1;

-- ---------------------------------------------------------------------
-- Suppléments (menu : « Supplément : Œufs, Fromage 0,50 €, Viande 1 € »,
-- soufflés : « Supplément viande 1 € »)
-- ---------------------------------------------------------------------
insert into public.supplements (name, price, applies_to, sort_order) values
  ('Œuf',    0.50, array['tomate','creme'],           1),
  ('Fromage', 0.50, array['tomate','creme'],           2),
  ('Viande', 1.00, array['tomate','creme','souffle'], 3)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- Produits
-- ---------------------------------------------------------------------
insert into public.products (name, description, category, price, sort_order, tag, to_confirm) values
  -- Base tomate
  ('La Margherita',   'Mozzarella, origan',                                       'tomate', 11.00, 10, null,     false),
  ('La Milano',       'Mozzarella, poulet, viande hachée, merguez, œufs',         'tomate', 13.00, 20, 'Maison', true),
  ('La Reine',        'Mozzarella, champignons, jambon',                          'tomate', 11.00, 30, null,     false),
  ('La Boursalino',   'Mozzarella, Boursin, viande hachée, oignons',              'tomate', 12.00, 40, null,     false),
  ('La Neptune',      'Mozzarella, thon, poivrons, oignons, olives',              'tomate', 12.00, 50, null,     false),
  ('La 4 Saisons',    'Mozzarella, champignons, poivrons, olives, jambon',        'tomate', 12.00, 60, null,     false),
  ('La Mexicaine',    'Mozzarella, merguez, viande hachée, oignons',              'tomate', 12.00, 70, null,     false),
  ('La Chicken',      'Mozzarella, poulet, champignons, œufs',                    'tomate', 12.00, 80, null,     false),
  ('La 4 Fromages',   'Mozzarella, brie, parmesan, chèvre',                       'tomate', 12.00, 90, null,     false),
  ('La Chorizo',      'Mozzarella, chorizo, pomme de terre, œufs',                'tomate', 12.00, 100, null,    false),
  ('La Végétarienne', 'Mozzarella, champignons, poivrons, oignons, olives',       'tomate', 11.00, 110, null,    false),
  ('La Paysanne',     'Mozzarella, lardons, pomme de terre, oignons',             'tomate', 12.00, 120, null,    false),
  -- Base crème
  ('La Saumon',       'Mozzarella, saumon, basilic, persil',                      'creme',  13.00, 10, null,     true),
  ('La 5 Fromages',   'Mozzarella, parmesan, chèvre, bleu',                       'creme',  12.00, 20, null,     true),
  ('La Chèvre Miel',  'Mozzarella, chèvre, miel',                                 'creme',  12.00, 30, null,     false),
  ('La Cannibale',    'Mozzarella, poulet, viande hachée, merguez, jambon',       'creme',  13.00, 40, null,     true),
  ('La Tartiflette',  'Mozzarella, lardons, pomme de terre, reblochon, oignons',  'creme',  13.00, 50, null,     false),
  ('La Raclette',     'Mozzarella, jambon, pomme de terre, raclette, oignons',    'creme',  13.00, 60, null,     false),
  ('La Burrata',      'Mozzarella, burrata, tomates cerises, jambon',             'creme',  13.00, 70, null,     false),
  -- Soufflés
  ('Soufflé garni',   'Sauce fromagère, poivrons, oignons, mozzarella, frites incluses. Viande au choix.', 'souffle', 10.00, 10, null, false),
  -- Boissons
  ('Coca-Cola 33 cl',            'Canette fraîche', 'boisson', 2.00, 10, null, false),
  ('Fanta 33 cl',                'Canette fraîche', 'boisson', 2.00, 20, null, false),
  ('Oasis Tropical 33 cl',       'Canette fraîche', 'boisson', 2.00, 30, null, true),
  ('Lipton Ice Tea pêche 33 cl', 'Canette fraîche', 'boisson', 2.00, 40, null, true),
  ('Orangina 33 cl',             'Canette fraîche', 'boisson', 2.00, 50, null, true),
  ('Tropico 33 cl',              'Canette fraîche', 'boisson', 2.00, 60, null, true),
  ('Coca-Cola 1,5 L',            'Bouteille',       'boisson', 3.50, 70, null, false),
  ('Fanta 1,5 L',                'Bouteille',       'boisson', 3.50, 80, null, false),
  ('Eau minérale 33 cl',         'Bouteille',       'boisson', 1.00, 90, null, false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- Vraies photos de pizzas du restaurant (provisoires, basse résolution) :
-- recadrées depuis la fiche Uber Eats du restaurant, bouton et badge de la
-- plateforme effacés. À remplacer par les fichiers originaux depuis
-- /pizzeria/photos. Ne s'applique que si le produit n'a pas déjà une photo.
-- ---------------------------------------------------------------------
update public.products p
set image_path = v.image_path, image_alt = v.alt, image_source = 'restaurant', image_updated_at = now()
from (values
  ('La Raclette',  '/photos/carte/raclette.webp',  'Pizza Raclette sur une assiette à pois : jambon, pomme de terre, fromage à raclette fondu et oignons rouges'),
  ('La Saumon',    '/photos/carte/saumon.webp',    'Pizza Saumon sur base crème, larges tranches de saumon et herbes, pâte dorée'),
  ('La Chorizo',   '/photos/carte/chorizo.webp',   'Pizza Chorizo sur sauce tomate : rondelles de chorizo, pomme de terre et fromage fondu'),
  ('La Neptune',   '/photos/carte/neptune.webp',   'Pizza Neptune : thon, poivrons rouges et verts, oignons rouges et olives noires sur sauce tomate'),
  ('La Cannibale', '/photos/carte/cannibale.webp', 'Pizza Cannibale sur base crème : poulet, viande hachée, merguez et lamelles de jambon')
) as v(name, image_path, alt)
where p.name = v.name and p.image_path is null;

-- Photos d'illustration générées par IA pour les pizzas sans vraie photo
update public.products p
set image_path = v.image_path, image_alt = v.alt, image_source = 'illustration', image_updated_at = now()
from (values
  ('La Margherita', '/photos/carte/margherita.webp', 'Pizza Margherita : sauce tomate, mozzarella fondue, origan'),
  ('La Milano',     '/photos/carte/milano.webp',     'Pizza Milano : mozzarella, poulet, viande hachée, merguez et œufs'),
  ('La Reine',      '/photos/carte/reine.webp',      'Pizza Reine : mozzarella, champignons et jambon sur sauce tomate'),
  ('La Boursalino', '/photos/carte/boursalino.webp', 'Pizza Boursalino : mozzarella, Boursin, viande hachée et oignons'),
  ('La 4 Saisons',  '/photos/carte/4-saisons.webp',  'Pizza 4 Saisons : champignons, poivrons, olives noires et jambon'),
  ('La Mexicaine',  '/photos/carte/mexicaine.webp',  'Pizza Mexicaine : merguez, viande hachée et oignons sur sauce tomate'),
  ('La Chicken',    '/photos/carte/chicken.webp',    'Pizza Chicken : poulet, champignons et œufs sur sauce tomate')
) as v(name, image_path, alt)
where p.name = v.name and p.image_path is null;

-- ---------------------------------------------------------------------
-- Galerie « Découvrez notre pizzeria » : photos AUTHENTIQUES prises dans
-- le restaurant (fichiers dans public/photos/etablissement, métadonnées
-- et position GPS retirées). Remplaçables depuis /pizzeria/photos.
-- ---------------------------------------------------------------------
insert into public.gallery_photos (section, image_path, alt, caption, source, sort_order)
select 'pizzas', '/photos/carte/neptune.webp',
       'Pizza Neptune du restaurant : thon, poivrons, oignons rouges et olives noires, devant le mur en lattes de bois',
       'Tout juste sortie du four', 'restaurant', 10
where not exists (select 1 from public.gallery_photos where image_path = '/photos/carte/neptune.webp');

-- ---------------------------------------------------------------------
-- Compte administrateur : à faire une fois le compte créé dans
-- Supabase > Authentication > Users (voir README) :
--
-- insert into public.staff (user_id, role)
-- select id, 'admin' from auth.users where email = 'prenom@exemple.fr';
-- ---------------------------------------------------------------------
