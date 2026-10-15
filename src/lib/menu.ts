import type { Category, OrderStatus } from "./types";

export const CATEGORIES: { id: Category; name: string; cls: string; sub: string }[] = [
  { id: "tomate", name: "Base tomate", cls: "red", sub: "Sauce tomate maison" },
  { id: "creme", name: "Base crème", cls: "green", sub: "Crème fraîche" },
  { id: "souffle", name: "Soufflés", cls: "", sub: "10 € · frites incluses" },
  { id: "boisson", name: "Boissons", cls: "", sub: "Bien fraîches" },
];

/** Doit rester identique à la contrainte order_items.meat de la migration. */
export const MEATS = ["Viande hachée", "Poulet", "Merguez", "Jambon"] as const;

export const KITCHEN_CATEGORIES: Category[] = ["tomate", "creme", "souffle"];

export const STATUS_FLOW: { id: Exclude<OrderStatus, "done">; name: string; color: string; button: string }[] = [
  { id: "new", name: "Nouvelles", color: "var(--hot)", button: "Lancer" },
  { id: "prep", name: "Au four", color: "var(--warn)", button: "Prête" },
  { id: "ready", name: "Prêtes", color: "var(--ok)", button: "Récupérée" },
];

export const STATUS_ORDER: OrderStatus[] = ["new", "prep", "ready", "done"]; // « cancelled » est hors du circuit

export function nextStatus(s: OrderStatus): OrderStatus | null {
  if (s === "cancelled") return null;
  const i = STATUS_ORDER.indexOf(s);
  return i >= 0 && i < STATUS_ORDER.length - 1 ? STATUS_ORDER[i + 1]! : null;
}

export function previousStatus(s: OrderStatus): OrderStatus | null {
  const i = STATUS_ORDER.indexOf(s);
  return i > 0 ? STATUS_ORDER[i - 1]! : null;
}
