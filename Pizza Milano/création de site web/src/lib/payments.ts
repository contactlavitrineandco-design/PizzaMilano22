import type { PaymentStatus } from "./types";

/**
 * Statuts de paiement.
 *
 * Aujourd'hui toutes les commandes sont créées en « pending » et réglées au
 * comptoir. Aucune intégration de paiement n'existe encore : le passage à
 * « paid », « failed » ou « refunded » devra venir d'une confirmation du
 * prestataire de paiement (SumUp, une fois le produit utilisé par le
 * restaurant identifié), jamais de la simple création de la commande.
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "À encaisser",
  paid: "Payée",
  failed: "Paiement échoué",
  refunded: "Remboursée",
};

export function isPaid(status: PaymentStatus): boolean {
  return status === "paid";
}
