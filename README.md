# Pizza Milano

Site de commande à emporter de la pizzeria Pizza Milano, avec un espace restaurant pour la tablette.

- **Next.js 16** (App Router) + **TypeScript**
- **Supabase** : base Postgres, authentification, temps réel
- Design repris à l'identique de la maquette (`reference/maquette.html`, CSS dans `src/app/globals.css`)

| Route        | Rôle                                                                  |
| ------------ | --------------------------------------------------------------------- |
| `/`          | Site public : bandeau, carte, panier                                   |
| `/commander` | Carte + panier + formulaire de commande                                |
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
2. Dans **SQL Editor**, exécutez dans l'ordre `supabase/migrations/20261008120000_init.sql`, puis `supabase/migrations/20261011120000_photos.sql` (qui crée aussi le stockage des photos), puis `supabase/seed.sql`.
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
                             ProductImage, PizzaIllustration, PizzeriaGallery, Lightbox
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


### Photos

**Ce que voient les clients**

- Chaque carte de la carte affiche une grande photo (format 4:3). Un clic l'agrandit. Les rubriques (base tomate, base crème, soufflés, boissons) servent de filtres.
- Ordre de priorité pour chaque produit :
  1. la photo enregistrée dans l'espace photos ;
  2. pour une pizza sans photo, une **illustration dessinée d'après ses ingrédients réels** (olives, champignons, jambon, œuf…). Elle porte toujours la mention « Illustration ». Ce n'est pas une photo et elle ne prétend pas en être une ;
  3. pour un autre produit sans photo, la carte reste en texte. Si d'autres produits de la même rubrique ont une photo, un panneau neutre garde les cartes alignées.
- Si une photo ne se charge pas, la carte bascule automatiquement sur l'illustration ou le panneau neutre.
- Une image ajoutée comme « Image d'illustration » (banque d'images, IA…) porte la mention « Photo d'illustration », sur la carte comme dans la galerie.
- La page d'accueil affiche la section **« Découvrez notre pizzeria »**, avec des filtres par rubrique quand il y en a plusieurs (intérieur, extérieur, four, préparation, pizzas, équipe). Elle est cachée tant qu'elle ne contient aucune photo publiée.
- Les images passent par l'optimiseur de Next.js : bonne taille selon l'écran, format WebP, chargement différé.

**Gérer les photos** (compte admin, bouton « Photos » dans l'espace pizzeria, page `/pizzeria/photos`)

1. Choisissez le produit (ou « Ajouter une photo » pour la galerie).
2. Choisissez une photo sur l'ordinateur, la tablette ou le téléphone. L'aperçu montre le cadrage exact sur la carte, rien n'est encore publié.
3. Indiquez l'origine (« Photo prise chez Pizza Milano » ou « Image d'illustration ») et vérifiez la description (proposée automatiquement à partir des ingrédients).
4. « Publier ». Remplacer une photo supprime l'ancienne du stockage. « Supprimer » remet l'illustration dessinée.
5. Dans la galerie, vous pouvez aussi masquer une photo, changer sa rubrique, sa légende et son ordre.

**Côté technique**

- Les fichiers sont dans **Supabase Storage**, bucket `photos` (créé par la migration) : lecture publique, écriture réservée au rôle admin (policies RLS), 5 Mo maximum, JPEG/PNG/WebP uniquement.
- Avant l'envoi, le navigateur redresse la photo, la réduit à 1600 px et la réencode en WebP. Cela **retire les métadonnées, dont la position GPS** des photos de téléphone.
- Après l'envoi, le serveur relit le fichier stocké (taille, signature binaire). Il supprime le fichier s'il n'est pas une vraie image, puis enregistre le lien en base.
- La base n'accepte que deux formes de chemin : un fichier du site (`/photos/…`) ou un fichier du bucket (`products/<uuid>.webp`, `gallery/<uuid>.webp`). Une URL externe est refusée, ce qui exclut les liens cassés et les images de sites tiers.
- Chaque nouveau fichier a un nom unique : le cache des images peut durer 31 jours sans risque d'afficher une ancienne version.

**Obtenir des images pour les pizzas sans photo**

Aucune banque d'images ni API de génération d'images n'est branchée dans le projet. Rien n'est configuré, et ce serait un coût et une clé secrète de plus. Par ordre de préférence :

1. **Vos photos** : le plus efficace est une séance de 30 minutes au restaurant, pizzas sortant du four, prises de dessus en lumière du jour, puis envoyées depuis la tablette dans l'espace photos.
2. **Banques d'images libres** (Unsplash, Pexels : usage commercial gratuit, sans attribution obligatoire, selon leurs licences au moment du téléchargement). Elles ont rarement la recette exacte. À marquer « Image d'illustration ».
3. **Images générées par IA** : possibles avec un outil externe (ChatGPT, Midjourney, Canva…). Vérifiez ses conditions d'utilisation commerciale et son coût, puis importez l'image comme « Image d'illustration ».

---

## À confirmer avec le restaurant

Ces données sont en base mais **ne sont pas validées commercialement**. Les produits concernés ont `to_confirm = true` dans la table `products`.

**Horaires**
- [ ] **Horaires d'ouverture : PROVISOIRES.** Le seed met tous les jours 11:00–14:00 et 18:00–22:30 (`opening_hours_provisional = true`). Ce ne sont pas les horaires du restaurant.
- [ ] Délai minimum de préparation (20 min) et pas des créneaux (10 min).

**Coordonnées**
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
- [ ] Les photos visibles sur Uber Eats n'ont **pas** été reprises. Les captures sont trop petites, avec des boutons par-dessus, et les droits ne sont pas clairs (photographe de la plateforme ou du restaurant). La photo « La 5 fromages » d'Uber Eats montre d'ailleurs d'autres pizzas. Demandez au restaurant les fichiers originaux, puis importez-les dans l'espace photos.

**Produits volontairement non ajoutés** (vus sur la caisse ou dans le frigo) : Indienne (12 €), Hawaï (2 €), Dada, Schweppes.

---

## Limites connues

- Seuls les numéros français (fixe ou mobile) sont acceptés.
- Une commande sur place ou par téléphone ne passe pas par le site. Elle peut être saisie dans la caisse comme avant.
- Le temps réel nécessite que la table `orders` soit dans la publication `supabase_realtime`. La migration s'en charge. En secours, la tablette se rafraîchit chaque minute.
- RGPD : prénoms et téléphones sont stockés. Il faut prévoir des mentions légales et une durée de conservation (par exemple supprimer les commandes de plus de 12 mois).
