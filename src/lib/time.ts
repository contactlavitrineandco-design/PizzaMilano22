import type { RestaurantSettings, TimeRange, Weekday } from "./types";

/** Tous les calculs d'horaires se font en heure de Paris, quel que soit le fuseau du serveur. */
export const TIMEZONE = "Europe/Paris";

export const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export interface ParisParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: Weekday;
  /** "YYYY-MM-DD" */
  ymd: string;
}

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "long",
});

export function parisParts(date: Date): ParisParts {
  const map: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(date)) map[p.type] = p.value;
  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  return {
    year,
    month,
    day,
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: (map.weekday ?? "monday").toLowerCase() as Weekday,
    ymd: `${map.year}-${map.month}-${map.day}`,
  };
}

export function toMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Décalage de Paris par rapport à UTC, en minutes, à l'instant donné. */
function parisOffsetMinutes(date: Date): number {
  const p = parisParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const floored = Math.floor(date.getTime() / 60000) * 60000;
  return Math.round((asUtc - floored) / 60000);
}

/** Convertit une date + heure « murale » de Paris en instant UTC. */
export function parisWallTimeToDate(ymd: string, hm: string): Date {
  const [y, mo, d] = ymd.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);
  const guess = Date.UTC(y ?? 1970, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0);
  const first = parisOffsetMinutes(new Date(guess));
  let ts = guess - first * 60000;
  const second = parisOffsetMinutes(new Date(ts));
  if (second !== first) ts = guess - second * 60000;
  return new Date(ts);
}

/** "HH:MM" en heure de Paris pour un instant ISO. */
export function formatParisTime(iso: string): string {
  const p = parisParts(new Date(iso));
  return fromMinutes(p.hour * 60 + p.minute);
}

export type OrderingReason = "open" | "closed_manual" | "outside_hours" | "no_slots";

export interface OrderingWindow {
  canOrder: boolean;
  reason: OrderingReason;
  /** Créneaux de retrait proposables, "HH:MM", heure de Paris. */
  slots: string[];
  /** Date du jour à Paris, "YYYY-MM-DD". */
  today: string;
}

/**
 * Règles :
 * - l'interrupteur manuel « commandes en ligne » doit être ouvert ;
 * - on ne commande que pendant une plage d'ouverture du jour ;
 * - le retrait se fait aujourd'hui, dans une plage d'ouverture
 *   (fermeture incluse), au moins min_prep_minutes après maintenant ;
 * - les créneaux sont alignés sur slot_interval_minutes.
 * La même règle est revérifiée en base par check_order_window().
 */
export function computeOrderingWindow(settings: RestaurantSettings, now: Date = new Date()): OrderingWindow {
  const p = parisParts(now);
  const base = { today: p.ymd, slots: [] as string[] };

  if (!settings.online_orders_open) return { ...base, canOrder: false, reason: "closed_manual" };

  const ranges: TimeRange[] = settings.opening_hours?.[p.weekday] ?? [];
  const nowMin = p.hour * 60 + p.minute;
  const openNow = ranges.some((r) => nowMin >= toMinutes(r.open) && nowMin < toMinutes(r.close));
  if (!openNow) return { ...base, canOrder: false, reason: "outside_hours" };

  const step = settings.slot_interval_minutes;
  const earliest = Math.ceil((nowMin + settings.min_prep_minutes) / step) * step;
  const slots = new Set<number>();
  for (const r of ranges) {
    const open = toMinutes(r.open);
    const close = toMinutes(r.close);
    let t = earliest > open ? earliest : Math.ceil(open / step) * step;
    for (; t <= close; t += step) slots.add(t);
  }
  const list = [...slots].sort((a, b) => a - b).map(fromMinutes);
  if (list.length === 0) return { ...base, canOrder: false, reason: "no_slots" };
  return { ...base, canOrder: true, reason: "open", slots: list };
}
