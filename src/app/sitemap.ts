import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Pages indexables (/commander n'est qu'une redirection vers la commande SumUp).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
