import type { OpeningHours, TimeRange, Weekday } from "./types";

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
