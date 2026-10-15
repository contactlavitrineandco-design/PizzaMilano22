import { getAccess } from "@/lib/auth";
import { csvNumber, csvText, frDate, parseHistoryQuery, periodLabel, splitVat, toCsv } from "@/lib/history";
import {
  fetchExportLines,
  fetchReport,
  fetchVatRates,
  HistoryError,
  logAdminAction,
} from "@/lib/history-data";
import { CATEGORIES } from "@/lib/menu";
import { formatParisTime } from "@/lib/time";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  new: "Nouvelle",
  prep: "Au four",
  ready: "Prête",
  done: "Récupérée",
  cancelled: "Annulée",
};

function deny(status: number, message: string) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * Export CSV de l'historique, sans aucune donnée personnelle (ni nom, ni téléphone).
 * Réservé à l'administrateur connecté avec la double authentification ; la base
 * de données refait la vérification et chaque export est inscrit au journal.
 */
export async function GET(request: Request) {
  const access = await getAccess();
  if (!access.role) return deny(401, "Connexion requise.");
  if (access.role !== "admin" || !access.mfa) return deny(403, "Accès réservé à l'administrateur (double authentification).");

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const type = params.type === "detail" ? "detail" : params.type === "recap" ? "recap" : null;
  if (!type || !params.du || !params.au) return deny(400, "Demande invalide.");
  const q = parseHistoryQuery(params);
  if (q.from !== params.du || q.to !== params.au) return deny(400, "Période invalide.");

  try {
    let csv: string;
    if (type === "recap") {
      const [report, vat] = await Promise.all([fetchReport(q.from, q.to, q.group), fetchVatRates()]);
      const withVat = vat.food !== null && vat.drinks !== null;
      const header = [
        q.group === "day" ? "Jour" : "Mois",
        "Commandes récupérées",
        "Plats TTC",
        "Boissons TTC",
        "Total TTC",
        ...(withVat
          ? [`Plats HT (${vat.food} %)`, "TVA plats", `Boissons HT (${vat.drinks} %)`, "TVA boissons", "Total HT", "Total TVA"]
          : []),
        "Commandes annulées",
        "Commandes non clôturées",
        "Montant non clôturé TTC",
      ];
      const rows = report.periods.map((p) => {
        const f = splitVat(p.food_total, vat.food);
        const d = splitVat(p.drinks_total, vat.drinks);
        return [
          csvText(periodLabel(p.period, q.group)),
          String(p.done_count),
          csvNumber(p.food_total),
          csvNumber(p.drinks_total),
          csvNumber(p.done_total),
          ...(withVat && f && d
            ? [f.ht, f.tva, d.ht, d.tva, f.ht + d.ht, f.tva + d.tva].map(csvNumber)
            : []),
          String(p.cancelled_count),
          String(p.open_count),
          csvNumber(p.open_total),
        ];
      });
      csv = toCsv(header, rows);
    } else {
      const lines = await fetchExportLines(q.from, q.to);
      const header = [
        "Date",
        "N° de commande",
        "Heure de retrait",
        "Statut",
        "Produit",
        "Rubrique",
        "Viande",
        "Supplément",
        "Quantité",
        "Prix unitaire TTC",
        "Total ligne TTC",
        "Total commande TTC",
      ];
      const rows = lines.map((l) => [
        frDate(l.order_date),
        String(l.order_number),
        formatParisTime(l.pickup_time),
        csvText(STATUS[l.status] ?? l.status),
        csvText(l.product_name),
        csvText(CATEGORIES.find((c) => c.id === l.category)?.name ?? l.category),
        csvText(l.meat),
        csvText(l.supplement),
        String(l.quantity),
        csvNumber(l.unit_price),
        csvNumber(l.line_total),
        csvNumber(l.order_total),
      ]);
      csv = toCsv(header, rows);
    }

    await logAdminAction(type === "recap" ? "export_summary" : "export_lines", { from: q.from, to: q.to });

    const name = `pizza-milano-${type === "recap" ? "recapitulatif" : "ventes"}-${q.from}_${q.to}.csv`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store, private",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (e) {
    if (e instanceof HistoryError && e.message === "FORBIDDEN")
      return deny(403, "Accès réservé à l'administrateur (double authentification).");
    console.error("[historique] export", e);
    return deny(500, "Export impossible pour le moment.");
  }
}
