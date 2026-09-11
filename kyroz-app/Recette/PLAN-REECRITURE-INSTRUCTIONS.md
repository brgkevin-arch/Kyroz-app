# Réécrire les recettes qui n'expliquent rien — plan par lots

> Ce document tient tout seul. Une session qui l'ouvre sans rien savoir du chantier doit
> pouvoir livrer le lot suivant sans reposer une question.
> Ouvert le 2026-09-09. **L1 et L2 livrés, L3 → L6 à faire.**

---

## 1. Le défaut, en une phrase

Une recette demande une **cuisson** et n'en dit **rien** : ni durée, ni feu, ni température,
ni signe permettant de savoir quand s'arrêter. On appelle ça une recette **muette**.

Ce que l'utilisateur lit aujourd'hui sur `rep129`, servie 96 fois sur 240 semaines simulées :

> Cuire les nouilles.
> Sauter tofu et légumes, lier à la sauce cacahuète.

Ce qu'il lit sur une recette de la vague B4, écrite six semaines plus tard :

> Rince le riz complet, puis fais-le cuire 25 minutes à couvert et à feu doux dans deux fois
> et demie son volume d'eau salée.

Ce n'est pas un défaut réparti : c'est une **méthode de génération périmée**, figée dans les
vagues `fondation`, `2026-06-19-vegan` et `2026-07-22-sans-gluten`. Les vagues B1 à B9
(préfixe `2026-08`) sont à **zéro** recette muette, sur 176 recettes.

---

## 2. La mesure — et pourquoi ce n'est PAS « le nombre d'étapes »

```bash
npm run mesure:instructions            # tableau par vague, par créneau, priorités
npm run mesure:instructions -- --liste # la liste complète des muettes
```

Le script (`scripts/mesure-instructions.ts`) croise **deux mesures indépendantes**, et c'est
ce croisement qui fait sa valeur :

1. **la cuisson est déduite des INGRÉDIENTS** (`basis: dry` / `raw`, plus les œufs, moins les
   flocons d'avoine qui se mangent crus), **jamais du texte**. Sinon une recette se
   blanchirait en supprimant le mot « cuire », et une réécriture qui ajoute « fais chauffer »
   s'auto-accuserait ;
2. **le repère est cherché dans le TEXTE** : une durée, une température, **ou** un signe
   sensoriel (« jusqu'à ce que », « doré », « al dente », « ferme sous le doigt »). Les trois
   se valent. Une durée n'est pas obligatoire là où la cuisine dit mieux avec un signe.

La logique vit dans `lib/instructionsQualite.ts`, partagée avec le garde-fou.

### L'indicateur de l'audit se trompait dans les deux sens

L'audit du bureau (`~/Desktop/kyroz-audit/audit-kyroz.md`, §3) mesurait « ≤ 2 étapes » et
comptait **197 recettes**. Ses chiffres par vague sont **exacts** — re-dérivés à l'identique,
vague par vague. Mais l'indicateur, lui, vise à côté :

| | recettes |
|---|---|
| « ≤ 2 étapes » (audit) | **197** |
| dont **sans aucune cuisson** — deux phrases y suffisent, ce sont des faux positifs | 68 |
| dont avec cuisson **mais un repère déjà présent** (« Cuire le millet 12 min. ») | 27 |
| dont réellement muettes | 102 |
| **+ recettes de PLUS de 2 étapes, pourtant muettes** — invisibles de l'audit | **37** |
| **total muettes** | **139** |

Les 37 faux négatifs sont concentrés dans `fondation`, que l'audit ne signalait qu'à 14 %.
Exemple, `rep16` : trois étapes, aucun repère.

> Cuis les pommes de terre. / Mijote la ratatouille. / Cuis le cabillaud vapeur.

**Le nombre d'étapes est une mesure de forme ; ce qui manque à l'utilisateur est de fond.**

### Ce que ça pèse dans l'assiette

C'est la mesure qui pilote la priorité : une recette jamais servie ne vaut pas le même effort
qu'une recette servie chaque semaine. Sur 240 semaines simulées (12 profils × 5 régimes ×
4 tirages, via `buildLocalPlan`), **6 720 repas** sont servis.

| | avant L1 | après L1 |
|---|---|---|
| recettes muettes | 139 / 512 | **119** |
| repas servis par une recette muette | 1 053 (15,7 %) | **359 (5,3 %)** |
| muettes jamais servies | 55 | 55 |

**20 recettes réécrites sur 139 ont retiré 66 % des repas muets.** La distribution est très
concentrée : le premier quart des muettes porte les trois quarts du problème.

### Par créneau — l'autre chose que l'audit ne dit pas

| créneau | recettes | dont cuisson | muettes (avant L1) |
|---|---|---|---|
| `repas_complet` | 280 | 273 | **121** |
| `petit_dej` | 122 | 69 | 15 |
| `collation` | 110 | 30 | 3 |

Le défaut est **un problème de repas complets**. Les collations signalées par l'audit sont
presque toutes des assemblages à froid, complets en deux phrases : les réécrire ne
produirait que du remplissage (le brief l'interdit, §4.6bis).

---

## 3. Le format visé

La référence est ce que produisent les vagues **B1 à B9**. Lis `BRIEF-GENERATION-RECETTES.md`
§4.6bis pour la règle, et deux ou trois recettes de `2026-08-02-b4-repas-denses` dans le
catalogue pour le ton.

- **4 à 7 étapes** pour un repas complet ou un petit-déjeuner ; **2 à 3** pour une collation.
- Chaque étape : une action, **sa durée ou son repère visuel**, et le **pourquoi** quand il
  évite un ratage (« laisse-le tiédir, sinon il liquéfie le fromage blanc »).
- **Tutoiement, impératif**, jamais d'infinitif.
- **Aucun tiret cadratin `—`** dans le texte lu par l'utilisateur. On écrit `:` ou on coupe la
  phrase. *(27 en subsistent dans les instructions des vagues B1-B9 : hors périmètre de ce
  chantier, à traiter à part.)*
- **Aucune durée écrite ne dépasse `temps_min`** (brief §4.5). Quand la durée vraie le
  dépasse, on **corrige `temps_min`**, on ne rabote pas la durée : le chiffre affiché doit
  être celui qu'on sert.

### Formulations canoniques, reprises telles quelles de B1-B9

| ingrédient | phrase |
|---|---|
| riz complet | « Rince le riz complet, puis fais-le cuire 25 minutes à couvert et à feu doux dans deux fois et demie son volume d'eau salée. » |
| riz basmati | « Rince le riz basmati jusqu'à ce que l'eau soit claire, puis fais-le cuire 11 minutes dans un grand volume d'eau salée et égoutte-le. » |
| quinoa | « Rince le quinoa sous l'eau froide 30 secondes pour retirer son amertume, puis fais-le cuire 12 minutes à couvert dans deux fois son volume d'eau salée. » |
| sarrasin | « Rince le sarrasin, fais-le cuire 12 minutes dans deux fois son volume d'eau salée, puis égoutte-le. » |
| nouilles de riz | « Plonge les nouilles de riz dans un grand volume d'eau bouillante, coupe le feu et laisse-les gonfler 4 minutes, puis égoutte et rince à l'eau froide pour qu'elles ne collent pas. » |
| polenta | « Verse la polenta en pluie dans quatre fois son volume d'eau salée frémissante et remue 5 minutes à feu doux, jusqu'à ce qu'elle nappe la cuillère. » |
| PST (`soja_texture`) | « Couvre la protéine de soja texturée d'eau bouillante salée, laisse-la gonfler 5 minutes puis presse-la pour l'essorer. » |
| tofu | « Presse le tofu 5 minutes entre deux feuilles de papier absorbant sous une assiette lestée : moins il est gorgé d'eau, mieux il dore. » puis « Coupe le tofu en cubes et fais-les colorer 8 minutes dans une poêle très chaude, en ne les retournant que lorsqu'une face est franchement dorée. » |
| tempeh | « Fais dorer le tempeh 3 minutes par face dans une poêle chaude à sec : c'est cette croûte qui lui enlève son amertume. » |
| patate douce rôtie | « Préchauffe le four à 210 °C. » + « Épluche la patate douce, coupe-la en cubes de deux centimètres … sans les superposer : entassés, ils cuisent à la vapeur au lieu de rôtir. » + « Enfourne 25 minutes en remuant à mi-cuisson. » |
| brocoli | « Détaille le brocoli en petits bouquets et plonge-le 4 minutes dans l'eau bouillante, puis récupère-le à l'écumoire : il doit rester vert vif et croquant. » |
| edamame | « Fais cuire les edamame 5 minutes à l'eau bouillante salée, puis égoutte-les et écosse-les si besoin. » |
| bœuf haché | « Ajoute le bœuf haché, écrase-le à la spatule et laisse-le colorer 5 minutes sans trop remuer : il doit brunir, pas bouillir. » |
| champignons | « Jette les champignons dans une poêle très chaude et laisse-les rendre leur eau 5 minutes sans remuer, jusqu'à ce qu'ils soient dorés. » |
| tortilla | « Passe la tortilla 20 secondes à la poêle chaude pour l'assouplir : elle roulera sans casser. » |

Répéter ces phrases d'une recette à l'autre est **assumé** : B1 le fait déjà (la phrase du riz
complet apparaît telle quelle dans cinq recettes). C'est un mode d'emploi, pas de la
littérature.

---

## 4. Les cinq pièges, tous rencontrés sur L1

1. **Une instruction ne peut citer QUE des ingrédients servis** (brief §4.6). Sel, poivre,
   citron, épices et herbes sont tolérés (pas de `ref`). ⚠️ **Ne jamais introduire un
   fantôme neuf.** Plusieurs recettes en portent déjà un (houmous dans `rep118`, curry rouge
   dans `rep166`, teriyaki dans `rep147`) : on les laisse tels quels, on n'en ajoute pas.
   Un chantier séparé traite ceux qui font mentir un régime.
2. **`temps_min` peut être plus court que la cuisson réelle.** Quatre cas sur L1 : `rep147`
   et `rep150` annonçaient 22 minutes pour un riz complet qui en prend 25 ; `rep41` et
   `rep149` annonçaient 25 et 28 minutes pour une patate douce rôtie. Corrigés à 30 et 35.
   **Vérifier systématiquement** avant d'écrire une durée.
3. **La pesée commande le verbe** (`lib/__tests__/legumineuses.test.ts`). Un `ref` `basis: dry`
   ne se décrit jamais comme « déjà cuit » ; un `ref` `*_conserve` ne se « cuit » pas, il se
   « mijote ». Écrire « égoutte et rince » sur une conserve, jamais « cuis ».
4. **Le nom peut promettre ce que la recette ne contient pas.** `rep104` s'appelle
   « Curry pois chiches – patate – **riz** » et **ne contient aucun riz** : les instructions
   ne doivent surtout pas en parler. Signalé ici, à traiter par le chantier des noms.
5. **Certaines recettes servent un ingrédient cru qui devrait cuire.** Trouvé par la sonde,
   hors du périmètre de l'audit : `col09` « Galettes de riz – fromage frais – dinde » sert
   60 g d'**escalope de dinde crue** (`basis: raw`) sans la moindre cuisson. Ce n'est pas un
   défaut de rédaction, c'est une recette fausse. Idem `rep74`, réécrite en saumon **saisi**
   plutôt qu'en poke cru. Quand le cas se présente, **cuire**, et le dire dans la PR.

---

## 5. Le garde-fou

`lib/__tests__/instructionsMuettes.test.ts` :

- **un cliquet** : `MUETTES_MAX`, l'état constaté, qui ne peut que **descendre**. Une vague
  qui rajoute une muette fait échouer la suite. **Après chaque lot, descendre le plafond au
  nouveau constaté** et ajouter une ligne au journal des mouvements — un cliquet qu'on ne
  resserre plus ne garde rien ;
- **une règle absolue** : aucune recette d'une vague `2026-08*` (B1 → B9, et toute vague
  future) ne peut être muette. Le cliquet couvre l'ancien, cette règle verrouille le neuf ;
- **trois témoins** : si la sonde cessait de mesurer, le compteur tomberait à zéro et le
  cliquet passerait au vert en silence. Ils vérifient que la cuisson est encore détectée sur
  plus de 300 recettes, que les repères le sont sur les 20 recettes de B1-lot1, et que les
  `ref` d'exception existent encore dans la table ;
- **cinq mutations** : cas fabriqués que le test doit attraper (« Cuire le riz. »), et cas
  qu'il ne doit **pas** attraper (une durée, un repère sensoriel, un assemblage à froid).

**Vu rouge le 2026-09-09**, sur trois mutations réelles :
`rep129` remise en muette → *« le compteur passe de 119 à 120 »* ;
`cuissonRequise` neutralisée → 3 tests rouges dont le témoin de couverture ;
le détecteur de repères neutralisé → 5 tests rouges, dont la règle absolue sur B1-B9.

---

## 6. Les lots

Ordre de priorité : **servie souvent × cuisson réelle × pauvreté du texte**. Les listes sont
figées au 2026-09-09 ; `npm run mesure:instructions -- --liste` les régénère à jour.

### L1 — LIVRÉ le 2026-09-09 (20 recettes, 694 repas muets)

`rep129` `rep166` `rep76` `rep68` `rep137` `rep131` `rep128` `rep147` `pd58` `rep89`
`rep60` `rep118` `pd67` `rep104` `rep150` `rep152` `rep41` `rep149` `rep74` `rep114`

### L2 — LIVRÉ le 2026-09-11 (20 recettes)

Solde : 114 → **94** muettes ; la part de repas servis par une muette tombe de **5,2 % à 2,2 %**
(352 repas sur 6 720 → 145). `rep82` annonçait 18 minutes pour un riz complet qui en prend 25 :
`temps_min` corrigé à 30. ⚠️ `pd68` s'appelle « Pancakes banane – œuf – sans farine » : écrire
« sans farine » dans une étape fait rougir le contrôle des denrées citées, à raison. Reformuler
(« rien ne vient lier cette pâte »), ne pas ajouter d'exception.

`rep162` `pd11` `pd68` `rep09` `rep91` `rep55` `rep42` `rep82` `rep71` `rep04`
`rep85` `rep145` `rep81` `rep23` `rep102` `rep141` `rep124` `rep164` `rep161` `rep148`

⚠️ `rep55` porte aussi un nom qui promet du sésame absent : ne pas en parler dans les
instructions.

### L3 — les 20 suivantes (≈ 110 repas muets)

`rep80` `rep110` `rep88` `rep125` `rep116` `pd52` `pd36` `pd66` `rep51` `rep50`
`col09` `rep72` `rep167` `rep169` `pd77` `pd76` `rep106` `rep54` `rep65` `rep20`

⚠️ `col09` est le cas « dinde crue » du §4.5. `rep20` est un poke : trancher cru ou cuit,
comme `rep74`.

### L4 — la fin des recettes servies (24 recettes, ≈ 49 repas muets)

`rep19` `rep79` `rep97` `rep48` `rep130` `rep113` `rep117` `rep33` `pd13` `rep77`
`rep120` `rep94` `rep123` `rep96` `rep78` `rep140` `rep62` `rep73` `rep46` `rep139`
`rep47` `rep99` `pd42` `rep111`

⚠️ `rep140` et `rep47` sont traitées en parallèle par le chantier « ingrédient fantôme »
(bouillon, miso, vinaigre) : **vérifier l'état du catalogue avant de les toucher.**

### L5 et L6 — les 55 jamais servies

Aucune urgence pour l'utilisateur : sur 240 semaines simulées, le moteur ne les sert jamais.
Mais elles pèsent sur le vivier des régimes minoritaires et deviendraient servables si la
sélection changeait. À traiter en deux lots d'environ 28, **après L4**, ou à considérer comme
candidates à la suppression si `mesure:vivier` montre qu'elles n'apportent aucune famille.

Liste : `npm run mesure:instructions -- --liste`, tout ce qui est à `0×`.

---

## 7. La procédure d'un lot

1. `npm run mesure:instructions -- --liste` → confirmer la liste et les compteurs.
2. Lire les recettes visées avec leurs ingrédients (`ref`, `qty`, `basis`) et leur `temps_min`.
3. Réécrire les instructions **par remplacement de chaînes ciblé** dans
   `Recette/recettes-kyroz.json` (Python ou sed). **Jamais `json.dump` sur tout le
   fichier** : le diff deviendrait illisible.
4. Ne toucher **ni les ingrédients, ni les quantités, ni les macros**. Seul `temps_min`
   bouge, et seulement quand il ment.
5. `npx vitest run` depuis `kyroz-app/` — tout doit rester vert.
6. `npm run mesure:instructions` → **descendre `MUETTES_MAX`** au nouveau constaté et
   ajouter une ligne au journal des mouvements du test.
7. Mettre à jour ce fichier : marquer le lot livré, avec sa date et son solde.

### `ENGINE_VERSION` : NON, et voici pourquoi

Réécrire des instructions **sans toucher aux ingrédients ni aux macros** ne bumpe pas
`ENGINE_VERSION` (précédent du 2026-09-09, même famille que le renommage de la PR #247).
Trois raisons :

- rien ne change dans l'assiette : ni composition, ni macros, ni sélection ;
- bumper **régénère la semaine de tout le monde**, suivi du jour compris, pour un
  changement de texte ;
- l'écran Plan **rafraîchit déjà** la copie de recette d'un plan en cache quand elle diffère
  du catalogue (`sameRecipe` → `reAdaptMealRecipe`, `app/(tabs)/plan.tsx`). Le nouveau texte
  arrive donc chez les utilisateurs existants sans régénérer quoi que ce soit.

⚠️ **Ce troisième point a demandé une correction** (2026-09-09) : `sameRecipe` comparait le
**nombre** d'étapes, pas leur texte. Une recette réécrite au même nombre d'étapes n'aurait
jamais atteint un plan en cache — réécrite pour personne. La comparaison porte désormais sur
le contenu.

**En revanche, si un lot change une composition** (le cas « dinde crue » pourrait justifier
d'ajouter un ingrédient), le bump redevient obligatoire, avec son entrée de changelog.
