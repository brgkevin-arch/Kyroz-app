# Étape 6b-bis — jugement des 33 textes, et son arbitrage
Date : 2026-08-27 · Corpus : 33 textes rendus par le code (T01–T33) · Jugement : Claude.ai · Arbitrage : mesuré contre le code

> **Le document qui revient s'arbitre, il ne s'applique pas.** Ce fichier porte les deux :
> le jugement tel qu'il est revenu, et ce que la mesure en retient.

---

## 0 · Ce qui s'est passé avant

Le premier brief renvoyait au fichier `06-textes-dump.md` du dépôt. Claude.ai a **refusé de
juger** — et le refus était le bon : sans les textes sous les yeux, on invente des constats
sur des phrases inventées, sur le corpus le plus sensible juridiquement de l'app. Le brief a
été réécrit pour **contenir** ses 33 textes, rendus par le code.

➡️ « Autonome » veut dire *contient*, pas *référence*. La leçon est plus large que ce brief.

---

## 1 · Les sept questions — mesurées contre le code

Le brief demandait de poser en QUESTION ce qui dépend du comportement du code, plutôt que de
le juger. Quatre questions revenaient marquées **P0 potentiel**. Mesurées :

| # | Ce que le texte dit | Ce que le code dit | Verdict |
|---|---|---|---|
| **Q1** | T31 — « le poids relevé… c'est lui que Kyroz suit » | `logWeight` appelle `recalcProfile({…, weight_kg})` dès que la pesée est du jour (`useWeightLog.ts:104`) | ✅ **vrai** |
| **Q2** | T30 — planchers retirés au-delà de 30 % (H) / 40 % (F) | `HIGH_ADIPOSITY_PCT = { male: 30, female: 40 }` (`safety.ts:274`) | ✅ **vrai** — le « 20 % » du brief déficit est le document périmé |
| **Q3** | T09 — activité de 1,3 à 1,45 | `NEAT_PAL` : `desk 1.30 · light 1.35 · active 1.40 · physical 1.45` | ✅ **vrai** |
| **Q4** | T04 — « réservée aux 18 ans et plus » | `AGE_BOUNDS[0]` borne `basicsValid` : sous 18 ans, l'étape 2 de l'onboarding ne se quitte pas | ✅ **vrai** |
| **Q5** | T16 — « **aucun plan ne peut descendre sous ces limites** » | **44,2 % des profils ont au moins un jour sous le plancher d'énergie disponible**, jusqu'à 1 103 kcal/j (75 264 profils) | 🔴 **FAUX** |
| **Q6** | la page ne mentionne nulle part que le budget varie d'un jour à l'autre | la répartition par volume est ACTIVE ; la banque de calories, elle, est éteinte (`RYTHME_HEBDOMADAIRE_ACTIF = false`) — la prémisse était à moitié périmée | 🟠 **la moitié vivante est la même que Q5** |
| **Q7** | T26 — mention Ciqual / Licence Ouverte 2.0 | non vérifiable depuis le dépôt : reste en checklist humaine | ⏸️ |

**Trois des quatre P0 candidats étaient des textes JUSTES.** C'est le résultat le plus utile
de la passe : un jugement sur pièces produit des soupçons, et trois sur quatre tombent dès
qu'on ouvre le code. ➡️ *Poser en question ce qu'on ne peut pas vérifier est ce qui a rendu
cette passe utilisable* — la consigne avait été ajoutée au brief après le refus.

### 🔴 Q5 · le seul mensonge, et il était sur la surface qui compte le plus

T16 promettait un plancher **quotidien** que le moteur ne tient pas. Le comportement est
délibéré et mesuré (contre-audit `CA-2-02`) : le budget du jour suit la dépense du jour, la
semaine conserve son total, et l'énergie disponible est une **moyenne soutenue** — comptée en
semaines, jamais en jours. Mais le texte, lui, annonçait autre chose.

⚠️ **J'avais corrigé cette sur-généralisation dans les documents d'audit et jamais cherché
ses autres surfaces.** C'est exactement la règle que je cite sans arrêt — *un manque ne se
grep pas, il se recense par rôle* — non appliquée à mon propre correctif. Le jugement des
textes l'a trouvée parce qu'il regardait, lui, la surface servie.

**Corrigé** : T16 devient trois phrases qui disent le vrai — les limites ne sont pas des
réglages · deux d'entre elles sont infranchissables **chaque jour** (métabolisme de base,
filet absolu) · l'énergie disponible se juge sur **la semaine**. Plus un paragraphe neuf qui
explique la variation quotidienne, ce qui ferme Q6 en même temps. Les trois propriétés
énoncées sont **mesurées** : conservation 0 violation · moyenne hebdomadaire jamais sous le
plancher 0 violation · plancher quotidien dur 0 violation (`plancherServi.test.ts`).

---

## 2 · Les huit constats — retenus, amendés, ou renvoyés

| # | Constat | Arbitrage |
|---|---|---|
| **01** | La taxonomie promet « tout » et ne classe pas cinq éléments | ✅ **Corrigé** (§3 bis). Mesuré sur la source : c'était **12 sur 18**, pas 5. Tous classés, et la promesse est comptée par un test |
| **02** | T08 empile quatre règles sans ordre, et ne dit pas le cas par défaut | ✅ **Corrigé** (§3 bis). Quatre phrases dans l'ordre d'application, le cas par défaut en tête |
| **03** | T22 est la seule limite formulée comme un refus opposé à l'utilisateur | ✅ **Corrigé.** Kyroz redevient le sujet, et la porte de sortie est nommée : « sert un plan complet à la maintenance » |
| **04** | Vouvoiement (T02) et tutoiement (T33) coexistent | ✅ **Tranché : TUTOIEMENT** (décision fondateur, §3 bis). Deux occurrences seulement — l'app tutoyait déjà partout |
| **05** | Quatre textes sans ligne source (`:0`), dont trois garde-fous | ✅ **Corrigé, et la reco du jugement appliquée** : `:0` est désormais un ÉCHEC de test |
| **06** | T17 nomme le risque avant de nommer la protection | ✅ **Corrigé.** La conséquence est rattachée au plancher, pas au lecteur |
| **07** | « Zone basse » non définie, deux compteurs de semaines sans lien | ✅ **Corrigé.** La zone est définie à sa première occurrence, et les deux compteurs sont dits indépendants |
| **08** | T03 et T32 : deux variantes d'une phrase obligatoire | ✅ **Corrigé.** Le `DISCLAIMER` s'aligne sur « ou **d'un** diététicien-nutritionniste ». ⚠️ Il entre dans l'empreinte du texte légal (injecté au §4 des CGU) : empreinte reportée, date inchangée — l'OTA du 27 n'est pas partie |

### Ce que le jugement a vu que je n'avais pas vu

Le constat **05** est le meilleur : quatre textes du dump portaient `:0` — mon générateur
n'avait pas su les rattacher à une ligne — et **trois sur quatre décrivaient des garde-fous
de sécurité**. Le jugement a nommé la catégorie exacte où ça coûte le plus cher, et proposé
la bonne réponse : faire de `:0` un échec plutôt qu'une valeur acceptée.

⚠️ **La résolution a demandé quatre versions**, et aucune n'a été trouvée en relisant :
un préfixe du texte rendu ne matche pas un gabarit commençant par une interpolation · une
regex sur les guillemets casse sur les apostrophes échappées (les `:0` sont passés de 4 à
**8**) · un seuil de 15 caractères laisse tomber « Après ${…} » (6 caractères). La bonne
réponse n'était **aucun seuil** : tous les littéraux de la ligne, dans l'ordre.
Et le dernier `:0` n'était pas un défaut d'ancrage mais **de fichier** — l'attribution Ciqual
vit dans `lib/foods.ts`, pas dans `methodologie.ts`. Le dump se trompait aussi de source.

### Ce qui tient, et le jugement a raison de le dire

Le compliment du §5 survit à la lecture du texte entier. Il se déplace : ce n'est plus la
prose qui impressionne, c'est **T26** — « les recettes n'ont pas été validées par un
diététicien-nutritionniste, et l'app ne le prétend nulle part » — un manque qui se dit sans
atténuation, sur le point exact où le secteur ment le plus. Et **T33**, qui avertit
l'utilisatrice enceinte **sans recueillir sa réponse** : conforme à la décision du
2026-08-11, à ne pas toucher.

---

## 3 · Ce qui était renvoyé au fondateur — **tranché le jour même**

> ⚠️ Cette section est conservée pour ce qu'elle expliquait : **pourquoi** ces trois points
> n'étaient pas des correctifs. Les décisions sont en §3 bis. Ne pas la lire comme l'état
> courant — un document qui porte deux époques côte à côte est exactement le défaut
> `CA-4-03` que cette passe vient de corriger ailleurs.

| # | Ce qu'il faut trancher | Pourquoi ce n'est pas un correctif |
|---|---|---|
| **06b-bis-04** | **Vouvoiement ou tutoiement ?** T02 dit « ce que **vous** déclarez », T33 dit « **Parles**-en à un médecin ». Ce sont deux des textes les plus lus de l'app, et ils s'adressent à la même personne de deux façons | C'est une décision de VOIX pour toute l'app, pas pour ces deux phrases. La trancher ici la trancherait par accident, et il faudrait ensuite propager sur les 711 autres textes |
| **06b-bis-01 + 02** | **Réécrire T08 et la taxonomie T28–T31.** T08 empile quatre règles (usage direct, glissement, asymétrie, seuils de provenance) sans dire le cas par défaut — celui de la quasi-totalité des utilisateurs. T28 promet « tout » et omet cinq éléments chiffrés | Ce n'est pas une correction de phrase mais une réécriture de la partie la plus technique de la page. Elle demande de décider **combien** on explique — et c'est le choix qui a fait la qualité de cette page |
| **Q7** | La mention Ciqual est-elle celle qu'exige la Licence Ouverte 2.0, au mot près ? Et le `®` est-il justifié par un dépôt réel ? | ⏸️ **Toujours ouvert** — se vérifie hors du dépôt, sur le site de l'ANSES et auprès d'Etalab. Seule chose qui reste |

---

## 3 bis · Les trois arbitrages, tranchés le 2026-08-27

### ✅ **04 — TUTOIEMENT** (décision fondateur)

Mesuré avant d'appliquer, et le résultat a réduit le chantier à presque rien : **l'app
tutoie déjà partout**. Le vouvoiement se réduisait à **deux occurrences**, toutes deux sur
la page Méthodologie — `lib/methodologie.ts:62` (« ce que **vous** déclarez ») et
`app/methodologie.tsx:38` (« ce qu'il **vous** propose »). Le reste de la page est écrit à
l'impersonnel. Corrigées. Surface produit : **0 vouvoiement**.

⚠️ **Restent 55 occurrences dans `constants/legal.ts`, et je ne les ai PAS touchées.** Ce
n'est pas la même question : les CGU et la politique de confidentialité sont des documents
**contractuels**, lus dans un autre contexte, et le vouvoiement y est la convention
française. Les basculer coûterait un bump de date et d'empreinte, la régénération des trois
surfaces (dont le dépôt du site), et surtout un changement de registre sur un document
opposable — que personne n'a demandé. Le constat 04 visait T02 contre T33, deux textes
**produit** : cette incohérence-là est fermée.
➡️ Si le tutoiement doit s'étendre au contractuel, c'est une décision à part.

### ✅ **02 — T08 découpé, le cas par défaut en tête**

Le paragraphe empilait quatre règles et ne disait pas ce qui s'applique par défaut —
c'est-à-dire à la quasi-totalité des utilisateurs. Il en fait quatre, dans l'ordre
d'application :

1. **Par défaut, c'est Mifflin-St Jeor** — quatre entrées certaines.
2. Une silhouette porte ±5 points ; au-delà de ce bruit, le calcul **glisse** vers Katch.
3. **Jamais l'inverse.**
4. Katch **telle quelle** dans un seul cas : un taux mesuré et déclaré comme tel — et la
   question n'est posée qu'au-delà de 35 % / 43 %, **en dessous le taux est toujours traité
   comme une estimation**.

Le fond ne bouge pas d'un kcal ; c'est l'ordre et le cas par défaut qui manquaient.

### ✅ **01 — la taxonomie range VRAIMENT tout, et un test le compte**

Le jugement disait « cinq éléments ne figurent dans aucune des deux listes ». Mesuré sur la
**source** plutôt que sur le rendu : **douze sur dix-huit**. Le jugement sous-comptait parce
qu'il lisait le texte rendu, où les constantes ont perdu leur nom.

Les douze sont classées. Et une troisième liste apparaît, pour ce qui le mérite : *« Sont
aussi des choix de Kyroz, et ce sont ceux qui s'écartent le plus de la littérature »* — le
glissement Mifflin↔Katch, la marge de ±5 points, les seuils de provenance, le retrait
progressif des planchers. C'est précisément ce que le jugement demandait de classer en
priorité.

🔴 **La promesse est désormais COMPTÉE** : `corpusTextes.test.ts` vérifie que chaque
constante interpolée ailleurs sur la page l'est aussi dans la taxonomie. **18 citées,
0 absente.** Vu rougir en sortant une constante de la liste.
➡️ *Une promesse d'exhaustivité non tenue est pire qu'une sélection annoncée : elle fait
croire que ce qui manque n'existe pas.* Et une promesse qu'aucun test ne compte se déclare
tenue toute seule.

---

## 4 · Ce que cette passe apprend

**① Un jugement sur pièces produit des soupçons, pas des constats — et c'est utile si on le
dit.** Quatre questions marquées P0 potentiel, **trois** se sont révélées être des textes
justes dès qu'on a ouvert le code. La consigne « pose-le comme une question à mesurer, pas
comme un constat » a transformé ce qui aurait été quatre faux P0 en quatre mesures rapides.

**② Le refus de juger était la bonne réponse, et il valait mieux qu'un jugement complaisant.**
Un brief qui référence au lieu de contenir produit des constats inventés. Le coût du refus a
été une réécriture du brief ; le coût de l'inverse aurait été des corrections appliquées à
des phrases qui n'existent pas, sur le corpus le plus sensible de l'app.

**③ Corriger une sur-généralisation dans un document ne la corrige pas là où elle est
SERVIE.** J'ai resserré « aucun plancher contournable » dans deux documents d'audit, et je
n'ai jamais cherché ses autres surfaces. Elle vivait mot pour mot dans un texte que
l'utilisateur lit. ➡️ *Un manque ne se grep pas, il se recense par rôle* — y compris quand
c'est son propre correctif qu'on recense.
