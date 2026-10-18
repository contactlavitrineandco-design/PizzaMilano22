-- Photos d'illustration (générées par IA, même fond que les autres) pour
-- La 4 Fromages, La Végétarienne et La Paysanne.
-- Ne remplace pas une photo déjà mise en place depuis /pizzeria/photos.
update public.products p
set image_path = v.image_path, image_alt = v.alt, image_source = 'illustration', image_updated_at = now()
from (values
  ('La 4 Fromages',   '/photos/carte/4-fromages.webp',   'Pizza 4 Fromages : sauce tomate, mozzarella, brie, parmesan et chèvre'),
  ('La Végétarienne', '/photos/carte/vegetarienne.webp', 'Pizza Végétarienne : champignons, poivrons, oignons et olives noires sur sauce tomate'),
  ('La Paysanne',     '/photos/carte/paysanne.webp',     'Pizza Paysanne : lardons, pomme de terre et oignons sur sauce tomate')
) as v(name, image_path, alt)
where p.name = v.name and p.image_path is null;
