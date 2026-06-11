# Kyroz

App mobile (React Native / Expo Router) de plans repas macro-précis pour hommes 18–35 pratiquant du sport. Le cœur (génération de plan 7 jours, recettes, liste de courses) tourne 100 % en local, sans clé API.

## 🧪 Tester l'app (pour un testeur)

Ouvre simplement ce lien dans le navigateur de ton téléphone — rien à installer :

> **https://brgkevin-arch.github.io/Kyroz-app/**

*(Le lien devient actif une fois le dépôt publié sur GitHub et GitHub Pages activé — voir ci-dessous.)*

Crée un compte (email) à l'arrivée, complète l'onboarding, et le plan se génère tout seul.

## 💻 Lancer en local (pour développer)

```bash
cd kyroz-app
npm install
npm run web      # ouvre la version web sur http://localhost:8081
npm test         # lance les tests unitaires (vitest)
```

## Structure

- `kyroz-app/` — l'application Expo (écrans dans `app/`, logique dans `lib/`, UI dans `components/`)
- `kyroz-app/lib/planEngine.ts` — moteur de génération de plan (local, macro-précis)
- `.github/workflows/deploy.yml` — build web + déploiement automatique sur GitHub Pages à chaque push sur `main`
