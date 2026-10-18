-- Photos d'illustration (IA, même décor que les autres) pour la Tartiflette et la Burrata.
-- Ne remplace jamais une photo déjà enregistrée.
update public.products p
set image_path = v.image_path, image_alt = v.alt, image_source = 'illustration', image_updated_at = now()
from (values
  ('La Tartiflette', '/photos/carte/tartiflette.webp', 'Pizza Tartiflette : crème, lardons, pomme de terre, reblochon fondu et oignons'),
  ('La Burrata',     '/photos/carte/burrata.webp',     'Pizza Burrata : crème, burrata entière au centre, tomates cerises et jambon')
) as v(name, image_path, alt)
where p.name = v.name and p.image_path is null;
