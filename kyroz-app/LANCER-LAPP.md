# Lancer l'app Kyroz en local (note perso)

## Le plus simple — dans le navigateur (Safari)

1. Ouvre le **Terminal**.
2. Va dans le dossier de l'app :
   ```
   cd "/Users/kevinberger/Kyroz Code/kyroz-app"
   ```
3. Lance le serveur :
   ```
   npm run web
   ```
4. Attends le message `Waiting on http://localhost:8081`, puis ouvre
   **http://localhost:8081** dans Safari.

➡️ Le code se recharge tout seul à chaque sauvegarde (hot reload). Pas besoin de relancer.

## Pour arrêter

Dans le Terminal où il tourne : **Ctrl + C**.

## Variantes utiles

| Commande | Effet |
|---|---|
| `npm run web` | Ouvre dans le navigateur (port **8081**) |
| `npm run ios` | Ouvre dans le **simulateur iOS** (rendu le plus fidèle ; nécessite Xcode) |
| `npm start` | Menu Expo : scanne le QR code avec l'app **Expo Go** sur ton iPhone |

## Si ça coince

- **« Port 8081 déjà utilisé »** : un serveur tourne déjà. Soit tu réutilises celui-là,
  soit tu le coupes (Ctrl+C dans son Terminal) avant de relancer.
- **Page blanche / erreur** : coupe (Ctrl+C) et relance. Si ça persiste, vide le cache :
  ```
  npx expo start --web --clear
  ```
- **Variables manquantes (Supabase…)** : vérifie que le fichier `.env.local` existe
  bien dans `kyroz-app/` (il n'est pas versionné, c'est normal).

## Où voir le streak

L'écran **Plan** (1er onglet) montre le bandeau de progression « 🔥 → 7 jours »,
et l'écran **Profil** la carte détaillée. La célébration s'affiche quand tu franchis
un palier (3, 7, 14… jours). ⚠️ Il faut être connecté + avoir fait l'onboarding
pour arriver sur ces écrans.
