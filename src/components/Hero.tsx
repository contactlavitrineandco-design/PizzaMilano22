import { eur } from "@/lib/format";
import type { OpenStatus } from "@/lib/time";
import type { RestaurantSettings } from "@/lib/types";
import { NeonChef } from "./NeonChef";
import { OrderButton } from "./OrderButton";

export interface HeroPrices {
  pizzaFrom: number | null;
  souffle: number | null;
  can: number | null;
}

const euro = (v: number) => (Number.isInteger(v) ? `${v} €` : eur(v));

export function Hero({
  settings,
  prices,
  city,
  status,
}: {
  settings: RestaurantSettings;
  prices: HeroPrices;
  city: string;
  status: OpenStatus | null;
}) {
  const online = Boolean(settings.order_url);
  return (
    <section className="hero slats">
      <div className="wrap">
        <div className="hero-card">
          {/* H1 = nom + activité + ville (référencement local) ; même apparence que l'ancien sur-titre */}
          <h1 className="eyebrow">Pizza Milano · Pizzeria à emporter à {city}</h1>
          <p className="hero-title">
            Commandez, on enfourne, <em>vous passez récupérer.</em>
          </p>
          <p>
            {online
              ? "Choisissez vos pizzas, votre heure de retrait et réglez en ligne : votre commande arrive directement en caisse chez Pizza Milano."
              : "Appelez-nous pour commander, on vous donne l'heure de retrait. Ou passez directement au comptoir."}
          </p>
          {/* La commande d'abord : bouton principal visible dès l'arrivée */}
          <div className="hero-actions">
            <OrderButton settings={settings} />
            <a className="ghost" href="#carte">
              Voir la carte
            </a>
          </div>
          {status && (
            <p className={`open-status${status.open ? " is-open" : ""}`}>
              <span className="dot" aria-hidden="true" />
              {status.label}
            </p>
          )}
          <div className="chips">
            {prices.pizzaFrom !== null && (
              <span className="chip">
                Pizzas dès <b>{euro(prices.pizzaFrom)}</b>
              </span>
            )}
            {prices.souffle !== null && (
              <span className="chip">
                Soufflé + frites <b>{euro(prices.souffle)}</b>
              </span>
            )}
            {prices.can !== null && (
              <span className="chip">
                Canettes <b>{euro(prices.can)}</b>
              </span>
            )}
          </div>
        </div>
        <NeonChef />
      </div>
    </section>
  );
}
