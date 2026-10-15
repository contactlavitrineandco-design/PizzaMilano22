import "server-only";

export interface ForwardedOrder {
  number: number;
  date: string; // journée de service "YYYY-MM-DD"
  pickup: string; // "HH:MM"
  name: string;
  total: number;
}

/**
 * Transmission de la commande à la caisse du restaurant.
 *
 * Le restaurant veut recevoir les commandes du site sur sa caisse SumUp. Le
 * moyen exact est à définir avec SumUp (voir README, « Commandes et SumUp ») :
 * SumUp ne publie pas d'interface permettant à un site extérieur de créer une
 * commande détaillée sur sa caisse. Aucune intégration n'est donc simulée ici.
 *
 * Tant que ce branchement n'existe pas, la commande est enregistrée dans la base
 * (table orders, consultable dans Supabase > Table Editor) et ne s'affiche nulle
 * part au restaurant : gardez les commandes en ligne « en pause » (espace gérant)
 * jusqu'à ce que la transmission fonctionne.
 *
 * Cette fonction ne doit jamais faire échouer la commande du client.
 */
export async function forwardOrderToRestaurant(order: ForwardedOrder): Promise<void> {
  void order; // branchement SumUp à ajouter ici, une fois la solution choisie avec SumUp
}
