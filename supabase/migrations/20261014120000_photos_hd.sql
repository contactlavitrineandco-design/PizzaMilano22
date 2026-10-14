-- Versions améliorées (super-résolution x4, 1200 × 900) des 5 vraies photos de
-- pizzas. Nouveau nom de fichier pour ne pas servir l'ancienne version en cache.
-- Ne touche qu'aux produits qui utilisent encore l'ancienne photo livrée avec le site.
update public.products
set image_path = replace(image_path, '.webp', '-hd.webp'), image_updated_at = now()
where image_path in (
  '/photos/pizzas/raclette.webp', '/photos/pizzas/saumon.webp', '/photos/pizzas/chorizo.webp',
  '/photos/pizzas/neptune.webp', '/photos/pizzas/cannibale.webp'
);
