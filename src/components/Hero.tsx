import Link from "next/link";
import { eur } from "@/lib/format";
import { NeonChef } from "./NeonChef";

export interface HeroPrices {
  pizzaFrom: number | null;
  souffle: number | null;
  can: number | null;
}

const euro = (v: number) => (Number.isInteger(v) ? `${v} €` : eur(v));

export function Hero({
  banner,
  prices,
  city,
  cta,
  showMenuLink,
}: {
  banner: string | null;
  prices: HeroPrices;
  city: string;
  /** Bouton principal du bandeau (la commande d'abord). */
  cta: { href: string; label: string };
  showMenuLink: boolean;
}) {
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
            Choisissez vos pizzas sur la carte, indiquez l&apos;heure de retrait et réglez au comptoir. Votre commande
            arrive directement sur la tablette du pizzaïolo.
          </p>
          {/* La commande d'abord : bouton principal visible dès l'arrivée */}
          <div className="hero-actions">
            <Link className="cta" href={cta.href}>
              {cta.label}
            </Link>
            {showMenuLink && (
              <a className="ghost" href="#carte">
                Voir la carte
              </a>
            )}
          </div>
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
