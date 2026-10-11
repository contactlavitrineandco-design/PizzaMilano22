import { Hero } from "@/components/Hero";
import { PizzeriaGallery } from "@/components/PizzeriaGallery";
import { Shop } from "@/components/Shop";
import { getGalleryPhotos } from "@/lib/data";
import { loadShop } from "@/lib/shop-page";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [data, gallery] = await Promise.all([loadShop(), getGalleryPhotos()]);
  const pizzaFrom = Number.isFinite(data.prices.pizzaFrom) ? data.prices.pizzaFrom : null;
  return (
    <main>
      <Hero banner={data.banner} prices={{ ...data.prices, pizzaFrom }} />
      <Shop products={data.products} supplements={data.supplements} ordering={data.ordering} mode="browse">
        <PizzeriaGallery photos={gallery} />
      </Shop>
    </main>
  );
}
