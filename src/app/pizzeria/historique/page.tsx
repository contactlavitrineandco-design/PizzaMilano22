import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/auth";
import { eur } from "@/lib/format";
import {
  daysBetween,
  frDate,
  historyHref,
  PAGE_SIZE,
  parseHistoryQuery,
  periodLabel,
  PRESETS,
  splitVat,
  type HistoryQuery,
  type SortKey,
} from "@/lib/history";
import {
  fetchAudit,
  fetchOrders,
  fetchReport,
  fetchVatRates,
  HistoryError,
  type HistoryRow,
} from "@/lib/history-data";
import { CATEGORIES } from "@/lib/menu";
import { formatParisTime, parisParts } from "@/lib/time";
import { RowActions } from "./RowActions";
import { VatForm } from "./VatForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Historique · Pizza Milano", robots: { index: false, follow: false } };

const STATUS_LABEL: Record<HistoryRow["status"], string> = {
  new: "Nouvelle",
  prep: "Au four",
  ready: "Prête",
  done: "Récupérée",
  cancelled: "Annulée",
};

const AUDIT_LABEL: Record<string, string> = {
  export_summary: "Export du récapitulatif",
  export_lines: "Export du détail des ventes",
  set_vat_rates: "Taux de TVA modifiés",
};

const catName = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? id;

function SortLink({ q, k, children }: { q: HistoryQuery; k: SortKey; children: React.ReactNode }) {
  const active = q.sort === k;
  const desc = active ? !q.desc : k === "date" || k === "total";
  return (
    <Link
      href={historyHref(q, { sort: k, desc, page: 1 })}
      className={`hist-sort${active ? " on" : ""}`}
      scroll={false}
    >
      {children}
      {active && <span aria-hidden="true">{q.desc ? " ↓" : " ↑"}</span>}
    </Link>
  );
}

export default async function HistoriquePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await getAccess();
  if (!access.role) redirect("/login");
  if (access.role !== "admin") redirect("/pizzeria");
  if (!access.mfa) redirect("/pizzeria/securite?suite=historique");

  const q = parseHistoryQuery(await searchParams);
  const today = parisParts(new Date()).ymd;

  let data;
  try {
    const [report, orders, vat, audit] = await Promise.all([
      fetchReport(q.from, q.to, q.group),
      fetchOrders(q),
      fetchVatRates(),
      fetchAudit(),
    ]);
    data = { report, orders, vat, audit };
  } catch (e) {
    if (e instanceof HistoryError && e.message === "FORBIDDEN") data = null;
    else throw e;
  }
  if (!data) redirect("/pizzeria/securite?suite=historique");

  const { report, orders, vat, audit } = data;
  const s = report.summary;
  const pages = Math.max(1, Math.ceil(orders.count / PAGE_SIZE));
  const rows = [
    { label: "Plats (pizzas, soufflés)", ttc: s.food_total, rate: vat.food },
    { label: "Boissons", ttc: s.drinks_total, rate: vat.drinks },
  ];
  const vatSet = vat.food !== null && vat.drinks !== null;
  const exportBase = `du=${q.from}&au=${q.to}`;
  const longRange = daysBetween(q.from, q.to) > 62;

  return (
    <main>
      <div className="wrap pro hist">
        <div className="pro-head">
          <h1>Historique des commandes</h1>
          <Link href="/pizzeria" className="ghost adm-link">
            Commandes du jour
          </Link>
          <Link href="/pizzeria/securite" className="ghost adm-link">
            Sécurité
          </Link>
        </div>

        {/* ---------- Période et filtres ---------- */}
        <section className="hist-filters" aria-label="Période et filtres">
          <nav className="hist-presets" aria-label="Périodes rapides">
            {PRESETS.map((p) => (
              <Link
                key={p.id}
                href={historyHref(q, { preset: p.id, page: 1 }, { autoGroup: true })}
                className={`chip${q.preset === p.id ? " on" : ""}`}
                aria-current={q.preset === p.id ? "true" : undefined}
              >
                {p.label}
              </Link>
            ))}
          </nav>
          <form className="hist-form" action="/pizzeria/historique" method="get">
            <label>
              Du
              <input type="date" name="du" defaultValue={q.from} max={today} required />
            </label>
            <label>
              Au
              <input type="date" name="au" defaultValue={q.to} max={today} required />
            </label>
            <label>
              Statut
              <select name="statut" defaultValue={q.status}>
                <option value="all">Toutes</option>
                <option value="done">Récupérées</option>
                <option value="open">Non clôturées</option>
                <option value="cancelled">Annulées</option>
              </select>
            </label>
            <label className="grow">
              Rechercher
              <input
                type="search"
                name="q"
                defaultValue={q.q}
                maxLength={40}
                placeholder="N° de commande, prénom, pizza…"
                autoComplete="off"
              />
            </label>
            <button type="submit" className="add">
              Afficher
            </button>
          </form>
          <p className="hist-range">
            Du <b>{frDate(q.from)}</b> au <b>{frDate(q.to)}</b>
          </p>
        </section>

        {/* ---------- Chiffres clés ---------- */}
        <div className="stats">
          <div className="stat">
            <span>Chiffre d&apos;affaires TTC</span>
            <b className="num">{eur(s.done_total)}</b>
          </div>
          <div className="stat">
            <span>Commandes récupérées</span>
            <b className="num">{s.done_count}</b>
          </div>
          <div className="stat">
            <span>Panier moyen</span>
            <b className="num">{eur(s.done_count ? s.done_total / s.done_count : 0)}</b>
          </div>
          <div className="stat">
            <span>Annulées</span>
            <b className="num">{s.cancelled_count}</b>
          </div>
        </div>

        {s.open_count > 0 && (
          <p className="hist-warn" role="note">
            {s.open_count} commande{s.open_count > 1 ? "s" : ""} non clôturée{s.open_count > 1 ? "s" : ""} (
            {eur(s.open_total)}) {s.open_count > 1 ? "ne sont" : "n'est"} pas comptée{s.open_count > 1 ? "s" : ""} dans
            le chiffre d&apos;affaires.{" "}
            <Link href={historyHref(q, { status: "open", page: 1 })}>Les vérifier</Link>
          </p>
        )}

        {/* ---------- Déclaration ---------- */}
        <section className="hist-card" aria-labelledby="decl">
          <div className="hist-card-head">
            <h2 id="decl">Pour la déclaration</h2>
            <div className="hist-export">
              <a className="ghost" href={`/pizzeria/historique/export?type=recap&par=${q.group}&${exportBase}`} download>
                Récapitulatif (CSV)
              </a>
              <a className="ghost" href={`/pizzeria/historique/export?type=detail&${exportBase}`} download>
                Détail des ventes (CSV)
              </a>
            </div>
          </div>
          <div className="hist-scroll">
            <table className="hist-table">
              <thead>
                <tr>
                  <th scope="col">Ventes récupérées</th>
                  <th scope="col" className="r">TTC</th>
                  {vatSet && (
                    <>
                      <th scope="col" className="r">Taux</th>
                      <th scope="col" className="r">HT</th>
                      <th scope="col" className="r">TVA</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const v = splitVat(r.ttc, r.rate);
                  return (
                    <tr key={r.label}>
                      <th scope="row">{r.label}</th>
                      <td className="r num">{eur(r.ttc)}</td>
                      {vatSet && v && (
                        <>
                          <td className="r num">{String(r.rate).replace(".", ",")} %</td>
                          <td className="r num">{eur(v.ht)}</td>
                          <td className="r num">{eur(v.tva)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td className="r num">{eur(s.done_total)}</td>
                  {vatSet && (
                    <>
                      <td />
                      <td className="r num">
                        {eur(rows.reduce((a, r) => a + (splitVat(r.ttc, r.rate)?.ht ?? 0), 0))}
                      </td>
                      <td className="r num">
                        {eur(rows.reduce((a, r) => a + (splitVat(r.ttc, r.rate)?.tva ?? 0), 0))}
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
          <details className="hist-details">
            <summary>Taux de TVA {vatSet ? "" : "(non renseignés)"}</summary>
            <p className="hist-note">
              Renseignez les taux avec votre comptable pour afficher le HT et la TVA. À titre indicatif, la vente à
              emporter de plats à consommer tout de suite relève en général du taux de 10 %, et les boissons sans alcool
              vendues fermées (canette, bouteille) du taux de 5,5 %. Seul votre comptable peut confirmer les taux qui
              s&apos;appliquent à votre activité.
            </p>
            <VatForm food={vat.food} drinks={vat.drinks} />
          </details>
          <p className="hist-note">
            Ces montants ne concernent que les commandes passées sur le site. Les ventes au comptoir et les paiements
            sont enregistrés par votre caisse (SumUp) : c&apos;est elle qui fait foi pour la déclaration.
          </p>
        </section>

        {/* ---------- Par jour / par mois ---------- */}
        <section className="hist-card" aria-labelledby="periodes">
          <div className="hist-card-head">
            <h2 id="periodes">Par {q.group === "day" ? "jour" : "mois"}</h2>
            <div className="switch" role="group" aria-label="Regrouper">
              <Link href={historyHref(q, { group: "day" })} className={q.group === "day" ? "on" : ""} scroll={false}>
                Jour
              </Link>
              <Link href={historyHref(q, { group: "month" })} className={q.group === "month" ? "on" : ""} scroll={false}>
                Mois
              </Link>
            </div>
          </div>
          {report.periods.length === 0 ? (
            <p className="hist-empty">Aucune commande sur cette période.</p>
          ) : (
            <div className={`hist-scroll${q.group === "day" && longRange ? " tall" : ""}`}>
              <table className="hist-table">
                <thead>
                  <tr>
                    <th scope="col">{q.group === "day" ? "Jour" : "Mois"}</th>
                    <th scope="col" className="r">Récupérées</th>
                    <th scope="col" className="r">Plats TTC</th>
                    <th scope="col" className="r">Boissons TTC</th>
                    <th scope="col" className="r">Total TTC</th>
                    <th scope="col" className="r">Annulées</th>
                    <th scope="col" className="r">Non clôturées</th>
                  </tr>
                </thead>
                <tbody>
                  {report.periods.map((p) => (
                    <tr key={p.period}>
                      <th scope="row">{periodLabel(p.period, q.group)}</th>
                      <td className="r num">{p.done_count}</td>
                      <td className="r num">{eur(p.food_total)}</td>
                      <td className="r num">{eur(p.drinks_total)}</td>
                      <td className="r num b">{eur(p.done_total)}</td>
                      <td className="r num">{p.cancelled_count || "–"}</td>
                      <td className={`r num${p.open_count ? " warn" : ""}`}>{p.open_count || "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------- Produits ---------- */}
        <section className="hist-card" aria-labelledby="produits">
          <div className="hist-card-head">
            <h2 id="produits">Ventes par produit</h2>
          </div>
          {report.products.length === 0 ? (
            <p className="hist-empty">Aucune vente récupérée sur cette période.</p>
          ) : (
            <>
              <ul className="hist-cats">
                {report.categories.map((c) => (
                  <li key={c.category}>
                    <span>{catName(c.category)}</span>
                    <b className="num">{c.quantity}</b>
                    <small className="num">{eur(c.total)}</small>
                  </li>
                ))}
              </ul>
              <div className="hist-scroll">
                <table className="hist-table">
                  <thead>
                    <tr>
                      <th scope="col">Produit</th>
                      <th scope="col">Rubrique</th>
                      <th scope="col" className="r">Quantité</th>
                      <th scope="col" className="r">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.products.map((p) => (
                      <tr key={p.name + p.category}>
                        <th scope="row">{p.name}</th>
                        <td>{catName(p.category)}</td>
                        <td className="r num">{p.quantity}</td>
                        <td className="r num">{eur(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* ---------- Liste des commandes ---------- */}
        <section className="hist-card" aria-labelledby="liste">
          <div className="hist-card-head">
            <h2 id="liste">
              Commandes <small className="num">({orders.count})</small>
            </h2>
          </div>
          {orders.rows.length === 0 ? (
            <p className="hist-empty">Aucune commande ne correspond.</p>
          ) : (
            <div className="hist-scroll">
              <table className="hist-table hist-orders">
                <thead>
                  <tr>
                    <th scope="col">
                      <SortLink q={q} k="date">Date</SortLink>
                    </th>
                    <th scope="col">
                      <SortLink q={q} k="number">N°</SortLink>
                    </th>
                    <th scope="col">
                      <SortLink q={q} k="name">Client</SortLink>
                    </th>
                    <th scope="col">Articles</th>
                    <th scope="col" className="r">
                      <SortLink q={q} k="total">Montant</SortLink>
                    </th>
                    <th scope="col">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.rows.map((o) => {
                    const open = o.status === "new" || o.status === "prep" || o.status === "ready";
                    return (
                      <tr key={o.id} className={o.status === "cancelled" ? "off" : undefined}>
                        <td className="num nowrap">
                          {frDate(o.order_date)}
                          <small>{formatParisTime(o.pickup_time)}</small>
                        </td>
                        <td className="num">#{o.order_number}</td>
                        <td>
                          {o.anonymized ? <i className="hist-anon">Anonymisé</i> : o.customer_name}
                          {o.phone_hint && <small className="num">{o.phone_hint}</small>}
                        </td>
                        <td className="hist-items">{o.items}</td>
                        <td className="r num b">{eur(o.total)}</td>
                        <td>
                          <span className={`hist-status s-${o.status}`}>
                            {STATUS_LABEL[o.status]}
                            {o.status === "cancelled" && o.cancelled_by && (
                              <small>{o.cancelled_by === "client" ? "par le client" : "par le restaurant"}</small>
                            )}
                          </span>
                          {open && o.order_date < today && !o.anonymized && (
                            <RowActions id={o.id} number={o.order_number} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {pages > 1 && (
            <nav className="hist-pages" aria-label="Pages">
              {q.page > 1 ? (
                <Link className="ghost" href={historyHref(q, { page: q.page - 1 })} scroll={false}>
                  ← Précédentes
                </Link>
              ) : (
                <span />
              )}
              <span className="num">
                Page {q.page} / {pages}
              </span>
              {q.page < pages ? (
                <Link className="ghost" href={historyHref(q, { page: q.page + 1 })} scroll={false}>
                  Suivantes →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </section>

        {/* ---------- Données et sécurité ---------- */}
        <section className="hist-card" aria-labelledby="donnees">
          <div className="hist-card-head">
            <h2 id="donnees">Données et sécurité</h2>
          </div>
          <ul className="hist-list">
            <li>Page réservée à l&apos;administrateur, connecté avec mot de passe et code à 6 chiffres.</li>
            <li>Les numéros de téléphone sont masqués ici. Les exports ne contiennent ni nom ni téléphone.</li>
            <li>
              Au bout de 12 mois, le nom, le téléphone et la remarque du client sont effacés automatiquement
              {s.anonymized_count > 0 ? ` (${s.anonymized_count} commande${s.anonymized_count > 1 ? "s" : ""} anonymisée${s.anonymized_count > 1 ? "s" : ""} sur cette période)` : ""}
              . Les montants et les articles sont gardés 10 ans pour la comptabilité, puis supprimés.
            </li>
          </ul>
          <h3 className="hist-sub">Dernières actions</h3>
          {audit.length === 0 ? (
            <p className="hist-empty">Aucun export pour l&apos;instant.</p>
          ) : (
            <ul className="hist-list">
              {audit.map((a) => (
                <li key={a.created_at + a.action}>
                  <span className="num">
                    {frDate(parisParts(new Date(a.created_at)).ymd)} {formatParisTime(a.created_at)}
                  </span>{" "}
                  · {AUDIT_LABEL[a.action] ?? a.action}
                  {typeof a.details.from === "string" && typeof a.details.to === "string" && (
                    <> (du {frDate(a.details.from)} au {frDate(a.details.to)})</>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
