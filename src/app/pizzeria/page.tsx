import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffRole } from "@/lib/auth";
import { toProduct, toSettings, toSupplement } from "@/lib/data";
import { createSessionClient } from "@/lib/supabase/server";
import { parisParts } from "@/lib/time";
import type { Order, OrderItem } from "@/lib/types";
import { Board } from "./Board";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Espace pizzeria · Pizza Milano", robots: { index: false } };

type Row = Record<string, unknown>;

function toOrder(r: Row): Order {
  const items = (Array.isArray(r.order_items) ? r.order_items : []) as Row[];
  return {
    id: String(r.id),
    order_number: Number(r.order_number),
    customer_name: String(r.customer_name),
    customer_phone: String(r.customer_phone),
    pickup_time: String(r.pickup_time),
    note: String(r.note ?? ""),
    status: r.status as Order["status"],
    payment_status: r.payment_status as Order["payment_status"],
    total: Number(r.total),
    created_at: String(r.created_at),
    items: items.map(
      (i): OrderItem => ({
        id: String(i.id),
        product_id: String(i.product_id),
        product_name: String(i.product_name),
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        supplement_name: (i.supplement_name as string | null) ?? null,
        supplement_price: i.supplement_price == null ? null : Number(i.supplement_price),
        meat: (i.meat as string | null) ?? null,
        line_total: Number(i.line_total),
        category: ((i.products as Row | null)?.category as OrderItem["category"]) ?? null,
      }),
    ),
  };
}

export default async function PizzeriaPage() {
  const role = await getStaffRole();
  if (!role) redirect("/login");

  const supabase = await createSessionClient();
  const now = new Date();
  const today = parisParts(now).ymd;

  const [orders, products, supplements, settings] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, customer_phone, pickup_time, note, status, payment_status, total, created_at, order_items(id, product_id, product_name, quantity, unit_price, supplement_name, supplement_price, meat, line_total, created_at, products(category))",
      )
      .eq("order_date", today)
      .order("pickup_time")
      .order("created_at", { referencedTable: "order_items" }),
    supabase.from("products").select("*").order("category").order("sort_order"),
    supabase.from("supplements").select("*").order("sort_order"),
    supabase.from("restaurant_settings").select("*").eq("id", 1).single(),
  ]);

  if (orders.error || products.error || supplements.error || settings.error) {
    console.error("[pizzeria] lecture", orders.error ?? products.error ?? supplements.error ?? settings.error);
    throw new Error("Lecture des commandes impossible");
  }

  return (
    <Board
      orders={(orders.data as Row[]).map(toOrder)}
      products={(products.data as Row[]).map(toProduct)}
      supplements={(supplements.data as Row[]).map(toSupplement)}
      settings={toSettings(settings.data as Row)}
      serverNow={now.getTime()}
    />
  );
}
