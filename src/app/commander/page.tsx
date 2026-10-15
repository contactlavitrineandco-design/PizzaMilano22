import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { PracticalInfo } from "@/components/PracticalInfo";
import { Shop } from "@/components/Shop";
import { loadShop } from "@/lib/shop-page";

export const dynamic = "force-dynamic";

// Même carte que l'accueil : on évite le contenu dupliqué en n'indexant que l'accueil.
export const metadata: Metadata = {
  title: "Commander",
  description: "Choisissez vos pizzas, votre heure de retrait et envoyez votre commande à Pizza Milano.",
  robots: { index: false, follow: true },
};

export default async function CommanderPage() {
  const data = await loadShop();
  return (
    <>
      <main>
        <Hero
          banner={data.banner}
          prices={data.prices}
          status={data.status}
          city={data.city}
          cta={{ href: "#carte", label: "Choisir mes pizzas" }}
          showMenuLink={false}
        />
        <Shop products={data.products} supplements={data.supplements} ordering={data.ordering} mode="order" />
      </main>
      <PracticalInfo
        settings={data.settings}
        city={data.city}
        pizzaFrom={data.prices.pizzaFrom}
        showOrderLink={false}
      />
    </>
  );
}
