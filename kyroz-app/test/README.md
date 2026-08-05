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

### Ce qui a dû être réparé le 2026-08-05 — et la règle qui en sort

Deux séquences décrivaient des écrans qui avaient bougé, et **les 5 scripts s'arrêtaient
au portail de dépistage santé** :

- `passScreening` cherchait l'attestation AVANT de répondre aux questions. L'écran ne la
  rend qu'une fois les DEUX conditions renseignées : la séquence est **Non · Non ·
  attestation · Continuer** ;
- `runOnboarding` remplissait un champ d'**âge** supprimé le 2026-08-02 — l'étape 2 saisit
  une **date de naissance** (Jour / Mois / Année). D'où `birth: { d, m, y }` dans les
  personas, et plus de champ `age` : il ne remplirait plus rien.

**SECONDE RÈGLE : une séquence périmée doit le DIRE.** Le défaut coûteux n'était pas la
péremption — c'était le silence. Une étape qui ne passe plus appelle `panne()` (marche
nommée, texte réellement à l'écran, capture `test/qa/panne-*.png`), chaque « Continuer »
exige une preuve d'avancement (`etapeCourante`, qui lit « ÉTAPE n / 6 »), et `bilanPannes()`
rend un **code de sortie non nul** en fin de script.

> Ne pas « réparer » un script en enchaînant des clics jusqu'à ce que ça passe : un clic
> sans preuve d'avancement, c'est exactement ce qui a permis à la panne de dormir.

### Le verrou qui prévient AVANT la prochaine passe

Les deux réparations ci-dessus corrigent le passé. Ce qui empêche la troisième, c'est
**`lib/__tests__/harnaisEcrans.test.ts`** : il lit les écrans du dépôt et vérifie que
chaque libellé, placeholder et clé de stockage dont les scripts dépendent existe
toujours — des deux côtés. Renommer un champ dans un écran fait rougir **`npm test` le
jour même**, avec le nom du script qui va casser, sans lancer ni navigateur ni serveur.

⚠️ **Ce qu'il ne sait PAS faire** : dire que l'ENCHAÎNEMENT est encore juste. C'est
précisément le défaut du 2026-08-05 — « Je confirme… » existait toujours, mais il fallait
désormais répondre aux questions avant. La preuve du parcours reste une passe Playwright ;
le test ferme le chemin par lequel la dérive est réellement arrivée, un texte changé d'un
côté sans l'autre.

## Quatre pièges qui font mentir un rapport

0. **« Écran introuvable » est presque toujours FAUX.** L'écran existe ; c'est le parcours
   qui ne l'atteint plus. Avant d'accuser l'app, lire le bilan des blocages en fin de
   sortie et la capture `test/qa/panne-*.png` : ils nomment la marche qui a cassé.
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
3. **L'auth anonyme s'allume et s'éteint depuis le dashboard, hors du dépôt.** Tous les
   scripts d'ici passent par `guestLogin` : provider coupé = **tout échoue d'un coup**,
   et ça ne ressemble pas au rate-limit du point 2 (aucune session, pas un 429). Ce
   réglage a été mesuré **trois fois en deux jours avec trois réponses différentes**
   (ouvert 07-31, fermé 08-01, ouvert 08-01) — donc **aucune note écrite ne peut être
   tenue pour à jour, y compris celle-ci.** Avant de conclure que l'app est cassée,
   relancer la mesure :

   ```
   curl -s "$SUPABASE_URL/auth/v1/settings" -H "apikey: $ANON_KEY" | grep anonymous
   ```

   `external_anonymous_users: false` → ce n'est pas l'app, c'est le réglage. La sortie
   durable serait un compte de test dédié (`storageState` réutilisé), qui ferait cesser
   cette dépendance.
