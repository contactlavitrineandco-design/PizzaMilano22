/**
 * Informations légales du site (mentions légales, confidentialité, conditions).
 *
 * Données publiques du registre des entreprises (SIRENE, consulté le 14/10/2026),
 * à faire confirmer par le gérant.
 * ⚠️ Les champs à `null` doivent être remplis avec les informations officielles
 * de l'entreprise qui exploite la pizzeria (extrait Kbis / avis de situation
 * INSEE). Tant qu'ils sont vides, les pages affichent « [à compléter : …] ».
 * Adresse, téléphone et horaires du restaurant viennent de la base
 * (restaurant_settings), pas de ce fichier.
 */
export const LEGAL = {
  editeur: {
    /** Nom de l'entreprise tel qu'inscrit au registre (ex. « SAS MILANO 22 » ou nom de l'entrepreneur individuel) */
    raisonSociale: "MILANO PIZZA 22" as string | null,
    /** Forme juridique : SAS, SARL, EURL, entreprise individuelle… */
    formeJuridique: "Société par actions simplifiée (SAS)" as string | null,
    /** Capital social (sociétés uniquement), ex. « 1 000 € » */
    capital: null as string | null,
    /** Adresse du siège social (peut être celle du restaurant) */
    siege: "3 rue du Maréchal Foch, 22000 Saint-Brieuc" as string | null,
    /** Numéro SIRET (14 chiffres) */
    siret: "995 087 970 00019" as string | null,
    /** Immatriculation : « RCS Saint-Brieuc 123 456 789 » ou « RM … » */
    immatriculation: "RCS Saint-Brieuc 995 087 970" as string | null,
    /** Numéro de TVA intracommunautaire (si assujetti) */
    tva: null as string | null,
    /** Directeur ou directrice de la publication (le gérant, en général) */
    directeurPublication: "Mohamed Lamine Sekine, président" as string | null,
    /** Adresse e-mail de contact (aussi pour les demandes RGPD) */
    email: null as string | null,
  },
  /**
   * Médiateur de la consommation (obligatoire pour vendre à des particuliers,
   * art. L612-1 du Code de la consommation) : nom + site web, ex. « CM2C – www.cm2c.net ».
   */
  mediateur: null as string | null,
  hebergeur: {
    nom: "Vercel Inc.",
    adresse: "440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis",
    site: "https://vercel.com",
  },
  baseDeDonnees: {
    nom: "Supabase, Inc.",
    site: "https://supabase.com",
    /** Région choisie à la création du projet Supabase, ex. « Union européenne (Francfort) » */
    region: null as string | null,
  },
  /** Date de dernière mise à jour des pages légales */
  miseAJour: "15 octobre 2026",
};
