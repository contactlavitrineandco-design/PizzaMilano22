import "server-only";
import { getMenuData } from "@/lib/data";
import { DEFAULT_CITY } from "@/lib/site";
import { openStatus } from "@/lib/time";

/** Données de la page d'accueil (vitrine) : carte, réglages, ouvert ou fermé. */
export async function loadShop() {
  const { products, supplements, settings } = await getMenuData();
  const minPrice = (cat: string) => {
    const prices = products.filter((p) => p.category === cat).map((p) => p.price);
    return prices.length ? Math.min(...prices) : null;
  };
  const cans = products.filter((p) => p.category === "boisson" && /33 ?cl/i.test(p.name) && p.description.includes("Canette"));
  const pizzaFrom = Math.min(minPrice("tomate") ?? Infinity, minPrice("creme") ?? Infinity);
  return {
    products,
    supplements,
    settings,
    city: settings.city ?? DEFAULT_CITY,
    status: settings.opening_hours_provisional ? null : openStatus(settings.opening_hours),
    prices: {
      pizzaFrom: Number.isFinite(pizzaFrom) ? pizzaFrom : null,
      souffle: minPrice("souffle"),
      can: cans.length ? Math.min(...cans.map((p) => p.price)) : null,
    },
  };
}
