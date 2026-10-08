import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { toSettings } from "@/lib/data";
import { computeOrderingWindow, parisWallTimeToDate } from "@/lib/time";
import { orderErrorMessage, STALE_DATA_CODES } from "./errors";
import type { OrderInput } from "./validation";

export interface OrderConfirmation {
  number: number;
  total: number;
  pickup: string; // "HH:MM"
  name: string;
}

export type CreateOrderResult =
  | { ok: true; order: OrderConfirmation }
  | { ok: false; code: string; message: string; refresh: boolean };

function fail(code: string, detail?: string | null): CreateOrderResult {
  return { ok: false, code, message: orderErrorMessage(code, detail), refresh: STALE_DATA_CODES.has(code) };
}

/**
 * Crée une commande à partir d'une saisie déjà validée.
 *
 * 1. relit les réglages et recalcule les créneaux (ouverture, horaires, délai) ;
 * 2. appelle create_order() qui, dans une seule transaction, revérifie
 *    ouverture et horaires, relit prix et disponibilités des produits et
 *    suppléments, calcule le total, attribue le numéro du jour et insère
 *    la commande et ses lignes.
 *
 * La commande est créée avec payment_status = "pending" (paiement au comptoir).
 * Point d'extension paiement : quand le moyen de paiement SumUp du restaurant
 * sera connu, l'étape de paiement se branchera ici, après la création, et le
 * statut ne passera à « paid » que sur confirmation du prestataire.
 */
export async function createOrder(input: OrderInput): Promise<CreateOrderResult> {
  const db = createAdminClient();

  const { data: settingsRow, error: settingsError } = await db
    .from("restaurant_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (settingsError || !settingsRow) {
    console.error("[createOrder] réglages illisibles", settingsError);
    return fail("UNKNOWN");
  }

  const window = computeOrderingWindow(toSettings(settingsRow));
  if (!window.canOrder) {
    return fail(
      window.reason === "closed_manual" ? "ORDERS_CLOSED" : window.reason === "no_slots" ? "NO_SLOTS" : "OUTSIDE_OPENING_HOURS",
    );
  }
  if (!window.slots.includes(input.pickup)) return fail("SLOT_UNAVAILABLE");

  const pickupAt = parisWallTimeToDate(window.today, input.pickup);

  const { data, error } = await db.rpc("create_order", {
    p_customer_name: input.name,
    p_customer_phone: input.phone,
    p_pickup_time: pickupAt.toISOString(),
    p_note: input.note,
    p_items: input.items.map((l) => ({
      product_id: l.productId,
      quantity: l.quantity,
      supplement_id: l.supplementId,
      meat: l.meat,
    })),
  });

  if (error) {
    const code = /^[A-Z_]+$/.test(error.message) ? error.message : "UNKNOWN";
    if (code === "UNKNOWN") console.error("[createOrder] erreur base", error);
    return fail(code, error.details);
  }

  const row = (Array.isArray(data) ? data[0] : data) as { order_number: number; total: number | string } | undefined;
  if (!row) return fail("UNKNOWN");

  return {
    ok: true,
    order: { number: Number(row.order_number), total: Number(row.total), pickup: input.pickup, name: input.name },
  };
}
