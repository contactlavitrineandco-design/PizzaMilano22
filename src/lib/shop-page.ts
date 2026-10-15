import "server-only";
import { closedBanner } from "@/lib/banner";
import { getMenuData } from "@/lib/data";
import { DEFAULT_CITY } from "@/lib/site";
import { computeOrderingWindow, openStatus } from "@/lib/time";

/** Données communes aux pages / et /commander. */
export async function loadShop() {
  const { products, supplements, settings } = await getMenuData();
  const ordering = computeOrderingWindow(settings);
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
    ordering,
    status: settings.opening_hours_provisional ? null : openStatus(settings.opening_hours),
    banner: closedBanner(ordering.reason),
    prices: {
      pizzaFrom: Number.isFinite(pizzaFrom) ? pizzaFrom : null,
      souffle: minPrice("souffle"),
      can: cans.length ? Math.min(...cans.map((p) => p.price)) : null,
    },
  };
}
