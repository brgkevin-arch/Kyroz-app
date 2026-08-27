# Mention Ciqual — ce qui était à vérifier hors du dépôt, et ce qu'il en reste

Date : 2026-08-27 · Origine : jugement 6b-bis, question **Q7** (dernier point ouvert du volet textes)

> **Bilan : il ne reste rien à aller chercher.** Tout était mesurable — la moitié sur ton
> disque, l'autre moitié dans le texte de la licence. Il reste **une décision de rédaction**,
> et elle tient en une question.

---

## 1 · Ce que la Licence Ouverte 2.0 exige VRAIMENT

Une seule obligation, et une restriction :

| | |
|---|---|
| **Obligation** | mentionner la paternité : **le nom du producteur** *et* **la date de dernière mise à jour** de l'information réutilisée |
| **Modalité alternative** | on peut s'en acquitter en indiquant **l'URL** qui renvoie vers l'information, si elle assure une mention effective de la paternité |
| **Restriction** | la mention ne doit **ni conférer un caractère officiel** à la réutilisation, **ni suggérer une reconnaissance ou une caution** du producteur |

➡️ Il n'y a **aucune** obligation distincte de signaler les modifications. Kyroz le fait
quand même, et c'est bien : c'est ce qui rend la restriction « pas de caution » crédible.

*(Sources : le texte de la licence, [etalab/licence-ouverte](https://github.com/etalab/licence-ouverte/blob/master/LO.md) et [data.gouv.fr](https://www.data.gouv.fr/pages/legal/licences/etalab-2.0).)*

---

## 2 · Ce que les trois surfaces disent aujourd'hui

| Surface | Producteur | **Date** | Non-caution | Modifications | `®` |
|---|---|---|---|---|---|
| `lib/foods.ts::CIQUAL_ATTRIBUTION` — affichée dans **Réglages** et sur la page **Méthodologie** | ✅ ANSES | ❌ **absente** (« 2025 » est un millésime, pas une date) | ✅ | ✅ | ⚠️ |
| `constants/legal.ts:329` — **CGU §6**, et sa copie publiée `public/legal.html` | ✅ ANSES | ❌ **absente** | ❌ | ❌ | — |
| `STORE-RELEASE.md` — texte de la **fiche store** (anglais) | ✅ ANSES | ❌ **absente** | ❌ | ❌ | — |

🔴 **Les trois manquent la date.** C'est la moitié de l'unique obligation de la licence.

---

## 3 · La date : elle était sur ton disque

`data/ciqual/MANIFEST.TXT` et les noms de fichiers la portent :

```
Table Ciqual 2025_FR_2025_11_03.xlsx      ← les données réutilisées
Table Ciqual 2025 doc FR_2025_11_19.pdf   ← la documentation
```

Et le jeu de données publié porte un **DOI** et une date de publication :

| | |
|---|---|
| Fichiers de données | **3 novembre 2025** |
| Publication du jeu (v1.0) | **19 novembre 2025** |
| DOI | `10.57745/RDMHWY` |
| Auteurs cités | Du Chaffaut L., Oseredczuk M., Gauvreau-Béziat J. (2025) |

➡️ La date à citer est celle du **jeu de données publié : 19 novembre 2025**. Le DOI permet
en plus d'emprunter la modalité alternative de la licence (l'URL), ce qui referme la question
sans discussion possible.

---

## 4 · Le `®` : il n'est justifié nulle part

Mesuré sur la **documentation officielle de l'ANSES** (`Table Ciqual 2025 doc FR_2025_11_19.pdf`,
sur ton disque) :

| | |
|---|---|
| occurrences de « Ciqual » | **37** |
| occurrences de « Ciqual® » | **0** |
| occurrences de `®` ailleurs dans le document | **157** |

Le producteur emploie donc `®` abondamment — pour des marques commerciales d'aliments — et
**jamais** pour « Ciqual ». La page du jeu de données ne l'emploie pas non plus.

➡️ **Le `®` doit partir.** Ce n'est pas de la typographie : apposer un symbole
d'enregistrement sur un nom que son propre titulaire ne marque pas est une affirmation
factuelle fausse sur la propriété d'un tiers.

⚠️ **Il est protégé par un test** — `emojiInterface.test.ts` cite « Table Ciqual® 2025 »
comme l'exemple de `®` légitime qu'il ne faut pas condamner. Le test reste juste sur le fond
(`®` est un signe typographique, pas un émoji) : c'est son EXEMPLE qui devient faux. À
corriger dans le même geste.

---

## 5 · Ce qui reste : une seule décision

Les faits sont clos. Reste à choisir **jusqu'où** la mention va sur chaque surface — l'app
peut être complète, les CGU sont un texte contractuel court, la fiche store est lue par un
relecteur.

Proposition, à valider ou à corriger :

**A · `CIQUAL_ATTRIBUTION`** (app — Réglages et Méthodologie)

> Données nutritionnelles issues de la Table Ciqual 2025 (ANSES), mise à jour du
> 19 novembre 2025, réutilisée sous Licence Ouverte 2.0 (Etalab) — doi.org/10.57745/RDMHWY.
> Certaines entrées sont ajoutées ou ajustées par Kyroz et ne proviennent pas de l'ANSES.
> L'ANSES n'endosse pas Kyroz.

**B · CGU §6** (`constants/legal.ts`) — la date et la non-caution entrent, le reste non

> Les recettes et contenus de l'app sont la propriété de Kyroz. Les données nutritionnelles
> sont issues de la table Ciqual 2025 (ANSES), mise à jour du 19 novembre 2025, réutilisées
> sous Licence Ouverte 2.0 (Etalab) ; l'ANSES n'endosse pas Kyroz.

⚠️ Toucher aux CGU rouvre l'empreinte du texte légal → report d'empreinte, `npm run gen:legal`,
et la 3ᵉ surface (`kyroz.app/legal.html`, dépôt `kyroz-site`) à régénérer.

**C · Fiche store** (`STORE-RELEASE.md`, anglais)

> Food composition: Ciqual 2025 table (ANSES, French food safety agency), updated
> 19 November 2025, reused under Open Licence 2.0 (Etalab).

---

## 6 · ✅ CE QUI A ÉTÉ FAIT (décision fondateur : l'app + le `®` partout)

**Arbitrage retenu, et son motif** : la licence se satisfait d'**une** mention effective de
la paternité. C'est `CIQUAL_ATTRIBUTION` qui la porte — affichée dans les Réglages et sur la
page Méthodologie. Les phrases des CGU et de la fiche store *mentionnent* la source sans être
l'attribution ; les enrichir aurait rouvert l'empreinte du texte légal, imposé une date
d'entrée en vigueur et la régénération de `kyroz.app/legal.html`, pour une conformité déjà
acquise ailleurs.

| | |
|---|---|
| `lib/foods.ts::CIQUAL_ATTRIBUTION` | ✅ date du **19 novembre 2025** + DOI `10.57745/RDMHWY` · `®` retiré |
| `lib/__tests__/emojiInterface.test.ts` | ✅ l'exemption `®`/`©`/`™` reste — **elle est juste** — mais son témoin devient CONSTRUIT, et le fichier dit qu'il n'existe plus aucun `®` réel |
| `CLAUDE.md` §8 | ✅ la note qui citait « Table Ciqual® 2025 » comme le `®` légitime du dépôt |
| `06-textes-dump.md` | ✅ bloc régénéré depuis le module |
| **CGU §6** (`constants/legal.ts`) | ⏸️ **non touchées** — rejoindront la prochaine révision légale |
| **Fiche store** (`STORE-RELEASE.md`) | ⏸️ **non touchée** — même raison |

⚠️ **À reprendre le jour où les CGU bougeront pour une autre raison** : y ajouter la date et
la non-caution. Ce n'est pas une dette de conformité, c'est une dette de cohérence.

⚠️ **Et le jour où Ciqual sera mis à jour** : la date de cette mention se re-mesure sur
`data/ciqual/MANIFEST.TXT`, elle ne se recopie pas. `python3 scripts/convert-ciqual.py`
régénère le dataset ; personne ne régénère la phrase.

---

## 7 · Ce que ça aurait changé au dépôt pour les deux autres surfaces

1. `lib/foods.ts` — nouvelle `CIQUAL_ATTRIBUTION`, sans `®`.
2. `constants/legal.ts` — §6 amendé · **date d'entrée en vigueur à arbitrer** · empreinte à
   reporter dans `legal.test.ts` · `npm run gen:legal`.
3. `STORE-RELEASE.md` — la ligne anglaise.
4. `lib/__tests__/emojiInterface.test.ts` — son exemple de `®` légitime doit changer de
   témoin (le `®` reste autorisé, mais « Ciqual® » n'est plus un cas réel).
5. Régénérer le bloc du dump et relancer `corpusTextes.test.ts`.
6. ⚠️ **Hors dépôt** : `KYROZ_SITE=<clone> npm run gen:legal` pour `kyroz.app/legal.html`.
