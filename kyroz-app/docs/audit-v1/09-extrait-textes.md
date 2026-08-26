# Extrait du dump — sections légal, paywall et consentement

> Sous-ensemble de `06-textes-dump.md` (728 chaînes) préparé pour l'étape 9.

> Verbatim, aucune retouche. Les sections retenues sont celles que le brief de l'étape 9 demande.

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

## Textes légaux (source unique) (`constants/legal.ts`)

| # | ligne | Rôle | Texte | Flag |
|---|---|---|---|---|
| 1 | `constants/legal.ts:15` | corps | Kyroz est conçu pour des adultes en bonne santé. Ces informations ne remplacent pas l | ⚑ |
| 2 | `constants/legal.ts:15` | corps | un médecin ou diététicien-nutritionniste. | ⚑ |
| 3 | `constants/legal.ts:28` | corps | Enceinte, allaitante, ou suivie pour une pathologie chronique ? Parles-en à un médecin avant de suivre un plan. | ⚑ |
| 4 | `constants/legal.ts:36` | corps | Kévin Berger |  |
| 5 | `constants/legal.ts:37` | corps | Entrepreneur individuel (micro-entreprise) |  |
| 6 | `constants/legal.ts:39` | corps | 2 rue du moulin, 64570 Arette | ⚑ |
| 7 | `constants/legal.ts:42` | corps | Supabase Inc. |  |
| 8 | `constants/legal.ts:43` | corps | Union européenne (UE) |  |
| 9 | `constants/legal.ts:49` | vide | Plus Five Five, Inc. |  |
| 10 | `constants/legal.ts:57` | vide | aux États-Unis |  |
| 11 | `constants/legal.ts:73` | vide | RevenueCat, Inc. |  |
| 12 | `constants/legal.ts:75` | vide | aux États-Unis |  |
| 13 | `constants/legal.ts:95` | corps | 26 août 2026 | ⚑ |
| 14 | `constants/legal.ts:106` | corps | 1. Responsable de traitement | ⚑ |
| 15 | `constants/legal.ts:108` | corps | Le responsable du traitement de vos données est ${LEGAL.controllerName}, ${LEGAL.controllerStatus}, SIREN ${LEGAL.siren}, ${LEGAL.address}. |  |
| 16 | `constants/legal.ts:109` | corps | Pour toute question relative à vos données ou pour exercer vos droits : ${LEGAL.dpoEmail}. |  |
| 17 | `constants/legal.ts:113` | corps | 2. Données collectées | ⚑ |
| 18 | `constants/legal.ts:115` | corps | Données de compte : adresse email (lors d’une inscription par email). |  |
| 19 | `constants/legal.ts:116` | corps | Données de santé : sexe, âge, poids, taille, taux de masse grasse, niveau d’activité et sport pratiqué, objectif, restrictions et préférences alimentaires. Ces informations sont des données de santé au sens de l’article 9 du RGPD. | ⚑ |
| 20 | `constants/legal.ts:117` | corps | Données d’usage de l’app : plans générés, suivi du poids, série (streak), favoris, réserve alimentaire. |  |
| 21 | `constants/legal.ts:118` | corps | Photos de progression (facultatives) : elles restent stockées UNIQUEMENT sur votre appareil et ne sont jamais transmises à nos serveurs. | ⚑ |
| 22 | `constants/legal.ts:119` | corps | Données d’abonnement, uniquement si vous souscrivez à Kyroz+ : l’identifiant technique de votre compte et l’état de votre abonnement. Aucune coordonnée bancaire ne transite par Kyroz. |  |
| 23 | `constants/legal.ts:120` | corps | Aucune statistique d’usage n’est collectée : l’application ne mesure pas comment vous vous en servez. |  |
| 24 | `constants/legal.ts:124` | corps | 3. Finalités | ⚑ |
| 25 | `constants/legal.ts:126` | corps | Vos données de compte et de santé servent exclusivement à : calculer vos besoins nutritionnels (calories, macros), générer vos plans repas, votre liste de courses et le suivi associé. | ⚑ |
| 26 | `constants/legal.ts:127` | corps | Aucune donnée n’est utilisée à des fins publicitaires. |  |
| 27 | `constants/legal.ts:131` | corps | 4. Base légale | ⚑ |
| 28 | `constants/legal.ts:133` | corps | Le traitement des données de santé repose sur votre consentement explicite (RGPD art. 9-2-a), recueilli à l’inscription. Vous pouvez le retirer à tout moment en supprimant votre compte. | ⚑ |
| 29 | `constants/legal.ts:203` | corps | 5. Destinataires et sous-traitants | ⚑ |
| 30 | `constants/legal.ts:205` | corps | Vos données synchronisées sont hébergées par ${LEGAL.host}, sur des serveurs situés en ${LEGAL.hostRegion}. |  |
| 31 | `constants/legal.ts:206` | vide | L’envoi des e-mails de service (confirmation d’inscription, réinitialisation de mot de passe) est assuré par ${LEGAL.emailProvider} (${LEGAL.emailProviderLegalName}). Seules votre adresse e-mail et le contenu de ces messages lui sont transmis — aucune donnée de santé. | ⚑ |
| 32 | `constants/legal.ts:207` | vide | Ces e-mails, ainsi que les journaux d’envoi correspondants, sont stockés par ${LEGAL.emailProvider} ${LEGAL.emailProviderStorage}. Ce transfert hors de l’Union européenne est encadré par les clauses contractuelles types de la Commission européenne et par l’adhésion de ce prestataire au cadre de protection des données UE–États-Unis (EU-U.S. Data Privacy Framework). |  |
| 33 | `constants/legal.ts:208` | vide | La gestion technique des abonnements Kyroz+ est confiée à ${LEGAL.subscriptionProvider} (${LEGAL.subscriptionProviderCountry}). Dès que vous êtes connecté, que vous soyez abonné ou non, l’identifiant technique de votre compte lui est transmis pour vérifier si un abonnement est actif ; s’y ajoutent, le cas échéant, l’état de votre abonnement et le reçu d’achat émis par l’App Store ou Google Play. Ne lui sont transmis ni votre adresse email, ni vos données de santé, ni aucune coordonnée bancaire. | ⚑ |
| 34 | `constants/legal.ts:209` | vide | Ces données sont stockées ${LEGAL.subscriptionProviderStorage}. Ce transfert hors de l’Union européenne est encadré par les clauses contractuelles types de la Commission européenne. |  |
| 35 | `constants/legal.ts:210` | corps | Le paiement lui-même est traité par l’App Store (Apple) ou Google Play. Kyroz ne voit ni ne conserve aucune coordonnée bancaire. |  |
| 36 | `constants/legal.ts:211` | corps | Nous ne vendons, ne louons et ne partageons vos données avec aucun tiers à des fins commerciales. Aucun traceur publicitaire n’est utilisé, et aucun suivi ne vous relie à d’autres applications ou sites. |  |
| 37 | `constants/legal.ts:215` | corps | 6. Hébergement et localisation | ⚑ |
| 38 | `constants/legal.ts:217` | corps | Les données synchronisées — profil, objectif, suivi du poids — sont stockées dans l’Union européenne. Une copie de travail réside localement sur votre appareil (fonctionnement hors-ligne). |  |
| 39 | `constants/legal.ts:218` | vide | Une exception, décrite au point 5 : les e-mails de service sont stockés ${LEGAL.emailProviderStorage}. Aucune donnée de santé ne quitte l’Union européenne. | ⚑ |
| 40 | `constants/legal.ts:222` | corps | 7. Durée de conservation | ⚑ |
| 41 | `constants/legal.ts:224` | corps | Vos données sont conservées tant que votre compte est actif. Elles sont supprimées (serveur + appareil) lorsque vous supprimez votre compte. |  |
| 42 | `constants/legal.ts:225` | corps | Une exception : si vous avez souscrit un abonnement, l’historique de facturation correspondant est conservé par le store concerné (Apple, Google) et par le prestataire mentionné au point 5, pour la durée qu’imposent leurs obligations légales et comptables. Cet historique ne contient aucune donnée de santé. | ⚑ |
| 43 | `constants/legal.ts:231` | corps | Les échanges avec nos serveurs sont chiffrés en transit (HTTPS). L’accès aux données est cloisonné par utilisateur : un utilisateur ne peut accéder qu’à ses propres données. |  |
| 44 | `constants/legal.ts:232` | corps | Les données stockées localement sur votre appareil ne sont pas chiffrées : protégez l’accès à votre appareil, en particulier sur un ordinateur partagé. |  |
| 45 | `constants/legal.ts:236` | corps | 9. Vos droits | ⚑ |
| 46 | `constants/legal.ts:238` | corps | Conformément au RGPD, vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité, ainsi que du droit de retirer votre consentement. |  |
| 47 | `constants/legal.ts:239` | corps | Le droit à l’effacement s’exerce directement dans l’app (Profil → Supprimer mon compte) ou par email à ${LEGAL.dpoEmail}. |  |
| 48 | `constants/legal.ts:240` | corps | Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr). |  |
| 49 | `constants/legal.ts:246` | corps | Kyroz est réservé aux personnes âgées de 18 ans et plus. Aucun compte ne peut être créé en deçà de cet âge. | ⚑ |
| 50 | `constants/legal.ts:250` | corps | 11. Modifications | ⚑ |
| 51 | `constants/legal.ts:252` | corps | La présente politique peut évoluer. Date de dernière mise à jour : ${LEGAL.effectiveDate}. |  |
| 52 | `constants/legal.ts:262` | corps | Les présentes conditions régissent l’utilisation de l’application ${LEGAL.appName}. En créant un compte ou en utilisant l’app, vous les acceptez. |  |
| 53 | `constants/legal.ts:266` | corps | 2. Description du service | ⚑ |
| 54 | `constants/legal.ts:268` | corps | Kyroz génère des plans repas, des listes de courses et des recettes à visée nutritionnelle, à partir des informations que vous fournissez. Le cœur du service est gratuit. |  |
| 55 | `constants/legal.ts:286` | corps | 3. Abonnement Kyroz+ | ⚑ |
| 56 | `constants/legal.ts:288` | corps | Le cœur du service reste gratuit : plan de la semaine, liste de courses, recettes, réserve, favoris, série, pesée, réglage du rythme de la semaine et synchronisation. Kyroz+ est un abonnement facultatif qui donne accès à des outils complémentaires — objectif daté et suivi de transformation. |  |
| 57 | `constants/legal.ts:289` | corps | L’abonnement est vendu par l’App Store ou Google Play, jamais directement par Kyroz. Le prix affiché au moment de l’achat fait foi. Le paiement, le renouvellement et la résiliation se gèrent dans les réglages de votre compte App Store ou Google Play. | ⚑ |
| 58 | `constants/legal.ts:290` | corps | L’abonnement se renouvelle automatiquement à la fin de chaque période, sauf résiliation au moins 24 heures avant l’échéance. Les demandes de remboursement relèvent du store, pas de Kyroz. | ⚑ |
| 59 | `constants/legal.ts:291` | corps | Le tarif de votre abonnement est celui affiché au moment où vous souscrivez, et il reste inchangé tant que votre abonnement demeure actif. Une évolution de nos tarifs ne s’applique qu’aux nouvelles souscriptions. En revanche, si vous résiliez puis souscrivez à nouveau plus tard, c’est le tarif en vigueur à cette date qui s’applique. |  |
| 60 | `constants/legal.ts:292` | corps | Les comptes créés avant la mise en vente de Kyroz+ conservent l’accès à ces outils gratuitement, à vie, sans démarche à effectuer. |  |
| 61 | `constants/legal.ts:296` | corps | 4. Avertissement santé | ⚑ |
| 62 | `constants/legal.ts:299` | corps | Kyroz ne s’adresse pas aux personnes atteintes de pathologies (diabète, insuffisance rénale, troubles cardiaques…), aux femmes enceintes ou allaitantes. En cas de doute, consultez un professionnel de santé. Vous restez seul responsable de votre alimentation. | ⚑ |
| 63 | `constants/legal.ts:305` | corps | Vous vous engagez à fournir des informations exactes et à avoir au moins 18 ans. Vous êtes responsable de la confidentialité de vos identifiants. | ⚑ |
| 64 | `constants/legal.ts:309` | corps | 6. Propriété intellectuelle | ⚑ |
| 65 | `constants/legal.ts:311` | corps | Les recettes et contenus de l’app sont la propriété de Kyroz. Les données nutritionnelles sont issues de la table Ciqual (ANSES), réutilisées sous Licence Ouverte 2.0 (Etalab). | ⚑ |
| 66 | `constants/legal.ts:315` | corps | 7. Données personnelles | ⚑ |
| 67 | `constants/legal.ts:317` | corps | Le traitement de vos données est décrit dans la Politique de confidentialité ci-dessus, qui fait partie intégrante des présentes conditions. |  |
| 68 | `constants/legal.ts:321` | corps | 8. Résiliation | ⚑ |
| 69 | `constants/legal.ts:323` | corps | Vous pouvez supprimer votre compte à tout moment depuis l’app (Profil → Supprimer mon compte), ce qui efface vos données. |  |
| 70 | `constants/legal.ts:326` | corps | Supprimer votre compte Kyroz n’annule PAS un abonnement en cours : celui-ci continue d’être facturé tant qu’il n’est pas résilié dans les réglages de votre compte App Store ou Google Play. |  |
| 71 | `constants/legal.ts:330` | corps | 9. Responsabilité | ⚑ |
| 72 | `constants/legal.ts:332` | corps | Kyroz fournit un outil d’aide à la planification nutritionnelle sans garantie de résultat. Notre responsabilité ne saurait être engagée pour l’usage que vous faites des plans proposés. | ⚑ |
| 73 | `constants/legal.ts:336` | corps | 10. Droit applicable | ⚑ |
| 74 | `constants/legal.ts:338` | corps | Les présentes conditions sont soumises au droit français. Contact : ${LEGAL.supportEmail}. En cas de litige, vous pouvez recourir à un médiateur de la consommation ou saisir la CNIL pour les questions relatives aux données. |  |
