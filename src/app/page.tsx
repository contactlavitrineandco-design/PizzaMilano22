import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { Menu } from "@/components/Menu";
import { OrderButton } from "@/components/OrderButton";
import { PizzeriaGallery } from "@/components/PizzeriaGallery";
import { PracticalInfo } from "@/components/PracticalInfo";
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
        <Hero settings={data.settings} prices={data.prices} city={data.city} status={data.status} />
        <Menu products={data.products} supplements={data.supplements} orderButton={<OrderButton settings={data.settings} />}>
          <PizzeriaGallery photos={gallery} settings={data.settings} />
        </Menu>
      </main>
      <PracticalInfo settings={data.settings} city={data.city} pizzaFrom={data.prices.pizzaFrom} />
    </>
  );
}
