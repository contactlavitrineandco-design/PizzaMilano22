# Pizza Milano

Site vitrine de la pizzeria Pizza Milano (Saint-Brieuc) : carte avec photos, horaires, coordonnées, Instagram et bouton **« Commander »**. Les commandes en ligne passent par **SumUp** et arrivent directement sur la caisse du restaurant.

- **Next.js 16** (App Router) + **TypeScript**
- **Supabase** : carte, photos et réglages (lecture seule pour le public)
- Design de la maquette (lattes de bois, néon du chef, kraft, touches tricolores), CSS dans `src/app/globals.css`

| Route | Rôle |
| --- | --- |
| `/` | Bandeau avec « Commander », ouvert / fermé, carte, galerie, carte Google, infos pratiques |
| `/commander` | Adresse courte à partager : renvoie vers la page de commande SumUp (ou vers la carte tant qu'elle n'est pas renseignée) |
| `/mentions-legales` | Mentions légales + conditions de commande |
| `/confidentialite` | Politique de confidentialité |

---

## Commandes : SumUp (15/10/2026)

Le restaurant encaisse avec la **caisse SumUp**. Il veut que les commandes du site arrivent directement dessus. SumUp ne propose pas de moyen public pour qu'un site extérieur envoie une commande détaillée à sa caisse : son API « Cloud » ne sert qu'à envoyer un **montant** à un lecteur de carte Solo. La solution prévue par SumUp est sa propre commande en ligne, **SumUp Order & Pay** : les clients commandent et paient depuis leur téléphone, choisissent une heure de retrait, et la commande part vers le poste de préparation. D'après la page de SumUp, elle est incluse dans l'offre **Caisse Plus** (49 € par mois, 2,50 % par transaction) : à vérifier avec SumUp pour le compte du restaurant.

**Ce que fait le site** : le bouton « Commander » (en-tête, bandeau, sous la carte, barre en bas sur mobile, pied de page) ouvre la page de commande SumUp du restaurant. Tant que le lien n'est pas renseigné, il devient « Commander au 06 50 64 73 89 » (appel direct).

**À faire par le restaurant**

1. Activer la commande en ligne dans son compte SumUp et récupérer le lien de sa page de commande.
2. Le renseigner (Supabase > SQL Editor) :

```sql
update public.restaurant_settings set order_url = 'https://…' where id = 1;
```

Seuls les liens `https://` sont acceptés. Le changement est visible tout de suite, sans redéployer.

3. Vérifier que **la carte SumUp correspond à celle du site** (noms, prix, ingrédients). Sur la photo de la caisse du 15/10/2026, on voit par exemple « Hawaï » à 2,00 €, « Indienne » et « La Poulet », qui ne sont pas sur le site.

**Ce qui a été retiré** : panier, formulaire de commande, numéro de commande, suivi et annulation en ligne, espace pizzeria (tablette, historique, code d'accès, gestion des photos), connexion du personnel. La caisse SumUp fournit le suivi des commandes et les rapports de ventes. La migration `…_vitrine_sumup` supprime les tables de commandes ; elle **refuse de s'exécuter** si la table `orders` contient déjà des commandes (il faudrait alors les exporter d'abord).

---

## Installation locale

Prérequis : **Node.js 20.9 ou plus récent** et un compte [Supabase](https://supabase.com) (gratuit).

### 1. Installer les dépendances

```bash
npm install
```

### 2. Créer la base Supabase

**Option A : projet Supabase en ligne (le plus simple)**

1. Créez un projet sur supabase.com (région Europe, par exemple Paris ou Francfort).
2. Dans **SQL Editor**, exécutez dans l'ordre les fichiers de `supabase/migrations/` (dans l'ordre des noms : `…_init`, `…_photos` qui crée aussi le stockage des photos, `…_seo`, `…_photos_hd`, `…_photos_ia`, `…_annulation`, `…_photos_nettes_legal`, `…_coordonnees_galerie`, `…_photos_tartiflette_burrata`, `…_photos_4fromages_vege_paysanne`, `…_vitrine_sumup`), puis `supabase/seed.sql`. Sur une base déjà en place, n'exécutez que les migrations que vous n'avez pas encore lancées.
   Avec la CLI, c'est équivalent à : `npx supabase link --project-ref <ref>` puis `npm run db:push`, et le seed dans le SQL Editor.
3. Dans **Authentication > Sign In / Providers**, **désactivez les inscriptions** (« Allow new users to sign up ») : le site n'a pas de comptes.

**Option B : Supabase en local (nécessite Docker)**

```bash
npx supabase init      # une seule fois, crée supabase/config.toml (garde les migrations existantes)
npm run db:start       # démarre Supabase en local et affiche les clés
npm run db:reset       # applique les migrations et le seed (efface les données locales)
```

### 3. Variables d'environnement

```bash
cp .env.example .env.local
```

| Variable | Où elle sert | Secrète ? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | lecture de la carte et des réglages | non |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem (clé « anon » ou « publishable ») | non |
| `NEXT_PUBLIC_SITE_URL` | adresse publique du site, ex. `https://www.mondomaine.fr` (balises canoniques, sitemap, Google) | non |

Il n'y a plus de clé secrète : le site ne fait que lire.

### 4. Lancer

```bash
npm run dev     # http://localhost:3000
```

---

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run start` | lance le build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | vérification TypeScript |
| `npm run check` | typecheck + lint + build |
| `npm run db:start` | Supabase local (Docker) |
| `npm run db:reset` | réapplique migrations + seed **en local** |
| `npm run db:push` | envoie les migrations au projet Supabase lié |

## Déploiement sur Vercel

1. Poussez le projet sur GitHub, puis importez-le dans Vercel (framework détecté automatiquement).
2. Ajoutez les trois variables d'environnement dans **Settings > Environment Variables**.
3. Si une ancienne variable `SUPABASE_SERVICE_ROLE_KEY` existe dans Vercel, supprimez-la : elle ne sert plus.

---

## Architecture

```
src/
  app/
    page.tsx               /            bandeau + carte + galerie + infos pratiques
    commander/page.tsx     /commander   redirection vers la commande SumUp
    mentions-legales/      confidentialite/
    globals.css            CSS de la maquette
  components/
    OrderButton.tsx        bouton « Commander » (lien SumUp, sinon appel)
    Header, Hero, NeonChef, Menu (carte à onglets), ProductImage, PhotoPlaceholder,
    PizzeriaGallery, MapEmbed, Lightbox, PracticalInfo, LegalField
  lib/
    data.ts                lecture de la carte, des photos et des réglages (clé publique)
    time.ts                ouvert / fermé, fuseau Europe/Paris, plages de nuit
    structured-data.ts     Schema.org Restaurant + Menu
    legal.ts               informations des mentions légales
supabase/
  migrations/              historique complet du schéma
  seed.sql                 carte, suppléments, réglages, photos
public/photos/carte/       photos de la carte (1200 × 900)
```

### Sécurité

- Le site ne collecte **aucune donnée personnelle** : pas de compte, pas de formulaire, pas de cookie, rien dans le navigateur.
- La base n'est lisible par le public qu'en lecture (RLS) : carte, suppléments, réglages, photos publiées. Aucune écriture possible avec la clé publique.
- En-têtes : HTTPS forcé (HSTS), interdiction d'intégrer le site dans une autre page, pas d'accès caméra / micro / position, `nosniff`, politique de référent.
- La carte Google Maps ne se charge qu'après un clic.

### Horaires

Repris du compte Instagram [@milanopizza22](https://www.instagram.com/milanopizza22/) le 15/10/2026 :

| Jour | Horaires |
| --- | --- |
| Lundi | Fermé |
| Mardi à samedi | 11 h – 15 h et 18 h – 23 h 30 |
| Dimanche | 18 h – 2 h |

Ils sont dans **Table Editor > restaurant_settings**, colonne JSON `opening_hours` :

```json
{"monday": [], "tuesday": [{"open": "11:00", "close": "15:00"}, {"open": "18:00", "close": "23:30"}], …, "sunday": [{"open": "18:00", "close": "02:00"}]}
```

Une plage dont l'heure de fermeture est **plus tôt** que l'heure d'ouverture se termine **le lendemain** (dimanche 18:00 → lundi 02:00). Une plage de nuit doit finir au plus tard à 6 h. Le bandeau affiche « Ouvert jusqu'à … » ou « Fermé · ouvre … à … » en heure de Paris. Les mêmes horaires sont publiés pour Google (données structurées) : ils doivent être identiques à la fiche Google Business Profile, qui affichait le 14/10/2026 des horaires différents (lundi 9 h–minuit, mardi minuit–17 h…). Pensez à la corriger.

### Découvrez notre pizzeria et carte

La section présente la pizzeria en quelques lignes, affiche la première photo de la galerie (une vraie Neptune du restaurant) puis une carte Google Maps. La carte ne se charge **qu'après un clic** sur « Afficher la carte » : aucune requête vers Google avant, ce qui évite un bandeau cookies.

### Photos

- Chaque produit affiche une grande photo (4:3), agrandie au clic. Une pizza sans photo affiche un emplacement neutre, jamais une fausse image.
- Les images d'illustration (générées par IA) portent la mention « Photo d'illustration ». Les vraies photos du restaurant n'en portent pas.
- Vraies photos (super-résolution à partir des captures Uber Eats) : Raclette, Saumon, Chorizo, Neptune, Cannibale.
- Photos d'illustration IA (Canva), même fond que les vraies : Margherita, Milano, Reine, Boursalino, 4 Saisons, Mexicaine, Chicken, Tartiflette, Burrata, 4 Fromages, Végétarienne, Paysanne.
- Sans photo : 5 Fromages, Chèvre Miel.

**Changer une photo** (sans espace d'administration, tout se fait dans Supabase) :

1. **Storage > photos** : envoyez l'image (JPEG, PNG ou WebP, 5 Mo maximum) dans le dossier `products/` (ou `gallery/`). Retirez d'abord les métadonnées GPS d'une photo de téléphone (une capture d'écran de la photo suffit).
2. **SQL Editor** :

```sql
update public.products
set image_path = 'products/nom-du-fichier.webp', image_source = 'restaurant', image_alt = 'Pizza Reine : …', image_updated_at = now()
where name = 'La Reine';
```

`image_source = 'illustration'` pour une image qui ne vient pas du restaurant. La base n'accepte que les chemins du site (`/photos/…`) ou du bucket (`products/…`, `gallery/…`), jamais une URL externe.

### Référencement (SEO)

- **Page indexée** : l'accueil `/`, qui contient la carte complète, la galerie et les infos pratiques. Titre « Pizza Milano · Pizzeria à emporter à Saint-Brieuc », description, canonique, image de partage `public/og.jpg`.
- **`/sitemap.xml` et `/robots.txt`** générés à partir de `NEXT_PUBLIC_SITE_URL`.
- **Données structurées** `Restaurant` + `Menu` construites uniquement à partir de la base : adresse, téléphone, GPS, lien Maps, horaires, Instagram (`sameAs`) et, si le lien SumUp est renseigné, l'action « Commander » (`OrderAction`, retrait sur place).
- **Vérifier après déploiement** : `/robots.txt`, `/sitemap.xml`, le [test des résultats enrichis](https://search.google.com/test/rich-results) et [PageSpeed Insights](https://pagespeed.web.dev/).

---

## Légal

**Pages** : `/mentions-legales` (éditeur, hébergeur, propriété intellectuelle, conditions de commande) et `/confidentialite`. Elles sont liées en bas de chaque page. Les conditions précisent que la commande en ligne et le paiement se font sur la page SumUp, avec ses propres conditions.

**Rempli** (registre des entreprises, 14/10/2026, à confirmer par le gérant) : SAS MILANO PIZZA 22, enseigne « Pizza Milano », 3 rue du Maréchal Foch, 22000 Saint-Brieuc, SIRET 995 087 970 00019, RCS Saint-Brieuc 995 087 970, directeur de la publication Mohamed Lamine Sekine (président).

**À remplir dans `src/lib/legal.ts`** (tant que c'est vide, les pages affichent « [à compléter : …] » en orange) :

| Champ | Où le trouver |
| --- | --- |
| Capital social | Extrait Kbis |
| TVA intracommunautaire | Kbis ou espace professionnel impots.gouv (si assujetti) |
| E-mail de contact | Adresse que le restaurant consulte (sert aussi aux demandes RGPD) |
| Médiateur de la consommation | **Obligatoire** pour vendre à des particuliers (art. L612-1 Code conso). Liste sur [economie.gouv.fr/mediation-conso](https://www.economie.gouv.fr/mediation-conso) |
| Région Supabase | Supabase > Project Settings > General |

**À faire relire** : ces textes sont un modèle sérieux, pas un avis juridique (CCI des Côtes-d'Armor, expert-comptable).

---

## À confirmer avec le restaurant

**Commande en ligne**
- [ ] Lien de la page de commande SumUp (Order & Pay), à mettre dans `order_url`.
- [ ] Carte SumUp identique à celle du site (voir plus haut : Hawaï à 2,00 €, Indienne, La Poulet présentes sur la caisse).

**Coordonnées**
- [x] Adresse et téléphone : **3 rue du Maréchal Foch, 22000 Saint-Brieuc, 06 50 64 73 89** (fiche Google Maps, 14/10/2026).
- [x] Nom affiché : « Pizza Milano » (choisi le 15/10/2026). Renommer la fiche Google « Milano pizza » en « Pizza Milano ».
- [x] Instagram : [@milanopizza22](https://www.instagram.com/milanopizza22/) (15/10/2026).
- [x] Horaires : repris d'Instagram (15/10/2026). Corriger la fiche Google pour qu'elle affiche les mêmes.

**Produits** (`to_confirm = true` dans la table `products`)
- [ ] **La Milano 13 €** : nom masqué sur le menu papier, repris de la caisse SumUp. Le badge « Maison » vient de la maquette.
- [ ] **La Cannibale 13 €** : nom repris de la caisse SumUp.
- [ ] **La 5 Fromages 12 €** : ingrédients « mozzarella, parmesan, chèvre, bleu » (brie retiré à votre demande ; Uber Eats indique du brie).
- [ ] **La Saumon** : « basilic » à moitié caché sur le menu ; Uber Eats indique « ail ».
- [ ] **Canettes Oasis Tropical, Lipton Ice Tea pêche, Orangina, Tropico à 2 €** : prix déduit de l'étiquette du frigo.
- [ ] **Œuf 0,50 €** et **supplément viande des soufflés 1 €**.
- [ ] Prix Uber Eats (15,50 € / 16,50 €) différents du menu en salle (12 € / 13 €) : le site garde les prix en salle.

**Photos**
- [ ] Les 5 vraies photos viennent de la fiche Uber Eats du restaurant (recadrées, badges effacés). Vérifier que le restaurant en détient les droits et demander les originaux.
- [ ] Une photo de la devanture serait la bienvenue dans la galerie.

---

## Limites connues

- Le site ne voit pas l'état des commandes SumUp (rupture, attente) : la caisse s'en charge. Pour marquer un produit épuisé sur la carte du site, passez `available` à `false` dans **Table Editor > products**.
- Le badge « Ouvert / Fermé » suit les horaires enregistrés, pas les fermetures exceptionnelles : pour une fermeture exceptionnelle, publiez-la sur Instagram ou passez temporairement les horaires du jour à `[]`.
