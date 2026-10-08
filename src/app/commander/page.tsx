import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { Shop } from "@/components/Shop";
import { loadShop } from "@/lib/shop-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commander · Pizza Milano" };

export default async function CommanderPage() {
  const data = await loadShop();
  const pizzaFrom = Number.isFinite(data.prices.pizzaFrom) ? data.prices.pizzaFrom : null;
  return (
    <main>
      <Hero banner={data.banner} prices={{ ...data.prices, pizzaFrom }} />
      <Shop products={data.products} supplements={data.supplements} ordering={data.ordering} mode="order" />
    </main>
  );
}
