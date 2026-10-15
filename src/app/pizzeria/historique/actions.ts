"use server";

import { revalidatePath } from "next/cache";
import { createSessionClient } from "@/lib/supabase/server";
import { VAT_RATES } from "@/lib/history";
import type { ActionResult } from "../actions";

function parseRate(v: unknown): number | null | undefined {
  if (v === "" || v === null) return null;
  const n = Number(v);
  return (VAT_RATES as readonly number[]).includes(n) ? n : undefined;
}

/** Taux de TVA (facultatifs). La fonction SQL exige l'administrateur avec double authentification. */
export async function setVatRates(food: string, drinks: string): Promise<ActionResult> {
  const f = parseRate(food);
  const d = parseRate(drinks);
  if (f === undefined || d === undefined) return { ok: false, message: "Taux invalide." };
  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("set_vat_rates", { p_food: f, p_drinks: d });
  if (error) {
    if (error.message === "FORBIDDEN")
      return { ok: false, message: "Accès refusé : reconnectez-vous avec votre code de double authentification." };
    console.error("[historique] TVA", error);
    return { ok: false, message: "Les taux n'ont pas été enregistrés. Réessayez." };
  }
  revalidatePath("/pizzeria/historique");
  return { ok: true };
}
