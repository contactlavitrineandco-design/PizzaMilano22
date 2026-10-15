import "server-only";
import { CATEGORIES } from "@/lib/menu";
import { imageUrl } from "@/lib/images";
import { siteUrl } from "@/lib/site";
import { WEEKDAYS } from "@/lib/time";
import type { GalleryPhoto, Product, RestaurantSettings } from "@/lib/types";

const SCHEMA_DAYS: Record<string, string> = {
  monday: "https://schema.org/Monday",
  tuesday: "https://schema.org/Tuesday",
  wednesday: "https://schema.org/Wednesday",
  thursday: "https://schema.org/Thursday",
  friday: "https://schema.org/Friday",
  saturday: "https://schema.org/Saturday",
  sunday: "https://schema.org/Sunday",
};

function absolute(path: string): string {
  const url = imageUrl(path);
  return url.startsWith("http") ? url : `${siteUrl()}${url}`;
}

/**
 * Données structurées Schema.org « Restaurant » construites UNIQUEMENT à partir
 * des données réelles en base. Un champ inconnu (adresse, téléphone…) est omis,
 * jamais inventé. Les horaires marqués provisoires ne sont pas publiés.
 */
export function restaurantJsonLd(settings: RestaurantSettings, products: Product[], gallery: GalleryPhoto[]) {
  const base = siteUrl();
  const pizzas = products.filter((p) => p.category === "tomate" || p.category === "creme");
  const prices = pizzas.map((p) => p.price);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${base}/#restaurant`,
    name: settings.restaurant_name,
    url: `${base}/`,
    servesCuisine: ["Pizza"],
    image: [`${base}/og.jpg`, ...gallery.filter((g) => g.source === "restaurant").map((g) => absolute(g.image_path))],
    hasMenu: {
      "@type": "Menu",
      name: "Carte",
      inLanguage: "fr",
      hasMenuSection: CATEGORIES.map((c) => ({
        "@type": "MenuSection",
        name: c.name,
        hasMenuItem: products
          .filter((p) => p.category === c.id)
          .map((p) => ({
            "@type": "MenuItem",
            name: p.name,
            ...(p.description ? { description: p.description } : {}),
            ...(p.image_path && p.image_source === "restaurant" ? { image: absolute(p.image_path) } : {}),
            offers: {
              "@type": "Offer",
              price: p.price.toFixed(2),
              priceCurrency: "EUR",
              availability: p.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
          })),
      })).filter((s) => s.hasMenuItem.length > 0),
    },
  };

  if (prices.length) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    data.priceRange = min === max ? `${min} €` : `${min}–${max} €`;
  }
  if (settings.address && settings.postal_code && settings.city) {
    data.address = {
      "@type": "PostalAddress",
      streetAddress: settings.address,
      postalCode: settings.postal_code,
      addressLocality: settings.city,
      addressCountry: "FR",
    };
  }
  if (settings.phone) data.telephone = `+33 ${settings.phone.slice(1)}`;
  if (settings.latitude != null && settings.longitude != null) {
    data.geo = { "@type": "GeoCoordinates", latitude: settings.latitude, longitude: settings.longitude };
  }
  if (settings.google_maps_url) data.hasMap = settings.google_maps_url;
  if (settings.instagram_url) data.sameAs = [settings.instagram_url];
  // Commande en ligne (page SumUp du restaurant), seulement si le lien est renseigné
  if (settings.order_url) {
    data.potentialAction = {
      "@type": "OrderAction",
      target: { "@type": "EntryPoint", urlTemplate: settings.order_url },
      deliveryMethod: "http://purl.org/goodrelations/v1#DeliveryModePickUp",
    };
  }
  if (!settings.opening_hours_provisional) {
    data.openingHoursSpecification = WEEKDAYS.flatMap((d) =>
      (settings.opening_hours[d] ?? []).map((r) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: SCHEMA_DAYS[d],
        opens: r.open,
        closes: r.close, // fermeture plus tôt que l'ouverture = le lendemain (accepté par Google)
      })),
    );
  }
  return data;
}

/** Sérialisation sûre dans une balise <script> (recommandation Next.js). */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
