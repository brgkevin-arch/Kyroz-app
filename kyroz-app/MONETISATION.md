# Kyroz — Proposition de monétisation freemium

> ## ✅ TRANCHÉ + CONSTRUIT (2026-07-27) — la valeur premium existe
> La question ouverte de ce doc (« que construit-on qui vaille 5 € ? ») est **répondue
> et LIVRÉE + DÉPLOYÉE** (`5a4fc63`). **Kyroz+ = « piloter son objectif dans le temps »**,
> en **2 piliers** (cf. AGENTS.md, session Kyroz+ 2026-07-27). ⚠️ **Ils étaient 3 jusqu'au
> 2026-08-18** : la banque de calories a été retirée de Kyroz+ ce jour-là (décision
> fondateur). Le moteur reste, dégaté et renommé « Jours plus copieux », **puis ÉTEINT le
> même jour** (`lib/featureFlags.ts::RYTHME_HEBDOMADAIRE_ACTIF`). Ce n'est pas une
> suppression de fonction : le moteur, ses tests et la colonne restent intacts, et un
> compte qui portait déjà un réglage n'en garde aucune trace, ni affichée ni servie.
> 1. **🎯 Objectif daté** — poids cible + date → trajectoire calorique au rythme le plus
>    rapide mais sûr (le « coffre » : le gratuit donne les clés, le premium le contenu).
> 2. **📈 Trajectoire + réassurance** — zone ombrée sur la courbe (pas une ligne à suivre :
>    anti-charge-mentale), verdict jamais alarmant, « Kyroz réajuste tes calories tout seul ».
> 3. **📸 Transformation** — photos avant/après (local-only).
>
> ✅ **LE PAYWALL EST LIVRÉ** — écran, verrou, SDK, prix du store. ⚠️ Cette ligne a annoncé
> « le seul chantier encore ouvert » longtemps après sa livraison. **Ce qui reste n'est plus
> du code** : les fiches produits chez Apple, un build pour la capture de review, le bac à
> sable, puis la date. Procédure : `PROCEDURE-2026-08-25-mise-en-vente-kyroz-plus.md`.
> ⚠️ **La banque de calories N'EST PLUS ce 4ᵉ pilier attendu** : elle a été livrée,
> puis retirée de Kyroz+ ET éteinte le 2026-08-18 (cf. la note tout en haut de ce fichier).
> **Paiement TRANCHÉ = achat in-app via les
> stores (Apple App Store + Google Play), emballé par RevenueCat** — PAS Stripe seul (les
> stores refusent Stripe pour les abos numériques).
> **Tarif, tranché le 2026-08-25** : standard **4,99 €/mois · 39,99 €/an**, précédé d'un
> palier **early bird 3,99 € · 29,99 €** retiré à date annoncée. **Un identifiant produit
> par palier** — jamais un prix changé en place : les CGU §3 promettent désormais le tarif
> bloqué à la souscription, ce qui l'interdit contractuellement.
> Le reste du doc ci-dessous = archive de la réflexion.

> Statut historique : **proposition à valider** (décision produit non tranchée — CLAUDE.md §1).
> Rien n'est codé : ce doc sert à trancher le découpage gratuit / payant avant
> toute implémentation de paywall.

## Principe directeur (non négociable)

Le **core loop reste 100 % gratuit, sans clé API** : profil → plan 7 jours
macro-précis → courses → recettes → réserve → favoris → **streak**.

Conséquence directe sur le **North Star** (% d'appareils à **7 jours actifs — un repas
cuisiné — dans les 14 premiers jours** ; définition et calcul dans `METRICS.md`, précisée
le 2026-08-20) : **le paywall ne doit JAMAIS bloquer la fenêtre des
14 premiers jours ni le geste quotidien**. On ne monétise que des features de
confort/puissance qui arrivent *après* que l'habitude est prise. Monétiser le
core tuerait le North Star — donc interdit.

## Découpage recommandé

> ## ⚠️ CE DÉCOUPAGE A VIEILLI — à relire avant de décider (constaté 2026-07-14)
>
> Ce doc a été écrit quand ces features n'existaient pas. Depuis, **elles ont été
> construites et livrées GRATUITEMENT**. Les remettre derrière un paywall
> reviendrait à **retirer aux utilisateurs ce qu'ils ont déjà** — le plus sûr moyen
> de casser la confiance et le North Star. À traiter comme acquis-gratuit :
>
> - **Carb cycling / jours de repos** → livré (`rest_weekdays`, moteur v5+).
> - **Ajustement des macros au poids** → livré (`recalcProfile` + check-in poids).
> - **Recettes personnalisées** → livré (`RecipeEditor` + table `recipe_overrides`).
> - **« Base étendue : 50 → +100 »** → sans objet : le catalogue est à **512 recettes**
>   (314 quand cette ligne a été écrite), toutes gratuites. Le rationner *a posteriori*
>   serait une régression — et l'écart entre les deux chiffres montre à quel point
>   l'argument s'est renforcé depuis.
>
> **Restent réellement monétisables** (non construits) : historique des plans,
> export de la liste de courses, et tout ce qui reste à inventer.
> **La vraie question n'est donc plus « que bloquer ? » mais « que CONSTRUIRE qui
> vaille 5 € ? »** — le catalogue gratuit est déjà généreux.

| Capacité | Gratuit | **Kyroz+** (payant) | État réel |
|---|---|---|---|
| Génération plan 7 j macro-précis | ✅ | ✅ | livré |
| Recettes + macros + courses + réserve | ✅ | ✅ | livré |
| Favoris + streak + rappel quotidien | ✅ | ✅ | livré |
| Régénérer / remplacer un repas | ✅ (illimité) | ✅ | livré |
| **Historique des plans** (semaines passées) | semaine en cours | ✅ illimité | **non construit** → monétisable |
| **Export liste de courses** (PDF / impression / Notes) | — | ✅ | **non construit** → monétisable |
| ~~Recettes personnalisées~~ | ✅ | — | ⚠️ **déjà livré gratuit** |
| ~~Base de recettes étendue (50 / +100)~~ | ✅ 512 | — | ⚠️ **sans objet** (512 recettes, gratuites) |
| ~~Ajustement auto des macros au poids~~ | ✅ | — | ⚠️ **déjà livré gratuit** |
| ~~Modes objectifs avancés (carb cycling)~~ | ✅ | — | ⚠️ **déjà livré gratuit** |

### Ce qu'on NE met PAS derrière le paywall (et pourquoi)
- **Sync cloud multi-appareils** : déjà construite et perçue comme un dû ; la
  bloquer punirait la réinstallation et casserait la confiance. Gratuit.
- **Le streak et le rappel** : ce sont les moteurs du North Star. Gratuits.
- **Le 1er plan et la fenêtre 14 j** : intouchables.

## Tarif recommandé (marché FR, cible hommes et femmes 18–50)

- **4,99 €/mois** ou **39,99 €/an** (−33 %, ancre la formule annuelle).
- **Essai** : pas d'essai chronométré agressif. Le gratuit EST l'essai (freemium
  large). Kyroz+ se déclenche sur l'intention (clic sur une feature avancée).
- Pas de pub, pas de revente de données (RGPD — données de santé, spec §7).

## Implémentation du paywall — plan de câblage (prochain chantier CODE)

> **▶ La valeur premium est construite ET le paiement est câblé (2026-08-02). Il reste des étapes de COMPTES, un build natif et une revue — plus une ligne de code.**
> Ordre respecté : (1) valeur tranchée → (2) construite ✅ → (3) paywall = ce chantier.
> Canal **TRANCHÉ** : achat in-app **Apple App Store (IAP) + Google Play (Billing)** via
> **RevenueCat** (pas de Stripe seul — refusé par les stores). ~~Bosser sur `feature/paywall`~~ — le
> câblage est LIVRÉ et mergé (2026-08-02), il n'y a plus de branche à ouvrir.
> ⚠️ **Revalider la doc RevenueCat/Apple à jour au moment du câblage** (les exigences bougent) —
> ce plan donne la trame, pas les appels d'API figés.

> ⚠️ **ÉTAT AU 2026-08-02 — les sections B, C et D sont LIVRÉES.** Ce plan datait d'avant
> le câblage ; il ne restait plus qu'à cocher, ce qui ne se voyait pas. Détail, mesures et
> pièges : `AGENTS.md` B2. Ce qui reste ouvert est **hors code** (comptes, build, revue).

### A. Prérequis externes (fondateur — comptes & produits, AVANT le code)
- [x] **App Store Connect** — ✅ **fait le 2026-07-30** : Paid Applications Agreement ACTIF,
      groupe d'abonnement **Kyroz+** et les 2 produits auto-renouvelables créés et tarifés,
      `kyroz_plus_monthly` (4,99 €) et `kyroz_plus_yearly` (39,99 € d'avance **ou 3,99 €/mois**).
      Reste la capture de review (impossible avant que le paywall existe) → produits en
      « Métadonnées manquantes ». ⚠️ Cette ligne ajoutait « ce qui n'empêche ni RevenueCat
      ni le bac à sable » : **RevenueCat, confirmé le 2026-08-02** (il résout les deux
      identifiants et affiche l'état Apple) ; **le bac à sable, jamais vérifié** — Apple ne
      sert normalement un produit à StoreKit qu'à partir de « Prêt à soumettre ».
      Cf. `STORE-RELEASE.md` §1-bis.
      ⚠️ **`kyroz_plus_yearly`, pas `_annual`** : le code s'était trompé, cf. AGENTS.md B2.
- [ ] **Google Play Console** : créer l'abonnement `kyroz_plus` avec 2 *base plans* (mensuel / annuel), mêmes prix.
- [x] ✅ **RevenueCat — fait le 2026-08-02.** Projet « Kyroz », app App Store rattachée
      (`app.kyroz.mobile`, clé d'achat in-app `.p8` déposée), entitlement **`premium`** avec
      `kyroz_plus_monthly` + `kyroz_plus_yearly` sous l'app Apple. Recoupé au caractère près
      avec `lib/purchases.ts` et `lib/premium.ts`.
      🔴 L'onboarding avait nommé l'entitlement **`Kyroz Premium`** (majuscule + ESPACE) et
      l'avait rempli de deux **faux produits du « Test Store »**. Corrigé côté dashboard :
      un identifiant générique laisse le nom commercial libre, et l'espace n'a rien à faire
      dans une chaîne qui voyage en URL. Cf. AGENTS.md B2 — c'est le 4ᵉ identifiant faux de
      la série.
      ⚠️ **Pas d'offering, volontairement** : le code adresse les produits par identifiant et
      ne lit jamais les offerings.
      ✅ **Clé publique `appl_…` POSÉE** (variable EAS `production`, vérifiée dans le
      bundle). Reste l'app Android le jour où Google Play existera.

### B. Intégration SDK (code) — ✅ LIVRÉE le 2026-08-02
- [x] `react-native-purchases` **v10.6.0** installé. ⚠️ Module **natif** → build EAS / dev
      client obligatoire (ni Expo Go, ni OTA).
- [x] Init **paresseuse et idempotente** dans `lib/purchases.ts::configurePurchases()`, pas au
      démarrage dans `app/_layout.tsx` — **écart assumé** : sans clé, le SDK n'est même pas
      chargé, donc l'app ne paie rien pour une feature qui n'est pas ouverte.
      Clés en `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`. ⚠️ **Elles vivent dans
      les VARIABLES D'ENVIRONNEMENT EAS, pas dans un fichier** (`.env.example` n'en donne
      que le nom). Depuis le 2026-08-03 c'est la source UNIQUE — `eas.json` ne porte plus
      aucune clé, parce que son bloc `env` est lu par `eas build` et **pas** par
      `eas update` (le détail, et les deux pièges qui vont avec, sont en `CLAUDE.md` §2).
- [x] **Web = no-op**, mais par **séparation de plateforme** (`lib/purchases.web.ts`) et non
      par une garde `Platform.OS !== 'web'`. ⚠️ **La garde ne suffisait PAS** : mesuré sur
      l'export, le SDK restait embarqué dans le bundle web (**+900 Ko**) parce que Metro
      analyse les `require` statiquement. Avec le fichier `.web.ts` : **+1,4 Ko** et zéro
      occurrence. Piège consigné dans `CLAUDE.md` §11.

### C. Entitlement / gating (`is_premium`)
- [x] ✅ Hook `usePremium()` : lit `entitlements.active['premium']` + écoute
      `addCustomerInfoUpdateListener` (sinon un achat ne se verrait qu'au prochain lancement).
      **Source de vérité = RevenueCat** (le SDK cache le dernier état → marche hors-ligne).
      Aucun flag local bricolé. Expose `{ allowed, reason, entitled, notice, can }` — plus
      riche que le `{ isPremium, loading }` prévu ici, parce que le verrou distingue quatre
      états (`not_launched`, `grandfathered`, `entitled`, `locked`).
- [x] ✅ **L'abonnement est rattaché au COMPTE, pas à l'appareil** — corrigé le 2026-08-02,
      `lib/purchases.ts::identifyUser()`. Le SDK était configuré **sans identifiant** : il
      travaillait donc sur un utilisateur ANONYME, propre au téléphone. Deux dégâts
      symétriques — la personne suivante sur un appareil partagé héritait de l'abonnement
      (rien ne le retirait à la déconnexion), et la même personne sur son second appareil
      restait `locked`. L'ancre est l'**UUID Supabase**, celui qui porte déjà `created_at`
      donc le grand-père. Jamais l'e-mail : cet identifiant part chez RevenueCat.
- [ ] (Optionnel, plus tard) miroir `profiles.is_premium` via **webhook RevenueCat → Edge
      Function** pour l'analytique serveur. PAS requis pour le gating client.
- [x] ✅ **RGPD — la moitié « déclarer » est faite le 2026-08-02.** Rattacher l'UUID
      Supabase fait de RevenueCat un **sous-traitant** qui conserve un identifiant de compte
      et un historique d'achats. Deux phrases de la politique devenaient donc fausses au
      premier abonné : §5 promettait « aucun tiers », §7 un effacement total. Réécrites **au
      conditionnel** (« si vous souscrivez… ») pour rester vraies aujourd'hui, plus une
      section CGU **« 3. Abonnement Kyroz+ »** : renouvellement automatique + 24 h,
      remboursements du ressort du store (Apple Guideline 3.1.2), et le piège qui coûte de
      l'argent — **supprimer son compte Kyroz n'annule PAS l'abonnement**.
      Verrouillé par `lib/__tests__/legal.test.ts`, qui exige aussi que le miroir
      `public/legal.html` contienne chaque paragraphe (les deux copies se recopiaient à la
      main, sans filet).
      🔴 **Le texte NOMMAIT RevenueCat — retiré le même jour, sur signalement du fondateur :
      aucun contrat n'existe, et le choix du prestataire n'est pas définitivement arrêté.**
      Nommer un sous-traitant qui n'en est pas un est le même mensonge que taire celui qui
      l'est. Le texte dit « un prestataire spécialisé » — les **catégories** de destinataires
      sont explicitement admises (RGPD art. 13-1-e) — et promet de le nommer avant la vente.
      ⚠️ **Manque encore, volontairement** : le cadre du transfert hors UE (clauses types /
      DPF, RGPD art. 13-1-f). Il ne se lit que dans le contrat — à écrire EN MÊME TEMPS que
      le nom, le jour de la signature.
      ⏭️ **Non fait, assumé** : appeler leur API d'effacement depuis `delete-account`. Elle
      demande la clé SECRÈTE, donc du code serveur, et ne sert à rien sans abonné.
- [x] ✅ **Ce qu'on verrouille = features Kyroz+ uniquement** : `PREMIUM_FEATURES` =
      `dated_goal` · `transformation` — ⚠️ **`calorie_bank` en est SORTI le 2026-08-18**. Le reste
      — core loop, courses, recettes, réserve, favoris, série, pesée, synchro — **reste
      libre**, et l'écran l'énumère noir sur blanc.
- [x] ✅ **North Star sacré** : le paywall ne s'ouvre que sur **INTENTION** — un seul point
      d'étranglement, `openEditor()` dans `app/(tabs)/profil.tsx` (ligne 187), plus l'entrée
      explicite du menu Profil. **Aucun appel au lancement**, vérifié : `/kyroz-plus` n'est
      poussé que depuis ces deux endroits.

### D. Paywall (écran) — ✅ LIVRÉ (écran le 2026-08-01, câblage le 2026-08-02)
- [x] `app/kyroz-plus.tsx` : prix **lus du store** (`priceString` localisé) dès qu'ils
      arrivent, sinon repli sur les tarifs français **avec la mention qui le dit**. Achat via
      `purchaseStoreProduct` (et non `purchasePackage` : on cible les produits directement,
      un offering n'est pas nécessaire pour deux formules).
- [x] **Obligatoires Apple** : « Restaurer mes achats » branché, liens CGU + Confidentialité,
      mentions prix / période / renouvellement. ⚠️ La restauration ne sera PROUVÉE qu'en bac
      à sable — sans ça, rejet Guideline 3.1.1.
- [x] États gérés : achat en cours, succès, **annulation traitée comme un cas NORMAL** (aucun
      message), erreur, indisponible. Via `useDialog()` et **jamais `Alert.alert`**, qui est
      une fonction vide sur web (`CLAUDE.md` §11).
- [x] ✅ **DEUX formules, et c'est réglé le 2026-08-25.** Apple portait aussi l'annuel payé
      au mois (3,99 €/mois, engagement 12 mois), que l'écran n'affichait pas. Il a été
      **retiré chez Apple** : avec l'early bird mensuel à 3,99 €, deux offres auraient porté
      le même prix mensuel dont l'une engageait douze mois.
      ⚠️ **L'API ne sait PAS le faire** — « Only future price changes can be deleted » : un
      prix en vigueur ne se supprime que dans l'interface (Disponibilité → colonne de droite
      → « Supprimer la facturation mensuelle »). À refuser DÈS la création des prochains
      produits.
- [x] ✅ **L'annuel est présélectionné** sur l'écran (2026-08-25). Le mensuel l'était, donc
      la formule dont l'économie affichée juste en dessous ne parle pas.

### E. Conformité review & tests
- [ ] Le reviewer doit **atteindre le paywall** (via l'accès reviewer existant) → le documenter
      dans les notes de review (§ STORE-RELEASE).
- [ ] **Sandbox** : testeur Sandbox iOS (App Store Connect) + license testers / piste fermée
      Android. Vérifier achat, **restauration**, expiration.

### F. Ordre de bataille
A (comptes/produits) → B (SDK + init web-safe) → C (hook `usePremium` + points de gate) →
D (écran paywall) → E (sandbox + review).
✅ **B, C, D et RevenueCat sont faits, et les clés sont dans EAS.**
🔴 **L'ORDRE CI-DESSOUS ÉTAIT FAUX D'UN CRAN, et il l'était depuis le début.** Il finissait
par « poser `PAYWALL_LAUNCH` » — or **l'écran de paywall ne se rend que si la date est
posée** (`enVente = reason === 'locked'`, `kyroz-plus.tsx:90`) : sans elle, il n'y a
strictement rien à capturer. La date n'était pas la conclusion de la chaîne, elle en était
le premier maillon.
✅ **Elle est posée depuis le 2026-08-27** (`'2026-08-27T00:00:00+02:00'`, décision
fondateur). Il reste, dans l'ordre : **build natif** → **capture de review** →
**« Prêt à soumettre »** → **bac à sable** → **médiateur de la consommation** → soumission.
⚠️ Le dernier est neuf, et c'est la pose de la date qui l'a armé : l'obligation d'adhésion
(L.612-1) ne vise que le professionnel qui VEND, elle mord à la première vente, et **aucune
adhésion n'existe**. C'est un contrat à souscrire, pas une ligne à écrire.
🔴 **Et c'est la CAPTURE qui bloque « Prêt à soumettre », pas les libellés** — mesuré le
2026-08-25 par `npm run check:abonnements` : les descriptions fr-FR existent depuis
toujours, `appStoreReviewScreenshot` est vide. Comme elle montre le paywall, elle exige un
binaire : **le bac à sable ne peut donc pas passer avant le build**, contrairement à ce que
ce fichier et `STORE-RELEASE.md` ont laissé croire.
⚠️ ~~La date se pose en DERNIER~~ — corrigé le 2026-08-27, voir ci-dessus : elle se pose AVANT la capture de review, qui n'existe pas sans elle. **Elle ne se recule jamais**, ça n'a pas changé. Sans impact `ENGINE_VERSION` — le seul
chantier qui touchait le moteur, la banque de calories, est CLOS (livrée puis éteinte le
2026-08-18, `lib/featureFlags.ts`). `profiles.stripe_customer_id` = vestige
(RevenueCat porte l'entitlement) : garder ou renommer au câblage, non bloquant.

## Décisions TRANCHÉES (2026-07-27) — plus rien en attente côté produit

1. **Valeur premium** = Kyroz+ « piloter son objectif dans le temps » (objectif daté +
   trajectoire + transformation) — **construite + déployée**. ⚠️ La banque de calories en
   faisait partie ; elle en est sortie le 2026-08-18, est devenue gratuite, puis a été
   ÉTEINTE le même jour (`lib/featureFlags.ts::RYTHME_HEBDOMADAIRE_ACTIF`) — moteur intact.
2. **Les 4 features déjà livrées restent GRATUITES** (carb cycling, recalc macros au poids,
   recettes perso, catalogue complet) : les reprendre casserait la confiance et le North Star.
3. **Paiement = achat in-app Apple App Store + Google Play, via RevenueCat** (pas Stripe seul).
4. **Tarif** = 4,99 €/mois · 39,99 €/an (ajustable au moment du câblage, mais c'est le plan retenu).

→ Reste UNIQUEMENT à **coder** : le **paywall** (RevenueCat + `is_premium`) et la **banque de
calories**. Plus aucune décision produit en suspens.
