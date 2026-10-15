import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { PizzeriaGallery } from "@/components/PizzeriaGallery";
import { PracticalInfo } from "@/components/PracticalInfo";
import { Shop } from "@/components/Shop";
import { getGalleryPhotos } from "@/lib/data";
import { loadShop } from "@/lib/shop-page";
import { jsonLdScript, restaurantJsonLd } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

// Titre et description par défaut (layout) : page d'accueil = page à référencer.
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [data, gallery] = await Promise.all([loadShop(), getGalleryPhotos()]);
  return (
    <>
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(restaurantJsonLd(data.settings, data.products, gallery)) }}
        />
        <Hero
          banner={data.banner}
          prices={data.prices}
          status={data.status}
          city={data.city}
          cta={
            data.ordering.canOrder
              ? { href: "/commander#carte", label: "Commander maintenant" }
              : { href: "#carte", label: "Voir la carte" }
          }
          showMenuLink={data.ordering.canOrder}
        />
        <Shop products={data.products} supplements={data.supplements} ordering={data.ordering} mode="browse">
          <PizzeriaGallery photos={gallery} settings={data.settings} />
        </Shop>
      </main>
      <PracticalInfo settings={data.settings} city={data.city} pizzaFrom={data.prices.pizzaFrom} showOrderLink />
    </>
  );
}
