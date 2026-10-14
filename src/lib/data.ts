import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import type { GalleryPhoto, Product, RestaurantSettings, Supplement } from "@/lib/types";

export function toProduct(r: Record<string, unknown>): Product {
  return {
    id: String(r.id),
    name: String(r.name),
    description: String(r.description ?? ""),
    category: r.category as Product["category"],
    price: Number(r.price),
    available: Boolean(r.available),
    sort_order: Number(r.sort_order ?? 0),
    tag: (r.tag as string | null) ?? null,
    to_confirm: Boolean(r.to_confirm),
    image_path: (r.image_path as string | null) ?? null,
    image_alt: (r.image_alt as string | null) ?? null,
    image_source: (r.image_source as Product["image_source"]) ?? null,
  };
}

export function toGalleryPhoto(r: Record<string, unknown>): GalleryPhoto {
  return {
    id: String(r.id),
    section: r.section as GalleryPhoto["section"],
    image_path: String(r.image_path),
    alt: String(r.alt),
    caption: String(r.caption ?? ""),
    source: r.source as GalleryPhoto["source"],
    published: Boolean(r.published),
    sort_order: Number(r.sort_order ?? 0),
  };
}

export function toSupplement(r: Record<string, unknown>): Supplement {
  return {
    id: String(r.id),
    name: String(r.name),
    price: Number(r.price),
    available: Boolean(r.available),
    applies_to: (r.applies_to as Supplement["applies_to"]) ?? [],
    sort_order: Number(r.sort_order ?? 0),
  };
}

export function toSettings(r: Record<string, unknown>): RestaurantSettings {
  return {
    id: Number(r.id),
    restaurant_name: String(r.restaurant_name),
    address: (r.address as string | null) ?? null,
    postal_code: (r.postal_code as string | null) ?? null,
    city: (r.city as string | null) ?? null,
    google_maps_url: (r.google_maps_url as string | null) ?? null,
    instagram_url: (r.instagram_url as string | null) ?? null,
    latitude: r.latitude == null ? null : Number(r.latitude),
    longitude: r.longitude == null ? null : Number(r.longitude),
    phone: (r.phone as string | null) ?? null,
    online_orders_open: Boolean(r.online_orders_open),
    opening_hours: r.opening_hours as RestaurantSettings["opening_hours"],
    opening_hours_provisional: Boolean(r.opening_hours_provisional),
    min_prep_minutes: Number(r.min_prep_minutes),
    slot_interval_minutes: Number(r.slot_interval_minutes),
  };
}

export interface MenuData {
  products: Product[];
  supplements: Supplement[];
  settings: RestaurantSettings;
}

/** Données publiques : carte, suppléments, réglages. Lues avec la clé publique (RLS). */
export async function getMenuData(): Promise<MenuData> {
  const db = createPublicClient();
  const [products, supplements, settings] = await Promise.all([
    db.from("products").select("*").order("category").order("sort_order"),
    db.from("supplements").select("*").order("sort_order"),
    db.from("restaurant_settings").select("*").eq("id", 1).single(),
  ]);
  if (products.error) throw new Error(`Lecture des produits impossible : ${products.error.message}`);
  if (supplements.error) throw new Error(`Lecture des suppléments impossible : ${supplements.error.message}`);
  if (settings.error) throw new Error(`Lecture des réglages impossible : ${settings.error.message}`);
  return {
    products: (products.data ?? []).map(toProduct),
    supplements: (supplements.data ?? []).map(toSupplement),
    settings: toSettings(settings.data),
  };
}

/** Photos publiées de la galerie « Découvrez notre pizzeria ». */
export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  const db = createPublicClient();
  const { data, error } = await db
    .from("gallery_photos")
    .select("*")
    .eq("published", true)
    .order("sort_order")
    .order("created_at");
  if (error) {
    // La galerie est secondaire : une erreur ne doit pas empêcher de commander.
    console.error("[galerie] lecture impossible", error.message);
    return [];
  }
  return (data ?? []).map(toGalleryPhoto);
}

/** Réglages publics du restaurant (coordonnées, horaires). */
export async function getSettings(): Promise<RestaurantSettings> {
  const db = createPublicClient();
  const { data, error } = await db.from("restaurant_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(`Lecture des réglages impossible : ${error.message}`);
  return toSettings(data);
}
