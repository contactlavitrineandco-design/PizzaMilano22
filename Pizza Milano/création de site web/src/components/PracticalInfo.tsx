import Link from "next/link";
import { eur } from "@/lib/format";
import { frHour, WEEKDAYS } from "@/lib/time";
import type { RestaurantSettings, Weekday } from "@/lib/types";

const DAY_NAMES: Record<Weekday, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

/**
 * Infos pratiques en bas de page : nom, adresse, téléphone, horaires.
 * Chaque information n'apparaît que si elle est renseignée (et validée pour les horaires) :
 * Google compare ces données avec la fiche Google Business Profile.
 */
export function PracticalInfo({
  settings,
  city,
  pizzaFrom,
  showOrderLink,
}: {
  settings: RestaurantSettings;
  city: string;
  pizzaFrom: number | null;
  showOrderLink: boolean;
}) {
  const hasAddress = settings.address && settings.postal_code && settings.city;
  const showHours = !settings.opening_hours_provisional;
  return (
    <footer className="site-foot" aria-labelledby="infos-h">
      <div className="wrap foot-grid">
        <div className="foot-about">
          <h2 id="infos-h">Pizza Milano, pizzeria à emporter à {city}</h2>
          <p>
            Pizzas sur base tomate ou crème{pizzaFrom !== null ? ` dès ${eur(pizzaFrom)}` : ""}, soufflés garnis servis
            avec des frites et boissons fraîches. Commandez en ligne, choisissez votre heure de retrait, puis récupérez et
            réglez votre commande au comptoir.
          </p>
          <p className="foot-pay">
            <b>Paiement sur place</b>, au retrait. Rien à payer en ligne.
          </p>
          {showOrderLink && (
            <Link className="ghost foot-cta" href="/commander">
              Commander en ligne
            </Link>
          )}
        </div>

        {(hasAddress || settings.phone || settings.instagram_url) && (
          <div>
            <h3>Nous trouver</h3>
            <address className="foot-address">
              {settings.restaurant_name}
              {hasAddress && (
                <>
                  <br />
                  {settings.address}
                  <br />
                  {settings.postal_code} {settings.city}
                </>
              )}
              {settings.phone && (
                <>
                  <br />
                  <a href={`tel:+33${settings.phone.replace(/\s/g, "").slice(1)}`}>{settings.phone}</a>
                </>
              )}
            </address>
            {settings.google_maps_url && (
              <a className="foot-link" href={settings.google_maps_url} target="_blank" rel="noopener">
                Itinéraire sur Google Maps
              </a>
            )}
            {settings.instagram_url && (
              <a className="foot-link" href={settings.instagram_url} target="_blank" rel="noopener">
                Instagram @{settings.instagram_url.replace(/\/+$/, "").split("/").pop()}
              </a>
            )}
          </div>
        )}

        {showHours && (
          <div>
            <h3>Horaires</h3>
            <table className="foot-hours">
              <tbody>
                {WEEKDAYS.map((d) => {
                  const ranges = settings.opening_hours[d] ?? [];
                  return (
                    <tr key={d}>
                      <th scope="row">{DAY_NAMES[d]}</th>
                      <td className="num">
                        {ranges.length ? ranges.map((r) => `${frHour(r.open)} – ${frHour(r.close)}`).join(" · ") : "Fermé"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="wrap foot-legal">
        <span>© {settings.restaurant_name}</span>
        <Link href="/mentions-legales">Mentions légales</Link>
        <Link href="/mentions-legales#conditions">Conditions de commande</Link>
        <Link href="/confidentialite">Confidentialité</Link>
        <Link href="/gerant">Espace gérant</Link>
      </div>
    </footer>
  );
}
