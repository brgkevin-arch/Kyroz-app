# Kyroz

App mobile (React Native / Expo Router) de plans repas macro-précis pour pratiquant de sport. Le cœur (génération de plan 7 jours, recettes, liste de courses) tourne 100 % en local, sans clé API.

iPhone **et iPad**. La mise en page tablette passe par `useLayout()` — cf. `kyroz-app/CLAUDE.md` §8.

> ⚠️ L'iPhone est en portrait, **pas l'iPad** : `orientation: "portrait"` dans `app.json` ne
> s'applique qu'au téléphone. Dès `supportsTablet: true`, Expo écrit les quatre orientations
> pour l'iPad, parce que le multitâche iPadOS l'exige — vérifié sur le manifeste généré, pas
> sur la config. Apple teste donc l'app **en paysage** sur iPad.

## 🧪 Tester l'app (pour un testeur)

Ouvre simplement ce lien dans le navigateur de ton téléphone — rien à installer :

> **https://brgkevin-arch.github.io/Kyroz-app/**

Crée un compte (email) à l'arrivée, complète l'onboarding, et le plan se génère tout seul.

> Pour publier une mise à jour : dans **GitHub Desktop**, **Commit** puis **Push** → le site se redéploie tout seul (~2 min). Ne jamais cliquer « Re-run all jobs » dans Actions (ça rejoue une vieille version).

## 💻 Lancer en local

```bash
cd "kyroz-app"
npm install
npm run web      # version web → http://localhost:8081 (hot reload)
npm run ios      # simulateur iOS (rendu le plus fidèle, nécessite Xcode)
npm test         # tests unitaires (vitest)
```

Pour arrêter : `Ctrl + C` dans le terminal. Page blanche / cache : `npx expo start --web --clear`.
Les variables Supabase vivent dans `kyroz-app/.env.local` (non versionné, c'est normal).

## Structure

- `kyroz-app/` — l'application Expo (écrans dans `app/`, logique dans `lib/`, UI dans `components/`)
- `kyroz-app/lib/planEngine.ts` — moteur de génération de plan (local, macro-précis)
- `.github/workflows/deploy.yml` — build web + déploiement automatique sur GitHub Pages à chaque push sur `main`

## Où vivent les documents

Rangé le **2026-08-30**. Trois états, trois endroits — et on ne laisse rien entre deux.

| Endroit | Ce qu'on y met |
|---|---|
| **Carte des docs**, en tête de `kyroz-app/AGENTS.md` | Les **21 docs vivants**. Relus, jamais datés dans leur nom. C'est la porte d'entrée : on la lit avant de chercher un fichier |
| `kyroz-app/docs/JOURNAL.md` | **L'histoire** — ce qui a été livré, avec le raisonnement. Sorti d'`AGENTS.md` le 2026-08-30 : il en pesait 70 % pour quelque chose qu'on ne relit jamais afin de décider |
| `kyroz-app/docs/procedures/` | Les procédures **en cours** — celles qui demandent un accès Apple, un dashboard, une décision. Une étape à la fois |
| `kyroz-app/docs/archive/` | Les **traces** : travail livré, décision annulée, question devenue sans objet. Date en préfixe + en-tête `ARCHIVÉ` |

Deux dossiers vivent au-dessus de l'app, parce qu'ils ne lui appartiennent pas :
`docs/briefs/` (les briefs autonomes pour Claude chat, datés) et
`docs/politique-confidentialite-kyroz.md` (**généré** depuis `kyroz-app/constants/legal.ts`
— ne pas l'éditer à la main).

> 🔍 **Le test qui dit si le rangement a tenu**, à rejouer de temps en temps : lister les
> `.md` versionnés, retirer ce que la carte annonce et ce que les étagères contiennent.
> **Ce qui reste est ce que personne n'a classé.** Il a rendu **22 documents (259 Ko)** le
> 2026-08-30 — la règle datait pourtant du 2026-07-30, elle n'avait juste jamais été
> re-mesurée.
