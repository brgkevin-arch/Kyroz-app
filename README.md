# Kyroz

App mobile (React Native / Expo Router) de plans repas macro-précis pour pratiquant de sport. Le cœur (génération de plan 7 jours, recettes, liste de courses) tourne 100 % en local, sans clé API.

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
