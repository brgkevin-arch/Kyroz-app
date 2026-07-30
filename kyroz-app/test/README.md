# `test/` — parcours Playwright (QA manuelle assistée)

> À ne pas confondre avec `lib/__tests__/` : **ces scripts ne tournent pas dans `npm test`.**
> Vitest ne regarde que `lib/__tests__/**/*.test.ts`. Ici, on pilote un vrai navigateur
> contre l'app web, pour voir et filmer ce que Vitest ne peut pas voir.

## Lancer

Il faut le serveur web en marche (`npm run web`), puis :

```bash
npm run qa:full          # 4 personas, onboarding complet, rapport chiffré
npm run qa:deep          # Frigo + tous les sous-écrans du Profil, captures
npm run qa:settings      # sous-écrans de réglages seuls (plus rapide)
npm run qa:walkthrough   # vidéo de parcours
```

| Variable | Défaut | Rôle |
|---|---|---|
| `KYROZ_URL` | `http://localhost:8090` | adresse du serveur web |
| `KYROZ_HEADLESS` | *(non posée)* | `1` = sans fenêtre, plus rapide |

Sorties : captures et rapports JSON dans `test/qa/`, vidéos dans `test/video/`.
Supprimer `test/qa/session.json` pour repartir d'une session vierge.

Première utilisation : `npx playwright install chromium`.

## `_harness.mjs` — pourquoi il existe

Ces scripts ont pourri entre juin et juillet 2026 : chacun recopiait les mêmes faits
volatils (chemin **absolu** du dépôt, port, enchaînement des écrans). Un renommage de
dossier les a tous cassés d'un coup, en silence. Ce qui a dû être réparé le 2026-07-30 :

- chemins codés en dur vers `/Users/kevinberger/Kyroz Code/…` → dérivés de `import.meta.url` ;
- port 8081 → 8090, surchargeable par `KYROZ_URL` ;
- `walkthrough-auth` et `qa-deep` attendaient un **login manuel de 3 minutes** → connexion invité ;
- l'onboarding est passé de 10 à 7 étapes (l'étape « récap » a sauté le 2026-06-20) ;
- le **portail de dépistage santé** s'interpose désormais avant l'étape 1 ;
- la **visite guidée** et la carte de **consentement analytics** interceptent tous les
  clics à l'arrivée sur le plan — les scripts déclaraient chaque écran « introuvable »
  alors qu'ils n'avaient jamais pu quitter l'écran Plan ;
- les sous-écrans du Profil sont des `Sheet`, pas des routes : `page.goBack()` ne les
  ferme pas.

**Règle** : aucun chemin, port ou libellé d'écran dans les scripts appelants. Tout
passe par `_harness.mjs`.

## Deux pièges qui font mentir un rapport

1. **`getByText('Plan')` est insensible à la casse** — le bouton « Générer mon plan »
   le satisfait. Un script pouvait donc annoncer « écran Plan atteint » sans plan.
   La preuve retenue est le plan **persisté** (`plannedMeals()`).
2. **Supabase plafonne la création d'invités** (429 `over_request_rate_limit`, par
   heure et par IP). Enchaîner les passes fait échouer des personas *sans que l'app
   ait quoi que ce soit à se reprocher* — `qa-full` le nomme explicitement.

   Chaque persona coûte un invité. Pour tenir dans le quota, `qa-full` accepte un
   filtre : `node test/qa-full.mjs H1 H2` puis `node test/qa-full.mjs F`.
   Réutiliser **un seul** invité pour les quatre ne marcherait pas : un contexte
   neuf n'a pas de profil local, `hydrateFromCloud` fait alors `pull_cloud` et le
   persona suivant hériterait du profil du précédent en sautant l'onboarding.
