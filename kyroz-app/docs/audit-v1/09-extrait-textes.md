# Extrait du dump — écrans légal-adjacents, paywall et consentement

> Sous-ensemble de `06-textes-dump.md`, préparé pour l'étape 9. Verbatim, aucune retouche.

>

> 🔴 **Le bloc « Textes légaux » a été RETIRÉ de cet extrait**, sur objection de l'étape 9 : la politique

> et les CGU s'auditent sur **`constants/legal.ts` lui-même**, pas sur un dump du dump. Le fichier est

> la pièce n°6 du dossier. La raison est mesurable — voir la note d'extraction en fin de document.

>

> ⚠️ **Chaque section porte désormais son état de RENDU.** L'étape 9 avait raison de le demander :

> un texte présent dans le bundle n'est pas un texte affiché, et la distinction change le jugement.

## Inscription / connexion (`app/(auth)/login.tsx`)

**État : 🟢 RENDU**

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

## Kyroz+ (paywall) (`app/kyroz-plus.tsx`)

**État : 🟢 RENDU — écran vivant**

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

## Légal (écran) (`app/legal.tsx`)

**État : 🟢 RENDU — c’est le lecteur, le contenu vient de `constants/legal.ts`**

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `app/legal.tsx:27` | corps | Confidentialité & CGU |  |
| 2 | `app/legal.tsx:31` | corps | Politique de confidentialité |  |
| 3 | `app/legal.tsx:37` | corps | Conditions générales d'utilisation |  |


---

# Composants partagés

## AnalyticsConsentStep (`components/AnalyticsConsentStep.tsx`)

**État : 🔴 NON RENDU — derrière `STATISTIQUES_USAGE_ACTIVES` (`onboarding.tsx:425`)**

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

## ReglagesSheet (`components/ReglagesSheet.tsx`)

**État : ⚠️ PARTIELLEMENT RENDU — le bloc « Statistiques d’usage » et la ligne « Supprimer mes statistiques » sont derrière la constante (`:323`, `:350`) ; le reste de la feuille est vivant**

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

---

## Note d'extraction — deux titres de section ont été perdus, et je sais lesquels

L'étape 9 a relevé que l'extrait sautait du §7 au §9 de la politique. Diagnostic : **ce n'est pas un manque
de la source, c'est un défaut de mon extracteur.** Pour les fichiers hors `app/` et `components/`, il ne
retenait que les chaînes d'**au moins 12 caractères**. Deux titres passent sous le seuil :

| Titre | Longueur | Retenu ? |
|---|---|---|
| `8. Sécurité` | **11** | 🔴 perdu |
| `10. Mineurs` | **11** | 🔴 perdu |

Les deux existent dans la source (`constants/legal.ts:229` et `:244`). L'étape 9 en avait vu **un** ; il y
en avait **deux** — et le second est précisément la section « Mineurs », celle sur laquelle portait le
constat 06b-19. ➡️ Raison de plus pour auditer le fichier, pas le dump.
