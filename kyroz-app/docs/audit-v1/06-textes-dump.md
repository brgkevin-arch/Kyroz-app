# Textes Kyroz — dump verbatim (commit c850512)

> Extraction MÉCANIQUE, sans reformulation ni correction. Commentaires retirés avant extraction.
>
> ⚠️ **Compte corrigé le 2026-08-27 : 711 textes, en 53 blocs.** Deux corrections successives,
> et la seconde n'avait jamais été mesurée.
>
> **① 2026-08-26 — le seuil de 12 caractères.** L'extracteur imposait un minimum
> de 12 caractères aux fichiers hors `app/` et `components/`. Trente chaînes passaient dessous, dont
> **quatre titres de section** (`8. Sécurité`, `10. Mineurs`, `1. Objet`, `5. Compte`) et **les
> quatorze noms d'auteurs** des citations de rappel — c'est-à-dire précisément la matière des
> constats 06b-17 et 06b-19. Défaut relevé par l'étape 9.
>
> 🔴 **② 2026-08-27 — CETTE RÉPARATION AVAIT CASSÉ AUTRE CHOSE** (contre-audit `CA-4-02`).
> L'extracteur régénéré coupait chaque chaîne sur l'**apostrophe échappée**. Mesuré :
> **14 entrées finissant par une barre oblique inverse** et **7 fragments orphelins**.
> « Ce que Kyroz calcule — et ce qu'il n'est pas » devenait DEUX entrées, et la phrase la
> plus lourde juridiquement de l'app — « Kyroz n'est pas un dispositif médical… » —
> n'apparaissait NULLE PART : `grep "dispositif médical"` rendait **0** sur tout le dump.
> Le `DISCLAIMER` de `constants/legal.ts:15` était coupé de la même façon.
> ➡️ Le bloc `lib/methodologie.ts` n'est plus extrait par regex : il est **RENDU** par
> `methodologie()`. **31 textes réels remplacent 72 fragments.** Garde-fou :
> `lib/__tests__/corpusTextes.test.ts`.
> ⚠️ **C'est exactement ce que l'étape 6b doit relire** : elle a jugé ces textes en morceaux.
> Flag `⚑` (sans jugement) : le texte contient un chiffre, ou l'un des mots de la liste du brief.
> Rôles : titre · sous-titre · corps · bouton · lien · placeholder · label · aide · erreur · alerte · toast · vide · a11y · notification · légal · store.

## Inscription / connexion (`app/(auth)/login.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `app/(auth)/login.tsx:142` | corps | KYROZ |  |
| 2 | `app/(auth)/login.tsx:143` | corps | Ton plan nutrition, sans réfléchir. |  |
| 3 | `app/(auth)/login.tsx:159` | titre | Confirme ton adresse |  |
| 4 | `app/(auth)/login.tsx:160` | corps | Un code à … chiffres vient de partir vers <Text style=…>… |  |
| 5 | `app/(auth)/login.tsx:167` | bouton | Code à ${CODE_LONGUEUR} chiffres |  |
| 6 | `app/(auth)/login.tsx:181` | bouton | Confirmer mon adresse |  |
| 7 | `app/(auth)/login.tsx:194` | aide | Rien reçu ? Regarde dans les indésirables. Si tu as cliqué le lien de l'e-mail, ton adresse est déjà confirmée : connecte-toi. |  |
| 8 | `app/(auth)/login.tsx:199` | corps | Revenir à la connexion |  |
| 9 | `app/(auth)/login.tsx:214` | bouton | Email |  |
| 10 | `app/(auth)/login.tsx:215` | placeholder | toi@email.com |  |
| 11 | `app/(auth)/login.tsx:219` | bouton | Mot de passe |  |
| 12 | `app/(auth)/login.tsx:220` | placeholder | 6 caractères minimum | ⚑ |
| 13 | `app/(auth)/login.tsx:229` | corps | J'accepte que mes données (poids, taille, composition corporelle, objectif, régime) — des <Text style=…}>données de santé | ⚑ |
| 14 | `app/(auth)/login.tsx:230` | aide | données de santé | ⚑ |
| 15 | `app/(auth)/login.tsx:254` | corps | Mot de passe oublié ? |  |
| 16 | `app/(auth)/login.tsx:258` | corps | Connexion Apple & Google bientôt — avec l'app iOS. |  |
| 17 | `app/(auth)/login.tsx:268` | corps | ou |  |
| 18 | `app/(auth)/login.tsx:272` | corps | Continuer en invité |  |
| 19 | `app/(auth)/login.tsx:281` | corps | Politique de confidentialité & CGU |  |

## Onboarding (`app/(auth)/onboarding.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `app/(auth)/onboarding.tsx:449` | titre | Tes infos de base |  |
| 2 | `app/(auth)/onboarding.tsx:450` | aide | Pour calculer ton métabolisme et tes macros au plus juste. |  |
| 3 | `app/(auth)/onboarding.tsx:453` | label | Poids |  |
| 4 | `app/(auth)/onboarding.tsx:453` | label | kg |  |
| 5 | `app/(auth)/onboarding.tsx:454` | label | Taille |  |
| 6 | `app/(auth)/onboarding.tsx:454` | label | cm |  |
| 7 | `app/(auth)/onboarding.tsx:460` | titre | Ta masse grasse |  |
| 8 | `app/(auth)/onboarding.tsx:461` | aide | Choisis la silhouette la plus proche de toi, ou saisis ton % si tu le connais. |  |
| 9 | `app/(auth)/onboarding.tsx:477` | titre | Ton activité |  |
| 10 | `app/(auth)/onboarding.tsx:478` | aide | Deux choses, comptées séparément : ce que tu dépenses dans une journée ordinaire, et ce que tes séances y ajoutent. |  |
| 11 | `app/(auth)/onboarding.tsx:484` | corps | TES SÉANCES |  |
| 12 | `app/(auth)/onboarding.tsx:491` | bouton | Je ne fais pas de sport |  |
| 13 | `app/(auth)/onboarding.tsx:500` | titre | Ton objectif |  |
| 14 | `app/(auth)/onboarding.tsx:501` | aide | Le plan sera calibré précisément pour ça. | ⚑ |
| 15 | `app/(auth)/onboarding.tsx:523` | corps | Passer en Maintien |  |
| 16 | `app/(auth)/onboarding.tsx:532` | titre | Tes préférences |  |
| 17 | `app/(auth)/onboarding.tsx:533` | aide | Pour des recettes qui te ressemblent vraiment. |  |
| 18 | `app/(auth)/onboarding.tsx:535` | corps | Régime |  |
| 19 | `app/(auth)/onboarding.tsx:542` | corps | Protéines préférées |  |
| 20 | `app/(auth)/onboarding.tsx:551` | corps | Variété des repas |  |
| 21 | `app/(auth)/onboarding.tsx:552` | aide | Tu préfères la routine ou la diversité ? |  |
| 22 | `app/(auth)/onboarding.tsx:567` | titre | Tes jours de plan |  |
| 23 | `app/(auth)/onboarding.tsx:583` | corps | Jours de repos |  |
| 24 | `app/(auth)/onboarding.tsx:611` | label | Aucun |  |
| 25 | `app/(auth)/onboarding.tsx:614` | corps | Repas inclus |  |
| 26 | `app/(auth)/onboarding.tsx:618` | aide | Coche ce que tu manges dans une journée. |  |
| 27 | `app/(auth)/onboarding.tsx:625` | aide | Sélectionne au moins 1 repas. | ⚑ |
| 28 | `app/(auth)/onboarding.tsx:719` | label | Ton prénom |  |

## Plan (accueil) (`app/(tabs)/plan.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `app/(tabs)/plan.tsx:885` | corps | de série |  |
| 2 | `app/(tabs)/plan.tsx:909` | corps | C'est le moment de te peser |  |
| 3 | `app/(tabs)/plan.tsx:910` | corps | Mets à jour ton poids — on réajuste tes macros et ton plan. |  |
| 4 | `app/(tabs)/plan.tsx:921` | corps | Ton plan te convient toujours ? | ⚑ |
| 5 | `app/(tabs)/plan.tsx:922` | corps | Dis-nous ce qui coince — on ajuste en un tap. |  |
| 6 | `app/(tabs)/plan.tsx:933` | corps | Ton plan (… j) ne correspond plus à tes réglages (… j). |  |
| 7 | `app/(tabs)/plan.tsx:1012` | aide | … plan <Text style=…}>… kcal assumées`} |  |
| 8 | `app/(tabs)/plan.tsx:1020` | aide | Retirer |  |
| 9 | `app/(tabs)/plan.tsx:1033` | corps | + J'ai mangé hors plan |  |
| 10 | `app/(tabs)/plan.tsx:1043` | corps | Ma répartition (%) |  |
| 11 | `app/(tabs)/plan.tsx:1071` | corps | Repas du jour |  |
| 12 | `app/(tabs)/plan.tsx:1098` | corps | Nouveau plan en route… |  |
| 13 | `app/(tabs)/plan.tsx:1107` | vide | Prêt à démarrer ? |  |
| 14 | `app/(tabs)/plan.tsx:1108` | vide | Kyroz génère ton plan repas, les recettes et la liste de courses en un instant. |  |
| 15 | `app/(tabs)/plan.tsx:1110` | bouton | Générer mon plan |  |
| 16 | `app/(tabs)/plan.tsx:1120` | titre | Plan |  |
| 17 | `app/(tabs)/plan.tsx:1217` | titre | +… kcal assumées, c'est noté |  |
| 18 | `app/(tabs)/plan.tsx:1225` | aide | Tes repas du jour sont déjà passés — il n'y a plus rien à réadapter. On garde tout tel quel. |  |
| 19 | `app/(tabs)/plan.tsx:1229` | aide | Compris |  |
| 20 | `app/(tabs)/plan.tsx:1263` | aide | reprend … kcal |  |
| 21 | `app/(tabs)/plan.tsx:1271` | aide | Non, je garde mon plan |  |
| 22 | `app/(tabs)/plan.tsx:1317` | aide | Ta journée s'arrête … kcal sous ta cible : les portions de tes repas ne peuvent pas monter plus haut. Une journée sous la cible ne compromet rien. |  |

## Recettes (`app/(tabs)/recettes.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `app/(tabs)/recettes.tsx:201` | titre | Recettes |  |
| 2 | `app/(tabs)/recettes.tsx:221` | placeholder | Rechercher une recette |  |
| 3 | `app/(tabs)/recettes.tsx:266` | corps | … maintenant · $… presque` : `$… recette$…`} |  |
| 4 | `app/(tabs)/recettes.tsx:305` | vide | … ».` : surReserve ? reserve.length === 0 ? "Ta réserve est vide. Remplis-la depuis l'onglet Réserve, ou termine une sortie de courses." : "Rien de réalisable avec ce que tu as pour l'instant, même à un ou deux ingrédients près." : "Aucune recette en favori pour l'instant."} | ⚑ |
| 5 | `app/(tabs)/recettes.tsx:329` | corps | <Text style=…>… |  |
| 6 | `app/(tabs)/recettes.tsx:346` | corps | Tu as tout ce qu'il faut |  |
| 7 | `app/(tabs)/recettes.tsx:348` | corps | Il te manque : … ($…)`).join(', ')} |  |
| 8 | `app/(tabs)/recettes.tsx:415` | titre | Recettes |  |

## Courses (`app/(tabs)/courses.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `app/(tabs)/courses.tsx:411` | titre | Ajouter un article |  |
| 2 | `app/(tabs)/courses.tsx:414` | bouton | Nom |  |
| 3 | `app/(tabs)/courses.tsx:417` | placeholder | Café |  |
| 4 | `app/(tabs)/courses.tsx:443` | bouton | Quantité (facultatif) |  |
| 5 | `app/(tabs)/courses.tsx:458` | bouton | Ajouter |  |
| 6 | `app/(tabs)/courses.tsx:459` | bouton | Annuler |  |
| 7 | `app/(tabs)/courses.tsx:499` | vide | … de ta liste. Ton plan de repas, lui, n'a pas changé.` : covered ? 'Ta réserve couvre déjà tout le plan de la semaine. La liste réapparaîtra dès qu\'il te manquera quelque chose.' : 'Génère un plan repas et ta liste de courses apparaît ici, triée par rayon.'} |  |
| 8 | `app/(tabs)/courses.tsx:513` | corps | Ajouter un article |  |
| 9 | `app/(tabs)/courses.tsx:522` | corps | Rétablir ma liste |  |
| 10 | `app/(tabs)/courses.tsx:534` | corps | Mes courses passées |  |
| 11 | `app/(tabs)/courses.tsx:581` | titre | Courses |  |
| 12 | `app/(tabs)/courses.tsx:591` | a11y | Ajouter un article |  |
| 13 | `app/(tabs)/courses.tsx:612` | corps | Tout cocher |  |
| 14 | `app/(tabs)/courses.tsx:617` | corps | Masquer cochés |  |
| 15 | `app/(tabs)/courses.tsx:622` | corps | Réinitialiser |  |
| 16 | `app/(tabs)/courses.tsx:628` | corps | Historique |  |
| 17 | `app/(tabs)/courses.tsx:660` | corps | Rétablir |  |
| 18 | `app/(tabs)/courses.tsx:670` | corps | Coche ce que tu prends. « Courses terminées » range le tout dans ta réserve. Appui long → tu retires un article de la liste. |  |
| 19 | `app/(tabs)/courses.tsx:755` | titre | Courses |  |

## Réserve (`app/(tabs)/reserve.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `app/(tabs)/reserve.tsx:200` | titre | Réserve |  |
| 2 | `app/(tabs)/reserve.tsx:226` | vide | Ta réserve est vide |  |
| 3 | `app/(tabs)/reserve.tsx:227` | vide | Ajoute ce que tu as déjà — ou fais tes courses : « Courses terminées » range tout ce que tu as coché ici, au frais ou au sec. |  |
| 4 | `app/(tabs)/reserve.tsx:233` | corps | Ajouter un aliment |  |
| 5 | `app/(tabs)/reserve.tsx:239` | corps | Touche une quantité pour la modifier. |  |
| 6 | `app/(tabs)/reserve.tsx:240` | bouton | Vider |  |
| 7 | `app/(tabs)/reserve.tsx:318` | titre | Réserve |  |
| 8 | `app/(tabs)/reserve.tsx:329` | titre | Ajouter un aliment |  |
| 9 | `app/(tabs)/reserve.tsx:330` | label | Nom |  |
| 10 | `app/(tabs)/reserve.tsx:330` | placeholder | Blanc de poulet |  |
| 11 | `app/(tabs)/reserve.tsx:348` | label | Quantité |  |
| 12 | `app/(tabs)/reserve.tsx:356` | bouton | Ajouter |  |
| 13 | `app/(tabs)/reserve.tsx:357` | bouton | Annuler |  |
| 14 | `app/(tabs)/reserve.tsx:362` | titre | Modifier la quantité |  |
| 15 | `app/(tabs)/reserve.tsx:365` | a11y | Diminuer la quantité |  |
| 16 | `app/(tabs)/reserve.tsx:369` | label | Quantité |  |
| 17 | `app/(tabs)/reserve.tsx:371` | a11y | Augmenter la quantité |  |
| 18 | `app/(tabs)/reserve.tsx:378` | corps | RANGEMENT |  |
| 19 | `app/(tabs)/reserve.tsx:384` | corps | Descends à 0 pour retirer cet aliment de ta réserve. | ⚑ |
| 20 | `app/(tabs)/reserve.tsx:392` | bouton | Annuler |  |
| 21 | `app/(tabs)/reserve.tsx:407` | bouton | Annuler |  |

## Profil & réglages (`app/(tabs)/profil.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `app/(tabs)/profil.tsx:475` | titre | Profil |  |
| 2 | `app/(tabs)/profil.tsx:486` | corps | de série |  |
| 3 | `app/(tabs)/profil.tsx:502` | a11y | Réglages |  |
| 4 | `app/(tabs)/profil.tsx:542` | corps | Ton poids est descendu sous la plage de référence pour ta taille. Kyroz a ramené ton plan à ta maintenance : plus de déficit tant que tu es dans cette zone. Tu n'as rien à faire dans l'immédiat — touche ici quand tu veux choisir un autre objectif. |  |
| 5 | `app/(tabs)/profil.tsx:563` | corps | Cette semaine, tu manges à ta maintenance. C'est prévu : après huit semaines de déficit d'affilée, Kyroz en intercale une à l'équilibre. Ton déficit reprend tout seul la semaine prochaine, et ta date d'objectif en tient déjà compte. |  |
| 6 | `app/(tabs)/profil.tsx:579` | corps | Tes cibles |  |
| 7 | `app/(tabs)/profil.tsx:614` | corps | Dépense estimée · maintenance (TDEE) |  |
| 8 | `app/(tabs)/profil.tsx:643` | corps | TOI |  |
| 9 | `app/(tabs)/profil.tsx:645` | label | Informations |  |
| 10 | `app/(tabs)/profil.tsx:646` | label | Sport & activité |  |
| 11 | `app/(tabs)/profil.tsx:652` | corps | TON OBJECTIF |  |
| 12 | `app/(tabs)/profil.tsx:654` | label | Objectif |  |
| 13 | `app/(tabs)/profil.tsx:655` | label | Objectif daté |  |
| 14 | `app/(tabs)/profil.tsx:656` | label | Calories & macros |  |
| 15 | `app/(tabs)/profil.tsx:659` | corps | TES REPAS |  |
| 16 | `app/(tabs)/profil.tsx:661` | label | Préférences alimentaires |  |
| 17 | `app/(tabs)/profil.tsx:665` | label | Paramètres des repas |  |
| 18 | `app/(tabs)/profil.tsx:671` | label | Jours plus copieux |  |
| 19 | `app/(tabs)/profil.tsx:678` | label | Écarts passés |  |
| 20 | `app/(tabs)/profil.tsx:688` | corps | Régénérer mon plan |  |
| 21 | `app/(tabs)/profil.tsx:697` | label | Kyroz+ |  |
| 22 | `app/(tabs)/profil.tsx:702` | titre | Profil |  |
| 23 | `app/(tabs)/profil.tsx:781` | titre | Supprimer mon compte ? |  |
| 24 | `app/(tabs)/profil.tsx:782` | aide | Toutes tes données (profil, plans, série, favoris, réserve) seront définitivement supprimées, sur cet appareil et sur le serveur. |  |
| 25 | `app/(tabs)/profil.tsx:793` | aide | Annuler |  |
| 26 | `app/(tabs)/profil.tsx:839` | bouton | Enregistrer |  |
| 27 | `app/(tabs)/profil.tsx:907` | titre | Informations |  |
| 28 | `app/(tabs)/profil.tsx:915` | corps | … Tu peux le changer dans « Objectif ». |  |
| 29 | `app/(tabs)/profil.tsx:922` | label | Prénom |  |
| 30 | `app/(tabs)/profil.tsx:922` | placeholder | Ton prénom |  |
| 31 | `app/(tabs)/profil.tsx:924` | corps | Date de naissance |  |
| 32 | `app/(tabs)/profil.tsx:932` | aide | Poids |  |
| 33 | `app/(tabs)/profil.tsx:935` | corps | Me peser |  |
| 34 | `app/(tabs)/profil.tsx:938` | aide | Ton poids se met à jour en te pesant : c'est ce qui garde ta courbe et ton suivi justes. |  |
| 35 | `app/(tabs)/profil.tsx:941` | label | Taille |  |
| 36 | `app/(tabs)/profil.tsx:941` | label | cm |  |
| 37 | `app/(tabs)/profil.tsx:942` | corps | Masse grasse (optionnel) |  |
| 38 | `app/(tabs)/profil.tsx:982` | corps | Tu sèches depuis plus de 3 mois. Pour protéger ton énergie sur la durée, Kyroz remonte doucement tes calories — environ … kcal par semaine, encore … semaine…. Tu n'as rien à changer. | ⚑ |
| 39 | `app/(tabs)/profil.tsx:986` | corps | Après un long déficit, Kyroz t'a ramenée à un niveau qui protège ton énergie : tes calories ne baisseront plus tant que tu restes ici. Tu n'as rien à faire dans l'immédiat — touche ici quand tu veux choisir un autre objectif. |  |
| 40 | `app/(tabs)/profil.tsx:1068` | corps | Ton budget est passé de … à … kcal/jour (……). … |  |
| 41 | `app/(tabs)/profil.tsx:1076` | corps | Régler mon activité |  |
| 42 | `app/(tabs)/profil.tsx:1079` | corps | C'est noté |  |
| 43 | `app/(tabs)/profil.tsx:1102` | titre | Sport & activité |  |
| 44 | `app/(tabs)/profil.tsx:1108` | corps | TES SÉANCES |  |
| 45 | `app/(tabs)/profil.tsx:1109` | aide | Tes sports servent à estimer tes calories dépensées. Plus c'est précis, plus ton plan l'est. | ⚑ |
| 46 | `app/(tabs)/profil.tsx:1124` | titre | Objectif |  |
| 47 | `app/(tabs)/profil.tsx:1283` | titre | Objectif daté |  |
| 48 | `app/(tabs)/profil.tsx:1284` | aide | Fixe un poids et une échéance : Kyroz ajuste tes calories jour après jour pour t'y amener au rythme le plus rapide — mais sûr. | ⚑ |
| 49 | `app/(tabs)/profil.tsx:1288` | label | Poids cible |  |
| 50 | `app/(tabs)/profil.tsx:1288` | label | kg |  |
| 51 | `app/(tabs)/profil.tsx:1302` | aide | À … kg, la première date que Kyroz peut tenir en sécurité : le …. | ⚑ |
| 52 | `app/(tabs)/profil.tsx:1311` | corps | Viser cette date |  |
| 53 | `app/(tabs)/profil.tsx:1316` | aide | À … kg, aucune date ne tient dans les cinq ans à venir, même au rythme le plus rapide que la sécurité autorise. Vise un poids intermédiaire : le plancher baissera avec ton poids, et la suite deviendra possible. | ⚑ |
| 54 | `app/(tabs)/profil.tsx:1324` | corps | Échéance |  |
| 55 | `app/(tabs)/profil.tsx:1335` | aide | Pose la date que tu vises — un mariage, une compétition, des vacances. |  |
| 56 | `app/(tabs)/profil.tsx:1372` | aide | … — c'est plus tôt que ce que Kyroz peut tenir : au rythme sûr, ce sera le $….` : `Cible le $… — ce poids n'est pas atteignable au rythme sûr, quelle que soit la date.`) : `Cible le $….`} |  |
| 57 | `app/(tabs)/profil.tsx:1406` | corps | Ce poids cible va dans le sens inverse de ton objectif « … ». Kyroz ne pilote pas tes calories tant que les deux ne concordent pas. |  |
| 58 | `app/(tabs)/profil.tsx:1435` | corps | Objectif ambitieux : au rythme le plus sûr tu atteins … kg …` : ' plus tard que prévu'}, après ta date.… … |  |
| 59 | `app/(tabs)/profil.tsx:1453` | corps | Ton plan ne peut pas descendre sous … kcal/jour en sécurité — c'est ton plancher, pas un réglage.… … kg le …. Tu peux viser cette date-là, ou choisir un poids cible plus proche : Kyroz ne creusera pas davantage.</> ) : ( <>À ce rythme, ce poids cible n'est pas atteignable quelle que soit la date. Choisis une cible plus proche, ou laisse le temps faire : ton poids qui baisse fera baisser le plancher avec lui.</> )} | ⚑ |
| 60 | `app/(tabs)/profil.tsx:1470` | aide | Rythme sûr, dans les clous de ta date. |  |
| 61 | `app/(tabs)/profil.tsx:1479` | corps | Ton plancher de sécurité est à … kcal/jour : en dessous, ton corps n'a plus assez d'énergie pour fonctionner correctement. Plus tu t'entraînes, plus ce plancher monte — c'est normal, l'énergie de tes séances ne compte pas comme énergie disponible. | ⚑ |
| 62 | `app/(tabs)/profil.tsx:1485` | aide | Tu es déjà à ton poids cible : Kyroz vise le maintien. |  |
| 63 | `app/(tabs)/profil.tsx:1492` | corps | Retirer l'objectif daté |  |
| 64 | `app/(tabs)/profil.tsx:1530` | titre | Calories & macros |  |
| 65 | `app/(tabs)/profil.tsx:1563` | titre | Préférences |  |
| 66 | `app/(tabs)/profil.tsx:1564` | corps | Régime |  |
| 67 | `app/(tabs)/profil.tsx:1566` | corps | Protéines préférées |  |
| 68 | `app/(tabs)/profil.tsx:1572` | aide | Les recettes que tu as marquées « j'aime pas ». Touche-en une pour la réafficher. |  |
| 69 | `app/(tabs)/profil.tsx:1575` | label | ${r.name}  ✕ |  |
| 70 | `app/(tabs)/profil.tsx:1606` | corps | Jours de repos |  |
| 71 | `app/(tabs)/profil.tsx:1628` | label | Aucun |  |
| 72 | `app/(tabs)/profil.tsx:1726` | titre | Paramètres des repas |  |
| 73 | `app/(tabs)/profil.tsx:1727` | corps | Jours du plan |  |
| 74 | `app/(tabs)/profil.tsx:1729` | corps | Repas inclus |  |
| 75 | `app/(tabs)/profil.tsx:1738` | corps | Sélectionne au moins 1 repas. | ⚑ |
| 76 | `app/(tabs)/profil.tsx:1746` | corps | Repas cochés automatiquement |  |
| 77 | `app/(tabs)/profil.tsx:1753` | aide | {repasAuto ? "Un repas non marqué passe en « mangé » une heure après le début du suivant — le dernier, en fin de journée. Ses ingrédients quittent ta réserve, et un repas coché ne revient pas en arrière." |  |
| 78 | `app/(tabs)/profil.tsx:1768` | corps | Repas que tu gères toi-même |  |
| 79 | `app/(tabs)/profil.tsx:1769` | aide | Définis-les une fois : Kyroz les compte dans ton total et cale tes autres repas autour, sans te les redemander chaque jour. |  |
| 80 | `app/(tabs)/profil.tsx:1781` | aide | … · $… kcal` : 'Kyroz le planifie'} |  |
| 81 | `app/(tabs)/profil.tsx:1789` | aide | Retirer |  |
| 82 | `app/(tabs)/profil.tsx:1801` | corps | Tu manges plus à quel moment ? |  |
| 83 | `app/(tabs)/profil.tsx:1811` | label | Équilibré |  |
| 84 | `app/(tabs)/profil.tsx:1813` | corps | Variété |  |
| 85 | `app/(tabs)/profil.tsx:1951` | titre | Jours plus copieux |  |
| 86 | `app/(tabs)/profil.tsx:1952` | aide | Certains jours sont plus copieux que d'autres — le repas de famille du dimanche, la soirée du samedi. Dis-le à Kyroz : il sert plus ce jour-là et reprend l'écart sur tes autres jours. Le total de ta semaine ne bouge pas, tes protéines non plus, et aucun jour ne descend sous ton plancher de sécurité. | ⚑ |
| 87 | `app/(tabs)/profil.tsx:1964` | aide | C'est un rythme, pas un événement : ton réglage vaut pour chaque semaine, tant que tu ne le changes pas. |  |
| 88 | `app/(tabs)/profil.tsx:1977` | corps | Ta cible est déjà à ton minimum |  |
| 89 | `app/(tabs)/profil.tsx:1980` | aide | Tes … kcal/jour correspondent à ton métabolisme de base : l'énergie que ton corps dépense au repos. On ne descend pas en dessous, même un seul jour — la banque n'a donc rien à emprunter sur ta semaine. … Si tu comptais sécher, ça vaut le coup de vérifier deux choses : ta… <Text style=…}>masse grasse |  |
| 90 | `app/(tabs)/profil.tsx:1986` | corps | masse grasse |  |
| 91 | `app/(tabs)/profil.tsx:1987` | corps | poids |  |
| 92 | `app/(tabs)/profil.tsx:1994` | corps | Le jour concerné |  |
| 93 | `app/(tabs)/profil.tsx:2006` | aide | Choisis d'abord tes jours de plan dans « Paramètres des repas ». |  |
| 94 | `app/(tabs)/profil.tsx:2013` | corps | Combien en plus ce jour-là ? |  |
| 95 | `app/(tabs)/profil.tsx:2016` | label | +${k} |  |
| 96 | `app/(tabs)/profil.tsx:2018` | label | Aucun |  |
| 97 | `app/(tabs)/profil.tsx:2021` | bouton | Ou une valeur précise | ⚑ |
| 98 | `app/(tabs)/profil.tsx:2021` | label | kcal |  |
| 99 | `app/(tabs)/profil.tsx:2035` | corps | Ta semaine après répartition |  |
| 100 | `app/(tabs)/profil.tsx:2047` | aide | … kcal…$…)` : ''} |  |
| 101 | `app/(tabs)/profil.tsx:2058` | aide | Sur cette semaine, … kcal ne peuvent pas être reprises : les autres jours sont déjà à ton plancher de sécurité. Ta semaine finira un peu au-dessus de sa cible, et c'est très bien — le plancher passe avant. | ⚑ |

## Kyroz+ (paywall) (`app/kyroz-plus.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `app/kyroz-plus.tsx:164` | corps | Kyroz+ |  |
| 2 | `app/kyroz-plus.tsx:172` | corps | Ce que Kyroz+ ajoute |  |
| 3 | `app/kyroz-plus.tsx:193` | corps | Ce qui reste gratuit |  |
| 4 | `app/kyroz-plus.tsx:201` | corps | Choisis ta formule |  |
| 5 | `app/kyroz-plus.tsx:207` | titre | ${p.label} — ${p.price} |  |
| 6 | `app/kyroz-plus.tsx:221` | corps | L'abonnement s'achète depuis l'app iPhone ou Android. Le navigateur ne peut pas encaisser le paiement. |  |
| 7 | `app/kyroz-plus.tsx:241` | corps | Restaurer mes achats |  |
| 8 | `app/kyroz-plus.tsx:246` | corps | L'abonnement n'est pas encore ouvert sur cette version de l'app. Tes deux outils restent actifs en attendant. |  |
| 9 | `app/kyroz-plus.tsx:254` | corps | Le paiement est débité de ton compte … à la confirmation de l'achat. L'abonnement se renouvelle automatiquement au même tarif à la fin de chaque période, sauf si tu le désactives au moins 24 h avant. Tu peux le gérer ou l'arrêter à tout moment dans les réglages de ton compte …. | ⚑ |
| 10 | `app/kyroz-plus.tsx:261` | corps | Les montants ci-dessus sont les tarifs français. Le prix exact de ton pays s'affiche au moment de l'achat, avant toute validation. |  |
| 11 | `app/kyroz-plus.tsx:270` | corps | Conditions d'utilisation · Confidentialité |  |

## Avis / contact (`app/avis.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `app/avis.tsx:80` | corps | Donner mon avis |  |
| 2 | `app/avis.tsx:87` | corps | Kyroz est fait par une seule personne, et chaque retour est lu. Dis ce qui coince, ce qui manque, ou ce qui t'a plu. |  |
| 3 | `app/avis.tsx:91` | corps | De quoi s'agit-il ? |  |
| 4 | `app/avis.tsx:110` | corps | Ton message |  |
| 5 | `app/avis.tsx:118` | placeholder | Ce que tu veux nous dire… |  |
| 6 | `app/avis.tsx:127` | corps | Joint à ton message : …. Rien d'autre — ni ton poids, ni ton objectif, ni tes plans. |  |
| 7 | `app/avis.tsx:131` | bouton | Envoyer |  |
| 8 | `app/avis.tsx:132` | corps | Ton message s'ouvre dans ta messagerie : tu le relis, et c'est toi qui l'envoies. |  |

## Méthodologie (`app/methodologie.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `app/methodologie.tsx:33` | corps | Méthodologie & sources |  |
| 2 | `app/methodologie.tsx:37` | corps | Comment Kyroz calcule ce qu'il vous propose, et sur quoi il s'appuie. |  |
| 3 | `app/methodologie.tsx:57` | corps | Sources |  |
| 4 | `app/methodologie.tsx:67` | corps | …. <Text style=…>… |  |

## Légal (écran) (`app/legal.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `app/legal.tsx:27` | corps | Confidentialité & CGU |  |
| 2 | `app/legal.tsx:31` | corps | Politique de confidentialité |  |
| 3 | `app/legal.tsx:37` | corps | Conditions générales d'utilisation |  |


---

# Composants partagés

## AnalyticsConsentStep (`components/AnalyticsConsentStep.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/AnalyticsConsentStep.tsx:76` | titre | Aider à réparer Kyroz |  |
| 2 | `components/AnalyticsConsentStep.tsx:77` | aide | Kyroz tourne entièrement sur ton téléphone : sans mesure, on ne voit rien de ce qui casse chez toi. Tu peux nous laisser regarder comment l’app est utilisée — ou pas. Ça ne change strictement rien à ton plan. |  |
| 3 | `components/AnalyticsConsentStep.tsx:86` | corps | Ce qui serait mesuré |  |
| 4 | `components/AnalyticsConsentStep.tsx:99` | corps | Ce qui ne l’est jamais | ⚑ |
| 5 | `components/AnalyticsConsentStep.tsx:122` | corps | Les mesures sont rattachées à un identifiant pseudonyme tiré au hasard sur ton téléphone — jamais à ton compte, jamais à ton e-mail. Elles sont envoyées à PostHog, l’outil qui nous sert à les lire, et stockées sur ses serveurs de Francfort au moins un an. | ⚑ |
| 6 | `components/AnalyticsConsentStep.tsx:128` | corps | Tu peux changer d’avis quand tu veux dans Réglages, et demander la suppression de ce qui a déjà été envoyé. |  |
| 7 | `components/AnalyticsConsentStep.tsx:142` | corps | Tout est détaillé dans Confidentialité &amp; CGU |  |
| 8 | `components/AnalyticsConsentStep.tsx:158` | aide | Non merci |  |
| 9 | `components/AnalyticsConsentStep.tsx:167` | corps | D’accord |  |
| 10 | `components/AnalyticsConsentStep.tsx:170` | corps | Ton plan, tes recettes et tes courses fonctionnent pareil dans les deux cas. |  |

## BirthDateField (`components/BirthDateField.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/BirthDateField.tsx:74` | aide | Date de naissance |  |

## BirthDatePicker (`components/BirthDatePicker.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/BirthDatePicker.tsx:73` | titre | Ta date de naissance |  |
| 2 | `components/BirthDatePicker.tsx:74` | aide | Elle sert à calculer ton métabolisme, et ton âge se mettra à jour tout seul. |  |
| 3 | `components/BirthDatePicker.tsx:100` | bouton | Valider |  |

## BirthdayCelebration (`components/BirthdayCelebration.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/BirthdayCelebration.tsx:134` | titre | … !` : 'Joyeux anniversaire !'} |  |
| 2 | `components/BirthdayCelebration.tsx:137` | aide | … ans aujourd'hui. Kyroz a mis ton âge à jour tout seul — ton plan reste calé sur toi, sans que tu aies rien à toucher. |  |
| 3 | `components/BirthdayCelebration.tsx:142` | bouton | Merci |  |

## BodyFatPicker (`components/BodyFatPicker.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/BodyFatPicker.tsx:191` | bouton | Ou saisis ton % exact (si tu le connais) |  |
| 2 | `components/BodyFatPicker.tsx:220` | placeholder | ex. 18 | ⚑ |
| 3 | `components/BodyFatPicker.tsx:244` | corps | Ce chiffre, tu l'as mesuré ? |  |
| 4 | `components/BodyFatPicker.tsx:249` | bouton | Oui, avec un appareil |  |
| 5 | `components/BodyFatPicker.tsx:254` | bouton | Non, c'est une estimation |  |
| 6 | `components/BodyFatPicker.tsx:275` | corps | … kg de masse maigre` : `$… %, c'est un niveau d'athlète de compétition`} |  |
| 7 | `components/BodyFatPicker.tsx:280` | aide | … de ta taille. Si tu penses être au-delà, saisis un pourcentage à la main juste en dessous.` : `C'est au-dessus de ce que porte la quasi-totalité des $… de ta taille. Kyroz calcule ta dépense sur cette masse$… kcal/jour` : ''} — autant de déficit en moins si le % est trop bas. La silhouette la plus proche sera plus juste.` : impactKcal != null && impactKcal > 0 ? `Ce chiffre relève ta dépense estimée de $… kcal/jour — autant de déficit en moins si tu te trompes. En cas de doute, la silhouette la plus proche sera plus juste.` | ⚑ |
| 8 | `components/BodyFatPicker.tsx:299` | aide | Effacer ma sélection |  |

## ConfirmationEnLigne (`components/ConfirmationEnLigne.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/ConfirmationEnLigne.tsx:54` | corps | Annuler |  |

## DateInput (`components/DateInput.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/DateInput.tsx:77` | label | Jour |  |
| 2 | `components/DateInput.tsx:81` | label | Mois |  |
| 3 | `components/DateInput.tsx:85` | label | Année |  |

## DatedGoalCard (`components/DatedGoalCard.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/DatedGoalCard.tsx:91` | aide | …/$…` : `$… sem`} |  |
| 2 | `components/DatedGoalCard.tsx:108` | corps | Prochaine étape : … kg …` : ''} … kg` : ''} |  |
| 3 | `components/DatedGoalCard.tsx:114` | aide | … {status.underweightBlocked ? 'Plan ramené au maintien\u00A0· poids sous la plage de référence' : status.direction === 'maintain' ? 'Poids cible atteint\u00A0· maintien' : status.reachableByDate | ⚑ |

## DislikeSheet (`components/DislikeSheet.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/DislikeSheet.tsx:30` | titre | C'est quoi qui te gêne ? |  |
| 2 | `components/DislikeSheet.tsx:31` | aide | Tu as écarté pas mal de plats. Dis-nous l'ingrédient que tu n'aimes pas : on l'évite partout et on te ramène les plats qui ne le contiennent pas. |  |
| 3 | `components/DislikeSheet.tsx:48` | aide | dans … plat… écarté… |  |
| 4 | `components/DislikeSheet.tsx:62` | placeholder | Ex. coriandre… |  |
| 5 | `components/DislikeSheet.tsx:74` | corps | Plus tard |  |

## DislikedFoodsField (`components/DislikedFoodsField.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/DislikedFoodsField.tsx:62` | corps | Aliments à éviter |  |
| 2 | `components/DislikedFoodsField.tsx:68` | label | ${kw}  ✕ |  |
| 3 | `components/DislikedFoodsField.tsx:73` | bouton | Autre aliment ou allergène (arachide, crustacés…) |  |
| 4 | `components/DislikedFoodsField.tsx:76` | placeholder | Tape un aliment puis Entrée |  |
| 5 | `components/DislikedFoodsField.tsx:82` | aide | … » — ce mot n'écartera aucune recette.` : `« $… » écarte $… recette$… du catalogue.`} |  |
| 6 | `components/DislikedFoodsField.tsx:89` | aide | Sans effet, aucun ingrédient ne correspond : …. |  |

## ErrorBoundary (`components/ErrorBoundary.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/ErrorBoundary.tsx:17` | titre | Oups, quelque chose a cassé |  |
| 2 | `components/ErrorBoundary.tsx:18` | aide | Ce n'est pas toi, c'est nous. Tes données sont intactes. |  |
| 3 | `components/ErrorBoundary.tsx:26` | corps | Réessayer |  |

## FirstPlanReveal (`components/FirstPlanReveal.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/FirstPlanReveal.tsx:121` | bouton | Objectif |  |
| 2 | `components/FirstPlanReveal.tsx:122` | bouton | kcal |  |
| 3 | `components/FirstPlanReveal.tsx:128` | corps | Un aperçu de ta semaine |  |
| 4 | `components/FirstPlanReveal.tsx:145` | bouton | Voir mon plan |  |

## FixedMealSheet (`components/FixedMealSheet.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/FixedMealSheet.tsx:91` | aide | Dis-nous une fois ce que tu manges — Kyroz cale tes autres repas autour, sans te le redemander chaque jour. |  |
| 2 | `components/FixedMealSheet.tsx:106` | corps | Changer |  |
| 3 | `components/FixedMealSheet.tsx:110` | corps | Quantité |  |
| 4 | `components/FixedMealSheet.tsx:117` | corps | ≈ … kcal · …g P · …g G · …g L |  |
| 5 | `components/FixedMealSheet.tsx:126` | placeholder | Ex. flocons d'avoine… |  |
| 6 | `components/FixedMealSheet.tsx:138` | vide | Aucun aliment trouvé — bascule sur « Saisir mon repas ». |  |
| 7 | `components/FixedMealSheet.tsx:148` | placeholder | Nom (ex. Mon shaker + flocons) |  |
| 8 | `components/FixedMealSheet.tsx:151` | bouton | Protéines |  |
| 9 | `components/FixedMealSheet.tsx:152` | bouton | Glucides |  |
| 10 | `components/FixedMealSheet.tsx:153` | bouton | Lipides |  |

## GuidedTour (`components/GuidedTour.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/GuidedTour.tsx:644` | corps | Précédent |  |

## HydrationBar (`components/HydrationBar.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/HydrationBar.tsx:138` | titre | Hydratation |  |
| 2 | `components/HydrationBar.tsx:141` | aide | … / … L · … verre…… |  |
| 3 | `components/HydrationBar.tsx:147` | a11y | Réglages de l'hydratation |  |
| 4 | `components/HydrationBar.tsx:163` | a11y | Retirer un verre |  |
| 5 | `components/HydrationBar.tsx:171` | a11y | Ajouter un verre d'eau |  |
| 6 | `components/HydrationBar.tsx:173` | corps | + un verre |  |
| 7 | `components/HydrationBar.tsx:180` | titre | Hydratation |  |
| 8 | `components/HydrationBar.tsx:184` | corps | Objectif du jour |  |
| 9 | `components/HydrationBar.tsx:186` | aide | … L par jour · ≈ … verres de … ml |  |
| 10 | `components/HydrationBar.tsx:192` | corps | Taille du verre (ml) |  |
| 11 | `components/HydrationBar.tsx:201` | corps | OK |  |

## MacroBar (`components/MacroBar.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/MacroBar.tsx:61` | aide | Reste … kcal |  |
| 2 | `components/MacroBar.tsx:77` | aide | … g de protéines · … g de glucides · … g de lipides |  |

## MacroSplit (`components/MacroSplit.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/MacroSplit.tsx:64` | aide | Conseillé pour « … » : <Text style=…}>… g/kg |  |
| 2 | `components/MacroSplit.tsx:69` | corps | Renseigne ta masse grasse (Profil → Informations) pour caler les protéines sur ta masse maigre. |  |
| 3 | `components/MacroSplit.tsx:77` | aide | RÉPARTITION DU RESTE (après protéines) |  |
| 4 | `components/MacroSplit.tsx:79` | aide | → <Text style=…}>…% |  |
| 5 | `components/MacroSplit.tsx:85` | aide | Servi : <Text style=…}>…% |  |
| 6 | `components/MacroSplit.tsx:97` | corps | Plancher de sécurité atteint : Kyroz ne descend pas sous … kcal/jour pour ton gabarit et ton volume d'entraînement. | ⚑ |

## MealCard (`components/MealCard.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/MealCard.tsx:74` | aide | … … MIN`} |  |
| 2 | `components/MealCard.tsx:93` | aide | Tu gères ce repas — compté dans ton total |  |
| 3 | `components/MealCard.tsx:98` | aide | <Text style=…}>… |  |
| 4 | `components/MealCard.tsx:117` | aide | Il te manque : … |  |
| 5 | `components/MealCard.tsx:125` | a11y | Voir ces ingrédients dans ma liste de courses |  |
| 6 | `components/MealCard.tsx:127` | corps | Mes courses › |  |
| 7 | `components/MealCard.tsx:132` | aide | Tout est dans ta réserve |  |
| 8 | `components/MealCard.tsx:148` | bouton | J'aime cette recette |  |
| 9 | `components/MealCard.tsx:149` | bouton | Je n'aime pas — changer |  |
| 10 | `components/MealCard.tsx:150` | bouton | Changer de recette |  |
| 11 | `components/MealCard.tsx:185` | corps | J'ai cuisiné |  |

## MealSlotsPicker (`components/MealSlotsPicker.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/MealSlotsPicker.tsx:109` | corps | Modifier |  |
| 2 | `components/MealSlotsPicker.tsx:137` | aide | Ajouter un repas |  |
| 3 | `components/MealSlotsPicker.tsx:142` | aide | … repas par jour, c'est le maximum : en deçà de cette taille de portion, aucune recette du catalogue ne sait viser la cible. |  |
| 4 | `components/MealSlotsPicker.tsx:194` | bouton | Nom du repas |  |
| 5 | `components/MealSlotsPicker.tsx:195` | placeholder | Shaker post-training |  |
| 6 | `components/MealSlotsPicker.tsx:201` | bouton | Heure |  |
| 7 | `components/MealSlotsPicker.tsx:207` | bouton | Minutes |  |
| 8 | `components/MealSlotsPicker.tsx:207` | label | min |  |
| 9 | `components/MealSlotsPicker.tsx:213` | aide | Kyroz y sert plutôt |  |
| 10 | `components/MealSlotsPicker.tsx:215` | aide | C'est le vivier de recettes dans lequel Kyroz pioche pour ce créneau, et la taille de portion qu'il y vise. |  |
| 11 | `components/MealSlotsPicker.tsx:221` | aide | Donne un nom à ce repas pour le retrouver dans ton plan. |  |
| 12 | `components/MealSlotsPicker.tsx:223` | bouton | Enregistrer ce repas |  |
| 13 | `components/MealSlotsPicker.tsx:227` | aide | Annuler |  |
| 14 | `components/MealSlotsPicker.tsx:232` | corps | Supprimer |  |

## MessageEnLigne (`components/MessageEnLigne.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/MessageEnLigne.tsx:57` | corps | Fermer |  |

## MotDePasseOublie (`components/MotDePasseOublie.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/MotDePasseOublie.tsx:108` | titre | Mot de passe oublié |  |
| 2 | `components/MotDePasseOublie.tsx:109` | corps | Entre l'adresse de ton compte. On t'envoie un code à … chiffres pour en choisir un nouveau. |  |
| 3 | `components/MotDePasseOublie.tsx:116` | bouton | Email |  |
| 4 | `components/MotDePasseOublie.tsx:117` | placeholder | toi@email.com |  |
| 5 | `components/MotDePasseOublie.tsx:124` | bouton | Recevoir un code |  |
| 6 | `components/MotDePasseOublie.tsx:130` | titre | Entre ton code |  |
| 7 | `components/MotDePasseOublie.tsx:131` | corps | Si un compte existe pour <Text style=…>… |  |
| 8 | `components/MotDePasseOublie.tsx:138` | bouton | Code à ${CODE_LONGUEUR} chiffres |  |
| 9 | `components/MotDePasseOublie.tsx:148` | bouton | Valider le code |  |
| 10 | `components/MotDePasseOublie.tsx:156` | aide | Rien reçu ? Regarde dans les indésirables. |  |
| 11 | `components/MotDePasseOublie.tsx:162` | titre | Nouveau mot de passe |  |
| 12 | `components/MotDePasseOublie.tsx:163` | corps | Choisis-en un nouveau. Il remplace l'ancien immédiatement. |  |
| 13 | `components/MotDePasseOublie.tsx:168` | bouton | Nouveau mot de passe |  |
| 14 | `components/MotDePasseOublie.tsx:169` | placeholder | ${MDP_LONGUEUR_MIN} caractères minimum |  |
| 15 | `components/MotDePasseOublie.tsx:177` | bouton | Enregistrer et continuer |  |
| 16 | `components/MotDePasseOublie.tsx:186` | corps | Revenir à la connexion |  |

## NeatPicker (`components/NeatPicker.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/NeatPicker.tsx:38` | corps | TES JOURNÉES, HORS SPORT |  |
| 2 | `components/NeatPicker.tsx:39` | aide | Ce que tu dépenses sans y penser : boulot, trajets, courses. Ne compte pas tes séances ici, elles sont comptées juste en dessous. |  |

## OffPlanHistory (`components/OffPlanHistory.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/OffPlanHistory.tsx:52` | titre | Mes repas hors plan |  |
| 2 | `components/OffPlanHistory.tsx:53` | aide | Ce que tu as mangé en dehors du plan, et ce que Kyroz en a fait. Rien à en tirer d'autre : une journée ne fait pas ta semaine. |  |
| 3 | `components/OffPlanHistory.tsx:61` | vide | Rien pour l'instant |  |
| 4 | `components/OffPlanHistory.tsx:62` | vide | Quand tu déclares un repas hors plan depuis l'écran Plan, il s'inscrit ici avec les calories que tes repas suivants ont reprises. |  |
| 5 | `components/OffPlanHistory.tsx:85` | a11y | Retirer cette ligne — ${frDate(e.date)} |  |
| 6 | `components/OffPlanHistory.tsx:97` | bouton | Retirer |  |
| 7 | `components/OffPlanHistory.tsx:108` | corps | Gardé sur ton téléphone uniquement, jamais envoyé — comme tes photos de progression. Les lignes de plus de six mois s'effacent toutes seules. | ⚑ |

## OffPlanSheet (`components/OffPlanSheet.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/OffPlanSheet.tsx:68` | titre | J'ai mangé hors plan |  |
| 2 | `components/OffPlanSheet.tsx:69` | aide | Cherche l'aliment dans notre base, ou estime à la louche. |  |
| 3 | `components/OffPlanSheet.tsx:84` | corps | Changer |  |
| 4 | `components/OffPlanSheet.tsx:88` | corps | Quantité |  |
| 5 | `components/OffPlanSheet.tsx:105` | placeholder | Ex. tarte aux fraises… |  |
| 6 | `components/OffPlanSheet.tsx:118` | vide | Aucun aliment trouvé — bascule sur « Estimer vite ». |  |
| 7 | `components/OffPlanSheet.tsx:143` | corps | Ou un chiffre précis | ⚑ |
| 8 | `components/OffPlanSheet.tsx:149` | corps | kcal |  |

## PlanCheckin (`components/PlanCheckin.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/PlanCheckin.tsx:40` | titre | Ton plan te convient ? |  |
| 2 | `components/PlanCheckin.tsx:50` | bouton | Oui, il me va bien |  |
| 3 | `components/PlanCheckin.tsx:51` | bouton | Trop répétitif |  |
| 4 | `components/PlanCheckin.tsx:52` | bouton | Je veux changer d'objectif ou mes macros |  |
| 5 | `components/PlanCheckin.tsx:53` | bouton | Juste un nouveau plan |  |
| 6 | `components/PlanCheckin.tsx:56` | corps | Ne plus me demander |  |
| 7 | `components/PlanCheckin.tsx:58` | corps | Tu pourras réactiver ces propositions dans Profil. |  |

## RecipeDetail (`components/RecipeDetail.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/RecipeDetail.tsx:93` | a11y | Personnaliser cette recette |  |
| 2 | `components/RecipeDetail.tsx:97` | a11y | J'aime cette recette |  |
| 3 | `components/RecipeDetail.tsx:101` | a11y | Je n'aime pas — changer |  |
| 4 | `components/RecipeDetail.tsx:105` | a11y | Fermer |  |
| 5 | `components/RecipeDetail.tsx:113` | corps | Personnalisée |  |
| 6 | `components/RecipeDetail.tsx:140` | corps | Aucune recette adaptée à ton régime pour ce repas — option standard. |  |
| 7 | `components/RecipeDetail.tsx:166` | corps | INGRÉDIENTS |  |
| 8 | `components/RecipeDetail.tsx:176` | corps | PRÉPARATION |  |
| 9 | `components/RecipeDetail.tsx:203` | corps | Remplacer ce repas |  |
| 10 | `components/RecipeDetail.tsx:209` | corps | Ce remplacement vaut pour ce plan. Si ce plat ne te plaît pas du tout, « je n'aime pas » l'écarte pour de bon. |  |
| 11 | `components/RecipeDetail.tsx:217` | corps | Je l'ai sauté |  |
| 12 | `components/RecipeDetail.tsx:220` | bouton | J'ai mangé — retirer de ma réserve |  |

## RecipeEditor (`components/RecipeEditor.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/RecipeEditor.tsx:111` | titre | Personnaliser la recette |  |
| 2 | `components/RecipeEditor.tsx:112` | aide | Ajuste-la comme TU l'aimes — ta version sera utilisée partout. |  |
| 3 | `components/RecipeEditor.tsx:116` | label | Nom |  |
| 4 | `components/RecipeEditor.tsx:119` | label | Temps |  |
| 5 | `components/RecipeEditor.tsx:119` | label | min |  |
| 6 | `components/RecipeEditor.tsx:120` | label | Portions |  |
| 7 | `components/RecipeEditor.tsx:123` | corps | INGRÉDIENTS |  |
| 8 | `components/RecipeEditor.tsx:124` | corps | Cherche un aliment pour lier ses macros — le calcul se met à jour tout seul. |  |
| 9 | `components/RecipeEditor.tsx:133` | placeholder | Cherche un aliment… |  |
| 10 | `components/RecipeEditor.tsx:145` | corps | macros liées à la base |  |
| 11 | `components/RecipeEditor.tsx:156` | vide | Aucun aliment trouvé — il restera libre (macros à saisir à la main). |  |
| 12 | `components/RecipeEditor.tsx:164` | corps | Ajouter un ingrédient |  |
| 13 | `components/RecipeEditor.tsx:167` | corps | MACROS / PORTION |  |
| 14 | `components/RecipeEditor.tsx:177` | bouton | kcal |  |
| 15 | `components/RecipeEditor.tsx:178` | bouton | Prot. |  |
| 16 | `components/RecipeEditor.tsx:179` | bouton | Gluc. |  |
| 17 | `components/RecipeEditor.tsx:180` | bouton | Lip. |  |
| 18 | `components/RecipeEditor.tsx:190` | corps | Lie au moins un ingrédient à la base pour calculer les macros, ou passe en Manuel. |  |
| 19 | `components/RecipeEditor.tsx:195` | label | Calories |  |
| 20 | `components/RecipeEditor.tsx:195` | label | kcal |  |
| 21 | `components/RecipeEditor.tsx:196` | label | Protéines |  |
| 22 | `components/RecipeEditor.tsx:199` | label | Glucides |  |
| 23 | `components/RecipeEditor.tsx:200` | label | Lipides |  |
| 24 | `components/RecipeEditor.tsx:202` | corps | Astuce : ajuste les macros si tu changes une quantité, pour garder ton plan précis. | ⚑ |
| 25 | `components/RecipeEditor.tsx:206` | corps | PRÉPARATION |  |
| 26 | `components/RecipeEditor.tsx:212` | placeholder | Étape… |  |
| 27 | `components/RecipeEditor.tsx:221` | corps | Ajouter une étape |  |
| 28 | `components/RecipeEditor.tsx:227` | corps | Réinitialiser à la recette d'origine |  |
| 29 | `components/RecipeEditor.tsx:233` | bouton | Enregistrer ma version |  |
| 30 | `components/RecipeEditor.tsx:235` | corps | Annuler |  |

## ReglagesSheet (`components/ReglagesSheet.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/ReglagesSheet.tsx:144` | titre | Réglages |  |
| 2 | `components/ReglagesSheet.tsx:149` | corps | Notifications |  |
| 3 | `components/ReglagesSheet.tsx:151` | corps | Rappel quotidien |  |
| 4 | `components/ReglagesSheet.tsx:184` | aide | …, avec une citation.` : 'Un rappel par jour, à l’heure que tu choisis, pour retrouver ton plan.'} … |  |
| 5 | `components/ReglagesSheet.tsx:198` | corps | Rappel de pesée |  |
| 6 | `components/ReglagesSheet.tsx:212` | corps | Propositions d'ajustement |  |
| 7 | `components/ReglagesSheet.tsx:226` | corps | Affichage |  |
| 8 | `components/ReglagesSheet.tsx:228` | corps | Apparence |  |
| 9 | `components/ReglagesSheet.tsx:239` | aide | … forcé.`} |  |
| 10 | `components/ReglagesSheet.tsx:245` | corps | Couleur d'accent |  |
| 11 | `components/ReglagesSheet.tsx:266` | aide | … — appliqué aux boutons et aux éléments actifs.`} |  |
| 12 | `components/ReglagesSheet.tsx:272` | corps | Suivi d'hydratation |  |
| 13 | `components/ReglagesSheet.tsx:286` | corps | Aide et retours |  |
| 14 | `components/ReglagesSheet.tsx:299` | label | Donner mon avis |  |
| 15 | `components/ReglagesSheet.tsx:300` | label | Revoir les tutos |  |
| 16 | `components/ReglagesSheet.tsx:304` | label | Méthodologie & sources |  |
| 17 | `components/ReglagesSheet.tsx:308` | corps | Confidentialité |  |
| 18 | `components/ReglagesSheet.tsx:325` | corps | Statistiques d'usage |  |
| 19 | `components/ReglagesSheet.tsx:351` | label | Supprimer mes statistiques |  |
| 20 | `components/ReglagesSheet.tsx:353` | label | Exporter mes données |  |
| 21 | `components/ReglagesSheet.tsx:354` | label | Confidentialité & CGU |  |
| 22 | `components/ReglagesSheet.tsx:361` | corps | Compte |  |
| 23 | `components/ReglagesSheet.tsx:363` | label | Version |  |
| 24 | `components/ReglagesSheet.tsx:367` | corps | Se déconnecter |  |
| 25 | `components/ReglagesSheet.tsx:370` | corps | Supprimer mon compte |  |

## ReminderOffer (`components/ReminderOffer.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/ReminderOffer.tsx:79` | titre | Un rappel par jour ? |  |
| 2 | `components/ReminderOffer.tsx:80` | aide | Une notification à l'heure que tu choisis, pour retrouver ton plan sans y penser. Rien d'autre : Kyroz ne t'enverra pas de notification en dehors de ça. |  |
| 3 | `components/ReminderOffer.tsx:92` | bouton | Activer le rappel |  |
| 4 | `components/ReminderOffer.tsx:94` | corps | Plus tard |  |
| 5 | `components/ReminderOffer.tsx:98` | aide | Ça se change ou se coupe à tout moment dans le Profil. |  |

## ReminderTimeField (`components/ReminderTimeField.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/ReminderTimeField.tsx:121` | a11y | Heure du rappel |  |
| 2 | `components/ReminderTimeField.tsx:136` | a11y | Minutes du rappel |  |

## ShoppingHistory (`components/ShoppingHistory.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/ShoppingHistory.tsx:64` | titre | Mes courses passées |  |
| 2 | `components/ShoppingHistory.tsx:69` | aide | Chaque liste terminée s'archive ici. |  |
| 3 | `components/ShoppingHistory.tsx:74` | vide | Rien pour l'instant |  |
| 4 | `components/ShoppingHistory.tsx:75` | vide | Quand tu appuies sur « Courses terminées » depuis l'onglet Courses, ta liste s'archive ici avec ce que tu as coché. |  |
| 5 | `components/ShoppingHistory.tsx:113` | corps | NON PRIS |  |
| 6 | `components/ShoppingHistory.tsx:120` | corps | Quantités demandées par ta liste ce jour-là. |  |
| 7 | `components/ShoppingHistory.tsx:126` | bouton | Retirer |  |
| 8 | `components/ShoppingHistory.tsx:138` | corps | Retirer de l'historique |  |

## Splash (`components/Splash.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/Splash.tsx:11` | corps | KYROZ |  |

## SportsEditor (`components/SportsEditor.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/SportsEditor.tsx:74` | bouton | séances / sem. |  |
| 2 | `components/SportsEditor.tsx:79` | bouton | durée |  |
| 3 | `components/SportsEditor.tsx:79` | label | min |  |
| 4 | `components/SportsEditor.tsx:110` | a11y | Diminuer ${label} |  |
| 5 | `components/SportsEditor.tsx:119` | a11y | Augmenter ${label} |  |

## StreakCelebration (`components/StreakCelebration.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/StreakCelebration.tsx:74` | bouton | Continuer |  |

## Transformation (`components/Transformation.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/Transformation.tsx:54` | aide | Depuis le départ : …… kg |  |
| 2 | `components/Transformation.tsx:86` | bouton | Avant |  |
| 3 | `components/Transformation.tsx:87` | bouton | Après |  |
| 4 | `components/Transformation.tsx:90` | corps | …… kg entre les deux photos |  |

## WeightChart (`components/WeightChart.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/WeightChart.tsx:51` | aide | Enregistre ton poids chaque semaine pour voir ta courbe. |  |
| 2 | `components/WeightChart.tsx:134` | aide | ▚ Ta zone vers … kg le … · rester dedans suffit |  |

## WeightCheckin (`components/WeightCheckin.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/WeightCheckin.tsx:235` | titre | Suivi du poids |  |
| 2 | `components/WeightCheckin.tsx:241` | aide | Chaque pesée recale ton plan. |  |
| 3 | `components/WeightCheckin.tsx:285` | label | kg |  |
| 4 | `components/WeightCheckin.tsx:293` | bouton | Enregistrer |  |
| 5 | `components/WeightCheckin.tsx:297` | corps | … — point $…`} …$… kg` : ''} |  |
| 6 | `components/WeightCheckin.tsx:305` | corps | Évolution |  |
| 7 | `components/WeightCheckin.tsx:338` | bouton | Note (optionnel) |  |
| 8 | `components/WeightCheckin.tsx:341` | placeholder | ex. voyage, malade, grosse semaine d'entraînement… |  |
| 9 | `components/WeightCheckin.tsx:349` | aide | Les photos de progression font partie de Kyroz+ |  |
| 10 | `components/WeightCheckin.tsx:364` | corps | Ajouter une photo de progression |  |
| 11 | `components/WeightCheckin.tsx:370` | corps | Prendre une photo |  |
| 12 | `components/WeightCheckin.tsx:373` | corps | Ma galerie |  |
| 13 | `components/WeightCheckin.tsx:392` | corps | Transformation |  |
| 14 | `components/WeightCheckin.tsx:400` | aide | Tes photos sont toujours sur ton téléphone. La comparaison avant/après fait partie de Kyroz+. | ⚑ |
| 15 | `components/WeightCheckin.tsx:418` | corps | Historique |  |
| 16 | `components/WeightCheckin.tsx:438` | bouton | Supprimer |  |

## WeightSummaryCard (`components/WeightSummaryCard.tsx`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `components/WeightSummaryCard.tsx:76` | corps | SUIVI DU POIDS |  |
| 2 | `components/WeightSummaryCard.tsx:82` | corps | kg |  |
| 3 | `components/WeightSummaryCard.tsx:85` | corps | …… kg depuis la pesée précédente |  |


---

# Textes hors écrans

## Textes légaux (source unique) (`constants/legal.ts`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `constants/legal.ts:15` | corps | Kyroz est conçu pour des adultes en bonne santé. Ces informations ne remplacent pas l'avis d'un médecin ou diététicien-nutritionniste. | ⚑ |
| 2 | `constants/legal.ts:28` | corps | Enceinte, allaitante, ou suivie pour une pathologie chronique ? Parles-en à un médecin avant de suivre un plan. | ⚑ |
| 3 | `constants/legal.ts:35` | corps | Kyroz |  |
| 4 | `constants/legal.ts:36` | corps | Kévin Berger |  |
| 5 | `constants/legal.ts:37` | corps | Entrepreneur individuel (micro-entreprise) |  |
| 6 | `constants/legal.ts:39` | corps | 2 rue du moulin, 64570 Arette | ⚑ |
| 7 | `constants/legal.ts:42` | corps | Supabase Inc. |  |
| 8 | `constants/legal.ts:43` | corps | Union européenne (UE) |  |
| 9 | `constants/legal.ts:48` | vide | Resend |  |
| 10 | `constants/legal.ts:49` | vide | Plus Five Five, Inc. |  |
| 11 | `constants/legal.ts:57` | vide | aux États-Unis |  |
| 12 | `constants/legal.ts:73` | vide | RevenueCat, Inc. |  |
| 13 | `constants/legal.ts:74` | vide | États-Unis |  |
| 14 | `constants/legal.ts:75` | vide | aux États-Unis |  |
| 15 | `constants/legal.ts:95` | corps | 26 août 2026 | ⚑ |
| 16 | `constants/legal.ts:106` | corps | 1. Responsable de traitement | ⚑ |
| 17 | `constants/legal.ts:108` | corps | Le responsable du traitement de vos données est ${LEGAL.controllerName}, ${LEGAL.controllerStatus}, SIREN ${LEGAL.siren}, ${LEGAL.address}. |  |
| 18 | `constants/legal.ts:109` | corps | Pour toute question relative à vos données ou pour exercer vos droits : ${LEGAL.dpoEmail}. |  |
| 19 | `constants/legal.ts:113` | corps | 2. Données collectées | ⚑ |
| 20 | `constants/legal.ts:115` | corps | Données de compte : adresse email (lors d’une inscription par email). |  |
| 21 | `constants/legal.ts:116` | corps | Données de santé : sexe, âge, poids, taille, taux de masse grasse, niveau d’activité et sport pratiqué, objectif, restrictions et préférences alimentaires. Ces informations sont des données de santé au sens de l’article 9 du RGPD. | ⚑ |
| 22 | `constants/legal.ts:117` | corps | Données d’usage de l’app : plans générés, suivi du poids, série (streak), favoris, réserve alimentaire. |  |
| 23 | `constants/legal.ts:118` | corps | Photos de progression (facultatives) : elles restent stockées UNIQUEMENT sur votre appareil et ne sont jamais transmises à nos serveurs. | ⚑ |
| 24 | `constants/legal.ts:119` | corps | Données d’abonnement, uniquement si vous souscrivez à Kyroz+ : l’identifiant technique de votre compte et l’état de votre abonnement. Aucune coordonnée bancaire ne transite par Kyroz. |  |
| 25 | `constants/legal.ts:120` | corps | Aucune statistique d’usage n’est collectée : l’application ne mesure pas comment vous vous en servez. |  |
| 26 | `constants/legal.ts:124` | corps | 3. Finalités | ⚑ |
| 27 | `constants/legal.ts:126` | corps | Vos données de compte et de santé servent exclusivement à : calculer vos besoins nutritionnels (calories, macros), générer vos plans repas, votre liste de courses et le suivi associé. | ⚑ |
| 28 | `constants/legal.ts:127` | corps | Aucune donnée n’est utilisée à des fins publicitaires. |  |
| 29 | `constants/legal.ts:131` | corps | 4. Base légale | ⚑ |
| 30 | `constants/legal.ts:133` | corps | Le traitement des données de santé repose sur votre consentement explicite (RGPD art. 9-2-a), recueilli à l’inscription. Vous pouvez le retirer à tout moment en supprimant votre compte. | ⚑ |
| 31 | `constants/legal.ts:203` | corps | 5. Destinataires et sous-traitants | ⚑ |
| 32 | `constants/legal.ts:205` | corps | Vos données synchronisées sont hébergées par ${LEGAL.host}, sur des serveurs situés en ${LEGAL.hostRegion}. |  |
| 33 | `constants/legal.ts:206` | vide | L’envoi des e-mails de service (confirmation d’inscription, réinitialisation de mot de passe) est assuré par ${LEGAL.emailProvider} (${LEGAL.emailProviderLegalName}). Seules votre adresse e-mail et le contenu de ces messages lui sont transmis — aucune donnée de santé. | ⚑ |
| 34 | `constants/legal.ts:207` | vide | Ces e-mails, ainsi que les journaux d’envoi correspondants, sont stockés par ${LEGAL.emailProvider} ${LEGAL.emailProviderStorage}. Ce transfert hors de l’Union européenne est encadré par les clauses contractuelles types de la Commission européenne et par l’adhésion de ce prestataire au cadre de protection des données UE–États-Unis (EU-U.S. Data Privacy Framework). |  |
| 35 | `constants/legal.ts:208` | vide | La gestion technique des abonnements Kyroz+ est confiée à ${LEGAL.subscriptionProvider} (${LEGAL.subscriptionProviderCountry}). Dès que vous êtes connecté, que vous soyez abonné ou non, l’identifiant technique de votre compte lui est transmis pour vérifier si un abonnement est actif ; s’y ajoutent, le cas échéant, l’état de votre abonnement et le reçu d’achat émis par l’App Store ou Google Play. Ne lui sont transmis ni votre adresse email, ni vos données de santé, ni aucune coordonnée bancaire. | ⚑ |
| 36 | `constants/legal.ts:209` | vide | Ces données sont stockées ${LEGAL.subscriptionProviderStorage}. Ce transfert hors de l’Union européenne est encadré par les clauses contractuelles types de la Commission européenne. |  |
| 37 | `constants/legal.ts:210` | corps | Le paiement lui-même est traité par l’App Store (Apple) ou Google Play. Kyroz ne voit ni ne conserve aucune coordonnée bancaire. |  |
| 38 | `constants/legal.ts:211` | corps | Nous ne vendons, ne louons et ne partageons vos données avec aucun tiers à des fins commerciales. Aucun traceur publicitaire n’est utilisé, et aucun suivi ne vous relie à d’autres applications ou sites. |  |
| 39 | `constants/legal.ts:215` | corps | 6. Hébergement et localisation | ⚑ |
| 40 | `constants/legal.ts:217` | corps | Les données synchronisées — profil, objectif, suivi du poids — sont stockées dans l’Union européenne. Une copie de travail réside localement sur votre appareil (fonctionnement hors-ligne). |  |
| 41 | `constants/legal.ts:218` | vide | Une exception, décrite au point 5 : les e-mails de service sont stockés ${LEGAL.emailProviderStorage}. Aucune donnée de santé ne quitte l’Union européenne. | ⚑ |
| 42 | `constants/legal.ts:222` | corps | 7. Durée de conservation | ⚑ |
| 43 | `constants/legal.ts:224` | corps | Vos données sont conservées tant que votre compte est actif. Elles sont supprimées (serveur + appareil) lorsque vous supprimez votre compte. |  |
| 44 | `constants/legal.ts:225` | corps | Une exception : si vous avez souscrit un abonnement, l’historique de facturation correspondant est conservé par le store concerné (Apple, Google) et par le prestataire mentionné au point 5, pour la durée qu’imposent leurs obligations légales et comptables. Cet historique ne contient aucune donnée de santé. | ⚑ |
| 45 | `constants/legal.ts:229` | corps | 8. Sécurité | ⚑ |
| 46 | `constants/legal.ts:231` | corps | Les échanges avec nos serveurs sont chiffrés en transit (HTTPS). L’accès aux données est cloisonné par utilisateur : un utilisateur ne peut accéder qu’à ses propres données. |  |
| 47 | `constants/legal.ts:232` | corps | Les données stockées localement sur votre appareil ne sont pas chiffrées : protégez l’accès à votre appareil, en particulier sur un ordinateur partagé. |  |
| 48 | `constants/legal.ts:236` | corps | 9. Vos droits | ⚑ |
| 49 | `constants/legal.ts:238` | corps | Conformément au RGPD, vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité, ainsi que du droit de retirer votre consentement. |  |
| 50 | `constants/legal.ts:239` | corps | Le droit à l’effacement s’exerce directement dans l’app (Profil → Supprimer mon compte) ou par email à ${LEGAL.dpoEmail}. |  |
| 51 | `constants/legal.ts:240` | corps | Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr). |  |
| 52 | `constants/legal.ts:244` | corps | 10. Mineurs | ⚑ |
| 53 | `constants/legal.ts:246` | corps | Kyroz est réservé aux personnes âgées de 18 ans et plus. Aucun compte ne peut être créé en deçà de cet âge. | ⚑ |
| 54 | `constants/legal.ts:250` | corps | 11. Modifications | ⚑ |
| 55 | `constants/legal.ts:252` | corps | La présente politique peut évoluer. Date de dernière mise à jour : ${LEGAL.effectiveDate}. |  |
| 56 | `constants/legal.ts:260` | corps | 1. Objet | ⚑ |
| 57 | `constants/legal.ts:262` | corps | Les présentes conditions régissent l’utilisation de l’application ${LEGAL.appName}. En créant un compte ou en utilisant l’app, vous les acceptez. |  |
| 58 | `constants/legal.ts:266` | corps | 2. Description du service | ⚑ |
| 59 | `constants/legal.ts:268` | corps | Kyroz génère des plans repas, des listes de courses et des recettes à visée nutritionnelle, à partir des informations que vous fournissez. Le cœur du service est gratuit. |  |
| 60 | `constants/legal.ts:286` | corps | 3. Abonnement Kyroz+ | ⚑ |
| 61 | `constants/legal.ts:288` | corps | Le cœur du service reste gratuit : plan de la semaine, liste de courses, recettes, réserve, favoris, série, pesée, réglage du rythme de la semaine et synchronisation. Kyroz+ est un abonnement facultatif qui donne accès à des outils complémentaires — objectif daté et suivi de transformation. |  |
| 62 | `constants/legal.ts:289` | corps | L’abonnement est vendu par l’App Store ou Google Play, jamais directement par Kyroz. Le prix affiché au moment de l’achat fait foi. Le paiement, le renouvellement et la résiliation se gèrent dans les réglages de votre compte App Store ou Google Play. | ⚑ |
| 63 | `constants/legal.ts:290` | corps | L’abonnement se renouvelle automatiquement à la fin de chaque période, sauf résiliation au moins 24 heures avant l’échéance. Les demandes de remboursement relèvent du store, pas de Kyroz. | ⚑ |
| 64 | `constants/legal.ts:291` | corps | Le tarif de votre abonnement est celui affiché au moment où vous souscrivez, et il reste inchangé tant que votre abonnement demeure actif. Une évolution de nos tarifs ne s’applique qu’aux nouvelles souscriptions. En revanche, si vous résiliez puis souscrivez à nouveau plus tard, c’est le tarif en vigueur à cette date qui s’applique. |  |
| 65 | `constants/legal.ts:292` | corps | Les comptes créés avant la mise en vente de Kyroz+ conservent l’accès à ces outils gratuitement, à vie, sans démarche à effectuer. |  |
| 66 | `constants/legal.ts:296` | corps | 4. Avertissement santé | ⚑ |
| 67 | `constants/legal.ts:299` | corps | Kyroz ne s’adresse pas aux personnes atteintes de pathologies (diabète, insuffisance rénale, troubles cardiaques…), aux femmes enceintes ou allaitantes. En cas de doute, consultez un professionnel de santé. Vous restez seul responsable de votre alimentation. | ⚑ |
| 68 | `constants/legal.ts:303` | corps | 5. Compte | ⚑ |
| 69 | `constants/legal.ts:305` | corps | Vous vous engagez à fournir des informations exactes et à avoir au moins 18 ans. Vous êtes responsable de la confidentialité de vos identifiants. | ⚑ |
| 70 | `constants/legal.ts:309` | corps | 6. Propriété intellectuelle | ⚑ |
| 71 | `constants/legal.ts:311` | corps | Les recettes et contenus de l’app sont la propriété de Kyroz. Les données nutritionnelles sont issues de la table Ciqual (ANSES), réutilisées sous Licence Ouverte 2.0 (Etalab). | ⚑ |
| 72 | `constants/legal.ts:315` | corps | 7. Données personnelles | ⚑ |
| 73 | `constants/legal.ts:317` | corps | Le traitement de vos données est décrit dans la Politique de confidentialité ci-dessus, qui fait partie intégrante des présentes conditions. |  |
| 74 | `constants/legal.ts:321` | corps | 8. Résiliation | ⚑ |
| 75 | `constants/legal.ts:323` | corps | Vous pouvez supprimer votre compte à tout moment depuis l’app (Profil → Supprimer mon compte), ce qui efface vos données. |  |
| 76 | `constants/legal.ts:326` | corps | Supprimer votre compte Kyroz n’annule PAS un abonnement en cours : celui-ci continue d’être facturé tant qu’il n’est pas résilié dans les réglages de votre compte App Store ou Google Play. |  |
| 77 | `constants/legal.ts:330` | corps | 9. Responsabilité | ⚑ |
| 78 | `constants/legal.ts:332` | corps | Kyroz fournit un outil d’aide à la planification nutritionnelle sans garantie de résultat. Notre responsabilité ne saurait être engagée pour l’usage que vous faites des plans proposés. | ⚑ |
| 79 | `constants/legal.ts:336` | corps | 10. Droit applicable | ⚑ |
| 80 | `constants/legal.ts:338` | corps | Les présentes conditions sont soumises au droit français. Contact : ${LEGAL.supportEmail}. En cas de litige, vous pouvez recourir à un médiateur de la consommation ou saisir la CNIL pour les questions relatives aux données. |  |

## Notifications (`lib/notifications.ts`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `lib/notifications.ts:32` | corps | ${WEIGH_ID}-${i} |  |
| 2 | `lib/notifications.ts:42` | corps | ${DAILY_ID}-${i} |  |
| 3 | `lib/notifications.ts:156` | corps | ${DAILY_ID}-${i} |  |
| 4 | `lib/notifications.ts:199` | corps | ${WEIGH_ID}-${i} |  |
| 5 | `lib/notifications.ts:215` | corps | ${WEIGH_ID}-0 | ⚑ |
| 6 | `lib/notifications.ts:254` | corps | @kyroz:lastNotifTap |  |
| 7 | `lib/notifications.ts:262` | corps | ${r.notification.request.identifier}:${r.notification.date} |  |

## Rappels (copie) (`lib/reminder.ts`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `lib/reminder.ts:100` | corps | ${String(time.hour).padStart(2, | ⚑ |
| 2 | `lib/reminder.ts:100` | corps | )}:${String(time.minute).padStart(2, | ⚑ |
| 3 | `lib/reminder.ts:105` | corps | ${time.hour}h${String(time.minute).padStart(2, | ⚑ |
| 4 | `lib/reminder.ts:150` | corps | Ta journée commence |  |
| 5 | `lib/reminder.ts:150` | corps | Le plan du jour est prêt |  |
| 6 | `lib/reminder.ts:150` | corps | Un coup d’œil et c’est parti |  |
| 7 | `lib/reminder.ts:151` | corps | C’est l’heure de manger |  |
| 8 | `lib/reminder.ts:151` | corps | Pause déjeuner |  |
| 9 | `lib/reminder.ts:151` | corps | Ton déjeuner t’attend |  |
| 10 | `lib/reminder.ts:151` | corps | Ton midi est déjà prévu |  |
| 11 | `lib/reminder.ts:152` | corps | Point de l’après-midi |  |
| 12 | `lib/reminder.ts:152` | corps | Ton plan est toujours là | ⚑ |
| 13 | `lib/reminder.ts:152` | corps | Il te reste la journée |  |
| 14 | `lib/reminder.ts:152` | corps | Un point rapide | ⚑ |
| 15 | `lib/reminder.ts:153` | corps | Le dîner approche |  |
| 16 | `lib/reminder.ts:153` | corps | Dernier repas de la journée |  |
| 17 | `lib/reminder.ts:153` | corps | On finit la journée |  |
| 18 | `lib/reminder.ts:153` | corps | Ce soir, tout est prêt |  |
| 19 | `lib/reminder.ts:245` | corps | Montaigne |  |
| 20 | `lib/reminder.ts:245` | corps | La Rochefoucauld |  |
| 21 | `lib/reminder.ts:245` | corps | Vauvenargues |  |
| 22 | `lib/reminder.ts:251` | corps | Tu n’as pas besoin de motivation aujourd’hui. Tu as un plan. |  |
| 23 | `lib/reminder.ts:252` | vide | La goutte d’eau creuse la pierre, non par la force, mais en tombant souvent. |  |
| 24 | `lib/reminder.ts:252` | vide | Ovide |  |
| 25 | `lib/reminder.ts:253` | corps | La régularité bat l’intensité, tous les jours de la semaine. |  |
| 26 | `lib/reminder.ts:254` | corps | Ce n’est pas le repas parfait qui compte, c’est le suivant. |  |
| 27 | `lib/reminder.ts:255` | corps | Un voyage de mille lieues commence toujours par un premier pas. | ⚑ |
| 28 | `lib/reminder.ts:255` | corps | Lao Tseu |  |
| 29 | `lib/reminder.ts:256` | corps | Les résultats viennent des jours ordinaires, pas des jours exceptionnels. |  |
| 30 | `lib/reminder.ts:257` | corps | Un plan suivi à 80 % vaut mieux qu’un plan parfait abandonné. | ⚑ |
| 31 | `lib/reminder.ts:258` | vide | Rien n’est plus fort que l’habitude. |  |
| 32 | `lib/reminder.ts:258` | vide | Ovide |  |
| 33 | `lib/reminder.ts:259` | corps | Ce que tu répètes devient facile. C’est tout le secret. |  |
| 34 | `lib/reminder.ts:260` | corps | Trois mois passent de toute façon. Autant qu’ils comptent. |  |
| 35 | `lib/reminder.ts:261` | corps | Regarde au-dedans : au-dedans est la source du bien. |  |
| 36 | `lib/reminder.ts:261` | corps | Marc Aurèle |  |
| 37 | `lib/reminder.ts:262` | corps | Manger comme prévu, c’est déjà une victoire de la journée. |  |
| 38 | `lib/reminder.ts:263` | corps | Personne ne se transforme en un jour. Tout le monde se transforme en un an. |  |
| 39 | `lib/reminder.ts:264` | corps | Il n’est pas de vent favorable pour qui ne sait où il va. |  |
| 40 | `lib/reminder.ts:264` | corps | Sénèque |  |
| 41 | `lib/reminder.ts:265` | corps | Une journée ordinaire bien suivie vaut mieux qu’une semaine héroïque. |  |
| 42 | `lib/reminder.ts:266` | corps | Le plan est déjà fait. Il ne te reste qu’à passer à table. |  |
| 43 | `lib/reminder.ts:267` | corps | Ajoute peu à peu sur peu, et bientôt cela fera beaucoup. |  |
| 44 | `lib/reminder.ts:267` | corps | Hésiode |  |
| 45 | `lib/reminder.ts:268` | corps | Ce que tu fais souvent compte plus que ce que tu fais parfaitement. |  |
| 46 | `lib/reminder.ts:269` | corps | Il n’y a pas de journée décisive. Il y a des journées qui s’additionnent. |  |
| 47 | `lib/reminder.ts:270` | corps | Ce ne sont pas les choses qui troublent les hommes, mais les opinions qu’ils en ont. |  |
| 48 | `lib/reminder.ts:270` | corps | Épictète |  |
| 49 | `lib/reminder.ts:271` | corps | Reviens au plan quand tu veux. Il t’attend sans rien te demander. |  |
| 50 | `lib/reminder.ts:272` | corps | Le corps change lentement, puis d’un coup. |  |
| 51 | `lib/reminder.ts:273` | corps | L’habitude est une seconde nature. |  |
| 52 | `lib/reminder.ts:273` | corps | Cicéron |  |
| 53 | `lib/reminder.ts:274` | corps | Un écart ne défait pas une semaine. Il en fait partie. |  |
| 54 | `lib/reminder.ts:275` | corps | Le plus dur est déjà derrière toi : décider quoi manger. |  |
| 55 | `lib/reminder.ts:276` | corps | Ce n’est pas que nous ayons peu de temps, c’est que nous en perdons beaucoup. |  |
| 56 | `lib/reminder.ts:276` | corps | Sénèque |  |
| 57 | `lib/reminder.ts:277` | corps | Avance à ton rythme. Le moteur porte la charge, pas toi. |  |
| 58 | `lib/reminder.ts:278` | corps | Le progrès n’est pas spectaculaire. Il est régulier. |  |
| 59 | `lib/reminder.ts:279` | corps | La pratique est le meilleur des maîtres. |  |
| 60 | `lib/reminder.ts:279` | corps | Publilius Syrus |  |
| 61 | `lib/reminder.ts:280` | corps | Ce qui est prévu se fait tout seul. Le reste se discute. |  |
| 62 | `lib/reminder.ts:281` | corps | Les bonnes journées se ressemblent. C’est ce qui les rend faciles. |  |
| 63 | `lib/reminder.ts:282` | corps | La patience est l’art d’espérer. |  |
| 64 | `lib/reminder.ts:282` | corps | Vauvenargues |  |
| 65 | `lib/reminder.ts:283` | corps | Tu n’as rien à prouver aujourd’hui. Juste à manger ce qui est prévu. |  |
| 66 | `lib/reminder.ts:284` | corps | Ton assiette du jour est déjà calculée. Il reste à en profiter. |  |
| 67 | `lib/reminder.ts:285` | corps | Qui se vainc soi-même est fort. |  |
| 68 | `lib/reminder.ts:285` | corps | Lao Tseu |  |
| 69 | `lib/reminder.ts:286` | corps | Prends ton temps. Rien dans ce plan ne se périme. |  |
| 70 | `lib/reminder.ts:287` | corps | La faim se prévoit. C’est tout l’intérêt d’avoir un plan. |  |
| 71 | `lib/reminder.ts:288` | corps | Tant que tu vis, apprends à vivre. |  |
| 72 | `lib/reminder.ts:288` | corps | Sénèque |  |
| 73 | `lib/reminder.ts:289` | corps | Chaque semaine ressemble à la précédente. C’est exactement le but. |  |
| 74 | `lib/reminder.ts:290` | corps | La discipline, c’est surtout de ne plus avoir à choisir. |  |
| 75 | `lib/reminder.ts:291` | corps | Ce qui fait obstacle à l’action fait avancer l’action. |  |
| 76 | `lib/reminder.ts:291` | corps | Marc Aurèle |  |
| 77 | `lib/reminder.ts:292` | corps | Un plan qu’on suit sans y penser est un plan qui a gagné. |  |
| 78 | `lib/reminder.ts:293` | corps | La plus grande chose du monde, c’est de savoir être à soi. |  |
| 79 | `lib/reminder.ts:293` | corps | Montaigne |  |
| 80 | `lib/reminder.ts:294` | corps | Deux repas prévus valent mieux qu’une bonne résolution. |  |
| 81 | `lib/reminder.ts:295` | corps | La parfaite valeur est de faire sans témoins ce qu’on serait capable de faire devant tout le monde. |  |
| 82 | `lib/reminder.ts:295` | corps | La Rochefoucauld |  |
| 83 | `lib/reminder.ts:300` | corps | ${c.texte} — ${c.auteur} |  |
| 84 | `lib/reminder.ts:340` | corps | Ta pesée du jour |  |
| 85 | `lib/reminder.ts:340` | corps | Note ton poids : Kyroz réajuste tes calories et ton plan tout seul. |  |
| 86 | `lib/reminder.ts:341` | corps | Un chiffre, rien de plus |  |
| 87 | `lib/reminder.ts:341` | corps | La pesée sert à caler ton plan, pas à te juger. |  |
| 88 | `lib/reminder.ts:342` | corps | C’est le jour de la pesée |  |
| 89 | `lib/reminder.ts:342` | corps | Trente secondes, et ton plan reste aligné sur ta progression. |  |

## Méthodologie (contenu) (`lib/methodologie.ts`)

> 🔴 **BLOC RÉGÉNÉRÉ LE 2026-08-27 — contre-audit `CA-4-02`.** Les 72 entrées précédentes
> étaient des MORCEAUX : l'extraction coupait chaque chaîne sur l'apostrophe échappée
> (`\'`), et ce fichier est le seul du corpus à en employer. « Ce que Kyroz calcule — et
> ce qu'il n'est pas » devenait deux entrées (« …et ce qu\ » puis « est pas »), et la
> phrase « Kyroz n'est pas un dispositif médical… » — la plus lourde juridiquement de
> l'app — n'apparaissait NULLE PART : `grep "dispositif médical"` rendait **0** sur tout
> le dump. C'est exactement la matière que le §5 de la synthèse cite comme modèle.
>
> Ce bloc n'est plus extrait par regex : il est **RENDU par `methodologie()`**, donc les
> interpolations portent leurs vraies valeurs et aucune apostrophe ne coupe rien.
> 33 textes, contre 72 fragments.

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `lib/methodologie.ts:60` | titre | Ce que Kyroz calcule — et ce qu'il n'est pas |  |
| 2 | `lib/methodologie.ts:62` | corps | Kyroz estime une dépense énergétique quotidienne à partir de ce que vous déclarez, puis construit des repas qui s'en approchent. C'est un outil de bien-être alimentaire pour adultes en bonne santé. |  |
| 3 | `lib/methodologie.ts:63` | corps | Kyroz n'est pas un dispositif médical. Il ne diagnostique, ne traite, ne guérit ni ne prévient aucune pathologie, et ne remplace pas l'avis d'un médecin ou d'un diététicien-nutritionniste. |  |
| 4 | `lib/methodologie.ts:64` | corps | L'app est réservée aux personnes de 18 ans et plus : les équations utilisées ci-dessous ne sont pas validées chez l'adolescent. | ⚑ |
| 5 | `lib/methodologie.ts:68` | titre | La dépense énergétique (TDEE) |  |
| 6 | `lib/methodologie.ts:70` | corps | La dépense est la somme de trois termes : le métabolisme de base, multiplié par un facteur d'activité quotidienne hors sport, auquel s'ajoute la dépense des séances déclarées. |  |
| 7 | `lib/methodologie.ts:71` | corps | Le métabolisme de base est estimé par l'équation de Mifflin-St Jeor, à partir du sexe, de l'âge, du poids et de la taille. |  |
| 8 | `lib/methodologie.ts:72` | corps | L'équation de Katch-McArdle, qui repose sur la masse maigre, est utilisée telle quelle si le taux de masse grasse a été MESURÉ (impédancemétrie, DEXA, plis cutanés) et déclaré comme tel. Un taux estimé à partir d'une silhouette porte une marge d'erreur de l'ordre de ±5 points : quand il indique nettement plus de masse maigre que la moyenne du gabarit — au-delà de ce bruit —, le calcul glisse progressivement de Mifflin-St Jeor vers Katch-McArdle. Jamais l'inverse : si la formule à masse maigre donne une dépense plus basse, c'est Mifflin-St Jeor qui reste servie. La question de provenance n'est posée qu'au-delà de 35 % (homme) et 43 % (femme). | ⚑ |
| 9 | `lib/methodologie.ts:73` | corps | Le facteur d'activité hors sport va de 1,3 (travail assis) à 1,45 (métier physique). La table s'arrête volontairement à 1,45 : les valeurs plus hautes des tables classiques incluent l'exercice, qui est déjà compté à part. | ⚑ |
| 10 | `lib/methodologie.ts:74` | corps | La dépense des séances est calculée par la méthode des équivalents métaboliques (MET), en valeur NETTE : le métabolisme de repos de l'heure de séance est retiré, parce qu'il est déjà compté par les deux premiers termes. |  |
| 11 | `lib/methodologie.ts:95` | titre | La répartition des macronutriments |  |
| 12 | `lib/methodologie.ts:97` | corps | La cible protéique dépend de l'objectif et se calcule sur un poids ajusté à la composition corporelle. Elle est ensuite bornée entre 1,6 et 2,6 g par kg de MASSE MAIGRE, quelle que soit la corpulence. | ⚑ |
| 13 | `lib/methodologie.ts:98` | corps | Les lipides ne descendent jamais sous 0,8 g par kg de poids de corps, seuil en deçà duquel l'apport en acides gras essentiels et l'absorption des vitamines liposolubles ne sont plus assurés. | ⚑ |
| 14 | `lib/methodologie.ts:99` | corps | Les glucides reçoivent le budget restant. |  |
| 15 | `lib/methodologie.ts:120` | titre | Les limites de sécurité |  |
| 16 | `lib/methodologie.ts:133` | corps | Ces limites ne sont pas des réglages : le code les applique à chaque calcul, quel que soit l'objectif choisi ou la date visée. |  |
| 17 | `lib/methodologie.ts:134` | corps | Deux d'entre elles sont infranchissables CHAQUE JOUR : le métabolisme de base et le filet absolu. L'énergie disponible, elle, se juge sur la SEMAINE — c'est une moyenne soutenue, et c'est ainsi que la littérature la définit. |  |
| 18 | `lib/methodologie.ts:135` | corps | Le budget d'un jour suit la dépense de ce jour-là : un jour de séance reçoit plus qu'un jour de repos, et la semaine conserve son total. Un jour calme peut donc passer sous le seuil d'énergie disponible sans que la semaine y passe — et le métabolisme de base, lui, reste un plancher quotidien. |  |
| 19 | `lib/methodologie.ts:138` | corps | Énergie disponible : au moins 30 kcal par kg de masse maigre, une fois la dépense sportive retirée. Ce plancher existe parce que la littérature documente, en dessous, des perturbations hormonales et osseuses (déficit énergétique relatif dans le sport, RED-S) : c'est ce que Kyroz tient à distance. | ⚑ |
| 20 | `lib/methodologie.ts:139` | corps | Au-delà de 12 semaines cumulées en zone basse — c'est-à-dire entre 30 et 35 kcal par kg de masse maigre —, ce plancher remonte progressivement vers 35 : l'app force une sortie de déficit au lieu de la laisser durer. | ⚑ |
| 21 | `lib/methodologie.ts:140` | corps | Filet absolu : jamais moins de 1 500 kcal par jour chez l'homme et 1 200 kcal chez la femme. | ⚑ |
| 22 | `lib/methodologie.ts:141` | corps | Déficit plafonné à 25 % de la dépense estimée. | ⚑ |
| 23 | `lib/methodologie.ts:145` | corps | Après 8 semaines de déficit consécutives, la semaine suivante est servie à la maintenance. Ce compteur-là est indépendant du précédent : l'un compte des semaines qui se suivent, l'autre des semaines cumulées. | ⚑ |
| 24 | `lib/methodologie.ts:148` | corps | Sous un indice de masse corporelle de départ de 18,5, Kyroz ne creuse aucun déficit et sert un plan complet à la maintenance — de même pour tout poids cible sortant de la plage saine. | ⚑ |
| 25 | `lib/methodologie.ts:164` | titre | Les données nutritionnelles |  |
| 26 | `lib/foods.ts:15` | corps | Données nutritionnelles issues de la Table Ciqual® 2025 (ANSES), réutilisée sous Licence Ouverte 2.0 (Etalab). Certaines entrées sont ajoutées ou ajustées par Kyroz et ne proviennent pas de l’ANSES. L’ANSES n’endosse pas Kyroz. | ⚑ |
| 27 | `lib/methodologie.ts:167` | corps | Les aliments que la table ne couvre pas proprement (produits protéinés, préparations composées) sont saisis à la main, à partir des valeurs déclarées par les fabricants. Aucune source tierce automatique n'alimente le catalogue. |  |
| 28 | `lib/methodologie.ts:168` | corps | Les recettes de Kyroz n'ont pas été validées par un diététicien-nutritionniste, et l'app ne le prétend nulle part. |  |
| 29 | `lib/methodologie.ts:179` | titre | Ce qui relève d'un choix de Kyroz |  |
| 30 | `lib/methodologie.ts:181` | corps | Tout ce qui précède ne sort pas de la littérature au même titre, et la distinction est faite ici plutôt que laissée à l'interprétation. |  |
| 31 | `lib/methodologie.ts:182` | corps | Viennent de la littérature : les deux équations de métabolisme de base, les valeurs MET, le seuil de 30 kcal par kg de masse maigre et les fourchettes protéiques. | ⚑ |
| 32 | `lib/methodologie.ts:183` | corps | Sont des choix de Kyroz, prudents par construction : le plafond de 1,45 sur l'activité quotidienne, le déficit borné à 25 %, la pause à la maintenance toutes les 8 semaines, et le retrait des planchers dérivés de la masse maigre au-delà de 30 % (homme) et 40 % (femme) de masse grasse — au-delà, la réserve adipeuse est la source d'énergie que ces planchers, conçus pour des athlètes maigres, interdisaient d'utiliser. | ⚑ |
| 33 | `lib/methodologie.ts:184` | corps | Une estimation de dépense reste une estimation : elle porte une marge d'erreur individuelle que ces équations ne suppriment pas. Le poids relevé au fil des semaines est le seul juge, et c'est lui que Kyroz suit. |  |
