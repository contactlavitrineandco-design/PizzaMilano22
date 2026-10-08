import { Hero } from "@/components/Hero";
import { Shop } from "@/components/Shop";
import { loadShop } from "@/lib/shop-page";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await loadShop();
  const pizzaFrom = Number.isFinite(data.prices.pizzaFrom) ? data.prices.pizzaFrom : null;
  return (
    <main>
      <Hero banner={data.banner} prices={{ ...data.prices, pizzaFrom }} />
      <Shop products={data.products} supplements={data.supplements} ordering={data.ordering} mode="browse" />
    </main>
  );
}
