# Pizza Milano

Site de la pizzeria Pizza Milano (SAS MILANO PIZZA 22), 3 rue du Maréchal Foch, 22000 Saint-Brieuc.

## Organisation du dépôt

```
Pizza Milano/
└── création de site web/        ← le site (Next.js) et sa base de données
    ├── src/                     ← pages, composants, logique serveur
    ├── public/                  ← photos, logo, image de partage
    ├── supabase/
    │   ├── migrations/          ← structure de la base, sécurité (RLS), fonctions
    │   ├── seed.sql             ← carte, horaires et coordonnées de départ
    │   └── config.toml          ← réglages de la CLI Supabase (aucun secret)
    └── README.md                ← documentation technique complète
.github/
├── workflows/
│   ├── supabase-base-de-donnees.yml  ← GitHub applique la base sur Supabase
│   └── verification.yml              ← lint + build à chaque envoi
└── dependabot.yml                    ← mises à jour de sécurité mensuelles
```

## Comment ça s'enchaîne

1. Le code est envoyé sur la branche `main` de ce dépôt.
2. **Vérification du site** : GitHub lance le lint et le build.
3. **Supabase : base de données** : si `supabase/migrations/` a changé, GitHub applique les nouvelles migrations sur le projet Supabase (`supabase db push`).
4. Vercel (relié au dépôt, dossier racine `Pizza Milano/création de site web`) met le site en ligne.

## À régler une seule fois (5 minutes)

Dans ce dépôt GitHub : **Settings > Secrets and variables > Actions**.

| Type | Nom | Où le trouver |
|---|---|---|
| Secret | `SUPABASE_ACCESS_TOKEN` | supabase.com > avatar > **Account preferences > Access Tokens** > Generate new token |
| Secret | `SUPABASE_DB_PASSWORD` | Mot de passe de la base choisi à la création du projet (réinitialisable dans **Project Settings > Database**) |
| Variable | `SUPABASE_PROJECT_ID` | Supabase > **Project Settings > General > Project ID** |

Ensuite : **Actions > Supabase : base de données > Run workflow**.

- Base **vide** (nouveau projet) : cochez « Envoyer aussi seed.sql ».
- Base **déjà créée à la main** dans le SQL Editor : cochez « Base déjà créée à la main », sinon les migrations seraient rejouées.

Tant que `SUPABASE_PROJECT_ID` n'est pas renseigné, le workflow ne fait rien.

### Option : l'intégration GitHub de Supabase

Supabase peut aussi lire ce dépôt directement : **Project Settings > Integrations > GitHub**, choisir ce dépôt et indiquer comme dossier Supabase `Pizza Milano/création de site web/supabase`. N'activez qu'une des deux méthodes pour la production, pas les deux.

## Protection des données

- Aucun secret dans le dépôt : les clés vivent dans les secrets GitHub, Vercel et Supabase. `.env.local` est ignoré.
- `SUPABASE_SERVICE_ROLE_KEY` et `ADMIN_SESSION_SECRET` restent côté serveur (jamais `NEXT_PUBLIC_`).
- RLS activée sur toutes les tables ; prix recalculés côté serveur ; paiement au comptoir uniquement (aucune donnée bancaire).
- Espace gérant protégé par code (haché en base, verrouillage après 5 essais).
- Conseil : passez ce dépôt en **privé** (Settings > General > Danger Zone > Change visibility). Vercel et Supabase fonctionnent pareil avec un dépôt privé.

Documentation détaillée : [`Pizza Milano/création de site web/README.md`](<Pizza Milano/création de site web/README.md>).
