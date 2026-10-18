import { isAdmin } from "@/lib/admin-session";
import { toProduct, toSupplement } from "@/lib/data";
import { CATEGORIES } from "@/lib/menu";
import { createAdminClient } from "@/lib/supabase/admin";
import { parisParts } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Export de la carte du site pour la caisse SumUp (espace gérant uniquement).
 *
 * Un fichier CSV lisible dans Excel (séparateur « ; », virgule décimale,
 * UTF-8) : rubrique, nom, prix TTC, description, disponible. SumUp importe un
 * catalogue depuis un fichier modèle téléchargé dans le compte SumUp ; les
 * colonnes de ce modèle ne sont pas connues ici, il suffit d'y recopier les
 * colonnes de ce fichier.
 */

/** Cellule texte ; une valeur commençant par = + - @ serait exécutée par Excel : on la neutralise. */
function cell(value: string): string {
  let s = value;
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const money = (n: number) => n.toFixed(2).replace(".", ",");

export async function GET() {
  if (!(await isAdmin())) {
    return new Response("Accès réservé au gérant.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const db = createAdminClient();
  const [products, supplements] = await Promise.all([
    db.from("products").select("*").order("category").order("sort_order"),
    db.from("supplements").select("*").order("sort_order"),
  ]);
  if (products.error || supplements.error) {
    return new Response("Export impossible pour le moment.", { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  const rows: string[][] = [];
  for (const c of CATEGORIES) {
    for (const p of (products.data ?? []).map(toProduct).filter((x) => x.category === c.id)) {
      rows.push([cell(c.name), cell(p.name), money(p.price), cell(p.description), p.available ? "Oui" : "Non"]);
    }
  }
  for (const s of (supplements.data ?? []).map(toSupplement)) {
    rows.push(["Suppléments", cell(`Supplément ${s.name.toLowerCase()}`), money(s.price), "", s.available ? "Oui" : "Non"]);
  }

  const header = ["Rubrique", "Nom", "Prix TTC (€)", "Description", "Disponible"];
  const csv = "﻿" + [header.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pizza-milano-carte-sumup-${parisParts(new Date()).ymd}.csv"`,
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
