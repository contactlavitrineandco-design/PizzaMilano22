/**
 * Adresse publique du site (domaine canonique), utilisée pour les balises
 * canoniques, le sitemap, Open Graph et les données structurées.
 * Ordre : NEXT_PUBLIC_SITE_URL > domaine de production Vercel > local.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/** Ville affichée dans les titres et le contenu. Donnée fournie par le propriétaire du site. */
export const DEFAULT_CITY = "Saint-Brieuc";
