import Link from "next/link";
import { eur } from "@/lib/format";
import type { OpenStatus } from "@/lib/time";
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
  address = null,
  cta,
  showMenuLink,
  status = null,
}: {
  banner: string | null;
  prices: HeroPrices;
  city: string;
  /** Rue du restaurant, affichée sous le nom pour qu'on le retrouve dans la rue. */
  address?: string | null;
  /** Bouton principal du bandeau (la commande d'abord). */
  cta: { href: string; label: string };
  showMenuLink: boolean;
  /** Ouvert / fermé maintenant (null tant que les horaires sont provisoires). */
  status?: OpenStatus | null;
}) {
  return (
    <section className="hero slats">
      <div className="wrap">
        <div className="hero-card">
          {/* H1 = nom + activité + ville (référencement local), lettré comme l'enseigne de la façade */}
          <h1 className="hero-sign">
            <span className="sign">Pizza Milano</span>
            <span className="hero-sub">Pizzeria à emporter à {city}
              {address ? ` · ${address}` : ""}
            </span>
          </h1>
          <p className="hero-title">Commandez en ligne, on enfourne, vous passez récupérer.</p>
          {/* Le paiement sur place, annoncé dès le premier écran, à côté du bouton */}
          <div className="hero-actions">
            <Link className="cta" href={cta.href}>
              {cta.label}
            </Link>
            <p className="pay-block">
              <b>Paiement sur place, au retrait.</b>
              <span>Rien à payer en ligne.</span>
            </p>
          </div>
          {status && (
            <p className={`open-status${status.open ? " is-open" : ""}`}>
              <span className="dot" aria-hidden="true" />
              {status.label}
            </p>
          )}
          <ol className="how-steps" aria-label="Comment commander">
            <li>
              <b>1</b> Choisissez vos pizzas
            </li>
            <li>
              <b>2</b> Indiquez l&apos;heure de retrait
            </li>
            <li>
              <b>3</b> Payez au comptoir en récupérant
            </li>
          </ol>
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
            {showMenuLink && (
              <a className="chip chip-link" href="#carte">
                Voir la carte
              </a>
            )}
          </div>
          {banner && <div className="closed-banner">{banner}</div>}
        </div>
        <NeonChef />
      </div>
    </section>
  );
}
