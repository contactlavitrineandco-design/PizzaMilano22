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
  description: "Quelles données Pizza Milano collecte lors d'une commande en ligne, pourquoi, combien de temps, et vos droits.",
  alternates: { canonical: "/confidentialite" },
};

export default async function Confidentialite() {
  const s = await getSettings();
  const e = LEGAL.editeur;
  const months = LEGAL.conservationCommandesMois;
  return (
    <>
      <main className="wrap legal">
        <h1>Politique de confidentialité</h1>
        <p className="legal-date">Dernière mise à jour : {LEGAL.miseAJour}</p>

        <p>
          En résumé : nous demandons seulement ce qu&apos;il faut pour préparer votre commande (prénom, téléphone, heure de
          retrait). Rien n&apos;est vendu, rien n&apos;est utilisé pour de la publicité, et votre prénom et votre
          téléphone sont effacés automatiquement au bout de {months} mois.
        </p>

        <h2>Responsable du traitement</h2>
        <p>
          <LegalField value={e.raisonSociale} label="raison sociale" />, qui exploite {s.restaurant_name}. Contact :{" "}
          <LegalField value={e.email} label="adresse e-mail" />.
        </p>

        <h2>Données collectées et utilisation</h2>
        <div className="legal-table">
          <table>
            <thead>
              <tr>
                <th scope="col">Données</th>
                <th scope="col">Pourquoi</th>
                <th scope="col">Base légale</th>
                <th scope="col">Durée</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Prénom, téléphone, remarque</td>
                <td>Préparer et vous remettre la commande, vous appeler en cas de problème</td>
                <td>Exécution de la commande (art. 6.1.b du RGPD)</td>
                <td>{months} mois, puis effacement automatique</td>
              </tr>
              <tr>
                <td>Produits commandés, montants, date et heure (sans nom ni téléphone)</td>
                <td>Comptabilité et déclarations du restaurant</td>
                <td>Obligation légale (art. 6.1.c du RGPD ; art. L123-22 du Code de commerce)</td>
                <td>10 ans, puis suppression automatique</td>
              </tr>
              <tr>
                <td>Téléphone et nombre de commandes récentes</td>
                <td>Empêcher les commandes abusives (3 commandes maximum en 15 minutes)</td>
                <td>Intérêt légitime (art. 6.1.f)</td>
                <td>Même durée que la commande</td>
              </tr>
              <tr>
                <td>Adresse e-mail des comptes du personnel</td>
                <td>Accès sécurisé à l&apos;espace pizzeria</td>
                <td>Intérêt légitime</td>
                <td>Jusqu&apos;à la suppression du compte</td>
              </tr>
              <tr>
                <td>Données techniques de connexion (adresse IP, navigateur)</td>
                <td>Sécurité et bon fonctionnement du site, chez l&apos;hébergeur</td>
                <td>Intérêt légitime</td>
                <td>Selon la politique de l&apos;hébergeur</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>Aucune donnée bancaire n&apos;est collectée : le paiement se fait au comptoir.</p>

        <h2>Destinataires</h2>
        <p>
          Seul le personnel de {s.restaurant_name} voit vos commandes. Deux prestataires techniques les hébergent pour notre
          compte : {LEGAL.hebergeur.nom} (hébergement du site, États-Unis) et {LEGAL.baseDeDonnees.nom} (base de données,
          région <LegalField value={LEGAL.baseDeDonnees.region} label="région du projet Supabase" />). Les transferts
          éventuels hors de l&apos;Union européenne sont encadrés par les garanties prévues par ces prestataires (clauses
          contractuelles types de la Commission européenne). Vos données ne sont ni vendues ni partagées à des fins
          publicitaires.
        </p>

        <h2>Cookies et stockage dans votre navigateur</h2>
        <p>
          Le site n&apos;utilise ni cookie publicitaire ni outil de mesure d&apos;audience. Il enregistre dans votre
          navigateur votre panier et le numéro de votre dernière commande, pour que vous puissiez les retrouver. Ces
          informations sont strictement nécessaires au service demandé et ne nécessitent donc pas de consentement. Un cookie de
          connexion est utilisé uniquement dans l&apos;espace réservé au personnel. Les polices de caractères sont hébergées
          par le site lui-même. La carte Google Maps n&apos;est chargée que si vous cliquez sur « Afficher la carte » :
          Google peut alors déposer ses propres cookies, selon sa politique de confidentialité.
        </p>

        <h2>Sécurité</h2>
        <p>
          Connexion chiffrée (HTTPS), accès aux commandes réservé aux comptes du personnel, prix et totaux recalculés par le
          serveur, base de données protégée par des règles d&apos;accès strictes. Le personnel ne voit que les commandes
          de la veille et du jour ; l&apos;historique complet n&apos;est accessible qu&apos;au responsable, avec un mot
          de passe et un code à 6 chiffres affiché par son téléphone (double authentification). Les numéros de téléphone
          y sont masqués et les exports comptables ne contiennent ni nom ni téléphone.
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
      <PracticalInfo settings={s} city={s.city ?? DEFAULT_CITY} pizzaFrom={null} showOrderLink />
    </>
  );
}
