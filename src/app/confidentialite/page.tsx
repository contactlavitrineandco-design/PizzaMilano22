import type { Metadata } from "next";
import Link from "next/link";
import { LegalField } from "@/components/LegalField";
import { PracticalInfo } from "@/components/PracticalInfo";
import { getSettings } from "@/lib/data";
import { LEGAL } from "@/lib/legal";
import { DEFAULT_CITY } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Données personnelles et site Pizza Milano : ce qui est collecté (presque rien), commandes via SumUp, cookies et vos droits.",
  alternates: { canonical: "/confidentialite" },
};

export default async function Confidentialite() {
  const s = await getSettings();
  const e = LEGAL.editeur;
  return (
    <>
      <main className="wrap legal">
        <h1>Politique de confidentialité</h1>
        <p className="legal-date">Dernière mise à jour : {LEGAL.miseAJour}</p>

        <p>
          En résumé : le site Pizza Milano présente la carte et ne vous demande aucune donnée personnelle. Pas de compte, pas
          de formulaire, pas de cookie publicitaire ni de mesure d&apos;audience.
        </p>

        <h2>Responsable du traitement</h2>
        <p>
          <LegalField value={e.raisonSociale} label="raison sociale" />, qui exploite {s.restaurant_name}. Contact :{" "}
          <LegalField value={e.email} label="adresse e-mail" />.
        </p>

        <h2>Commandes en ligne</h2>
        <p>
          Le bouton « Commander en ligne » ouvre la page de commande de SumUp, prestataire de caisse et de paiement du
          restaurant. Les informations que vous y saisissez (prénom, téléphone, commande, paiement) sont traitées par SumUp
          pour notre compte et transmises à notre caisse, afin de préparer votre commande et d&apos;encaisser le paiement.
          SumUp présente sa protection des données sur sa{" "}
          <a
            href="https://help.sumup.com/fr-FR/articles/2MrnASQDdzJMkFMUnK7BFL-rgpd-protection-des-donnees"
            rel="noopener"
            target="_blank"
          >
            page RGPD
          </a>
          . Les ventes sont conservées par le restaurant pendant la durée exigée pour sa comptabilité.
        </p>

        <h2>Données techniques</h2>
        <p>
          Comme tout site, l&apos;hébergeur {LEGAL.hebergeur.nom} (États-Unis) reçoit des données techniques de connexion
          (adresse IP, navigateur) pour assurer la sécurité et le bon fonctionnement du site, sur la base de notre intérêt
          légitime et selon sa propre politique de conservation. Les transferts hors de l&apos;Union européenne sont encadrés
          par les clauses contractuelles types de la Commission européenne. La carte, les photos et les réglages du site sont
          hébergés par {LEGAL.baseDeDonnees.nom} et ne contiennent aucune donnée personnelle de visiteur.
        </p>

        <h2>Cookies</h2>
        <p>
          Le site ne dépose aucun cookie et n&apos;enregistre rien dans votre navigateur. Les polices de caractères sont
          hébergées par le site lui-même. La carte Google Maps n&apos;est chargée que si vous cliquez sur « Afficher la
          carte » : Google peut alors déposer ses propres cookies, selon sa politique de confidentialité. Le lien Instagram et
          la page de commande SumUp s&apos;ouvrent sur leurs sites, avec leurs propres règles.
        </p>

        <h2>Sécurité</h2>
        <p>
          Connexion chiffrée (HTTPS) et en-têtes de sécurité. Le site n&apos;a ni espace de connexion ni base de commandes :
          il n&apos;y a pas de données de clients à protéger chez nous. La base de données n&apos;est lisible qu&apos;en
          lecture seule par le public (carte, photos, horaires).
        </p>

        <h2>Vos droits</h2>
        <p>
          Vous pouvez demander l&apos;accès à vos données, leur rectification, leur effacement, la limitation du traitement,
          vous y opposer ou demander leur portabilité, en écrivant à <LegalField value={e.email} label="adresse e-mail" />. Nous
          répondons dans un délai d&apos;un mois. Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une
          réclamation à la CNIL (
          <a href="https://www.cnil.fr/fr/plaintes" rel="noopener" target="_blank">
            cnil.fr
          </a>
          ).
        </p>

        <p>
          Voir aussi les <Link href="/mentions-legales">mentions légales et conditions de commande</Link>.
        </p>
      </main>
      <PracticalInfo settings={s} city={s.city ?? DEFAULT_CITY} pizzaFrom={null} />
    </>
  );
}
