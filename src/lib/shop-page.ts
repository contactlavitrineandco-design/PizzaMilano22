import "server-only";
import { closedBanner } from "@/lib/banner";
import { getMenuData } from "@/lib/data";
import { computeOrderingWindow } from "@/lib/time";

/** Données communes aux pages / et /commander. */
export async function loadShop() {
  const { products, supplements, settings } = await getMenuData();
  const ordering = computeOrderingWindow(settings);
  const minPrice = (cat: string) => {
    const prices = products.filter((p) => p.category === cat).map((p) => p.price);
    return prices.length ? Math.min(...prices) : null;
  };
  const cans = products.filter((p) => p.category === "boisson" && /33 ?cl/i.test(p.name) && p.description.includes("Canette"));
  return {
    products,
    supplements,
    ordering,
    banner: closedBanner(ordering.reason),
    prices: {
      pizzaFrom: Math.min(minPrice("tomate") ?? Infinity, minPrice("creme") ?? Infinity),
      souffle: minPrice("souffle"),
      can: cans.length ? Math.min(...cans.map((p) => p.price)) : null,
    },
  };
}
