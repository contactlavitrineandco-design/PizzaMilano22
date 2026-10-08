import { eur } from "@/lib/format";
import { NeonChef } from "./NeonChef";

export interface HeroPrices {
  pizzaFrom: number | null;
  souffle: number | null;
  can: number | null;
}

const euro = (v: number) => (Number.isInteger(v) ? `${v} €` : eur(v));

export function Hero({ banner, prices }: { banner: string | null; prices: HeroPrices }) {
  return (
    <section className="hero slats">
      <div className="wrap">
        <div className="hero-card">
          <div className="eyebrow">Pizzas · Soufflés · Boissons fraîches</div>
          <h1>
            Commandez, on enfourne, <em>vous passez récupérer.</em>
          </h1>
          <p>
            Choisissez vos pizzas sur la carte, indiquez l&apos;heure de retrait et réglez au comptoir. Votre commande
            arrive directement sur la tablette du pizzaïolo.
          </p>
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
            <span className="chip">Paiement CB au comptoir</span>
          </div>
          {banner && <div className="closed-banner">{banner}</div>}
        </div>
        <NeonChef />
      </div>
    </section>
  );
}
