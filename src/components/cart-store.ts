"use client";

import { useSyncExternalStore } from "react";
import type { CartLine } from "@/lib/types";

/**
 * Panier conservé dans le navigateur (localStorage).
 * Il ne contient que des identifiants et des quantités : aucun prix,
 * aucune commande. Une commande n'existe qu'une fois enregistrée par le serveur.
 */
const KEY = "pizzaMilano.cart.v2";
const EMPTY: CartLine[] = [];
let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

function sanitize(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
    .map((l) => ({
      productId: String(l.productId ?? ""),
      quantity: Number.isInteger(l.quantity) ? (l.quantity as number) : 1,
      supplementId: typeof l.supplementId === "string" ? l.supplementId : null,
      meat: typeof l.meat === "string" ? l.meat : null,
    }))
    .filter((l) => l.productId && l.quantity > 0)
    .slice(0, 30);
}

function read(): CartLine[] {
  if (cache) return cache;
  try {
    cache = sanitize(JSON.parse(window.localStorage.getItem(KEY) ?? "[]"));
  } catch {
    cache = [];
  }
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setCart(next: CartLine[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // stockage indisponible (navigation privée…) : le panier reste en mémoire
  }
  for (const l of listeners) l();
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
