import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eur } from "@/lib/format";
import { getOrderByToken } from "@/lib/orders/track";
import { formatParisTime } from "@/lib/time";
import type { OrderStatus } from "@/lib/types";
import { AutoRefresh } from "./AutoRefresh";
import { CancelButton } from "./CancelButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ma commande", robots: { index: false, follow: false } };

const STEPS: { id: OrderStatus; label: string }[] = [
  { id: "new", label: "Reçue" },
  { id: "prep", label: "Au four" },
  { id: "ready", label: "Prête" },
  { id: "done", label: "Récupérée" },
];

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order) notFound();

  const cancelled = order.status === "cancelled";
  const stepIndex = STEPS.findIndex((s) => s.id === order.status);

  return (
    <main>
      <AutoRefresh />
      <div className="wrap track">
        <div className="track-card">
          <div className="eyebrow">Pizza Milano · votre commande</div>
          <h1 className="track-no">#{order.number}</h1>
          <p className="track-sub">
            {order.name}, retrait à <b>{formatParisTime(order.pickupTime)}</b> · {eur(order.total)} à régler au comptoir
          </p>

          {cancelled ? (
            <p className="track-msg off">
              Commande annulée{order.cancelledBy === "restaurant" ? " par la pizzeria" : ""}.
            </p>
          ) : (
            <ol className="track-steps" aria-label="Avancement">
              {STEPS.map((s, i) => (
                <li key={s.id} className={i < stepIndex ? "done" : i === stepIndex ? "now" : ""}>
                  {s.label}
                </li>
              ))}
            </ol>
          )}

          <ul className="track-items">
            {order.items.map((i, k) => (
              <li key={k}>
                <b>{i.quantity}×</b> {i.name}
                {i.extra && <small> · {i.extra}</small>}
              </li>
            ))}
          </ul>

          {order.status === "new" && <CancelButton token={token} />}
          {(order.status === "prep" || order.status === "ready") && (
            <p className="track-msg">Votre commande est en préparation : pour la modifier, appelez la pizzeria.</p>
          )}

          <Link className="ghost track-back" href="/">
            Retour à la carte
          </Link>
        </div>
      </div>
    </main>
  );
}
