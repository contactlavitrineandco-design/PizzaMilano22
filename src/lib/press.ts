/**
 * Article de presse mis en avant sur l'accueil (« Ils parlent de nous »).
 *
 * Droit d'auteur : on n'affiche ni la photo du journal ni l'article complet,
 * seulement le titre, une citation courte attribuée au journal et un lien.
 *
 * À COMPLÉTER : `url` (adresse exacte de l'article sur ouest-france.fr) et
 * `date` exacte. Tant que `url` est null, le lien « Lire l'article » n'apparaît pas.
 */
export const PRESS_ARTICLE = {
  outlet: "Ouest-France",
  /** Mois de parution d'après la capture de l'article (jour exact à vérifier). */
  date: "avril 2025",
  title: "Plutôt calzone, mexicaine ou campagnarde ? Une nouvelle pizzeria s'est installée à Saint-Brieuc",
  /** Citation courte, mot pour mot, tirée du chapô de l'article. */
  quote: "Son gérant, Mohamed Sekine, a déjà passé près de quinze ans dans la restauration.",
  url: null as string | null,
};
