# Point 4 — « que l'app tourne en silence » : l'inventaire des phrases (2026-10-22)

> Demande du fondateur (2026-10-20), point 4 de la liste « À peaufiner AVANT la 62ᵉ OTA »
> d'`AGENTS.md` : *« L'idée est bonne mais la phrase est inutile pour un user. Donc j'aimerais
> enlever ces phrases et l'app tourne en silence… vérifie s'il y a d'autres choses
> similaires. »*
>
> ✅ **« · il t'en faut … » est RETIRÉ** (#376, 2026-10-22) : la ligne de Courses dit ce
> qu'on prend en rayon, rien d'autre. *Avant* : « Beurre d'amande · 1 pot de 250 g · il t'en
> faut 5 g ». *Après* : « Beurre d'amande · 1 pot de 250 g ». Le calcul qui fabriquait la
> phrase est parti avec elle (`Achat.besoin`, `Achat.ecartVisible`, `besoinLisible`,
> `UNITES_COMPTEES`) ; garde-fou : `formatsVendus.test.ts`, « chaque ligne dit ce qu'on prend
> en magasin, et rien d'autre », vu rougir en remettant la phrase.
>
> ✅ **Les 16 propositions ont été VALIDÉES par le fondateur le 2026-10-22** (« je valide les
> 16 ») et **15 sont appliquées** (#376). ⚠️ **Le n° 8 ne l'est PAS** : son motif était faux.
> « Descends à 0 pour retirer cet aliment » est le SEUL chemin de suppression d'un aliment
> de la Réserve (`reserve.tsx`, « tomber à zéro retire l'aliment »), et le bouton
> « Retirer de ma réserve » n'apparaît qu'une fois à zéro — il n'est donc pas « juste
> dessous ». La phrase reste, en attendant que le fondateur tranche à nouveau.
> ➕ Appliqué par cohérence avec le n° 10 : la fiche d'un repas sauté dit « Repas sauté »,
> plus « Repas sauté, journée recalée » (même phrase, autre écran).
> Garde-fou : `lib/__tests__/silence.test.ts` (les phrases retirées ne reviennent pas ; le
> seul bandeau du Plan est « Ok. Réactivable dans Profil. »), vu rougir par 3 mutations.
> Vu au navigateur (session factice) : la liste, l'aide, « À partir de jeudi. », et « J'ai
> cuisiné » sans bandeau. Non vu sur iPhone.

## Comment l'inventaire a été fait

Par écran, pas en cherchant la phrase fautive : toutes les phrases affichées (texte des
écrans, chaînes de 4 mots ou plus, toasts) ont été extraites de Courses, Réserve, Plan,
Recettes et des fiches qu'ils ouvrent (carte repas, fiche recette, historique des courses,
repas hors plan, repas géré soi-même, « je n'aime pas », rappel, macros), puis classées par
RÔLE.

La règle appliquée pour l'avis :
- **Retirer** : ce qui raconte ce que Kyroz fait en coulisses, ou ce qui annonce après coup
  un changement que l'écran montre déjà.
- **Garder** : ce que la personne doit faire ou décider ; la conséquence d'un geste, dite
  AVANT qu'elle le fasse (confirmations) ; un geste invisible autrement (appui long) ; un
  état vide ; un titre ; une obligation (sécurité, santé, RGPD, paiement).

## À retirer ou raccourcir (validé le 2026-10-22, appliqué sauf le n° 8)

| # | Écran | Phrase aujourd'hui | Proposition |
|---|---|---|---|
| 1 | Courses, pied de liste | « Formats courants en magasin, arrondis au-dessus de ce que demandent tes repas de la semaine[, sauf ce que tu as ajouté toi-même]. Ce qui reste d'un paquet est déduit de tes prochaines listes. » | Retirer |
| 2 | Courses, en tête | « Depuis tes dernières courses : pour les repas qu'il te reste à cuisiner. » | Retirer |
| 3 | Courses, en tête | « À partir de lundi, le jour où tu commences. » / « À partir du mardi : ton plan avait déjà commencé. » | « À partir de lundi. » (la justification part) |
| 4 | Courses, sous les boutons | « Coche ce que tu prends, puis « Courses terminées » range le tout dans ta réserve, paquets entiers. Appui long pour retirer un article. » | « Appui long pour retirer un article. » (le seul geste qui ne se voit pas) |
| 5 | Courses, ajout d'un article | « Sans quantité, l'article ne rejoindra pas ta réserve une fois acheté. » | Retirer |
| 6 | Courses, liste vide | « Ta réserve couvre déjà tout le plan de la semaine. La liste réapparaîtra dès qu'il te manquera quelque chose. » et « Tu as retiré tous les articles de ta liste. Ton plan de repas, lui, n'a pas changé. » | Garder la 1ʳᵉ phrase de chacune |
| 7 | Réserve, une section vide | « Rien au frais pour l'instant. Tout ce que tu as est rangé au sec. » (et l'inverse) | Garder la 1ʳᵉ phrase |
| 8 | Réserve, fiche d'un aliment | « Descends à 0 pour retirer cet aliment de ta réserve. » | ~~Retirer~~ **NON appliqué** : c'est le seul chemin de suppression, et le bouton « Retirer » n'apparaît qu'à zéro (motif d'origine faux) |
| 9 | Plan, toast | « Repas coché, son heure était passée » / « 3 repas cochés, leur heure était passée » | Retirer : le repas apparaît coché, en silence |
| 10 | Plan, toasts | « ✓ Mangé, journée recalée », « Repas sauté, journée recalée », « Journée réadaptée » | Retirer : la carte et le compteur du jour le montrent |
| 11 | Plan, toasts | « Ok, on garde ton plan », « C'est noté, on te change ça » (×2), « Compris, on évite ça et on te ramène le reste », « Parfait, on continue », « Variété au max, nouveau plan en route », « Recette changée » | Retirer : le changement se voit |
| 12 | Plan, un jour avant le début choisi | « Les repas d'avant ton début ne sont pas comptés. » | Retirer (« Ton plan commence lundi 26 octobre. » reste) |
| 13 | Plan, bandeau de pesée | « C'est le moment de te peser » + « Mets à jour ton poids — on réajuste tes macros et ton plan. » | Garder le titre seul |
| 14 | Plan, carte des protéines | « Revois tes protéines préférées » + « Elles suivent maintenant ton régime, et celles que tu coches reviennent plus souvent. » | « Celles que tu coches reviennent plus souvent. » |
| 15 | Carte d'un repas géré soi-même | « Tu gères ce repas — compté dans ton total » | « Tu gères ce repas » |
| 16 | Fiche recette, note de précision | « Repas un peu au-dessus de ta cible. », « Repas un peu en dessous de ta cible. », « Repas un peu pauvre en protéines. » | Retirer : rien à faire pour la personne (1,7 à 4,6 % des repas la portent depuis le point 2) ; garder « ~X g de protéines sous ta cible : ajoute un side protéiné. », qui demande un geste |

## À garder (avis)

- **Les confirmations** avant un geste : retirer un article, terminer les courses avec des
  articles non cochés, vider la réserve, supprimer une pesée, retirer une ligne d'historique.
- **Les titres et les états vides** : « Pour ta semaine du lundi 26 octobre. », « Encore pour
  cette semaine », « Ta réserve est vide… », « Prêt à démarrer ? », « Ce jour-là, ton plan
  n'avait pas encore commencé. ».
- **Les gestes** : « Touche une quantité pour la modifier. », « Appui long… » (n° 4).
- **Les conseils qui demandent un geste** : « Même plat demain midi : tu peux cuisiner les deux
  en même temps », « Tout est dans ta réserve », « Il te manque : », « ajoute un side protéiné ».
- **« Ok. Réactivable dans Profil. »** : le seul toast qui dit où revenir.
- **Les questions et leurs explications avant un choix** : « Ton plan te convient toujours ? »,
  la feuille « +X kcal assumées » et ses options, « je n'aime pas », le repas géré soi-même.
- **Les obligations** : « Aucune recette adaptée à ton régime pour ce repas — option
  standard. » (sécurité du régime), « (estimé) » sur les fibres, le plancher de sécurité des
  macros, le disclaimer, « Gardé sur ton téléphone uniquement » (RGPD), la promesse du rappel
  (« Kyroz ne t'enverra pas de notification en dehors de ça »), les mentions de paiement.

## Hors #376

- **Feuille de pesée** (« Chaque pesée recale ton plan. ») et **carte du poids** (« Kyroz
  recale calories, macros et plan à chaque fois ») : la même catégorie, mais #390 (onglet
  Poids, autre chantier) réécrit ces deux fichiers — y toucher ici ferait un conflit. À
  reprendre avec #390.
- **Profil, Réglages, inscription, connexion, Kyroz+** : pas passés au crible. Le Profil est
  en refonte (#390 puis la refonte qui suit), l'inscription a son chantier (reprise A→Z), et
  Kyroz+ porte surtout des mentions obligatoires.
