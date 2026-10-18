import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TrackedOrder {
  number: number;
  name: string;
  pickupTime: string; // ISO
  status: OrderStatus;
  cancelledBy: "client" | "restaurant" | null;
  total: number;
  items: { quantity: number; name: string; extra: string }[];
}

/**
 * Lecture d'une commande par son jeton secret (côté serveur, clé service).
 * Seules les informations utiles au client sont renvoyées : pas de téléphone.
 */
export async function getOrderByToken(token: string): Promise<TrackedOrder | null> {
  if (!UUID_RE.test(token)) return null;
  const db = createAdminClient();
  const { data, error } = await db
    .from("orders")
    .select(
      "order_number, customer_name, pickup_time, status, cancelled_by, total, order_items(quantity, product_name, supplement_name, meat, created_at)",
    )
    .eq("cancel_token", token)
    .order("created_at", { referencedTable: "order_items" })
    .maybeSingle();
  if (error || !data) return null;
  const items = (data.order_items ?? []) as {
    quantity: number;
    product_name: string;
    supplement_name: string | null;
    meat: string | null;
  }[];
  return {
    number: Number(data.order_number),
    name: String(data.customer_name),
    pickupTime: String(data.pickup_time),
    status: data.status as OrderStatus,
    cancelledBy: (data.cancelled_by as TrackedOrder["cancelledBy"]) ?? null,
    total: Number(data.total),
    items: items.map((i) => ({
      quantity: Number(i.quantity),
      name: i.product_name,
      extra: [i.meat, i.supplement_name ? `+ ${i.supplement_name}` : null].filter(Boolean).join(" · "),
    })),
  };
}

export type CancelResult = "CANCELLED" | "ALREADY_CANCELLED" | "TOO_LATE" | "NOT_FOUND";

export async function cancelOrderByToken(token: string): Promise<CancelResult> {
  if (!UUID_RE.test(token)) return "NOT_FOUND";
  const db = createAdminClient();
  const { data, error } = await db.rpc("cancel_order_by_token", { p_token: token });
  if (error) {
    console.error("[cancelOrder]", error.message);
    throw new Error("cancel_failed");
  }
  return data as CancelResult;
}
