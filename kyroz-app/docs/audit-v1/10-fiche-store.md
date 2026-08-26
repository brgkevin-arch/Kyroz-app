# Fiche store — textes FR, extraits de STORE-RELEASE.md

> Extrait verbatim de `STORE-RELEASE.md:547-644`, préparé pour l étape 10.

> ⚠️ Il n existe **pas** de `store.config.json` : ces textes ne sont versionnés qu ici, et rien ne les
> compare à ce qui est réellement saisi dans les consoles (constat 03-08).

## 3. Fiche store — textes FR (à copier-coller)

**Nom** (30 car. max) : `Kyroz`

> **ASO — 25 des 30 caractères du Nom ne portent aucun terme de recherche (2026-08-18).**
> Apple pèse le champ Nom plus lourd que le sous-titre et que les mots-clés pour le
> classement recherche ; un nom mono-mot ne capte donc rien. **Recommandation** :
> `Kyroz — Plan repas & macros` (27 car.) — decision de MARQUE, pas technique, donc pas
> appliquée ici tant que tu n'as pas tranché. Le sous-titre couvre déjà « repas »/« macros » ;
> les reprendre dans le nom coûte un peu de budget caractères mais rend la fiche lisible
> d'un coup d'œil pour une marque encore inconnue — un arbitrage, pas un calcul.

**Sous-titre Apple / titre court** (30 car. max) :
`Repas calés sur tes macros`

**Texte promotionnel Apple** (170 car., modifiable sans review) :
`Ton plan de repas hebdo, précis au gramme, adapté à ton objectif et ton sport. Gratuit, sans compte requis pour démarrer.`

**Description** (App Store + Google Play) :
```
Kyroz calcule ton plan de repas de la semaine, précis à la macro près, à partir
de ton profil : objectif (sèche, maintien, prise de masse), sport, préférences et
régime. Pas de blabla : un plan crédible dès le premier jour.

• Plan 7 jours généré automatiquement, ajusté à tes calories et tes protéines
• 512 recettes, adaptées à ton régime (végétarien, vegan, sans gluten, sans
  lactose, sans porc, halal, pescétarien)
• Quantités ajustées automatiquement pour tomber sur tes macros
• Liste de courses (qui déduit ce que tu as déjà) + réserve, le frais et le sec
• « Recale ma journée » : un imprévu, un repas sauté ? Le plan se réajuste
• Suivi de série pour tenir le rythme
• 100 % gratuit sur le cœur, fonctionne hors-ligne

Kyroz est conçu pour des adultes en bonne santé. Ces informations ne remplacent
pas l'avis d'un médecin ou d'un diététicien-nutritionniste.
```

⚠️ **Le nombre de recettes est écrit À LA MAIN ici** — c'est du texte que tu colles dans
la fiche, rien ne peut le calculer. **Il a déjà dérivé DEUX fois** : annoncé **314** pour
un catalogue de **466** (corrigé le 2026-08-01), puis **466** pour un catalogue de **512**
(corrigé le 2026-08-03, après les vagues B7→B9). L'avertissement « à revérifier après
CHAQUE vague » était déjà écrit ici la première fois — et il n'a pas suffi.
➡️ **Le mesurer, pas le relire** : `npm run mesure:couverture`, ou
`node -e "console.log(require('./Recette/recettes-kyroz.json').recipes.length)"`.
Un chiffre faux dans une fiche de store est une allégation fausse, pas une coquille.
✅ **Re-mesuré le 2026-08-18** : toujours **512**. Rien n'a dérivé depuis le 2026-08-03.

**Description courte Google Play** (80 car. max — champ distinct du texte promotionnel
Apple, affiché SOUS le titre avant le « en savoir plus », **manquait à cette fiche**) :
`Ton plan de repas 7 jours, précis à la macro, selon ton objectif et ton sport.` (78 car.)

**Mots-clés Apple** (100 car., séparés par des virgules, sans espaces) :
`rééquilibrage alimentaire,macros,musculation,seche,prise de masse,proteine,calories,nutrition,regime`

> ⚠️ **Compte mesuré à EXACTEMENT 100/100** (`[...chaine].length`, pas une lecture à l'œil)
> — zéro marge. Toute retouche ultérieure devra couper avant d'ajouter ; `regime` est le
> premier candidat. Revu le 2026-08-18 :
> - **Retirés** : `fitness` (redondant avec la catégorie Santé et forme elle-même, très
>   concurrentiel) · `sport` (trop générique pour capter une recherche précise) ·
>   `meal prep` (terme anglophone, plus faible sur un marché francophone que l'équivalent
>   français) · `repas` (déjà couvert par le SOUS-TITRE — le répéter dans les mots-clés
>   n'ajoute aucun terme neuf à ce que l'algorithme indexe déjà).
> - **Ajoutés** : `rééquilibrage alimentaire` — la formulation la plus cherchée en France
>   pour « mieux manger durablement », plus large que « régime » et sans sa connotation ;
>   absente de toute la fiche jusqu'ici. `musculation` en toutes lettres à la place de
>   l'abréviation `muscu` seule — plus long mais plus cherché tel quel.
> - **Gardés** : les termes bodybuilding/nutrition à fort volume et propres à Kyroz
>   (`seche`, `prise de masse`, `proteine`, `calories`, `macros`, `nutrition`) et `regime`
>   — connotation à éviter dans les textes VISIBLES (§10 CLAUDE.md), mais ce champ est
>   invisible à l'utilisateur : il ne sert qu'à matcher une recherche, pas à donner le ton.
> - **Non résolu par manque de place** : `objectif`, pourtant central à la promesse Kyroz
>   (objectif daté). Retenu pour le NOM plutôt que les mots-clés, cf. note ci-dessus — un
>   mot seul et abstrait a peu de valeur de recherche isolé, il porte mieux dans un titre.

**Catégorie** : Santé et forme (Health & Fitness). Secondaire (Google) : Nutrition.

**URL politique de confidentialité** (obligatoire, déjà en ligne, HTTP 200) :
`https://kyroz.app/legal.html`

> Changée le 2026-08-18. L'ancienne (`https://brgkevin-arch.github.io/Kyroz-app/legal.html`)
> reste servie et valide, mais elle expose un **pseudo personnel** dans un champ public de
> fiche produit. La nouvelle est sur le domaine de la marque et sert le **même fichier
> généré** depuis `constants/legal.ts`.
>
> ⚠️ **Ne PAS déplacer le site Pages de l'app derrière un domaine personnalisé** pour
> arriver au même résultat — et ce n'est pas une précaution théorique : ça a été fait le
> 2026-08-18, et **le site public n'a plus rien chargé** pendant des heures. Un domaine
> personnalisé s'applique à un SITE, jamais à un fichier : tout le Pages suit,
> `confirme.html` compris — l'URL de retour de confirmation d'e-mail, codée en dur
> (`lib/emailConfirmation.ts`), gravée dans les binaires déjà distribués et inscrite en
> liste blanche Supabase. Le domaine a été retiré le soir même.
> ➡️ La valeur à déclarer reste `https://kyroz.app/legal.html`, servie par le dépôt
> `kyroz-site`, où rien ne l'écrase.

**Support / contact** : `contact@kyroz.app`

---
