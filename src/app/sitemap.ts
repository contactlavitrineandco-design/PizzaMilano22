import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Seule la page d'accueil est indexable (/commander, /login et /pizzeria sont en noindex).
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${siteUrl()}/`, changeFrequency: "weekly", priority: 1 }];
}
