import { parisParts } from "@/lib/time";

/** Paramètres de l'historique, lus depuis l'URL et validés. */
export type StatusFilter = "all" | "done" | "open" | "cancelled";
export type SortKey = "date" | "number" | "total" | "name";
export type Group = "day" | "month";

export interface HistoryQuery {
  from: string;
  to: string;
  preset: string;
  status: StatusFilter;
  q: string;
  sort: SortKey;
  desc: boolean;
  page: number;
  group: Group;
}

export const PAGE_SIZE = 50;
export const VAT_RATES = [0, 2.1, 5.5, 10, 20] as const;

export const PRESETS: { id: string; label: string }[] = [
  { id: "mois", label: "Ce mois-ci" },
  { id: "mois-1", label: "Mois dernier" },
  { id: "trimestre", label: "Ce trimestre" },
  { id: "trimestre-1", label: "Trimestre dernier" },
  { id: "annee", label: "Cette année" },
  { id: "annee-1", label: "Année dernière" },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function ymd(y: number, m: number, d: number): string {
  // m de 1 à 12 ; Date.UTC gère les débordements (mois 13, jour 0)
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
}

function validDate(s: string | undefined): string | null {
  if (!s || !DATE_RE.test(s)) return null;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : null;
}

export function presetRange(id: string, today: string): { from: string; to: string } | null {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const q = Math.floor((m - 1) / 3) * 3 + 1; // premier mois du trimestre
  switch (id) {
    case "mois":
      return { from: ymd(y, m, 1), to: today };
    case "mois-1":
      return { from: ymd(y, m - 1, 1), to: ymd(y, m, 0) };
    case "trimestre":
      return { from: ymd(y, q, 1), to: today };
    case "trimestre-1":
      return { from: ymd(y, q - 3, 1), to: ymd(y, q, 0) };
    case "annee":
      return { from: ymd(y, 1, 1), to: today };
    case "annee-1":
      return { from: ymd(y - 1, 1, 1), to: ymd(y - 1, 12, 31) };
    default:
      return null;
  }
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86_400_000);
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseHistoryQuery(sp: Params, now = new Date()): HistoryQuery {
  const today = parisParts(now).ymd;
  const preset = one(sp.p) ?? "";
  let range = presetRange(preset, today);
  let usedPreset = range ? preset : "";
  if (!range) {
    const from = validDate(one(sp.du));
    const to = validDate(one(sp.au));
    if (from && to && from <= to && daysBetween(from, to) <= 3700) range = { from, to };
  }
  if (!range) {
    range = presetRange("mois", today)!;
    usedPreset = "mois";
  }
  const status = one(sp.statut);
  const sort = one(sp.tri);
  const group = one(sp.par);
  const page = Number.parseInt(one(sp.page) ?? "1", 10);
  return {
    ...range,
    preset: usedPreset,
    status: (["all", "done", "open", "cancelled"] as const).find((s) => s === status) ?? "all",
    q: (one(sp.q) ?? "").trim().slice(0, 40),
    sort: (["date", "number", "total", "name"] as const).find((s) => s === sort) ?? "date",
    desc: one(sp.ordre) !== "asc",
    page: Number.isFinite(page) && page >= 1 && page <= 10_000 ? page : 1,
    group: group === "day" || group === "month" ? group : daysBetween(range.from, range.to) <= 62 ? "day" : "month",
  };
}

/** Construit l'URL de l'historique en ne gardant que les paramètres utiles. */
export function historyHref(
  q: HistoryQuery,
  patch: Partial<HistoryQuery> = {},
  opts: { autoGroup?: boolean } = {},
): string {
  const v = { ...q, ...patch };
  const p = new URLSearchParams();
  if (v.preset) p.set("p", v.preset);
  else {
    p.set("du", v.from);
    p.set("au", v.to);
  }
  if (v.status !== "all") p.set("statut", v.status);
  if (v.q) p.set("q", v.q);
  if (v.sort !== "date") p.set("tri", v.sort);
  if (!v.desc) p.set("ordre", "asc");
  if (v.page > 1) p.set("page", String(v.page));
  // Sans « par », le regroupement est choisi selon la durée (jour jusqu'à 2 mois, sinon mois).
  if (!opts.autoGroup) p.set("par", v.group);
  return `/pizzeria/historique?${p.toString()}`;
}

/** Montant HT et TVA à partir d'un montant TTC (arrondis au centime). */
export function splitVat(ttc: number, rate: number | null): { ht: number; tva: number } | null {
  if (rate === null) return null;
  const ht = Math.round((ttc / (1 + rate / 100)) * 100) / 100;
  return { ht, tva: Math.round((ttc - ht) * 100) / 100 };
}

export function frDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export function periodLabel(isoDate: string, group: Group): string {
  if (group === "day") return frDate(isoDate);
  return `${MONTHS[Number(isoDate.slice(5, 7)) - 1]} ${isoDate.slice(0, 4)}`;
}

// ---------------------------------------------------------------------
// CSV (Excel français : séparateur « ; », virgule décimale, UTF-8 avec BOM)
// ---------------------------------------------------------------------

/** Nombre au format français, sans symbole : 12,50 */
export function csvNumber(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

/**
 * Cellule texte. Une valeur qui commence par = + - @ ou une tabulation
 * pourrait être exécutée comme formule par Excel (injection CSV) :
 * elle est préfixée d'une apostrophe.
 */
export function csvText(value: string | null | undefined): string {
  let s = value ?? "";
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: string[][]): string {
  return "﻿" + [header.map(csvText).join(";"), ...rows.map((r) => r.join(";"))].join("\r\n") + "\r\n";
}
