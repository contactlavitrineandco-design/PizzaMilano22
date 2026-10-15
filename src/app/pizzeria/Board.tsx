"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { eur } from "@/lib/format";
import { KITCHEN_CATEGORIES, nextStatus, previousStatus, STATUS_FLOW } from "@/lib/menu";
import { PAYMENT_STATUS_LABELS } from "@/lib/payments";
import { formatParisTime } from "@/lib/time";
import type { Order, OrderStatus, Product, RestaurantSettings, Supplement } from "@/lib/types";
import { logout } from "../login/actions";
import {
  setOnlineOrdersOpen,
  setOrderStatus,
  setProductAvailability,
  setSupplementAvailability,
  type ActionResult,
} from "./actions";

interface Props {
  orders: Order[];
  products: Product[];
  supplements: Supplement[];
  settings: RestaurantSettings;
  serverNow: number;
  isAdmin: boolean;
}

const DONE_LABEL = "récupérée";

export function Board({ orders, products, supplements, settings, serverNow, isAdmin }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(serverNow);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }

  // Horloge (retards) + rafraîchissement de secours chaque minute
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      router.refresh();
    }, 60_000);
    return () => clearInterval(id);
  }, [router]);

  // Temps réel : toute création ou modification de commande recharge le tableau
  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel("orders-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 300);
      })
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  function run(key: string, action: () => Promise<ActionResult>, success?: string) {
    setBusy(key);
    startTransition(async () => {
      const res = await action();
      setBusy(null);
      if (!res.ok) {
        showToast(res.message);
        return;
      }
      if (success) showToast(success);
      setNow(Date.now());
      router.refresh();
    });
  }

  // Prévenir le pizzaïolo quand un client annule (détecté à chaque rafraîchissement)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const seenCancelled = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(orders.filter((o) => o.status === "cancelled").map((o) => o.id));
    if (seenCancelled.current) {
      const fresh = orders.filter((o) => ids.has(o.id) && !seenCancelled.current!.has(o.id) && o.cancelled_by === "client");
      if (fresh.length) {
        const msg = `Commande ${fresh.map((o) => `#${o.order_number}`).join(", ")} annulée par le client`;
        setTimeout(() => {
          setToast(msg);
          if (toastTimer.current) clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => setToast(null), 6000);
        }, 0);
      }
    }
    seenCancelled.current = ids;
  }, [orders]);

  function move(order: Order, status: OrderStatus | null) {
    if (!status) return;
    const label = status === "done" ? DONE_LABEL : (STATUS_FLOW.find((s) => s.id === status)?.name.toLowerCase() ?? status);
    run(order.id, () => setOrderStatus(order.id, status), `#${order.order_number} → ${label}`);
  }

  const cancelled = orders.filter((o) => o.status === "cancelled");
  const valid = orders.filter((o) => o.status !== "cancelled");
  const active = valid.filter((o) => o.status !== "done");
  const done = valid.filter((o) => o.status === "done");
  const totalOrdered = valid.reduce((a, o) => a + o.total, 0);
  const toCook = active
    .filter((o) => o.status === "new" || o.status === "prep")
    .reduce(
      (a, o) =>
        a + o.items.filter((i) => i.category && KITCHEN_CATEGORIES.includes(i.category)).reduce((x, i) => x + i.quantity, 0),
      0,
    );

  return (
    <main>
      <div className="wrap pro">
        <div className="pro-head">
          <h1>Commandes du jour</h1>
          <div className="toggle">
            Commandes en ligne{" "}
            <button
              type="button"
              className={settings.online_orders_open ? "on" : "offb"}
              disabled={busy === "open"}
              onClick={() =>
                run(
                  "open",
                  () => setOnlineOrdersOpen(!settings.online_orders_open),
                  settings.online_orders_open ? "Commandes en ligne en pause" : "Commandes en ligne ouvertes",
                )
              }
            >
              {settings.online_orders_open ? "Ouvertes" : "En pause"}
            </button>
          </div>
          {isAdmin && (
            <>
              <Link href="/pizzeria/historique" className="ghost adm-link">
                Historique
              </Link>
              <Link href="/pizzeria/photos" className="ghost adm-link">
                Photos
              </Link>
            </>
          )}
          <form action={logout}>
            <button type="submit" className="ghost">
              Se déconnecter
            </button>
          </form>
        </div>

        <div className="stats">
          <div className="stat">
            <span>Commandes</span>
            <b className="num">{valid.length}</b>
          </div>
          <div className="stat">
            <span>Total commandé</span>
            <b className="num">{eur(totalOrdered)}</b>
          </div>
          <div className="stat">
            <span>Panier moyen</span>
            <b className="num">{eur(valid.length ? totalOrdered / valid.length : 0)}</b>
          </div>
          <div className="stat">
            <span>Pizzas à faire</span>
            <b className="num">{toCook}</b>
          </div>
        </div>

        <div className="board">
          {STATUS_FLOW.map((st, si) => {
            const list = active
              .filter((o) => o.status === st.id)
              .sort((a, b) => a.pickup_time.localeCompare(b.pickup_time));
            return (
              <section className="col" aria-label={st.name} key={st.id}>
                <div className="col-h">
                  <span>
                    <span className="dot" style={{ background: st.color }} />
                    {st.name}
                  </span>
                  <span className="count">{list.length}</span>
                </div>
                {list.length === 0 ? (
                  <div className="col-empty">Aucune commande ici.</div>
                ) : (
                  list.map((o) => {
                    const minutes = Math.round((new Date(o.pickup_time).getTime() - now) / 60000);
                    const late = st.id !== "ready" && minutes < 5;
                    return (
                      <article className="tk" style={{ ["--c" as string]: st.color }} key={o.id}>
                        <div className="tk-top">
                          <span className="tk-no">#{o.order_number}</span>
                          <span className={`tk-time${late ? " late" : ""}`}>
                            {formatParisTime(o.pickup_time)}
                            {st.id !== "ready" &&
                              ` · ${minutes >= 0 ? `dans ${minutes} min` : `retard ${-minutes} min`}`}
                          </span>
                        </div>
                        <div className="tk-who">
                          {o.customer_name} <small>{o.customer_phone}</small>
                        </div>
                        <ul>
                          {o.items.map((i) => {
                            const extra = [i.meat, i.supplement_name ? `+ ${i.supplement_name}` : null]
                              .filter(Boolean)
                              .join(" · ");
                            return (
                              <li key={i.id}>
                                <b>{i.quantity}×</b>
                                {i.product_name}
                                {extra && <small> · {extra}</small>}
                              </li>
                            );
                          })}
                        </ul>
                        {o.note && <div className="note">{o.note}</div>}
                        <div className="tk-top">
                          <span style={{ color: "var(--ink-3)", fontSize: 13 }}>
                            {PAYMENT_STATUS_LABELS[o.payment_status]}
                          </span>
                          <span className="price">{eur(o.total)}</span>
                        </div>
                        <div className="tk-actions">
                          {st.id === "new" &&
                            (confirmCancel === o.id ? (
                              <button
                                type="button"
                                className="back tk-cancel"
                                disabled={busy === o.id}
                                onClick={() => {
                                  setConfirmCancel(null);
                                  run(o.id, () => setOrderStatus(o.id, "cancelled"), `#${o.order_number} annulée`);
                                }}
                              >
                                Confirmer
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="back"
                                aria-label={`Annuler la commande ${o.order_number}`}
                                onClick={() => setConfirmCancel(o.id)}
                              >
                                ✕
                              </button>
                            ))}
                          {si > 0 && (
                            <button
                              type="button"
                              className="back"
                              aria-label="Revenir à l'étape précédente"
                              disabled={busy === o.id}
                              onClick={() => move(o, previousStatus(o.status))}
                            >
                              ↶
                            </button>
                          )}
                          <button
                            type="button"
                            className="adv"
                            disabled={busy === o.id}
                            onClick={() => move(o, nextStatus(o.status))}
                          >
                            {st.button}
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </section>
            );
          })}
        </div>
        <div className="done-list">
          {done.length > 0 && `Récupérées aujourd'hui : ${done.map((o) => `#${o.order_number}`).join(", ")}`}
        </div>
        {cancelled.length > 0 && (
          <div className="done-list">
            Annulées aujourd&apos;hui :{" "}
            {cancelled
              .map((o) => `#${o.order_number} (${o.cancelled_by === "client" ? "par le client" : "par le restaurant"})`)
              .join(", ")}
          </div>
        )}
        {settings.opening_hours_provisional && (
          <div className="done-list">
            Horaires d&apos;ouverture provisoires : à confirmer avec le restaurant puis à modifier dans Supabase.
          </div>
        )}

        <section className="stock">
          <h2>Disponibilité de la carte</h2>
          <p>Touchez un produit pour le passer en rupture : il devient grisé et non commandable côté client.</p>
          <div className="stock-grid">
            {products.map((p) => (
              <div className="st" key={p.id}>
                <span>{p.name}</span>
                <button
                  type="button"
                  className={p.available ? "in" : "out"}
                  aria-pressed={!p.available}
                  disabled={busy === p.id}
                  onClick={() => run(p.id, () => setProductAvailability(p.id, !p.available))}
                >
                  {p.available ? "Dispo" : "Rupture"}
                </button>
              </div>
            ))}
            {supplements.map((s) => (
              <div className="st" key={s.id}>
                <span>Supplément {s.name.toLowerCase()}</span>
                <button
                  type="button"
                  className={s.available ? "in" : "out"}
                  aria-pressed={!s.available}
                  disabled={busy === s.id}
                  onClick={() => run(s.id, () => setSupplementAvailability(s.id, !s.available))}
                >
                  {s.available ? "Dispo" : "Rupture"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
