"use server";

import { createSessionClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES: OrderStatus[] = ["new", "prep", "ready", "done"];

/**
 * Chaque action passe par une fonction SQL qui vérifie elle-même que le
 * compte connecté figure dans la table staff (is_staff()). Une action
 * serveur étant appelable par n'importe qui, la base reste le vrai garde-fou.
 */
async function callRpc(fn: string, args: Record<string, unknown>): Promise<ActionResult> {
  const supabase = await createSessionClient();
  const { error } = await supabase.rpc(fn, args);
  if (!error) return { ok: true };
  if (error.message === "FORBIDDEN") return { ok: false, message: "Session expirée ou accès refusé. Reconnectez-vous." };
  console.error(`[pizzeria] ${fn}`, error);
  return { ok: false, message: "La modification n'a pas été enregistrée. Réessayez." };
}

export async function setOrderStatus(orderId: string, status: OrderStatus): Promise<ActionResult> {
  if (!UUID_RE.test(orderId) || !STATUSES.includes(status)) return { ok: false, message: "Demande invalide." };
  return callRpc("set_order_status", { p_order_id: orderId, p_status: status });
}

export async function setProductAvailability(productId: string, available: boolean): Promise<ActionResult> {
  if (!UUID_RE.test(productId) || typeof available !== "boolean") return { ok: false, message: "Demande invalide." };
  return callRpc("set_product_availability", { p_product_id: productId, p_available: available });
}

export async function setSupplementAvailability(supplementId: string, available: boolean): Promise<ActionResult> {
  if (!UUID_RE.test(supplementId) || typeof available !== "boolean") return { ok: false, message: "Demande invalide." };
  return callRpc("set_supplement_availability", { p_supplement_id: supplementId, p_available: available });
}

export async function setOnlineOrdersOpen(open: boolean): Promise<ActionResult> {
  if (typeof open !== "boolean") return { ok: false, message: "Demande invalide." };
  return callRpc("set_online_orders_open", { p_open: open });
}
