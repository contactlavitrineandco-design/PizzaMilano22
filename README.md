# Pizza Milano

Site de la pizzeria Pizza Milano (Saint-Brieuc) : carte avec photos, **commande en ligne à emporter avec paiement au comptoir**, et un **espace gérant protégé par un code** pour modifier le site.

- **Next.js 16** (App Router) + **TypeScript**
- **Supabase** : base Postgres, stockage des photos
- Design de la maquette (lattes de bois, néon du chef, kraft, touches tricolores), CSS dans `src/app/globals.css`

| Route | Rôle |
| --- | --- |
| `/` | Bandeau (ouvert / fermé, « Commander », 3 étapes), carte, panier, galerie, carte Google, infos pratiques |
| `/commander` | Carte + panier + formulaire (prénom, téléphone, heure de retrait, remarque) |
| `/commande/<jeton>` | Suivi de sa commande par le client, annulation tant qu'elle n'est pas lancée |
| `/mentions-legales` | Mentions légales + conditions de commande |
| `/confidentialite` | Politique de confidentialité |
| `/gerant` | **Espace gérant** (code d'accès) : commandes en ligne ouvertes / en pause, horaires, carte (noms, ingrédients, prix, épuisé, ajout, suppression), photos, suppléments, coordonnées, changement du code |

---

## Commandes et SumUp (15/10/2026)

- Le client choisit ses pizzas, son heure de retrait, donne son prénom et son téléphone, et envoie. Il reçoit un numéro de commande et un lien de suivi.
- **Le paiement se fait au comptoir, au retrait.** Rien n'est payé en ligne, aucune carte bancaire n'est demandée. C'est écrit dans le bandeau (« 3. Payez au comptoir en récupérant », pastille « Paiement au comptoir »), dans le panier juste au-dessus du bouton d'envoi, sur le ticket de confirmation, en bas de page et dans les conditions de commande.
- **Le restaurant veut recevoir les commandes sur sa caisse SumUp. Ce branchement reste à définir avec SumUp.** SumUp ne publie pas d'interface permettant à un site extérieur de créer une commande détaillée sur sa caisse (son API « Cloud » ne transmet qu'un montant à un lecteur de carte Solo). Leur offre de commande en ligne, Order & Pay (Caisse Plus), fonctionne avec sa propre page de commande, pas avec ce site.
- Le point de branchement est prêt : `src/lib/orders/forward.ts`, appelé après chaque commande. Il ne fait rien pour l'instant : **aucune fausse intégration**.
- **Tant que ce branchement n'existe pas, les commandes sont seulement enregistrées dans la base** (Supabase > Table Editor > `orders`) et n'apparaissent nulle part au comptoir. L'ancien écran des commandes du restaurant a été retiré à votre demande. **Gardez les commandes en ligne « en pause » dans l'espace gérant** jusqu'à ce que la transmission fonctionne, sinon des clients viendraient chercher des commandes que personne n'a vues.

---

## Espace gérant (`/gerant`)

Le gérant ouvre `https://votre-site/gerant` (lien « Espace gérant » discret en bas de chaque page) et saisit son **code d'accès**.

- **Code de départ : `220000`.** Un rappel s'affiche tant qu'il n'est pas changé. Changez-le dès la mise en ligne (rubrique « Code d'accès ») : 6 à 12 chiffres, ni chiffres identiques ni chiffres qui se suivent.
- Ce qu'on peut faire : ouvrir ou mettre en pause les commandes en ligne ; modifier les horaires (2 plages par jour, plage de nuit possible) ; modifier nom, ingrédients, prix, badge de chaque produit, le passer en « Épuisé », en ajouter, en supprimer (un produit déjà commandé ne se supprime pas : passez-le en « Épuisé ») ; changer ou retirer sa photo (prise au téléphone ou choisie, réduite et nettoyée de ses données GPS avant l'envoi) ; prix et disponibilité des suppléments ; téléphone, lien Instagram, délai de préparation ; changer le code.
- Les changements sont visibles immédiatement sur le site.

**Sécurité de l'accès**

- Le code n'est jamais stocké en clair : la base garde son empreinte (bcrypt) et le vérifie elle-même (`verify_admin_code`), uniquement à la demande du serveur.
- 5 erreurs en 15 minutes depuis un même appareil, ou 30 au total, bloquent les essais 15 minutes.
- Après un bon code, le serveur pose un cookie de session **signé** (HMAC, secret `ADMIN_SESSION_SECRET`), `httpOnly`, `SameSite=Strict`, limité à `/gerant`, valable 12 heures. Un cookie modifié ou expiré est refusé.
- **Changer le code déconnecte tous les autres appareils.**
- Chaque action du gérant revérifie la session côté serveur et valide les données ; la base garde ses propres contraintes (prix, horaires, chemins de photos). La clé publique ne peut rien modifier.
- La page n'est ni mise en cache ni indexée par Google.
- Un code de 6 chiffres reste devinable par quelqu'un de très patient malgré le blocage : un code plus long (8 chiffres ou plus) est plus sûr.

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
2. Dans **SQL Editor**, exécutez dans l'ordre les fichiers de `supabase/migrations/` (dans l'ordre des noms : `…_init`, `…_photos` qui crée aussi le stockage des photos, `…_seo`, `…_photos_hd`, `…_photos_ia`, `…_annulation`, `…_photos_nettes_legal`, `…_coordonnees_galerie`, `…_photos_tartiflette_burrata`, `…_photos_4fromages_vege_paysanne`, `…_horaires_nuit_instagram`, `…_espace_gerant`), puis `supabase/seed.sql`. Sur une base déjà en place, n'exécutez que les migrations que vous n'avez pas encore lancées.
   Avec la CLI, c'est équivalent à : `npx supabase link --project-ref <ref>` puis `npm run db:push`, et le seed dans le SQL Editor.
3. Dans **Authentication > Sign In / Providers**, **désactivez les inscriptions** (« Allow new users to sign up ») : le site n'utilise aucun compte.

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
| `NEXT_PUBLIC_SUPABASE_URL` | navigateur + serveur | non |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navigateur + serveur (clé « anon » ou « publishable ») | non |
| `NEXT_PUBLIC_SITE_URL` | adresse publique du site, ex. `https://www.mondomaine.fr` (balises canoniques, sitemap, Google) | non |
| `SUPABASE_SERVICE_ROLE_KEY` | **serveur uniquement** (création des commandes, espace gérant) — clé « service_role » ou « secret » | **oui** |
| `ADMIN_SESSION_SECRET` | **serveur uniquement** : signe la session de l'espace gérant. 32 caractères au hasard minimum (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`) | **oui** |

### 4. Espace gérant

Rien à créer : le code de départ `220000` est installé par la migration `…_espace_gerant`. Ouvrez `/gerant` et changez-le.

### 5. Lancer

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
2. Ajoutez les cinq variables d'environnement dans **Settings > Environment Variables**. `SUPABASE_SERVICE_ROLE_KEY` et `ADMIN_SESSION_SECRET` ne doivent jamais être préfixées par `NEXT_PUBLIC_`.
3. Ouvrez `/gerant`, entrez `220000`, puis choisissez votre propre code.

---

## Architecture

```
src/
  app/
    page.tsx               /                bandeau + carte + panier + galerie + infos pratiques
    commander/             /commander       formulaire ; actions.ts = action serveur submitOrder
    commande/[token]/      suivi et annulation par le client
    gerant/                espace gérant : page, connexion par code, tableau de bord, actions serveur
    mentions-legales/      confidentialite/
  components/              Header, Hero, Shop (carte + panier), cart-store, my-order, ProductImage,
                           PizzeriaGallery, MapEmbed, Lightbox, PracticalInfo, LegalField
  lib/
    orders/                validation serveur, création, suivi, messages d'erreur
    orders/forward.ts      point de branchement vers la caisse (SumUp, à définir)
    admin-session.ts       session de l'espace gérant (cookie signé)
    image-prep.ts          réduction des photos dans le navigateur avant envoi
    time.ts                horaires, créneaux, ouvert / fermé, fuseau Europe/Paris, plages de nuit
    supabase/admin.ts      clé service — "server-only", jamais dans le navigateur
supabase/
  migrations/              historique complet du schéma
  seed.sql                 carte, suppléments, réglages, photos
```

### Sécurité

| Qui | Peut | Ne peut pas |
| --- | --- | --- |
| **Client** (anonyme) | lire la carte ; créer une commande via l'action serveur ; suivre et annuler **sa** commande avec son lien secret | lire ou modifier les commandes ; appeler `create_order()` directement ; modifier la carte |
| **Gérant** (code + session signée) | modifier la carte, les prix, les photos, les horaires, les coordonnées ; ouvrir ou mettre en pause les commandes | lire le code stocké ; contourner le blocage après 5 erreurs |

- RLS sur toutes les tables ; `orders`, `order_items`, `order_counters`, `admin_access`, `admin_login_attempts` fermées à la clé publique.
- Prix et total recalculés en base ; validation serveur ; anti-abus (champ piège, 3 commandes maximum par téléphone en 15 minutes).
- `payment_status` reste `pending` (« À encaisser ») : la création d'une commande ne la rend jamais « payée ».
- En-têtes : HTTPS forcé (HSTS), pas d'intégration dans une autre page, pas d'accès caméra / micro / position.
- Les commandes de plus de 12 mois sont supprimées chaque nuit (`purge_old_orders`, pg_cron).

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

Une plage dont l'heure de fermeture est **plus tôt** que l'heure d'ouverture se termine **le lendemain** (dimanche 18:00 → lundi 02:00). Une plage de nuit doit finir au plus tard à 6 h : la **journée de service** se termine à 6 h, donc une commande passée à 1 h dans la nuit de dimanche reste sur le tableau du dimanche, avec la suite des numéros. On commande pendant les heures d'ouverture ; les créneaux de retrait sont proposés toutes les 10 minutes, au moins 20 minutes plus tard (`slot_interval_minutes`, `min_prep_minutes`). Le bandeau affiche « Ouvert jusqu'à … » ou « Fermé · ouvre … à … » en heure de Paris. Les mêmes horaires sont publiés pour Google (données structurées) : ils doivent être identiques à la fiche Google Business Profile, qui affichait le 14/10/2026 des horaires différents (lundi 9 h–minuit, mardi minuit–17 h…). Pensez à la corriger.

### Découvrez notre pizzeria et carte

La section présente la pizzeria en quelques lignes, affiche la première photo de la galerie (une vraie Neptune du restaurant) puis une carte Google Maps. La carte ne se charge **qu'après un clic** sur « Afficher la carte » : aucune requête vers Google avant, ce qui évite un bandeau cookies.

### Photos

- Chaque produit affiche une grande photo (4:3), agrandie au clic. Une pizza sans photo affiche un emplacement neutre, jamais une fausse image.
- Les images d'illustration (générées par IA) portent la mention « Photo d'illustration ». Les vraies photos du restaurant n'en portent pas.
- Vraies photos (super-résolution à partir des captures Uber Eats) : Raclette, Saumon, Chorizo, Neptune, Cannibale.
- Photos d'illustration IA (Canva), même fond que les vraies : Margherita, Milano, Reine, Boursalino, 4 Saisons, Mexicaine, Chicken, Tartiflette, Burrata, 4 Fromages, Végétarienne, Paysanne.
- Sans photo : 5 Fromages, Chèvre Miel.

**Changer une photo** : espace gérant > « Carte et photos » > le produit > « Changer la photo ». Choisissez l'origine : « Photo prise chez Pizza Milano » ou « Image d'illustration » (affichée avec la mention). La photo est réduite à 1600 px et réencodée dans le navigateur (ce qui retire la position GPS), puis le serveur vérifie que c'est bien une image JPEG, PNG ou WebP de moins de 5 Mo avant de la publier dans Supabase Storage. L'ancienne photo est supprimée du stockage. Les photos de la galerie « Découvrez notre pizzeria » se changent dans Supabase (table `gallery_photos`).

### Référencement (SEO)

- **Page indexée** : l'accueil `/`, qui contient la carte complète, la galerie et les infos pratiques. Titre « Pizza Milano · Pizzeria à emporter à Saint-Brieuc », description, canonique, image de partage `public/og.jpg`.
- **`/sitemap.xml` et `/robots.txt`** générés à partir de `NEXT_PUBLIC_SITE_URL`.
- **Données structurées** `Restaurant` + `Menu` construites uniquement à partir de la base : adresse, téléphone, GPS, lien Maps, horaires, Instagram (`sameAs`).
- `/commander`, `/commande/…` et `/gerant` sont en `noindex`.
- **Vérifier après déploiement** : `/robots.txt`, `/sitemap.xml`, le [test des résultats enrichis](https://search.google.com/test/rich-results) et [PageSpeed Insights](https://pagespeed.web.dev/).

---

## Légal

**Pages** : `/mentions-legales` (éditeur, hébergeur, propriété intellectuelle, conditions de commande) et `/confidentialite`. Elles sont liées en bas de chaque page. Les conditions précisent que le paiement se fait au comptoir, au retrait.

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
- [ ] Délai minimum de préparation (20 min) et pas des créneaux (10 min).
- [ ] Carte de la caisse SumUp : on y voit « Hawaï » à 2,00 €, « Indienne » et « La Poulet », absentes du site. Pour encaisser au bon prix, la caisse et le site doivent avoir les mêmes produits et prix.

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

- **Les commandes du site n'arrivent pas encore sur la caisse SumUp** (voir « Commandes et SumUp ») : gardez les commandes en ligne en pause jusqu'au branchement.
- Seuls les numéros français (fixe ou mobile) sont acceptés.
- Les commandes sur place ou par téléphone ne passent pas par le site : elles se saisissent dans la caisse comme avant.
- Le badge « Ouvert / Fermé » suit les horaires enregistrés, pas les fermetures exceptionnelles : mettez les commandes en ligne en pause depuis l'espace gérant.
- Si le gérant oublie son code : dans Supabase > SQL Editor, `update public.admin_access set code_hash = extensions.crypt('NOUVEAU_CODE', extensions.gen_salt('bf', 10)), version = version + 1 where id = 1;`
