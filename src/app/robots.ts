import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * Pas de Disallow sur /pizzeria et /login : ces pages exigent une connexion et
 * portent déjà « noindex ». Les bloquer ici empêcherait Google de lire ce noindex.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
