import type { Category, GallerySection, Product } from "./types";

export const PHOTO_BUCKET = "photos";

export const GALLERY_SECTIONS: { id: GallerySection; name: string }[] = [
  { id: "interieur", name: "Intérieur" },
  { id: "exterieur", name: "Extérieur" },
  { id: "four", name: "Le four" },
  { id: "preparation", name: "Préparation" },
  { id: "pizzas", name: "Pizzas" },
  { id: "equipe", name: "L'équipe" },
];

export const PIZZA_CATEGORIES: Category[] = ["tomate", "creme"];

export function isPizza(p: Pick<Product, "category">): boolean {
  return PIZZA_CATEGORIES.includes(p.category);
}

/**
 * URL publique d'une image.
 * - « /photos/… » : fichier livré avec le site (dossier public/)
 * - « products/… » ou « gallery/… » : fichier du stockage Supabase
 */
export function imageUrl(path: string): string {
  if (path.startsWith("/")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

/** Texte alternatif par défaut, construit à partir de la carte (nom + ingrédients). */
export function defaultProductAlt(p: Pick<Product, "name" | "description" | "category">): string {
  const kind = isPizza(p) ? "Pizza " : "";
  const name = isPizza(p) ? p.name.replace(/^La /, "") : p.name;
  return `${kind}${name}${p.description ? ` : ${p.description}` : ""}`.slice(0, 200);
}

/** Même règle que is_valid_image_path() dans la migration. */
export const STORAGE_PATH_RE =
  /^(products|gallery)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpe?g|png)$/;
export const STATIC_PATH_RE = /^\/photos\/[a-z0-9_-]+(\/[a-z0-9_-]+)*\.(webp|jpe?g|png)$/;
