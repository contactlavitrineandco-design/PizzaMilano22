import "server-only";
import { createSessionClient } from "@/lib/supabase/server";
import type { Category, OrderStatus, PaymentStatus } from "@/lib/types";
import { PAGE_SIZE, type Group, type HistoryQuery } from "@/lib/history";

export interface ReportPeriod {
  period: string;
  done_count: number;
  done_total: number;
  food_total: number;
  drinks_total: number;
  cancelled_count: number;
  open_count: number;
  open_total: number;
}

export interface Report {
  summary: {
    done_count: number;
    done_total: number;
    cancelled_count: number;
    open_count: number;
    open_total: number;
    food_total: number;
    drinks_total: number;
    anonymized_count: number;
  };
  periods: ReportPeriod[];
  categories: { category: Category; quantity: number; total: number }[];
  products: { name: string; category: Category; quantity: number; total: number }[];
}

export interface HistoryRow {
  id: string;
  order_date: string;
  order_number: number;
  customer_name: string;
  phone_hint: string | null;
  pickup_time: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total: number;
  items: string;
  cancelled_by: "client" | "restaurant" | null;
  anonymized: boolean;
}

export interface ExportLine {
  order_date: string;
  order_number: number;
  pickup_time: string;
  status: OrderStatus;
  product_name: string;
  category: Category;
  meat: string | null;
  supplement: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  order_total: number;
}

export class HistoryError extends Error {}

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error || res.data === null) {
    console.error(`[historique] ${what}`, res.error);
    throw new HistoryError(res.error?.message === "FORBIDDEN" ? "FORBIDDEN" : "READ_FAILED");
  }
  return res.data;
}

export async function fetchReport(from: string, to: string, group: Group): Promise<Report> {
  const supabase = await createSessionClient();
  const raw = check(await supabase.rpc("order_report", { p_from: from, p_to: to, p_group: group }), "récap") as Row;
  const s = raw.summary as Row;
  return {
    summary: {
      done_count: num(s.done_count),
      done_total: num(s.done_total),
      cancelled_count: num(s.cancelled_count),
      open_count: num(s.open_count),
      open_total: num(s.open_total),
      food_total: num(s.food_total),
      drinks_total: num(s.drinks_total),
      anonymized_count: num(s.anonymized_count),
    },
    periods: (raw.periods as Row[]).map((p) => ({
      period: String(p.period),
      done_count: num(p.done_count),
      done_total: num(p.done_total),
      food_total: num(p.food_total),
      drinks_total: num(p.drinks_total),
      cancelled_count: num(p.cancelled_count),
      open_count: num(p.open_count),
      open_total: num(p.open_total),
    })),
    categories: (raw.categories as Row[]).map((c) => ({
      category: c.category as Category,
      quantity: num(c.quantity),
      total: num(c.total),
    })),
    products: (raw.products as Row[]).map((p) => ({
      name: String(p.name),
      category: p.category as Category,
      quantity: num(p.quantity),
      total: num(p.total),
    })),
  };
}

export async function fetchOrders(q: HistoryQuery): Promise<{ rows: HistoryRow[]; count: number }> {
  const supabase = await createSessionClient();
  const data = check(
    await supabase.rpc("search_orders", {
      p_from: q.from,
      p_to: q.to,
      p_status: q.status,
      p_q: q.q,
      p_sort: q.sort,
      p_desc: q.desc,
      p_limit: PAGE_SIZE,
      p_offset: (q.page - 1) * PAGE_SIZE,
    }),
    "recherche",
  ) as Row[];
  return {
    count: num(data[0]?.total_count),
    rows: data.map((r) => ({
      id: String(r.id),
      order_date: String(r.order_date),
      order_number: num(r.order_number),
      customer_name: String(r.customer_name),
      phone_hint: (r.phone_hint as string | null) ?? null,
      pickup_time: String(r.pickup_time),
      status: r.status as OrderStatus,
      payment_status: r.payment_status as PaymentStatus,
      total: num(r.total),
      items: String(r.items ?? ""),
      cancelled_by: (r.cancelled_by as HistoryRow["cancelled_by"]) ?? null,
      anonymized: Boolean(r.anonymized),
    })),
  };
}

const EXPORT_PAGE = 1000; // limite de lignes par requête de Supabase (réglage par défaut)
const EXPORT_MAX = 200_000;

export async function fetchExportLines(from: string, to: string): Promise<ExportLine[]> {
  const supabase = await createSessionClient();
  const out: ExportLine[] = [];
  for (let start = 0; start < EXPORT_MAX; start += EXPORT_PAGE) {
    const page = check(
      await supabase.rpc("export_order_lines", { p_from: from, p_to: to }).range(start, start + EXPORT_PAGE - 1),
      "export",
    ) as Row[];
    for (const r of page)
      out.push({
        order_date: String(r.order_date),
        order_number: num(r.order_number),
        pickup_time: String(r.pickup_time),
        status: r.status as OrderStatus,
        product_name: String(r.product_name),
        category: r.category as Category,
        meat: (r.meat as string | null) ?? null,
        supplement: (r.supplement as string | null) ?? null,
        quantity: num(r.quantity),
        unit_price: num(r.unit_price),
        line_total: num(r.line_total),
        order_total: num(r.order_total),
      });
    if (page.length < EXPORT_PAGE) break;
  }
  return out;
}

export async function fetchVatRates(): Promise<{ food: number | null; drinks: number | null }> {
  const supabase = await createSessionClient();
  const data = check(
    await supabase.from("restaurant_settings").select("vat_rate_food, vat_rate_drinks").eq("id", 1).single(),
    "TVA",
  ) as Row;
  return {
    food: data.vat_rate_food == null ? null : Number(data.vat_rate_food),
    drinks: data.vat_rate_drinks == null ? null : Number(data.vat_rate_drinks),
  };
}

export async function fetchAudit(): Promise<{ action: string; details: Row; created_at: string }[]> {
  const supabase = await createSessionClient();
  const data = check(
    await supabase.from("admin_audit").select("action, details, created_at").order("created_at", { ascending: false }).limit(8),
    "journal",
  ) as Row[];
  return data.map((r) => ({ action: String(r.action), details: (r.details as Row) ?? {}, created_at: String(r.created_at) }));
}

export async function logAdminAction(action: "export_summary" | "export_lines", details: Record<string, string>) {
  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("log_admin_action", { p_action: action, p_details: details });
  if (error) {
    console.error("[historique] journal", error);
    throw new HistoryError(error.message === "FORBIDDEN" ? "FORBIDDEN" : "READ_FAILED");
  }
}
