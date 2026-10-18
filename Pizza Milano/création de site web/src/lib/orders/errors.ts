/** Codes levés par create_order() (migration) et par la couche serveur. */
export function orderErrorMessage(code: string, detail?: string | null): string {
  switch (code) {
    case "ORDERS_CLOSED":
      return "Les commandes en ligne sont en pause pour le moment.";
    case "OUTSIDE_OPENING_HOURS":
      return "Les commandes en ligne sont fermées en dehors des horaires d'ouverture.";
    case "NO_SLOTS":
      return "Plus aucun créneau de retrait n'est disponible aujourd'hui.";
    case "SLOT_UNAVAILABLE":
    case "PICKUP_TOO_SOON":
    case "PICKUP_OUTSIDE_HOURS":
    case "PICKUP_NOT_TODAY":
      return "Ce créneau de retrait n'est plus disponible. Choisissez-en un autre.";
    case "PRODUCT_UNAVAILABLE":
      return `${detail ?? "Un produit"} n'est plus disponible. Il a été retiré de votre panier.`;
    case "SUPPLEMENT_UNAVAILABLE":
      return `Le supplément ${detail ?? ""} n'est plus disponible. Modifiez votre panier.`.replace("  ", " ");
    case "SUPPLEMENT_INVALID":
      return "Un supplément choisi ne correspond pas à son produit. Modifiez votre panier.";
    case "MEAT_REQUIRED":
      return "Choisissez la viande de votre soufflé.";
    case "MEAT_NOT_ALLOWED":
    case "PRODUCT_NOT_FOUND":
    case "INVALID_CART":
    case "INVALID_QUANTITY":
      return "Votre panier contient un article invalide. Rechargez la page.";
    case "CART_TOO_LARGE":
      return "50 articles maximum par commande en ligne.";
    case "INVALID_NAME":
      return "Indiquez votre prénom.";
    case "INVALID_PHONE":
      return "Indiquez un numéro français à 10 chiffres.";
    case "INVALID_NOTE":
      return "Remarque trop longue (200 caractères maximum).";
    case "TOO_MANY_ORDERS":
      return "Plusieurs commandes viennent d'être passées avec ce numéro. Réessayez dans quelques minutes.";
    default:
      return "La commande n'a pas pu être envoyée. Réessayez dans un instant.";
  }
}

/** Codes après lesquels la carte ou les créneaux affichés sont périmés. */
export const STALE_DATA_CODES = new Set([
  "ORDERS_CLOSED",
  "OUTSIDE_OPENING_HOURS",
  "NO_SLOTS",
  "SLOT_UNAVAILABLE",
  "PICKUP_TOO_SOON",
  "PICKUP_OUTSIDE_HOURS",
  "PICKUP_NOT_TODAY",
  "PRODUCT_UNAVAILABLE",
  "SUPPLEMENT_UNAVAILABLE",
  "PRODUCT_NOT_FOUND",
]);
