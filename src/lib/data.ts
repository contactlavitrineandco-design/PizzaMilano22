import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import type { Product, RestaurantSettings, Supplement } from "@/lib/types";

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
