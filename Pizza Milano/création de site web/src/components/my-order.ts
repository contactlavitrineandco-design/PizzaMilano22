"use client";

import { useSyncExternalStore } from "react";

/**
 * Dernière commande passée depuis ce navigateur : uniquement le numéro, l'heure
 * de retrait et le jeton de suivi (la commande elle-même est en base).
 * Sert à afficher « Votre commande #N : suivre ou annuler » sur la carte.
 */
export interface MyOrder {
  token: string;
  number: number;
  pickup: string;
  day: string; // YYYY-MM-DD, la commande n'est rappelée que le jour même
}

const KEY = "pizzaMilano.myOrder.v1";
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: MyOrder | null } = { raw: null, value: null };

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

function read(): MyOrder | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw === cache.raw) return cache.value;
  let value: MyOrder | null = null;
  try {
    const o = raw ? (JSON.parse(raw) as MyOrder) : null;
    value = o && typeof o.token === "string" && o.day === today() ? o : null;
  } catch {
    value = null;
  }
  cache = { raw, value };
  return value;
}

export function saveMyOrder(o: Omit<MyOrder, "day">) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...o, day: today() }));
  } catch {
    // stockage indisponible : le lien reste affiché sur l'écran de confirmation
  }
  for (const l of listeners) l();
}

export function useMyOrder(): MyOrder | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => null,
  );
}
