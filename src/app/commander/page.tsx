import { redirect } from "next/navigation";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Adresse courte à partager (affiche, réseaux) : /commander renvoie vers la
 * page de commande SumUp du restaurant, ou vers la carte tant qu'elle n'est
 * pas renseignée.
 */
export default async function CommanderPage() {
  const settings = await getSettings().catch(() => null);
  redirect(settings?.order_url ?? "/#carte");
}
