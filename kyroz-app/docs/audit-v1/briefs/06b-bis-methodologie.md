# Brief 6b-bis — rejuger les textes que l'étape 6b a lus en morceaux

**Pour Claude.ai. Autonome : les 33 textes à juger sont DANS ce document, en entier.**

> ⚠️ **Correction du 2026-08-27.** Une première version de ce brief renvoyait au fichier
> `06-textes-dump.md` du dépôt — que tu n'as pas. Le refus de juger était le bon : sans les
> textes sous les yeux, on invente des constats sur des phrases inventées, et sur le corpus
> le plus sensible juridiquement de l'app ce serait la faute de 6b en pire. Les textes sont
> désormais inclus, **rendus par le code lui-même** (interpolations résolues, valeurs
> réelles), pas recopiés à la main.

---

## Pourquoi ce brief existe

L'étape 6b a jugé le corpus des textes de Kyroz le 2026-08-26 et rendu 23 constats. Elle a
bien fait son travail — **sur un corpus mutilé**.

L'extraction (étape 6a) coupait chaque chaîne de caractères sur l'**apostrophe échappée**.
En français, ça coupe la majorité des phrases. Mesuré sur le dump que 6b a lu :
**14 entrées finissant net sur une barre oblique inverse** et **7 fragments orphelins** —
des queues de phrases sans leur tête.

Concrètement, 6b a lu ceci :

| ce que 6b a lu | ce que le code dit vraiment |
|---|---|
| « Ce que Kyroz calcule — et ce qu\ » *(puis, séparément)* « est pas » | « Ce que Kyroz calcule — et ce qu'il n'est pas » |
| « Le métabolisme de base est estimé par l\ » | la phrase entière (**T07** ci-dessous) |
| « …ne remplacent pas l » *(puis)* « un médecin ou diététicien-nutritionniste. » | le DISCLAIMER entier, avec « l'avis d' » au milieu (T32) |

Et le cas qui décide de ce brief : l'avertissement « dispositif médical » (**T03**)
**n'apparaissait nulle part** dans le corpus. `grep "dispositif médical"` rendait **0** sur
les 753 entrées. 6b ne l'a jamais vu.

⚠️ Le fichier touché est `lib/methodologie.ts` — la page « Méthodologie & sources »,
précisément celle que la synthèse de l'audit cite comme **modèle** (« pas vu d'équivalent
dans une app grand public »). Le compliment portait sur des textes que le jugement n'avait
pas lus en entier.

**Réparé côté dépôt** : ce bloc n'est plus extrait par une expression régulière, il est
**rendu** par la fonction `methodologie()`. 31 textes réels remplacent 72 fragments, et un
test le tient fermé. Ce qui reste à faire est le **jugement**, et c'est ce brief.

---

## Ce qu'on te demande

**Juger les 33 textes ci-dessous, et eux seuls.** Pas le reste du corpus : les 711 autres
textes n'étaient pas abîmés, et leur jugement du 26 août tient.

### Le contexte produit, en cinq lignes

Kyroz est une app de plans repas macro-précis pour adultes sportifs de 18 à 50 ans. Elle
calcule une dépense énergétique, en déduit des cibles caloriques et des macros, et génère
des repas. Les textes ci-dessous forment la page **« Méthodologie & sources »** — un écran
que l'utilisateur ouvre depuis son profil pour comprendre **comment** Kyroz calcule et **sur
quoi** il s'appuie. Ce ne sont pas des textes d'interface courante : ce sont des
explications techniques et des garde-fous de sécurité.

### Les deux règles, et elles seules

**① Zéro charge mentale.** Tout ce qui est affiché doit **rassurer, jamais mettre la
pression**. Aucun signal alarmant, aucun reproche. Le message de fond est « le moteur porte
la charge », pas « tu es en retard ».
⚠️ Sur des textes techniques, cette règle s'applique différemment : un plancher calorique
décrit comme une **protection** rassure ; le même décrit comme une **limite subie**
inquiète. C'est ce contraste-là qu'il faut regarder.

**② Zéro malhonnêteté.** Un chiffre affiché est celui qui sera servi. Une phrase qui décrit
un mécanisme décrit le mécanisme **réel**. Une promesse est tenue par le code. Un manque se
dit, il ne se tait pas.

### Ce qu'on ne te demande PAS

- **Ne réécris pas les textes.** Constate, propose une direction, n'implémente pas.
- **Ne juge pas la justesse scientifique** des équations citées : elle a été arbitrée
  ailleurs, avec des mesures, et ce n'est pas l'objet de ce brief.
- **Ne propose pas de raccourcir « pour alléger ».** Ces textes existent parce que quelqu'un
  a décidé d'expliquer plutôt que d'affirmer. C'est un choix, pas un défaut.
- **Ne juge pas ce que tu ne peux pas vérifier.** Si un constat dépend du comportement réel
  du code, dis-le comme une QUESTION à mesurer, pas comme un constat.

### Le format attendu

D'abord, **ce qui tient** — un jugement qui ne dit que ce qui cloche donne une image fausse,
et ce corpus a été cité comme modèle : il faut savoir si le compliment survit à la lecture
du texte entier.

Puis, pour chaque constat :

```markdown
### 06b-bis-NN <titre court>
- Sévérité : P0 / P1 / P2 / P3
- Texte concerné : T07 (`lib/methodologie.ts:73`)
- Règle enfreinte : charge mentale / malhonnêteté
- Pourquoi : <une phrase>
- Reco : <une phrase, sans réécrire le texte entier>
```

Barème : **P0** = expose légalement ou décrit un mécanisme faux · **P1** = à corriger avant
le lancement public · **P2** = post-lancement · **P3** = typographie, style.

---

## Deux avertissements, tirés de ce qui s'est déjà passé

**⚠️ Le document qui revient s'ARBITRE, il ne s'applique pas.** L'étape 6b avait recommandé
d'écrire « 18 mois » dans un texte — une durée que le registre RGPD démentait. La
recommandation a été rejetée par une seule lecture du registre. Toute reco qui fait afficher
une durée, un chiffre ou une promesse sera vérifiée contre le code avant d'être retenue.

**⚠️ Une reco ne doit pas remettre en production ce qu'une règle avait fait retirer.** Deux
sujets à ne pas rouvrir : les questions de dépistage santé (retirées le 2026-08-11 sur avis
juridique — subordonner l'accès au service à l'état de santé ou à la grossesse est un refus
de service discriminatoire, et la réponse recueillie était elle-même une donnée de santé) ;
et toute formulation laissant croire que les recettes ont été validées par un professionnel
(elles ne l'ont pas été, **T26** le dit explicitement, et c'est voulu).

---

# LES 33 TEXTES

> Rendus par le code, interpolations résolues. Les valeurs numériques sont celles que
> l'utilisateur voit réellement. `:NN` = ligne dans `lib/methodologie.ts`.

### Section — Ce que Kyroz calcule — et ce qu'il n'est pas

**T01** · `:60` — *titre de section*

> Ce que Kyroz calcule — et ce qu'il n'est pas

**T02** · `:62`

> Kyroz estime une dépense énergétique quotidienne à partir de ce que vous déclarez, puis construit des repas qui s'en approchent. C'est un outil de bien-être alimentaire pour adultes en bonne santé.

**T03** · `:63`

> Kyroz n'est pas un dispositif médical. Il ne diagnostique, ne traite, ne guérit ni ne prévient aucune pathologie, et ne remplace pas l'avis d'un médecin ou d'un diététicien-nutritionniste.

**T04** · `:64`

> L'app est réservée aux personnes de 18 ans et plus : les équations utilisées ci-dessous ne sont pas validées chez l'adolescent.


### Section — La dépense énergétique (TDEE)

**T05** · `:68` — *titre de section*

> La dépense énergétique (TDEE)

**T06** · `:70`

> La dépense est la somme de trois termes : le métabolisme de base, multiplié par un facteur d'activité quotidienne hors sport, auquel s'ajoute la dépense des séances déclarées.

**T07** · `:71`

> Le métabolisme de base est estimé par l'équation de Mifflin-St Jeor, à partir du sexe, de l'âge, du poids et de la taille.

**T08** · `:72`

> L'équation de Katch-McArdle, qui repose sur la masse maigre, est utilisée telle quelle si le taux de masse grasse a été MESURÉ (impédancemétrie, DEXA, plis cutanés) et déclaré comme tel. Un taux estimé à partir d'une silhouette porte une marge d'erreur de l'ordre de ±5 points : quand il indique nettement plus de masse maigre que la moyenne du gabarit — au-delà de ce bruit —, le calcul glisse progressivement de Mifflin-St Jeor vers Katch-McArdle. Jamais l'inverse : si la formule à masse maigre donne une dépense plus basse, c'est Mifflin-St Jeor qui reste servie. La question de provenance n'est posée qu'au-delà de 35 % (homme) et 43 % (femme).

**T09** · `:73`

> Le facteur d'activité hors sport va de 1,3 (travail assis) à 1,45 (métier physique). La table s'arrête volontairement à 1,45 : les valeurs plus hautes des tables classiques incluent l'exercice, qui est déjà compté à part.

**T10** · `:74`

> La dépense des séances est calculée par la méthode des équivalents métaboliques (MET), en valeur NETTE : le métabolisme de repos de l'heure de séance est retiré, parce qu'il est déjà compté par les deux premiers termes.


### Section — La répartition des macronutriments

**T11** · `:95` — *titre de section*

> La répartition des macronutriments

**T12** · `:97`

> La cible protéique dépend de l'objectif et se calcule sur un poids ajusté à la composition corporelle. Elle est ensuite bornée entre 1,6 et 2,6 g par kg de MASSE MAIGRE, quelle que soit la corpulence.

**T13** · `:98`

> Les lipides ne descendent jamais sous 0,8 g par kg de poids de corps, seuil en deçà duquel l'apport en acides gras essentiels et l'absorption des vitamines liposolubles ne sont plus assurés.

**T14** · `:99`

> Les glucides reçoivent le budget restant.


### Section — Les limites de sécurité

**T15** · `:120` — *titre de section*

> Les limites de sécurité

**T16** · `:122`

> Aucun plan ne peut descendre sous ces limites, quel que soit l'objectif choisi ou la date visée. Ce ne sont pas des réglages : le code les applique à chaque calcul.

**T17** · `:123`

> Énergie disponible : au moins 30 kcal par kg de masse maigre, une fois la dépense sportive retirée. C'est le seuil sous lequel la littérature documente des perturbations hormonales et osseuses (déficit énergétique relatif dans le sport, RED-S).

**T18** · `:0`

> Au-delà de 12 semaines cumulées en zone basse, ce plancher remonte progressivement vers 35 kcal par kg de masse maigre : l'app force une sortie de déficit au lieu de la laisser durer.

**T19** · `:125`

> Filet absolu : jamais moins de 1 500 kcal par jour chez l'homme et 1 200 kcal chez la femme.

**T20** · `:0`

> Déficit plafonné à 25 % de la dépense estimée.

**T21** · `:0`

> Après 8 semaines de déficit consécutives, la semaine suivante est servie à la maintenance.

**T22** · `:128`

> Un déficit est refusé si l'indice de masse corporelle de départ est inférieur à 18,5, ainsi que pour tout poids cible sortant de la plage saine.


### Section — Les données nutritionnelles

**T23** · `:144` — *titre de section*

> Les données nutritionnelles

**T24** · `:0`

> Données nutritionnelles issues de la Table Ciqual® 2025 (ANSES), réutilisée sous Licence Ouverte 2.0 (Etalab). Certaines entrées sont ajoutées ou ajustées par Kyroz et ne proviennent pas de l’ANSES. L’ANSES n’endosse pas Kyroz.

**T25** · `:147`

> Les aliments que la table ne couvre pas proprement (produits protéinés, préparations composées) sont saisis à la main, à partir des valeurs déclarées par les fabricants. Aucune source tierce automatique n'alimente le catalogue.

**T26** · `:148`

> Les recettes de Kyroz n'ont pas été validées par un diététicien-nutritionniste, et l'app ne le prétend nulle part.


### Section — Ce qui relève d'un choix de Kyroz

**T27** · `:159` — *titre de section*

> Ce qui relève d'un choix de Kyroz

**T28** · `:161`

> Tout ce qui précède ne sort pas de la littérature au même titre, et la distinction est faite ici plutôt que laissée à l'interprétation.

**T29** · `:162`

> Viennent de la littérature : les deux équations de métabolisme de base, les valeurs MET, le seuil de 30 kcal par kg de masse maigre et les fourchettes protéiques.

**T30** · `:163`

> Sont des choix de Kyroz, prudents par construction : le plafond de 1,45 sur l'activité quotidienne, le déficit borné à 25 %, la pause à la maintenance toutes les 8 semaines, et le retrait des planchers dérivés de la masse maigre au-delà de 30 % (homme) et 40 % (femme) de masse grasse — au-delà, la réserve adipeuse est la source d'énergie que ces planchers, conçus pour des athlètes maigres, interdisaient d'utiliser.

**T31** · `:164`

> Une estimation de dépense reste une estimation : elle porte une marge d'erreur individuelle que ces équations ne suppriment pas. Le poids relevé au fil des semaines est le seul juge, et c'est lui que Kyroz suit.


### Hors page Méthodologie — les deux phrases obligatoires

**T32** · `constants/legal.ts` — `DISCLAIMER`, affiché à l'inscription, dans les paramètres et sur chaque plan

> Kyroz est conçu pour des adultes en bonne santé. Ces informations ne remplacent pas l'avis d'un médecin ou diététicien-nutritionniste.

**T33** · `constants/legal.ts` — `AVERTISSEMENT_MEDICAL`, exigé par Apple 1.4.1 et Google

> Enceinte, allaitante, ou suivie pour une pathologie chronique ? Parles-en à un médecin avant de suivre un plan.
