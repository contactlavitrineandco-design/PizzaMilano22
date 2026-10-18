"use server";

import { cancelOrderByToken } from "@/lib/orders/track";

export type CancelState = { ok: boolean; message: string } | null;

export async function cancelMyOrder(token: string): Promise<CancelState> {
  try {
    const res = await cancelOrderByToken(String(token));
    switch (res) {
      case "CANCELLED":
        return { ok: true, message: "Votre commande est annulée. Rien ne vous sera demandé." };
      case "ALREADY_CANCELLED":
        return { ok: true, message: "Cette commande était déjà annulée." };
      case "TOO_LATE":
        return {
          ok: false,
          message: "Votre pizza est déjà au four : l'annulation en ligne n'est plus possible. Appelez la pizzeria.",
        };
      default:
        return { ok: false, message: "Commande introuvable." };
    }
  } catch {
    return { ok: false, message: "L'annulation n'a pas pu être envoyée. Réessayez dans un instant." };
  }
}
