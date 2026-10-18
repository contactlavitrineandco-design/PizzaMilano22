import type { OpeningHours, RestaurantSettings, TimeRange, Weekday } from "./types";

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

export function addDaysYmd(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + n)).toISOString().slice(0, 10);
}

function weekdayOf(ymd: string): Weekday {
  const [y, m, d] = ymd.split("-").map(Number);
  const js = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay(); // 0 = dimanche
  return WEEKDAYS[(js + 6) % 7]!;
}

/** Une plage dont la fermeture précède l'ouverture se termine le lendemain (ex. 18:00 → 02:00). */
export function rangeEndMinutes(r: TimeRange): number {
  const open = toMinutes(r.open);
  const close = toMinutes(r.close);
  return close <= open ? close + 1440 : close;
}

/** "18:00" → "18h", "23:30" → "23h30" */
export function frHour(hm: string): string {
  const [h, m] = hm.split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

const DAY_FR: Record<Weekday, string> = {
  monday: "lundi",
  tuesday: "mardi",
  wednesday: "mercredi",
  thursday: "jeudi",
  friday: "vendredi",
  saturday: "samedi",
  sunday: "dimanche",
};

export interface OpenStatus {
  open: boolean;
  /** Phrase courte : « Ouvert jusqu'à 23h30 », « Fermé · ouvre mardi à 11h ». */
  label: string;
}

/** Ouvert ou fermé maintenant (heure de Paris), plages de nuit comprises. */
export function openStatus(hours: OpeningHours, now: Date = new Date()): OpenStatus {
  const p = parisParts(now);
  const nowMin = p.hour * 60 + p.minute;
  // Minutes depuis minuit aujourd'hui ; la veille en négatif, les 7 jours suivants en positif.
  const windows = [-1, 0, 1, 2, 3, 4, 5, 6, 7].flatMap((offset) => {
    const day = weekdayOf(addDaysYmd(p.ymd, offset));
    return (hours[day] ?? []).map((r) => ({
      offset,
      day,
      open: r.open,
      close: r.close,
      start: offset * 1440 + toMinutes(r.open),
      end: offset * 1440 + rangeEndMinutes(r),
    }));
  });
  const current = windows.find((w) => nowMin >= w.start && nowMin < w.end);
  if (current) return { open: true, label: `Ouvert jusqu'à ${frHour(current.close)}` };
  const next = windows.filter((w) => w.start > nowMin).sort((a, b) => a.start - b.start)[0];
  if (!next) return { open: false, label: "Fermé" };
  const when = next.offset === 0 ? "aujourd'hui" : next.offset === 1 ? "demain" : DAY_FR[next.day];
  return { open: false, label: `Fermé · ouvre ${when} à ${frHour(next.open)}` };
}

/** Fin de la journée de service : avant 6 h, on est encore sur la journée de la veille (comme business_date() en base). */
export const SERVICE_DAY_END_MINUTES = 6 * 60;

export function businessDate(date: Date = new Date()): string {
  const p = parisParts(date);
  return p.hour * 60 + p.minute < SERVICE_DAY_END_MINUTES ? addDaysYmd(p.ymd, -1) : p.ymd;
}

export type OrderingReason = "open" | "closed_manual" | "outside_hours" | "no_slots";

export interface OrderingWindow {
  canOrder: boolean;
  reason: OrderingReason;
  /** Créneaux de retrait proposables, "HH:MM", heure de Paris. */
  slots: string[];
  /** Date (Paris, "YYYY-MM-DD") de chaque créneau : le lendemain pour un créneau après minuit. */
  slotDates: Record<string, string>;
  /** Journée de service en cours, "YYYY-MM-DD" (elle se termine à 6 h du matin). */
  today: string;
}

/**
 * Règles (identiques à check_order_window() en base) :
 * - l'interrupteur manuel « commandes en ligne » doit être ouvert ;
 * - on ne commande que pendant une plage d'ouverture (celles de la veille
 *   qui passent minuit comptent) ;
 * - le retrait se fait dans une plage de la même journée de service, pas
 *   encore terminée (fermeture incluse), au moins min_prep_minutes après
 *   maintenant ;
 * - les créneaux sont alignés sur slot_interval_minutes.
 */
export function computeOrderingWindow(settings: RestaurantSettings, now: Date = new Date()): OrderingWindow {
  const p = parisParts(now);
  const base = { today: businessDate(now), slots: [] as string[], slotDates: {} as Record<string, string> };

  if (!settings.online_orders_open) return { ...base, canOrder: false, reason: "closed_manual" };

  // Minutes comptées depuis minuit aujourd'hui (Paris) ; la veille est en négatif.
  const nowMin = p.hour * 60 + p.minute;
  const windows = [-1, 0].flatMap((offset) =>
    (settings.opening_hours?.[weekdayOf(addDaysYmd(p.ymd, offset))] ?? []).map((r) => ({
      offset,
      start: offset * 1440 + toMinutes(r.open),
      end: offset * 1440 + rangeEndMinutes(r),
    })),
  );
  const current = windows.find((w) => nowMin >= w.start && nowMin < w.end);
  if (!current) return { ...base, canOrder: false, reason: "outside_hours" };

  const step = settings.slot_interval_minutes;
  const earliest = Math.ceil((nowMin + settings.min_prep_minutes) / step) * step;
  const slots = new Set<number>();
  for (const w of windows) {
    if (w.offset !== current.offset) continue;
    for (let t = Math.max(earliest, Math.ceil(w.start / step) * step); t <= w.end; t += step) slots.add(t);
  }
  const sorted = [...slots].sort((a, b) => a - b);
  if (sorted.length === 0) return { ...base, canOrder: false, reason: "no_slots" };
  const slotDates: Record<string, string> = {};
  const list = sorted.map((t) => {
    const label = fromMinutes(t % 1440);
    slotDates[label] = t >= 1440 ? addDaysYmd(p.ymd, 1) : p.ymd;
    return label;
  });
  return { ...base, canOrder: true, reason: "open", slots: list, slotDates };
}
