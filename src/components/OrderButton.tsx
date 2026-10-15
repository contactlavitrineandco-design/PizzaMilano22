import type { RestaurantSettings } from "@/lib/types";

/** « +33 6 50 64 73 89 » pour un lien tel: à partir de « 06 50 64 73 89 ». */
export function telHref(phone: string): string {
  return `tel:+33${phone.replace(/\s/g, "").slice(1)}`;
}

/**
 * Bouton « Commander ». Les commandes passent par la page de commande SumUp
 * (Order & Pay) du restaurant : elles arrivent directement sur la caisse SumUp.
 * Tant que le lien n'est pas renseigné (restaurant_settings.order_url), le
 * bouton propose d'appeler la pizzeria.
 */
export function OrderButton({
  settings,
  className = "cta",
  label = "Commander en ligne",
}: {
  settings: Pick<RestaurantSettings, "order_url" | "phone">;
  className?: string;
  label?: string;
}) {
  if (settings.order_url)
    return (
      <a className={className} href={settings.order_url} target="_blank" rel="noopener">
        {label}
      </a>
    );
  if (settings.phone)
    return (
      <a className={className} href={telHref(settings.phone)}>
        Commander au {settings.phone}
      </a>
    );
  return null;
}
