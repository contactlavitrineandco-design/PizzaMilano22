# Pizza Milano

Site de commande à emporter de la pizzeria Pizza Milano, avec un espace restaurant pour la tablette.

- **Next.js 16** (App Router) + **TypeScript**
- **Supabase** : base Postgres, authentification, temps réel
- Design repris à l'identique de la maquette (`reference/maquette.html`, CSS dans `src/app/globals.css`)

| Route        | Rôle                                                                  |
| ------------ | --------------------------------------------------------------------- |
| `/`          | Site public : bandeau, carte, panier                                   |
| `/commander` | Carte + panier + formulaire de commande                                |
| `/mentions-legales` | Mentions légales + conditions de commande |
| `/confidentialite` | Politique de confidentialité (RGPD) |
| `/commande/<jeton>` | Suivi de sa commande par le client, annulation tant qu'elle n'est pas lancée |
| `/login`     | Connexion du personnel                                                 |
| `/pizzeria`  | Tableau des commandes, statistiques, ruptures, ouverture des commandes |
| `/pizzeria/photos` | Photos de la carte et galerie de la pizzeria (compte admin uniquement) |

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
2. Dans **SQL Editor**, exécutez dans l'ordre les fichiers de `supabase/migrations/` (dans l'ordre des noms : `…_init`, `…_photos` qui crée aussi le stockage des photos, `…_seo`, `…_photos_hd`, `…_photos_ia`, `…_annulation`, `…_photos_nettes_legal`, `…_coordonnees_galerie`), puis `supabase/seed.sql`. Sur une base déjà en place, n'exécutez que les migrations que vous n'avez pas encore lancées.
   Avec la CLI, c'est équivalent à : `npx supabase link --project-ref <ref>` puis `npm run db:push`, et le seed dans le SQL Editor.
3. Dans **Authentication > Sign In / Providers**, **désactivez les inscriptions** (« Allow new users to sign up »). Seuls les comptes que vous créez vous-même doivent exister.

**Option B : Supabase en local (nécessite Docker)**

```bash
npx supabase init      # une seule fois, crée supabase/config.toml (garde les migrations existantes)
npm run db:start       # démarre Supabase en local et affiche les clés
npm run db:reset       # applique la migration et le seed (efface les données locales)
```

`db:reset` est la seule fonction de remise à zéro : elle n'existe qu'en ligne de commande, jamais dans l'interface.

### 3. Variables d'environnement

```bash
cp .env.example .env.local
```

Remplissez avec **Project Settings > API** :

| Variable                        | Où elle sert                          | Secrète ? |
| ------------------------------- | ------------------------------------- | --------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | navigateur + serveur                  | non       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navigateur + serveur (clé « anon » ou « publishable ») | non |
| `NEXT_PUBLIC_SITE_URL`          | adresse publique du site, ex. `https://www.mondomaine.fr` (balises canoniques, sitemap, Google) | non |
| `SUPABASE_SERVICE_ROLE_KEY`     | **serveur uniquement** (création des commandes) — clé « service_role » ou « secret » | **oui** |

### 4. Créer le compte administrateur du restaurant

1. **Authentication > Users > Add user** : e-mail + mot de passe, cochez « Auto confirm user ».
2. Dans le **SQL Editor** :

```sql
insert into public.staff (user_id, role)
select id, 'admin' from auth.users where email = 'adresse@du-restaurant.fr';
```

Un compte Supabase qui n'est pas dans `staff` ne peut **pas** accéder à `/pizzeria`, même connecté.

### 5. Lancer

```bash
npm run dev     # http://localhost:3000
```

---

## Scripts

| Commande            | Effet                                          |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | serveur de développement                       |
| `npm run build`     | build de production                            |
| `npm run start`     | lance le build de production                   |
| `npm run lint`      | ESLint                                         |
| `npm run typecheck` | vérification TypeScript                        |
| `npm run check`     | typecheck + lint + build                       |
| `npm run db:start`  | Supabase local (Docker)                        |
| `npm run db:reset`  | réapplique migration + seed **en local**       |
| `npm run db:push`   | envoie les migrations au projet Supabase lié   |

## Déploiement sur Vercel

1. Poussez le projet sur GitHub, puis importez-le dans Vercel (framework détecté automatiquement).
2. Ajoutez les trois variables d'environnement dans **Settings > Environment Variables**. `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais être préfixée par `NEXT_PUBLIC_`.
3. Dans Supabase, **Authentication > URL Configuration**, mettez l'URL Vercel comme « Site URL ».

---

## Architecture

```
src/
  app/
    page.tsx                 /           bandeau + carte + panier
    commander/page.tsx       /commander  + formulaire
    commander/actions.ts     action serveur submitOrder (point d'entrée public)
    login/                   connexion, déconnexion
    pizzeria/page.tsx        lecture des commandes du jour (session du personnel)
    pizzeria/Board.tsx       tableau tablette, temps réel
    pizzeria/actions.ts      statuts, ruptures, ouverture (via fonctions SQL contrôlées)
    pizzeria/photos/         gestion des photos (admin) : page, actions serveur, PhotoManager
    globals.css              CSS de la maquette, inchangé
  components/                Header, Hero, NeonChef, Shop, cart-store,
                             ProductImage, PhotoPlaceholder, PizzeriaGallery, Lightbox, my-order
  lib/
    orders/validation.ts     validation serveur (prénom, téléphone, panier, heure)
    orders/create.ts         création de commande + point d'extension paiement
    orders/errors.ts         messages d'erreur en français
    time.ts                  horaires et créneaux, fuseau Europe/Paris
    images.ts                URL des images, textes alternatifs, rubriques de la galerie
    image-prep.ts            redimensionnement / réencodage des photos dans le navigateur
    supabase/admin.ts        clé service — "server-only", jamais dans le navigateur
    supabase/server.ts       client lié à la session (cookies)
    supabase/browser.ts      client navigateur (clé publique, temps réel)
  proxy.ts                   rafraîchit la session, redirige /pizzeria sans session
supabase/
  migrations/20261008120000_init.sql
  migrations/20261011120000_photos.sql   photos produits, galerie, stockage
  seed.sql
public/photos/etablissement/  vraies photos de la salle (sans métadonnées GPS)
```

### Parcours d'une commande

1. Le navigateur envoie seulement : prénom, téléphone, heure, remarque et des lignes `{ productId, quantity, supplementId, meat }`. **Aucun prix.**
2. `submitOrder` revalide tout (`lib/orders/validation.ts`).
3. `createOrder` relit les réglages, recalcule les créneaux disponibles et refuse une heure qui n'en fait pas partie.
4. La fonction SQL `create_order()` s'exécute dans **une seule transaction**. Elle revérifie l'ouverture et les horaires. Elle relit les prix et les disponibilités des produits et des suppléments, contrôle la viande des soufflés et calcule le total. Elle attribue le numéro du jour puis insère la commande et ses lignes.
5. Le client reçoit uniquement son numéro, le total, l'heure de retrait et son prénom.
6. La tablette reçoit la commande en temps réel (Supabase Realtime, filtré par les policies).

### Annulation par le client

- À la création, chaque commande reçoit un **jeton secret** (`orders.cancel_token`), renvoyé seulement au client qui l'a passée.
- L'écran de confirmation affiche le lien « Suivre ou annuler ma commande » (`/commande/<jeton>`). Le navigateur mémorise aussi la commande du jour : un bandeau « Votre commande #N » reste en haut de la carte.
- La page de suivi montre l'avancement (Reçue → Au four → Prête → Récupérée) et se met à jour toute seule toutes les 30 s.
- **Annulation possible tant que la commande est « Nouvelle »**. Dès que le pizzaïolo l'a lancée, le client doit appeler. La règle est vérifiée en base par `cancel_order_by_token()`.
- Côté tablette : une annulation client fait disparaître le ticket, affiche « Commande #N annulée par le client » et apparaît dans « Annulées aujourd'hui ». Les commandes annulées sont exclues des statistiques. Le pizzaïolo peut aussi annuler une nouvelle commande (bouton ✕, avec confirmation), et une commande annulée ne peut plus être relancée.

### Numéro de commande du jour

La table `order_counters` contient une ligne par jour (heure de Paris). `create_order()` l'incrémente avec `insert … on conflict do update`. Cela verrouille la ligne jusqu'à la fin de la transaction, donc deux commandes simultanées ne peuvent pas obtenir le même numéro. Si la commande échoue, l'incrément est annulé, donc il n'y a pas de trou. Une contrainte `unique (order_date, order_number)` sert de filet de sécurité.

### Sécurité

| Qui | Peut | Ne peut pas |
| --- | ---- | ----------- |
| **Client** (anonyme) | lire la carte, les suppléments et les réglages ; créer une commande via l'action serveur | lire, modifier ou supprimer une commande (même la sienne) ; appeler `create_order()` directement |
| **Personnel** (`staff`) | lire les commandes ; changer leur statut ; gérer les ruptures ; ouvrir ou fermer les commandes en ligne | modifier prix, totaux ou contenu des commandes |
| **Admin** (`staff.role = 'admin'`) | en plus : gérer produits, suppléments, réglages, personnel et photos | — |

- RLS est activé sur toutes les tables. `orders`, `order_items` et `order_counters` sont fermées à la clé publique.
- Les actions du personnel passent par des fonctions SQL (`set_order_status`, `set_product_availability`, `set_supplement_availability`, `set_online_orders_open`) qui vérifient `is_staff()` elles-mêmes. Une action serveur Next.js est appelable par n'importe qui, donc c'est la base qui fait foi.
- `create_order()` n'est exécutable que par le rôle `service_role`, utilisé uniquement dans `src/lib/supabase/admin.ts`. Ce fichier est marqué `server-only` : la compilation échoue s'il est importé côté navigateur.
- Anti-abus : un champ piège invisible, et au maximum 3 commandes par numéro de téléphone sur 15 minutes.

### Horaires d'ouverture

Ils sont dans `restaurant_settings.opening_hours`, un objet JSON avec une liste de plages par jour (liste vide = fermé ce jour-là) :

```json
{ "monday": [{ "open": "11:00", "close": "14:00" }, { "open": "18:00", "close": "22:30" }], "tuesday": [], "...": "..." }
```

Règles appliquées, côté Next.js et à nouveau côté base, toujours en heure de Paris :

- l'interrupteur **Commandes en ligne** (tablette) ferme tout, quels que soient les horaires : c'est la fermeture exceptionnelle ;
- on ne peut commander que pendant une plage d'ouverture du jour ;
- le retrait a lieu le jour même, dans une plage d'ouverture (heure de fermeture incluse), au moins `min_prep_minutes` après l'heure actuelle (20 min par défaut) ;
- les créneaux sont proposés tous les `slot_interval_minutes` (10 min par défaut). Par exemple, à 13 h 45 avec une fermeture à 14 h, le premier créneau proposé est 18 h 00.

Pour modifier les horaires, ouvrez **Table Editor > restaurant_settings** et éditez la colonne JSON. Passez ensuite `opening_hours_provisional` à `false`.

### Paiement : préparé, pas intégré

- Chaque commande a un `payment_status` : `pending` (par défaut), `paid`, `failed` ou `refunded`.
- Aujourd'hui tout est réglé au comptoir et reste en `pending`. Créer une commande ne la rend **jamais** « payée ».
- L'interface affiche le statut via `src/lib/payments.ts` (« À encaisser », « Payée »…).
- Le point d'extension est documenté dans `src/lib/orders/create.ts`. Rien n'est développé tant que le produit SumUp utilisé par le restaurant n'est pas identifié.


### Découvrez notre pizzeria et carte

La section présente la pizzeria en quelques lignes, affiche la première photo de la galerie (aujourd'hui une vraie Neptune du restaurant) puis une carte Google Maps. La carte ne se charge **qu'après un clic** sur « Afficher la carte » : aucune requête vers Google avant, ce qui évite un bandeau cookies. Le lien « itinéraire » ouvre la fiche Google de la pizzeria.

### Photos

**Ce que voient les clients**

- Chaque carte de la carte affiche une grande photo (format 4:3). Un clic l'agrandit. Les rubriques (base tomate, base crème, soufflés, boissons) servent de filtres.
- Ordre de priorité pour chaque produit :
  1. la photo enregistrée dans l'espace photos ;
  2. pour une pizza sans photo, un emplacement neutre (lattes de bois et pictogramme), sans fausse image ;
  3. pour un autre produit sans photo, la carte reste en texte. Si d'autres produits de la même rubrique ont une photo, un panneau neutre garde les cartes alignées.
- Si une photo ne se charge pas, la carte bascule automatiquement sur l'illustration ou le panneau neutre.
- Une image ajoutée comme « Image d'illustration » (banque d'images, IA…) porte la mention « Photo d'illustration », sur la carte comme dans la galerie.
- La page d'accueil affiche la section **« Découvrez notre pizzeria »**, avec des filtres par rubrique quand il y en a plusieurs (intérieur, extérieur, four, préparation, pizzas, équipe). Elle est cachée tant qu'elle ne contient aucune photo publiée.
- Les images passent par l'optimiseur de Next.js : bonne taille selon l'écran, format WebP, chargement différé.

**Gérer les photos** (compte admin, bouton « Photos » dans l'espace pizzeria, page `/pizzeria/photos`)

1. Choisissez le produit (ou « Ajouter une photo » pour la galerie).
2. Choisissez une photo sur l'ordinateur, la tablette ou le téléphone. L'aperçu montre le cadrage exact sur la carte, rien n'est encore publié.
3. Indiquez l'origine (« Photo prise chez Pizza Milano » ou « Image d'illustration ») et vérifiez la description (proposée automatiquement à partir des ingrédients).
4. « Publier ». Remplacer une photo supprime l'ancienne du stockage. « Supprimer » remet l'emplacement neutre.
5. Dans la galerie, vous pouvez aussi masquer une photo, changer sa rubrique, sa légende et son ordre.

**Côté technique**

- Les fichiers sont dans **Supabase Storage**, bucket `photos` (créé par la migration) : lecture publique, écriture réservée au rôle admin (policies RLS), 5 Mo maximum, JPEG/PNG/WebP uniquement.
- Avant l'envoi, le navigateur redresse la photo, la réduit à 1600 px et la réencode en WebP. Cela **retire les métadonnées, dont la position GPS** des photos de téléphone.
- Après l'envoi, le serveur relit le fichier stocké (taille, signature binaire). Il supprime le fichier s'il n'est pas une vraie image, puis enregistre le lien en base.
- La base n'accepte que deux formes de chemin : un fichier du site (`/photos/…`) ou un fichier du bucket (`products/<uuid>.webp`, `gallery/<uuid>.webp`). Une URL externe est refusée, ce qui exclut les liens cassés et les images de sites tiers.
- Chaque nouveau fichier a un nom unique : le cache des images peut durer 31 jours sans risque d'afficher une ancienne version.

**Photos améliorées et images générées (14/10/2026)**

- Les 5 vraies photos (Raclette, Saumon, Chorizo, Neptune, Cannibale) ont été agrandies par super-résolution (modèle EDSR ×4, 1200 × 900) : fichiers `*-hd.webp`. La migration `…_photos_hd.sql` bascule la base sur ces fichiers. Le gain est réel mais limité, parce que les originaux Uber Eats ne font qu'environ 300 px.
- 4 photos d'illustration réalistes ont été générées avec Canva IA, dans le style des vraies photos : Margherita, Milano, Reine, Boursalino. Elles sont dans le compte Canva, pas dans le projet, car le téléchargement depuis Canva n'était pas possible depuis l'environnement de développement. Pour les mettre en ligne : les ouvrir dans Canva, les télécharger en JPG, puis `/pizzeria/photos` > la pizza > « Ajouter une photo », origine **« Image d'illustration »**. Elles s'afficheront avec la mention « Photo d'illustration ».
- Mise à jour : 7 photos IA sont maintenant **intégrées au site** (`public/photos/pizzas-ia/`, agrandies par super-résolution) : Margherita, Milano, Reine, Boursalino, 4 Saisons, Mexicaine, Chicken. Elles portent la mention « Photo d'illustration ».
- Il reste 7 pizzas sans photo (4 Fromages, Végétarienne, Paysanne, 5 Fromages, Chèvre Miel, Tartiflette, Burrata). Elles affichent un emplacement neutre : les illustrations dessinées ont été retirées pour un rendu plus propre. Crédits Canva épuisés à nouveau.
- La photo du frigo a été retirée de la galerie.

**Obtenir des images pour les pizzas sans photo**

Aucune banque d'images ni API de génération d'images n'est branchée dans le projet. Rien n'est configuré, et ce serait un coût et une clé secrète de plus. Par ordre de préférence :

1. **Vos photos** : le plus efficace est une séance de 30 minutes au restaurant, pizzas sortant du four, prises de dessus en lumière du jour, puis envoyées depuis la tablette dans l'espace photos.
2. **Banques d'images libres** (Unsplash, Pexels : usage commercial gratuit, sans attribution obligatoire, selon leurs licences au moment du téléchargement). Elles ont rarement la recette exacte. À marquer « Image d'illustration ».
3. **Images générées par IA** : possibles avec un outil externe (ChatGPT, Midjourney, Canva…). Vérifiez ses conditions d'utilisation commerciale et son coût, puis importez l'image comme « Image d'illustration ».

### Référencement (SEO)

- **Page indexée** : seulement l'accueil `/`, qui contient la carte complète, la galerie et les infos pratiques. `/commander` reprend la même carte, donc elle est en `noindex, follow` pour éviter le contenu dupliqué. `/login` et `/pizzeria` sont en `noindex`.
- **Métadonnées** : titre « Pizza Milano · Pizzeria à emporter à Saint-Brieuc », description, balise canonique et image de partage `public/og.jpg` (layout et pages).
- **`/sitemap.xml` et `/robots.txt`** sont générés par `src/app/sitemap.ts` et `src/app/robots.ts`. Ils utilisent `NEXT_PUBLIC_SITE_URL`.
- **H1** : « Pizza Milano · Pizzeria à emporter à Saint-Brieuc » (même apparence que l'ancien sur-titre). La grande phrase d'accroche est un paragraphe.
- **Carte** : les 4 rubriques sont dans le HTML et les onglets ne font que filtrer. Avant, Google ne voyait que la base tomate.
- **Données structurées** Schema.org `Restaurant` + `Menu` (prix, disponibilités, photos réelles) dans `src/lib/structured-data.ts`. Elles sont construites **uniquement à partir de la base** : adresse, téléphone, coordonnées GPS et lien Maps ne sont publiés que s'ils sont renseignés. Les horaires ne sont publiés que si `opening_hours_provisional = false`.
- **Infos pratiques** en bas de page (`src/components/PracticalInfo.tsx`), avec les mêmes règles. Elles doivent être identiques à la fiche Google Business Profile.
- **Polices** servies par le site (`src/app/fonts/`, préchargées, plus d'appel à Google Fonts) : même rendu, chargement plus rapide.

**À remplir avant la mise en ligne** (Supabase > SQL Editor), avec les vraies informations du restaurant :

```sql
update public.restaurant_settings set
  address = 'numéro et rue',
  postal_code = '22000',
  city = 'Saint-Brieuc',
  phone = '02 xx xx xx xx',
  google_maps_url = 'https://maps.app.goo.gl/…',   -- lien « Partager » de la fiche Google
  latitude = null, longitude = null,                -- facultatif
  opening_hours = '{…}',                            -- vrais horaires (format plus haut)
  opening_hours_provisional = false
where id = 1;
```

**Vérifier après déploiement** : `https://votre-domaine/robots.txt`, `/sitemap.xml`, le [test des résultats enrichis](https://search.google.com/test/rich-results) sur l'accueil et [PageSpeed Insights](https://pagespeed.web.dev/).

---

## Légal et sécurité

**Pages** : `/mentions-legales` (éditeur, hébergeur, propriété intellectuelle, conditions de commande) et `/confidentialite` (RGPD). Elles sont liées en bas de chaque page et sous le formulaire de commande.

**À remplir dans `src/lib/legal.ts`** (tant que c'est vide, les pages affichent « [à compléter : …] » en orange) :

| Champ | Où le trouver |
| --- | --- |
| Raison sociale, forme juridique, capital | Extrait Kbis ou avis de situation INSEE |
| SIRET, immatriculation (RCS ou RM) | Kbis / [annuaire-entreprises.data.gouv.fr](https://annuaire-entreprises.data.gouv.fr) |
| TVA intracommunautaire | Kbis ou espace professionnel impots.gouv (si assujetti) |
| Directeur de la publication | En général le gérant |
| E-mail de contact | Adresse que le restaurant consulte (sert aussi aux demandes RGPD) |
| Médiateur de la consommation | **Obligatoire** pour vendre à des particuliers (art. L612-1 Code conso). Adhésion à un médiateur agréé, liste sur [economie.gouv.fr/mediation-conso](https://www.economie.gouv.fr/mediation-conso) |
| Région Supabase | Supabase > Project Settings > General (choisir une région de l'UE à la création) |

**Base de données** (Supabase > SQL Editor) : adresse, téléphone, horaires réels (`opening_hours_provisional = false`), lien Google Maps et lien Instagram (`instagram_url`). Voir la section Référencement.

**Sécurité en place** : HTTPS forcé (HSTS), en-têtes de protection (pas d'intégration dans une autre page, pas d'accès caméra/micro/position), accès aux commandes réservé au personnel (RLS), prix recalculés côté serveur, jeton secret pour l'annulation, limite anti-abus, clé secrète jamais envoyée au navigateur.

**RGPD** : les commandes de plus de 12 mois sont supprimées chaque nuit par `purge_old_orders()` (planifiée avec pg_cron par la migration `…_photos_nettes_legal`). Vérifier dans Supabase > Database > Extensions que **pg_cron** est activé ; sinon l'activer et relancer le bloc final de cette migration.

**À faire relire** : ces textes sont un modèle sérieux, pas un avis juridique. Faites-les relire si possible (CCI des Côtes-d'Armor, expert-comptable).

---

## À confirmer avec le restaurant

Ces données sont en base mais **ne sont pas validées commercialement**. Les produits concernés ont `to_confirm = true` dans la table `products`.

**Horaires**
- [ ] **Horaires d'ouverture : PROVISOIRES.** Le seed met tous les jours 11:00–14:00 et 18:00–22:30 (`opening_hours_provisional = true`). Ce ne sont pas les horaires du restaurant.
- [ ] Délai minimum de préparation (20 min) et pas des créneaux (10 min).

**Coordonnées (indispensables au référencement local)**
- [x] Adresse et téléphone repris de la fiche Google Maps « Milano pizza » (14/10/2026) : **3 rue du Maréchal Foch, 22000 Saint-Brieuc, 06 50 64 73 89**. Enregistrés par la migration `…_coordonnees_galerie` et le seed.
- [ ] **Nom** : la fiche Google dit « Milano pizza », le site dit « Pizza Milano ». Pour Google, il faut le même nom partout.
- [ ] **Horaires** : ceux de la fiche Google paraissent erronés (lundi 9 h–minuit, mardi minuit–17 h…). Ils ne sont pas repris : donner les vrais horaires.
- [ ] Nom exact du compte Instagram (« pizza milano 22 »), pour `instagram_url`.
- [ ] Adresse et téléphone du restaurant (vides dans `restaurant_settings`).
- [ ] Nom du restaurant : « Pizza Milano ». La plaque du comptoir indique « Pizza Zone ».

**Produits**
- [ ] **La Milano 13 €** : le nom est masqué sur le menu papier et vient de la caisse SumUp. Le badge « Maison » vient de la maquette, pas du restaurant.
- [ ] **La Cannibale 13 €** : nom repris de la caisse SumUp.
- [ ] **La 5 Fromages 12 €** : prix repris de la caisse. Ingrédients corrigés en « mozzarella, parmesan, chèvre, bleu » (le brie a été retiré).
- [ ] **La Saumon** : « Mozzarella, saumon, basilic, persil ». Le mot « basilic » est à moitié caché sur la photo du menu.
- [ ] **Canettes Oasis Tropical, Lipton Ice Tea pêche, Orangina, Tropico à 2 €** : prix déduit de l'étiquette « 2 € » du frigo. Seuls Coca et Fanta à 2 € apparaissent sur la caisse.

**Suppléments**
- [ ] **Œuf 0,50 €** : le menu indique « Œufs, Fromage 0,50 € », la lecture est ambiguë.
- [ ] **Supplément viande sur les soufflés 1 €** : présent sur le menu papier, ajouté ici.

**Relevé sur les captures Uber Eats du 11/10/2026** (rien n'a été modifié en base) :
- [ ] **La Saumon** : Uber Eats indique « Crème fraîche, Mozzarella, Saumon, **ail**, persil ». Le mot caché sur le menu papier est donc probablement « ail », pas « basilic ».
- [ ] **La 5 Fromages** : Uber Eats indique « Crème fraîche, mozzarella, **brie**, parmesan, chèvre, bleu ». Le menu papier lu ne mentionnait pas le brie, qui a été retiré à votre demande. Les deux sources se contredisent.
- [ ] **Prix** : Uber Eats affiche 15,50 € et 16,50 €, contre 12 € et 13 € au menu en salle. Le site garde les prix du menu en salle.
- [ ] **La Cannibale** : « jambon **halal** » sur Uber Eats. Faut-il l'indiquer sur le site ?
- [ ] **Orientale** (tomate, mozzarella, merguez, poivrons, oignons) : présente sur Uber Eats, absente du menu papier. Non ajoutée.

**Photos**
- [ ] Les 3 photos de la galerie (néon, salle, frigo) ont été prises sur place. Il faut l'accord du restaurant pour les publier. Le comptoir porte un autocollant « Pizza Zone ».
- [ ] **5 vraies photos de pizzas** (Raclette, Saumon, Chorizo, Neptune, Cannibale) viennent de la fiche Uber Eats du restaurant. Elles ont été recadrées, et le bouton « + » et le badge de la plateforme ont été effacés. Elles sont **provisoires et en basse résolution** (environ 600 px). Il faut confirmer que le restaurant en détient les droits : si un photographe de la plateforme les a prises, elles peuvent lui appartenir. Demandez les fichiers originaux et remplacez-les dans `/pizzeria/photos`. La photo « 5 fromages » d'Uber Eats n'a pas été reprise : elle montre d'autres pizzas.

**Produits volontairement non ajoutés** (vus sur la caisse ou dans le frigo) : Indienne (12 €), Hawaï (2 €), Dada, Schweppes.

---

## Limites connues

- Seuls les numéros français (fixe ou mobile) sont acceptés.
- Une commande sur place ou par téléphone ne passe pas par le site. Elle peut être saisie dans la caisse comme avant.
- Le temps réel nécessite que la table `orders` soit dans la publication `supabase_realtime`. La migration s'en charge. En secours, la tablette se rafraîchit chaque minute.
- RGPD : prénoms et téléphones sont stockés. Il faut prévoir des mentions légales et une durée de conservation (par exemple supprimer les commandes de plus de 12 mois).
