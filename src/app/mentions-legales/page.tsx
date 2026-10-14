import type { Metadata } from "next";
import Link from "next/link";
import { LegalField } from "@/components/LegalField";
import { PracticalInfo } from "@/components/PracticalInfo";
import { getSettings } from "@/lib/data";
import { LEGAL } from "@/lib/legal";
import { DEFAULT_CITY } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mentions légales et conditions de commande",
  description: "Éditeur du site, hébergement et conditions de commande en ligne de Pizza Milano.",
  alternates: { canonical: "/mentions-legales" },
};

export default async function MentionsLegales() {
  const s = await getSettings();
  const e = LEGAL.editeur;
  const address = s.address && s.postal_code && s.city ? `${s.address}, ${s.postal_code} ${s.city}` : null;
  return (
    <>
      <main className="wrap legal">
        <h1>Mentions légales</h1>
        <p className="legal-date">Dernière mise à jour : {LEGAL.miseAJour}</p>

        <h2>Éditeur du site</h2>
        <dl className="legal-dl">
          <dt>Entreprise</dt>
          <dd>
            <LegalField value={e.raisonSociale} label="raison sociale" /> ({s.restaurant_name})
          </dd>
          <dt>Forme juridique</dt>
          <dd>
            <LegalField value={e.formeJuridique} label="forme juridique" />
            {e.capital && `, capital de ${e.capital}`}
          </dd>
          <dt>Siège social</dt>
          <dd>
            <LegalField value={e.siege ?? address} label="adresse du siège" />
          </dd>
          <dt>SIRET</dt>
          <dd>
            <LegalField value={e.siret} label="numéro SIRET" />
          </dd>
          <dt>Immatriculation</dt>
          <dd>
            <LegalField value={e.immatriculation} label="RCS ou RM + numéro" />
          </dd>
          {e.tva && (
            <>
              <dt>TVA intracommunautaire</dt>
              <dd>{e.tva}</dd>
            </>
          )}
          <dt>Directeur de la publication</dt>
          <dd>
            <LegalField value={e.directeurPublication} label="nom du responsable" />
          </dd>
          <dt>Contact</dt>
          <dd>
            <LegalField value={e.email} label="adresse e-mail" />
            {s.phone && ` · ${s.phone}`}
          </dd>
        </dl>

        <h2>Hébergement</h2>
        <p>
          Site hébergé par {LEGAL.hebergeur.nom}, {LEGAL.hebergeur.adresse} (
          <a href={LEGAL.hebergeur.site} rel="noopener" target="_blank">
            vercel.com
          </a>
          ). Base de données et commandes hébergées par {LEGAL.baseDeDonnees.nom} (
          <a href={LEGAL.baseDeDonnees.site} rel="noopener" target="_blank">
            supabase.com
          </a>
          ), région <LegalField value={LEGAL.baseDeDonnees.region} label="région du projet Supabase" />.
        </p>

        <h2>Propriété intellectuelle</h2>
        <p>
          Les textes, photos et éléments graphiques du site appartiennent à l&apos;éditeur, sauf mention contraire.
          Toute reproduction sans autorisation est interdite. Les images marquées « Photo d&apos;illustration » ont été
          générées par intelligence artificielle et ne sont pas contractuelles.
        </p>

        <h2 id="conditions">Conditions de commande en ligne</h2>
        <ol className="legal-list">
          <li>
            <b>Commande.</b> Le site permet de commander des pizzas, soufflés et boissons à retirer au restaurant, à {DEFAULT_CITY}, sur un
            créneau proposé lors de la commande. Il n&apos;y a pas de livraison depuis ce site.
          </li>
          <li>
            <b>Prix.</b> Les prix sont indiqués en euros, toutes taxes comprises. Le total est calculé par le restaurant au moment
            de la commande et affiché sur la confirmation.
          </li>
          <li>
            <b>Confirmation.</b> Un numéro de commande s&apos;affiche dès l&apos;envoi. La commande est transmise directement au
            restaurant.
          </li>
          <li>
            <b>Paiement.</b> Le paiement se fait au comptoir, lors du retrait. Aucune donnée bancaire n&apos;est demandée sur le
            site.
          </li>
          <li>
            <b>Annulation.</b> Vous pouvez annuler en ligne, depuis le lien « Suivre ou annuler ma commande », tant que la
            commande n&apos;est pas en préparation. Ensuite, contactez le restaurant.
          </li>
          <li>
            <b>Droit de rétractation.</b> Il ne s&apos;applique pas aux denrées alimentaires susceptibles de se détériorer
            rapidement (article L221-28, 4° du Code de la consommation).
          </li>
          <li>
            <b>Allergènes.</b> La liste des allergènes de chaque produit est disponible sur simple demande au comptoir ou par
            téléphone, avant la commande.
          </li>
          <li>
            <b>Photos.</b> Les photos sont non contractuelles.
          </li>
          <li>
            <b>Réclamations et médiation.</b> Contactez d&apos;abord le restaurant. En cas de litige non résolu, vous pouvez
            recourir gratuitement au médiateur de la consommation :{" "}
            <LegalField value={LEGAL.mediateur} label="nom et site du médiateur de la consommation" />.
          </li>
        </ol>

        <h2>Données personnelles</h2>
        <p>
          Le traitement de vos données est décrit dans la{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>
      </main>
      <PracticalInfo settings={s} city={s.city ?? DEFAULT_CITY} pizzaFrom={null} showOrderLink />
    </>
  );
}
