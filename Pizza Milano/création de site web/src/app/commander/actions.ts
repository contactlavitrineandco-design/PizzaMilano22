"use server";

import { createOrder, type OrderConfirmation } from "@/lib/orders/create";
import { validateOrderInput, type FieldErrors } from "@/lib/orders/validation";

export type SubmitOrderResult =
  | { ok: true; order: OrderConfirmation }
  | { ok: false; message: string; fields?: (keyof FieldErrors)[]; refresh: boolean };

/**
 * Point d'entrée public pour créer une commande.
 * Tout ce qui arrive ici vient du navigateur et est revalidé ;
 * les prix envoyés éventuellement sont ignorés (seuls identifiants,
 * quantités, supplément et viande sont lus).
 */
export async function submitOrder(raw: unknown): Promise<SubmitOrderResult> {
  const parsed = validateOrderInput(raw);
  if (!parsed.ok) {
    if (parsed.spam) return { ok: false, message: "La commande n'a pas pu être envoyée.", refresh: false };
    const fields = Object.keys(parsed.errors) as (keyof FieldErrors)[];
    const first = fields[0];
    return {
      ok: false,
      message: (first && parsed.errors[first]) || "Vérifiez le formulaire.",
      fields,
      refresh: false,
    };
  }

  try {
    const res = await createOrder(parsed.value);
    if (res.ok) return { ok: true, order: res.order };
    return { ok: false, message: res.message, refresh: res.refresh };
  } catch (err) {
    console.error("[submitOrder]", err);
    return { ok: false, message: "La commande n'a pas pu être envoyée. Réessayez dans un instant.", refresh: false };
  }
}
