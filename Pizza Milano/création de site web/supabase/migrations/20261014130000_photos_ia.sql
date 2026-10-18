-- Photos d'illustration générées par IA (Canva) pour les pizzas sans vraie photo.
-- Marquées source = 'illustration' : le site affiche « Photo d'illustration ».
-- Ne remplace jamais une photo déjà enregistrée (vraie photo ou envoyée depuis l'espace photos).
update public.products p
set image_path = v.image_path, image_alt = v.alt, image_source = 'illustration', image_updated_at = now()
from (values
  ('La Margherita', '/photos/pizzas-ia/margherita.webp', 'Pizza Margherita : sauce tomate, mozzarella fondue, origan'),
  ('La Milano',     '/photos/pizzas-ia/milano.webp',     'Pizza Milano : mozzarella, poulet, viande hachée, merguez et œufs'),
  ('La Reine',      '/photos/pizzas-ia/reine.webp',      'Pizza Reine : mozzarella, champignons et jambon sur sauce tomate'),
  ('La Boursalino', '/photos/pizzas-ia/boursalino.webp', 'Pizza Boursalino : mozzarella, Boursin, viande hachée et oignons'),
  ('La 4 Saisons',  '/photos/pizzas-ia/4-saisons.webp',  'Pizza 4 Saisons : champignons, poivrons, olives noires et jambon'),
  ('La Mexicaine',  '/photos/pizzas-ia/mexicaine.webp',  'Pizza Mexicaine : merguez, viande hachée et oignons sur sauce tomate'),
  ('La Chicken',    '/photos/pizzas-ia/chicken.webp',    'Pizza Chicken : poulet, champignons et œufs sur sauce tomate')
) as v(name, image_path, alt)
where p.name = v.name and p.image_path is null;

-- Photo du frigo retirée de la galerie (jugée inutile).
delete from public.gallery_photos where image_path = '/photos/etablissement/frigo-boissons.webp';
