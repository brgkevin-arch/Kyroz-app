# Comparer une maquette Claude Design avec l'app

But : voir la maquette et l'app **côte à côte**, écran par écran, sans toucher au code de
l'app. C'est l'étape « avant/après » — on décide ensuite quoi garder.

## Pourquoi ce n'est pas un copier-coller

Claude Design produit du **HTML/CSS**. Kyroz est du **React Native** (Expo). Il n'y a pas de
`className`, pas de feuille de style : les styles sont des objets JavaScript. Une maquette ne
peut donc pas « tourner dans l'app ». Elle sert de **référence visuelle** posée à côté.

Le design system réel de l'app vit dans deux fichiers :

- `kyroz-app/constants/theme.ts` — couleurs, typo, espacements, rayons
- `kyroz-app/components/ui.tsx` — les briques partagées

C'est là que le design atterrira *si* on décide de le porter (autre chantier, autre branche).

## La procédure

### 1. Sortir la maquette de la conversation

Dans la conversation où la maquette a été faite, sur l'artifact : bouton de téléchargement →
récupérer le fichier `.html`.

Un seul fichier autonome attendu (le CSS et le JS sont dedans). S'il y a plusieurs écrans dans
plusieurs artifacts, télécharger chacun.

### 2. Poser le fichier

Déposer le `.html` dans `mockups/` à la racine du dépôt.

Plusieurs écrans → un fichier par écran, nommés lisiblement :

```
mockups/
  accueil.html
  journee.html
  recette.html
```

### 3. Lancer les deux serveurs

Deux serveurs, déjà configurés dans `.claude/launch.json` :

| Quoi        | Config         | Port | URL                     |
| ----------- | -------------- | ---- | ----------------------- |
| La maquette | `mockups`      | 3002 | `localhost:3002/<f>.html` |
| L'app       | `kyroz-web`    | 8090 | `localhost:8090`        |

**Sessions parallèles.** Si une autre session Claude tourne déjà sur le dépôt, elle occupe
probablement déjà ces deux ports. Ne pas en relancer un deuxième : ouvrir directement l'URL,
le serveur existant sert le même dossier.

### 4. Comparer

Écran par écran : la maquette d'un côté, l'app de l'autre, au même format d'écran (mobile
375 px de large). On note les écarts réels — couleur, espacement, taille de texte, hiérarchie —
pas les impressions.

Comparer **à mode égal** : si l'app est en sombre, prendre la colonne SOMBRE de la maquette.
Sinon on compare deux choses différentes et tous les écarts de couleur sont faux.

## Pièges rencontrés

- **Écran vide après un scroll piloté en JS.** Un `window.scrollTo()` sur le document de
  maquette laisse une zone repeinte en uni : le DOM contient bien les éléments, mais la
  capture ressort vide. Recharger la page, puis scroller au geste. Ne pas conclure « la
  maquette est cassée » sur une capture blanche.
- **La largeur de fenêtre coupe la colonne SOMBRE.** Les cadres font 402 px et sont posés
  côte à côte : sous ~1400 px de large, le téléphone de droite est tronqué.
- 🔴 **`requestAnimationFrame` ne tourne PAS dans le panneau navigateur** — mesuré le
  2026-08-04 : **0 frame en 7,2 secondes**. Toute animation (`Animated.timing`, transition
  CSS, fondu) démarre, rend une frame ou deux, puis se **fige** à une valeur intermédiaire.
  ⚠️ **Le piège n'est pas la capture vide, c'est la capture PLAUSIBLE** : une opacité figée
  à 0,03 ressemble exactement à une animation cassée, et j'ai « corrigé » un
  `useNativeDriver` qui n'avait rien de fautif avant de mesurer l'instrument.
  ➡️ Devant une animation qui ne se termine pas, **compter les frames d'abord** :
  ```js
  window.__n = 0; const b = () => { window.__n++; requestAnimationFrame(b); }; requestAnimationFrame(b);
  // puis, dans un SECOND appel : window.__n
  ```
  Si le compteur reste à 0, c'est le panneau, pas le code. On vérifie alors l'**état final**
  (forcer l'opacité à 1 dans le DOM pour juger le rendu) et le **déclencheur** séparément
  (la valeur a-t-elle quitté 0 au bon seuil ?), sans jamais conclure sur le mouvement.

## À savoir

- `mockups/` n'est **pas** du code de production. Ne pas le committer : c'est un brouillon de
  travail, pas un livrable. (Pas de `.gitignore` à la racine du dépôt aujourd'hui — donc git
  verra ce dossier tant qu'on ne l'ignore pas explicitement.)
- La comparaison ne modifie rien. Tant qu'on reste sur cette procédure, l'app est intacte.

## Ce que cette procédure a donné (2026-08-03)

Appliquée aux maquettes Claude Design, elle a servi à refondre les **5 écrans**.
Deux enseignements qui valent pour la prochaine fois :

- **La DA de la maquette était DÉJÀ celle du thème** — palette système iOS des deux
  côtés, 4 valeurs divergentes seulement. Le vrai chantier n'était pas la palette
  mais les **couleurs de macro**, employées à 32 endroits dont des listes où il n'y
  a aucune proportion à comparer. ➡️ Comparer les TOKENS avant de conclure « il faut
  tout refaire ».
- **Une couleur relevée sur une maquette se VÉRIFIE à l'écran.** Le 3ᵉ gris clair de
  la maquette (`#DDDDDF`) tombait à 1,21:1 contre le fond : le segment « lipides »
  était invisible. Juste dans un cadre de 402 px, illisible sur le vrai fond.
