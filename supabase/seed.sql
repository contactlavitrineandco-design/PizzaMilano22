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
  1, 'Pizza Milano', null, null, true,
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
-- Compte administrateur : à faire une fois le compte créé dans
-- Supabase > Authentication > Users (voir README) :
--
-- insert into public.staff (user_id, role)
-- select id, 'admin' from auth.users where email = 'prenom@exemple.fr';
-- ---------------------------------------------------------------------
