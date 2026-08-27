# Brief 6b-bis — rejuger les textes que l'étape 6b a lus en morceaux

**Pour Claude.ai. Autonome : rien d'autre à ouvrir que ce document et le fichier joint.**

---

## Pourquoi ce brief existe

L'étape 6b a jugé le corpus des textes de Kyroz le 2026-08-26, et rendu 23 constats.
Elle a bien fait son travail — **sur un corpus mutilé**.

L'extraction (étape 6a) coupait chaque chaîne de caractères sur l'**apostrophe
échappée**. En français, ça coupe la majorité des phrases. Mesuré sur le dump que 6b a
lu : **14 entrées finissant net sur une barre oblique inverse** et **7 fragments
orphelins** — des queues de phrases sans leur tête.

Concrètement, 6b a lu ceci :

| ce que 6b a lu | ce que le code dit vraiment |
|---|---|
| « Ce que Kyroz calcule — et ce qu\ » *(puis, séparément)* « est pas » | « Ce que Kyroz calcule — et ce qu'il n'est pas » |
| « Le métabolisme de base est estimé par l\ » | « Le métabolisme de base est estimé par l'équation de Mifflin-St Jeor, à partir du sexe, de l'âge, du poids et de la taille. » |
| « Kyroz est conçu pour des adultes en bonne santé. Ces informations ne remplacent pas l » *(puis)* « un médecin ou diététicien-nutritionniste. » | la phrase entière, avec « l'avis d' » au milieu |

Et le cas qui décide de ce brief : la phrase la plus lourde juridiquement de l'app —

> « Kyroz n'est pas un dispositif médical. Il ne diagnostique, ne traite, ne guérit ni ne
> prévient aucune pathologie, et ne remplace pas l'avis d'un médecin ou d'un
> diététicien-nutritionniste. »

— **n'apparaissait nulle part dans le corpus.** `grep "dispositif médical"` rendait **0**
sur les 753 entrées. 6b ne l'a jamais vue.

⚠️ Le fichier touché est `lib/methodologie.ts` — c'est-à-dire la page « Méthodologie &
sources », précisément celle que la synthèse de l'audit cite comme **modèle** (« pas vu
d'équivalent dans une app grand public »). Le compliment portait sur des textes que le
jugement n'avait pas lus en entier.

**Réparé le 2026-08-27** : ce bloc n'est plus extrait par une expression régulière, il est
**rendu** par la fonction `methodologie()` elle-même. 31 textes réels remplacent
72 fragments. Un garde-fou (`lib/__tests__/corpusTextes.test.ts`) le tient fermé.

---

## Ce qu'on te demande

**Rejuger UNIQUEMENT les 32 textes ci-dessous** — les 31 de la page Méthodologie, plus le
`DISCLAIMER`. Pas tout le corpus : le reste des 711 textes n'était pas abîmé, et son
jugement du 26 août tient.

Les textes sont dans **`docs/audit-v1/06-textes-dump.md`**, bloc
`## Méthodologie (contenu) (lib/methodologie.ts)` (dernier bloc du fichier), plus l'entrée
`constants/legal.ts:15`.

### Les deux règles, et elles seules

**① Zéro charge mentale.** Tout suivi affiché à l'utilisateur doit **rassurer, jamais
mettre la pression**. Une zone, pas une ligne au pixel près. Aucun signal alarmant. Le
pire cas reste neutre. Le message de fond est « le moteur porte la charge », pas « tu es
en retard ». Aucun reproche, jamais.

**② Zéro malhonnêteté.** Un chiffre affiché est celui qui sera servi. Une phrase qui
décrit un mécanisme décrit le mécanisme réel. Une promesse est tenue par le code. Un
manque se dit, il ne se tait pas.

⚠️ **Ce sont des textes techniques et légaux, pas de l'interface courante.** La règle ①
s'y applique différemment : ils expliquent des garde-fous de sécurité, et leur ton doit
rester factuel sans devenir anxiogène. Un plancher calorique qui se décrit comme une
protection rassure ; le même décrit comme une limite subie inquiète.

### Ce qu'on ne te demande PAS

- **Ne réécris pas les textes.** Constate, propose, n'implémente pas.
- **Ne juge pas la justesse scientifique** des équations citées — elle a été arbitrée
  ailleurs, et ce n'est pas l'objet.
- **Ne propose pas de raccourcir « pour alléger ».** Ces textes existent parce que
  quelqu'un a décidé d'expliquer plutôt que d'affirmer. C'est un choix, pas un défaut.

### Le format attendu

Pour chaque constat :

```markdown
### 06b-bis-NN <titre court>
- Sévérité : P0 / P1 / P2 / P3
- Texte concerné : `lib/methodologie.ts:NN` (cite-le)
- Règle enfreinte : charge mentale / malhonnêteté
- Pourquoi : <une phrase>
- Reco : <une phrase, sans réécrire le texte entier>
```

Plus, en tête : **ce qui tient**. Un jugement qui ne dit que ce qui cloche donne une image
fausse — et ce corpus-ci a été cité comme modèle, donc il faut savoir si le compliment
survit à la lecture du texte entier.

---

## Deux avertissements tirés de ce qui s'est déjà passé

**⚠️ Le document qui revient s'ARBITRE, il ne s'applique pas.** L'étape 6b avait
recommandé d'écrire « 18 mois » dans un texte — une durée que le registre RGPD démentait.
La recommandation a été rejetée par une seule lecture du registre. Toute reco qui fait
afficher une durée, un chiffre ou une promesse sera vérifiée contre le code avant d'être
retenue.

**⚠️ Une reco ne doit pas remettre en production ce qu'une règle avait fait retirer.**
Deux exemples à ne pas rouvrir : les questions de dépistage santé (retirées le 2026-08-11
sur avis juridique — subordonner l'accès à l'état de santé ou à la grossesse est un refus
de service discriminatoire), et toute formulation laissant croire que les recettes ont été
validées par un professionnel (elles ne l'ont pas été, et un texte le dit explicitement —
c'est voulu).
