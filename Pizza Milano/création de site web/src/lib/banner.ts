import type { OrderingReason } from "./time";

export function closedBanner(reason: OrderingReason): string | null {
  switch (reason) {
    case "closed_manual":
      return "Les commandes en ligne sont en pause pour le moment. Vous pouvez parcourir la carte.";
    case "outside_hours":
      return "Les commandes en ligne sont fermées en dehors des horaires d'ouverture. Vous pouvez parcourir la carte.";
    case "no_slots":
      return "Plus aucun créneau de retrait n'est disponible aujourd'hui. Vous pouvez parcourir la carte.";
    default:
      return null;
  }
}
