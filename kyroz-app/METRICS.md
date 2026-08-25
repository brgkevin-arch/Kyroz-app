# METRICS.md — Kyroz · ce que chaque chiffre mesure

> **Écrit le 2026-08-20**, sur demande du fondateur (tâche 6 de son plan d'action :
> « rendre la north star réellement calculable »).
>
> **Ce fichier fait foi.** Quand un autre document nomme la north star, il pointe ici.
> C'est la règle qui manquait : au 2026-08-20, **trois formulations différentes** de « la
> north star » vivaient dans le dépôt sans se savoir (§6). Un indicateur qui a trois
> définitions n'a pas de définition — il a trois camps qui se croiront d'accord.

---

## 1. La north star

> **% d'appareils atteignant 7 JOURS ACTIFS dans leurs 14 premiers jours.**
>
> Un **jour actif** = un jour où **au moins un repas a été marqué « J'ai cuisiné »**.

C'est tout. Trois précisions, et elles comptent toutes les trois :

- **« Actif » veut dire cuisiné, pas ouvert.** Ouvrir son plan sans rien cuisiner n'est
  pas un jour actif. C'était l'ambiguïté nommée par le fondateur — « ouvrir l'app ≠
  cuisiner » — et elle est tranchée **du côté exigeant**, parce que la définition
  indulgente flatte : un plan consulté et jamais suivi est un échec, pas un succès.
- **« Appareil », jamais « personne ».** L'identifiant est pseudonyme et tiré sur le
  téléphone ; réinstaller en tire un nouveau. Cf. l'arbitrage du 2026-08-10, §3.4.
- **7 jours actifs, pas 7 jours d'affilée.** La fenêtre est de 14 jours ; les 7 jours
  n'ont pas à se suivre. Une définition consécutive punit un week-end de mariage aussi
  fort qu'un abandon, alors que les deux ne disent pas la même chose du produit.

### ⚠️ Ce que `meal_cooked` mesure vraiment

**Un tap sur un bouton, pas une cuisson.** Impossible de distinguer « n'a pas cuisiné »
de « a cuisiné sans cocher ». Le chiffre ABSOLU ne veut donc rien dire ; seules la
tendance dans le temps et la comparaison entre cohortes sont exploitables. Cette phrase
doit accompagner le chiffre partout où il est affiché — sinon il sera relu dans six mois
comme un taux d'adhésion réel. (Avertissement repris de l'arbitrage du 2026-08-10, §5.)

---

## 2. La série affichée n'est PAS la north star

**Décision du fondateur, le 2026-08-20 : les deux sont SÉPARÉS.**

| | La série (à l'écran) | La north star (dans PostHog) |
|---|---|---|
| Compte | les jours où le plan est **ouvert** | les jours où un repas est **cuisiné** |
| Se déclenche | `markActiveToday()` au montage de l'écran Plan | `capture(Events.mealCooked)` |
| Sert à | la rétention, sans pression | décider ce qu'on construit |
| Pardonne | oui — un gel par semaine (`FREEZE_RECHARGE`) | non, rien à pardonner : personne ne la voit |

**La série n'a pas été changée, et c'est délibéré.** Elle dit déjà la vérité sur ce
qu'elle compte : la bulle du tutoriel `plan-serie` annonce *« Ta série, sans pression —
elle avance dès que tu ouvres ton plan, cuisiné ou pas »*. La rendre exigeante ferait
perdre sa série à quelqu'un qui suit son plan mais oublie de cocher — une punition pour
un tap manqué, exactement l'inverse de la charte (« rassurer au lieu de mettre la
pression », CLAUDE.md §5).

🔴 **NE PAS LES RENOMMER L'UN DANS L'AUTRE.** Le défaut que cette page ferme est né de
là : `lib/streak.ts` s'annonçait « Logique du streak (North Star : 7 jours consécutifs) »
et `plan.tsx` commentait son appel au montage par « North Star (jours d'usage
consécutifs) ». Les deux étaient faux du même coup — ils appelaient north star un
compteur d'ouvertures. Corrigé le 2026-08-20.

---

## 3. Comment elle se calcule, côté PostHog

**Événement** : `meal_cooked` · **propriété qui compte** : `jour_depuis_install`
(entier, posé sur TOUS les événements — `lib/analytics.ts`).

```
Pour chaque distinct_id :
    jours_actifs = COUNT(DISTINCT jour_depuis_install)
                   sur les events `meal_cooked` où jour_depuis_install <= 13
    atteint      = jours_actifs >= 7
North star = part des distinct_id avec atteint = vrai, par cohorte d'installation
```

🔴 **COMPTER PAR `jour_depuis_install`, JAMAIS PAR LA DATE DE L'ÉVÉNEMENT.** Ce n'est pas
une préférence de style, c'est un décalage réel :

- `timestamp` part en **UTC** (`new Date().toISOString()`, `lib/analytics.ts`) ;
- `jour_depuis_install` est calculé **en heure locale** sur le téléphone (`stampLocal`).

En France (UTC+1/+2), **un repas coché après 22 h locale tombe le lendemain en UTC**.
Grouper par date d'événement éclate donc une soirée en deux jours actifs, ou fusionne
deux jours en un — sur exactement la population qui cuisine le soir. C'est le même piège
que le dépôt a déjà payé sur la série (`hooks/useStreak.ts::dayStamp`, corrigé pour la
même raison) : une journée, ici, est une journée LOCALE.

### Les événements suffisent-ils ? — **oui, rien ne manque**

Vérifié dans le code le 2026-08-20 : `meal_cooked` est capturé à l'endroit exact — et au
seul endroit — où un repas passe à `eaten` (`app/(tabs)/plan.tsx`, `cookMeal`), et
`jour_depuis_install` est ajouté à tous les envois. La north star est donc reconstituable
telle quelle, sans nouvel événement.

⚠️ **La seule limite, et elle est voulue** : les appareils dont le consentement date
d'AVANT le 2026-08-10 n'ont pas de jour 0 stocké — la propriété est alors **absente**, pas
à zéro. Ces appareils ne peuvent pas entrer dans une cohorte. Leur donner J0 daterait
toutes leurs cohortes de plusieurs mois : mieux vaut un trou visible qu'un chiffre faux.

⚠️ **« J'ai mangé » depuis le filtre « Ma réserve » ne compte pas**
(`app/(tabs)/recettes.tsx::cuisiner`, ex-`garde-manger.tsx::cook`) : ce geste déduit des
ingrédients, il ne marque aucun repas du plan. C'est un autre acte — cuisiner ce qu'on a,
pas suivre son plan. Si un jour il doit compter, il lui faudra son propre événement, pas
un détournement de `meal_cooked`.

🔴 **`meal_cooked` PORTE DÉSORMAIS `auto`, ET LA NORTH STAR DOIT LE LIRE** (2026-08-24).
Depuis l'auto-coche, un repas dont l'heure est passée se marque « mangé » tout seul et
émet `meal_cooked` — décision fondateur : c'est le même acte, on ne le mesure pas
autrement. Mais un jour actif ne veut plus dire la même chose selon la propriété :
`auto: false`, quelqu'un a TAPÉ « J'ai cuisiné » ; `auto: true`, l'app a conclu qu'un
repas planifié avait eu lieu. ⚠️ **Une north star qui les additionne sans les distinguer
compte des installations, pas des adhésions** — le réglage étant allumé par défaut, tout
appareil qui garde l'app ouverte émet l'événement. ➡️ Lire la north star sur
`auto = false` en référence, et suivre le taux d'auto-coche à côté : c'est lui qui dit si
les gens ont cessé de marquer leurs repas.

---

## 4. Le seuil — CE QUI N'EST PAS ENCORE POSÉ

L'arbitrage du 2026-08-10 (§10, D2) pose : *jours actifs médians sur 14 **< 4**, après
3 cohortes mensuelles → revoir le rappel quotidien et la boucle de retour.* **Ce seuil est
écrit pour la définition `plan_opened`**, la plus indulgente — le §10 le dit lui-même.

➡️ **Il ne se transpose pas tel quel** à la définition « cuisiné », qui est plus dure par
construction : garder 4 reviendrait à durcir le seuil en silence, ce que le §2 de
l'arbitrage interdit explicitement.
➡️ **Le seuil de la définition exigeante reste À POSER**, à la première lecture réelle et
avec la première cohorte sous les yeux. D'ici là, le §10 prescrit déjà le bon geste :
**afficher les deux médianes côte à côte** (ouvert / cuisiné). Leur écart est la donnée —
si elles se suivent, la question ne se posait pas ; si elles divergent, « ouvrir » et
« suivre » sont deux produits différents.

**Inventer un chiffre ici serait pire que de ne rien écrire** : un seuil arbitraire qu'on
prend pour une mesure est exactement ce que le §10 s'interdit.

---

## 5. Les deux autres nombres du rituel

Le rituel de lecture (arbitrage §3.6) est **hebdomadaire sur trois nombres, décision
mensuelle uniquement**. Les deux autres ne sont pas définis ici parce qu'ils n'étaient pas
ambigus : le **ratio repas cuisinés / repas affichés** (D4) et le **taux d'échec de
génération** (D6). Leurs seuils sont au §10 de l'arbitrage, qui reste la référence.

---

## 6. Les deux événements de diagnostic (2026-08-21)

Le rituel du §5 dit **quand** ça décroche. Ces deux-là commencent à dire **pourquoi** —
c'est leur seule raison d'exister, et ils n'en ont pas d'autre.

| Événement | Propriété | Ce qu'il mesure |
|---|---|---|
| `meal_swapped` | `meal_type` | « ce plat-là, non » — l'utilisateur demande une alternative |
| `recipe_disliked` | `meal_type` | « ce plat-là, plus jamais » — la recette est masquée (👎), réversible depuis le Profil |

**Ils ne se confondent pas avec `plan_regenerated`**, qui refait la semaine entière : ici
c'est UN repas qu'on refuse. Un plan qu'on régénère dit « cette semaine ne me va pas » ;
dix repas remplacés disent « le vivier est trop mince pour moi », et ce n'est pas la même
correction.

### 🔴 Ce qu'ils ne portent PAS, et pourquoi — l'ID de recette

La demande d'origine disait « avec l'ID de recette d'origine, pas le profil ». **L'ID n'est
pas envoyé**, et ce n'est pas de la prudence de principe :

- toutes les recettes servies à quelqu'un **respectent déjà son régime** — c'est le moteur
  qui les choisit ainsi ;
- l'identifiant PostHog est **pseudonyme et stable**, donc les événements d'un même
  appareil se regroupent ;
- ⇒ une dizaine d'ID de recettes rattachés au même identifiant **reconstituent le régime**,
  et « régime, restrictions » est dans l'interdit ABSOLU du §6 de l'arbitrage.

C'est le raisonnement déjà appliqué à `onboarding_blocked`, dont le motif a été retiré pour
la même raison : désigner un corps ou un régime sur un identifiant supprimable, ce n'est
pas anonyme.
➡️ **Si le besoin réel est la qualité du CATALOGUE** (« quelle recette se fait rejeter ? »),
ce n'est pas à l'analytics de le porter : c'est le canal de retour (`app/avis.tsx`) ou une
mesure locale, pas un événement attaché à un identifiant.
➡️ Pour la même raison, **pas de propriété « vivier bas »** sur `recipe_disliked` : un
vivier mince est un proxy direct du régime.

### Les seuils — écrits AVANT, comme l'exige le §2

> ⚠️ **Valeurs ARBITRAIRES, pas des mesures** — même statut que celles du §10 de
> l'arbitrage, et pour la même raison : aucune donnée Kyroz n'existe encore. Elles ne
> servent pas à avoir raison, elles servent à empêcher la rationalisation après coup.
> **Se relisent à la première lecture réelle**, et se corrigent alors **en le disant**.

| Décision | Seuil pré-écrit | Action si franchi |
|---|---|---|
| **D7** — le plan proposé ne convient pas | **médiane ≥ 10 `meal_swapped`** par appareil sur ses 14 premiers jours, sur une cohorte mensuelle | **Enquêter sur le VIVIER avant le moteur** : `npm run mesure:vivier`, régime par régime. Un catalogue trop mince ne se corrige pas en changeant la sélection |
| **D8** — le catalogue rejette trop | **médiane ≥ 5 `recipe_disliked`** par appareil sur 14 jours, mêmes conditions | Commander une vague de recettes sur les créneaux les plus touchés — le `meal_type` est là pour ça |

⚠️ **Les deux se lisent ensemble, jamais l'un sans l'autre.** Beaucoup de remplacements et
peu de 👎 = « je cherche autre chose aujourd'hui », un signal tiède. Beaucoup des deux = le
vivier ne convient pas à cette personne. Peu des deux avec un décrochage quand même = la
cause est ailleurs, et ces deux événements auront fait leur travail en l'écartant.

---

## 7. Ce que ce fichier périme

Trois formulations coexistaient. Aucune n'était absurde ; elles ne parlaient simplement
pas du même objet.

| Où | Ce qui y est écrit | Statut |
|---|---|---|
| `CLAUDE.md` (spec, §5 et §rôle) | « % d'utilisateurs avec 7 jours consécutifs d'**usage** dans les 14 premiers » | **La cible reste**, mais « usage » devient « cuisiné » et « consécutifs » tombe (§1). Note posée sur place. |
| `MONETISATION.md` | même phrase, comme garde-fou du paywall | L'argument tient mot pour mot sous la nouvelle définition — le paywall ne doit toucher ni la fenêtre de 14 jours ni le geste quotidien. Note posée sur place. |
| `docs/2026-08-10-…-arbitrage.md` §4.2 | « ne pas trancher maintenant, capter les deux » | ✅ **Tranché le 2026-08-20** — et la consigne a fait son travail : les deux événements étant captés depuis, la north star se calcule rétroactivement, sans rien coder. |
| `lib/streak.ts`, `app/(tabs)/plan.tsx` | la série appelée « North Star » | ❌ **Faux, corrigé le 2026-08-20.** Voir §2. |

⚠️ **Ce fichier ne fixe pas de seuil** (§4) et **ne change rien à l'écran** (§2). Il dit ce
que les chiffres veulent dire — c'est tout ce qu'on lui demande, et c'est ce qui manquait.
