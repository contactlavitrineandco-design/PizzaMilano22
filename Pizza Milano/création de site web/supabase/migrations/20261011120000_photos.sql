-- =====================================================================
-- Pizza Milano : photos des produits et galerie de la pizzeria
--
-- Chemins d'image acceptés (contrainte image_path_format) :
--   - fichier livré avec le site :  /photos/etablissement/salle.webp
--   - fichier du stockage Supabase : products/<uuid>.webp  ou  gallery/<uuid>.webp
-- Aucune URL externe n'est acceptée : pas de lien cassé ni d'image d'un tiers.
--
-- source :
--   'restaurant'   = vraie photo de Pizza Milano
--   'illustration' = image d'illustration (banque d'images, IA…), affichée
--                    avec la mention « Photo d'illustration »
-- =====================================================================

create or replace function public.is_valid_image_path(p text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p ~ '^/photos/[a-z0-9_-]+(/[a-z0-9_-]+)*\.(webp|jpe?g|png)$'
      or p ~ '^(products|gallery)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpe?g|png)$';
$$;

-- ---------------------------------------------------------------------
-- Photo d'un produit (une par produit)
-- ---------------------------------------------------------------------
alter table public.products
  add column image_path   text,
  add column image_alt    text,
  add column image_source text,
  add column image_updated_at timestamptz,
  add constraint products_image_path_format check (image_path is null or public.is_valid_image_path(image_path)),
  add constraint products_image_alt_length  check (image_alt is null or char_length(image_alt) <= 200),
  add constraint products_image_source_values check (image_source is null or image_source in ('restaurant', 'illustration')),
  add constraint products_image_consistency check ((image_path is null) = (image_source is null));

-- ---------------------------------------------------------------------
-- Galerie « Découvrez notre pizzeria »
-- ---------------------------------------------------------------------
create table public.gallery_photos (
  id         uuid primary key default gen_random_uuid(),
  section    text not null check (section in ('interieur', 'exterieur', 'four', 'preparation', 'pizzas', 'equipe')),
  image_path text not null check (public.is_valid_image_path(image_path)),
  alt        text not null check (char_length(alt) between 1 and 200),
  caption    text not null default '' check (char_length(caption) <= 120),
  source     text not null check (source in ('restaurant', 'illustration')),
  published  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index gallery_photos_order_idx on public.gallery_photos (sort_order, created_at);

alter table public.gallery_photos enable row level security;

-- Deux policies séparées : le rôle anon n'a pas le droit d'exécuter is_admin().
create policy "Galerie publiée lisible par les visiteurs" on public.gallery_photos
  for select to anon using (published);
create policy "Galerie lisible par les comptes connectés" on public.gallery_photos
  for select to authenticated using (published or public.is_admin());
create policy "Admin gère la galerie" on public.gallery_photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke insert, update, delete, truncate on public.gallery_photos from anon;

-- ---------------------------------------------------------------------
-- Stockage des fichiers : bucket public en lecture, écriture admin seule.
-- Taille et types limités par le bucket lui-même.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Admin lit les fichiers photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and public.is_admin());

create policy "Admin envoie des photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and public.is_admin()
    and (storage.foldername(name))[1] in ('products', 'gallery')
  );

create policy "Admin modifie des photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and public.is_admin())
  with check (bucket_id = 'photos' and public.is_admin());

create policy "Admin supprime des photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and public.is_admin());
