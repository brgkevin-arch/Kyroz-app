// Texte légal / sécurité affiché à l'onboarding, dans les paramètres et sur chaque
// plan (CLAUDE.md §6). Source UNIQUE pour ne jamais laisser diverger les copies.
//
// ⚠️ CE FICHIER EST LA SOURCE — les autres surfaces se FABRIQUENT (2026-08-18).
// `public/legal.html` (URL publique servie en 200, exigée par les stores : le web
// est exporté en SPA, donc /legal y renverrait un 404) et
// `../docs/politique-confidentialite-kyroz.md` sont GÉNÉRÉS depuis ici :
//
//     npm run gen:legal
//
// Ne recopie plus rien à la main. `lib/__tests__/legal.test.ts` fait échouer
// `npm test` si un fichier généré ne correspond plus — la recopie manuelle avait
// laissé deux surfaces mentir en production pendant des semaines.
export const DISCLAIMER =
  "Kyroz est conçu pour des adultes en bonne santé. Ces informations ne remplacent pas l'avis d'un médecin ou diététicien-nutritionniste.";

// Renvoi vers un professionnel de santé exigé par Apple (1.4.1) et Google.
//
// 🔴 IL DOIT RESTER SUR LE PARCOURS, PAS DANS UNE PAGE LÉGALE. Il portait un ÉCRAN
// entier (« Avant de commencer » + bouton « J'ai compris »), supprimé le 2026-08-12
// sur décision fondateur : depuis le 2026-08-11 cet écran ne posait plus de question
// et ne bloquait plus personne — c'était un tap de plus pour deux phrases. Les deux
// phrases, elles, ne sont pas facultatives : elles sont désormais servies en clair
// sous le bouton de la première étape de l'onboarding.
// ➡️ « Discret » veut dire petit et gris, JAMAIS derrière un lien ou un dépliant.
// Garde-fou : lib/__tests__/avertissementMedical.test.ts.
export const AVERTISSEMENT_MEDICAL =
  "Enceinte, allaitante, ou suivie pour une pathologie chronique ? Parles-en à un médecin avant de suivre un plan.";

// ── Identité du responsable de traitement ───────────────────────────────────
// Identité du responsable de traitement (RGPD art. 13 / mentions légales). Tout
// est regroupé ici : ne pas dupliquer ailleurs. Les surfaces générées la reprennent
// d'elles-mêmes (`npm run gen:legal`).
export const LEGAL = {
  appName: 'Kyroz',
  controllerName: 'Kévin Berger',
  controllerStatus: 'Entrepreneur individuel (micro-entreprise)',
  siren: '106386162',
  address: '2 rue du moulin, 64570 Arette',
  dpoEmail: 'contact@kyroz.app',
  supportEmail: 'contact@kyroz.app',
  host: 'Supabase Inc.',
  hostRegion: 'Union européenne (UE)',
  // Expéditeur des e-mails de service (confirmation d'inscription, réinitialisation
  // de mot de passe), branché en SMTP dédié le 2026-08-09.
  // ⚠️ Le nom commercial n'est pas le nom légal, et c'est le second qui engage : le
  // DPA est conclu avec `Plus Five Five, Inc.`, qui exploite le service « Resend ».
  emailProvider: 'Resend',
  emailProviderLegalName: 'Plus Five Five, Inc.',
  // 🔴 STOCKAGE AUX ÉTATS-UNIS, et ce n'est pas un réglage qu'on a mal posé : la page
  // RGPD de Resend écrit que TOUTES les données client y sont stockées (contenu des
  // messages, journaux de livraison, webhooks, données de compte), et que la région
  // d'envoi choisie pour un domaine « does not control where data is stored ». Il
  // n'existe aujourd'hui aucun réglage qui déplace le stockage dans l'UE.
  // ➡️ Donc le §6 ne peut PAS dire « tout est en Europe » : la promesse ne vaut que
  // pour les données synchronisées (Supabase). Vérifié le 2026-08-23.
  emailProviderStorage: 'aux États-Unis',
  // Mesure d'audience (PostHog Cloud EU) — cf. `lib/analytics.ts`. Le consentement
  // est demandé séparément à l'onboarding et se retire dans Réglages.
  // ⚠️ On écrit le STOCKAGE, pas « hébergé dans l'UE » : les données sont stockées à
  // Francfort, mais le transit est routé par Cloudflare sur des points de présence
  // mondiaux (liste des sous-traitants PostHog, consultée le 2026-08-18). Une
  // localisation de serveurs ne se transforme pas en promesse plus large qu'elle.
  // Gestion des abonnements (`lib/purchases.ts`). ⚠️ Nommé depuis le 2026-08-26, après
  // lecture du DPA : ce n'est plus une catégorie mais un sous-traitant identifié, parce
  // que la clé est en PRODUCTION et qu'il traite déjà.
  // ⚠️ La raison sociale FINIT PAR UN POINT (« Inc. »). Toute phrase qui la place en
  // fin de proposition écrit « RevenueCat, Inc.. » — coquille servie en production le
  // 2026-08-26, sur les trois surfaces à la fois. Ne pas la mettre devant un point :
  // `legal.test.ts` compte désormais la ponctuation doublée.
  subscriptionProvider: 'RevenueCat, Inc.',
  subscriptionProviderCountry: 'États-Unis',
  subscriptionProviderStorage: 'aux États-Unis',
  analyticsProvider: 'PostHog',
  analyticsStorage: 'Francfort, en Allemagne',
  analyticsRetention: 'au moins un an',
  /**
   * La date que les documents affichent comme leur dernière mise à jour.
   *
   * 🔴 **ELLE A MENTI PENDANT TROIS JOURS, ET C'EST CE QUI A FAIT NAÎTRE SON
   * GARDE-FOU.** Le 2026-08-25, deux paragraphes ont été réécrits (« garde-manger »
   * → « réserve ») et un paragraphe ENTIER ajouté aux CGU — le blocage du tarif à la
   * souscription, qui n'est pas une reformulation mais un ENGAGEMENT. Cette date,
   * elle, était restée au 23 : un lecteur en concluait que l'engagement valait déjà
   * le 23 août. Il ne valait rien du tout, il n'existait pas.
   *
   * ⚠️ Rien ne la forçait à suivre : les cinq mises à jour précédentes ont été faites
   * à la main, et la sixième a été oubliée sans que rien ne rougisse. C'est
   * `lib/__tests__/legal.test.ts` qui la tient désormais — une empreinte du texte y
   * est enregistrée À CÔTÉ de cette date, et elle rougit dès que l'un bouge sans
   * l'autre.
   *
   * ⚠️ Ce n'est PAS la date du commit : c'est celle à laquelle le texte devient
   * opposable, donc celle de la livraison. Elle s'arbitre, elle ne se déduit pas.
   */
  effectiveDate: '26 août 2026',
} as const;

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

// ── Politique de confidentialité (RGPD — données de santé) ───────────────────
export const PRIVACY_POLICY: LegalSection[] = [
  {
    title: '1. Responsable de traitement',
    paragraphs: [
      `Le responsable du traitement de vos données est ${LEGAL.controllerName}, ${LEGAL.controllerStatus}, SIREN ${LEGAL.siren}, ${LEGAL.address}.`,
      `Pour toute question relative à vos données ou pour exercer vos droits : ${LEGAL.dpoEmail}.`,
    ],
  },
  {
    title: '2. Données collectées',
    paragraphs: [
      "Données de compte : adresse email (lors d’une inscription par email).",
      "Données de santé : sexe, âge, poids, taille, taux de masse grasse, niveau d’activité et sport pratiqué, objectif, restrictions et préférences alimentaires. Ces informations sont des données de santé au sens de l’article 9 du RGPD.",
      "Données d’usage de l’app : plans générés, suivi du poids, série (streak), favoris, réserve alimentaire.",
      "Photos de progression (facultatives) : elles restent stockées UNIQUEMENT sur votre appareil et ne sont jamais transmises à nos serveurs.",
      "Données d’abonnement, uniquement si vous souscrivez à Kyroz+ : l’identifiant technique de votre compte et l’état de votre abonnement. Aucune coordonnée bancaire ne transite par Kyroz.",
      "Mesures d’usage, uniquement si vous les acceptez : des événements techniques (étape d’inscription atteinte, plan ouvert, repas coché, palier de série, échec de génération, erreur technique), des comptes (nombre de jours du plan, nombre de repas) et le rang du jour depuis l’installation. Ils sont rattachés à un identifiant pseudonyme tiré au hasard sur votre appareil, jamais relié à votre compte ni à votre adresse e-mail.",
    ],
  },
  {
    title: '3. Finalités',
    paragraphs: [
      "Vos données de compte et de santé servent exclusivement à : calculer vos besoins nutritionnels (calories, macros), générer vos plans repas, votre liste de courses et le suivi associé.",
      "Les mesures d’usage, si vous les acceptez, servent uniquement à comprendre comment l’application est utilisée — où l’inscription décroche, si les plans sont suivis, quelles erreurs surviennent — afin de l’améliorer. Aucune donnée de santé et aucun contenu de plan (aliment, recette, quantité, liste de courses) n’y figure. Elles ne servent ni au profilage, ni à la personnalisation de votre plan.",
      "Aucune donnée n’est utilisée à des fins publicitaires.",
    ],
  },
  {
    title: '4. Base légale',
    paragraphs: [
      "Le traitement des données de santé repose sur votre consentement explicite (RGPD art. 9-2-a), recueilli à l’inscription. Vous pouvez le retirer à tout moment en supprimant votre compte.",
      "La mesure d’usage repose sur un consentement distinct de celui portant sur vos données de santé. Il vous est demandé avant toute collecte, se refuse sans aucune conséquence sur l’usage de l’application, et se retire à tout moment dans Réglages → Confidentialité → Statistiques d’usage, sans avoir à supprimer votre compte.",
    ],
  },
  // ✅ **ÉCHÉANCE HONORÉE LE 2026-08-26 : LE PRESTATAIRE D'ABONNEMENT EST NOMMÉ.**
  // Cette note disait « ON NE NOMME AUCUN PRESTATAIRE, ET C'EST DÉLIBÉRÉ » : une
  // première version (2026-08-02) écrivait « RevenueCat, Inc. (États-Unis) » alors
  // qu'aucun contrat n'existait et que le choix technique n'était pas arrêté. Nommer un
  // sous-traitant qui n'en est pas un est le même mensonge que taire celui qui l'est —
  // juste dans l'autre sens. Le texte a donc parlé de CATÉGORIE (art. 13-1-e).
  //
  // 🔴 **CE QUI A CHANGÉ, ET CE N'EST PAS LA RÉDACTION : LE CÂBLAGE.** Mesuré le
  // 2026-08-26 — `EXPO_PUBLIC_REVENUECAT_IOS_KEY` est posée dans l'environnement
  // `production` d'EAS, donc `Purchases.configure()` s'exécute à chaque lancement d'un
  // build de prod, et `hooks/usePremium.ts` appelle `identifyUser(uid)` **dès qu'un
  // utilisateur est CONNECTÉ — abonné ou non**.
  // ➡️ La phrase d'avant était au FUTUR (« pourra être confiée », « sera nommé avant
  // toute mise en vente »). Elle est devenue fausse toute seule le jour où le futur est
  // arrivé, et rien ne l'a signalé. **Un texte au conditionnel ne se périme pas moins
  // qu'un autre — il se périme en silence.**
  //
  // Ce que le DPA dit (lu en entier le 2026-08-26, version « Effective: August 2026 »,
  // page publique) : incorporé par référence aux conditions d'utilisation, donc RIEN À
  // SIGNER ; clauses contractuelles types 2021/914 incorporées et effectives « from
  // commencement of the relevant transfer », **module 2** (responsable → sous-traitant),
  // clause 7 écartée ; 13 sous-traitants ultérieurs, tous aux États-Unis (Annexe 3) ;
  // « Sensitive data transferred: Not Applicable » (Annexe 1B), ce que le code confirme
  // — seul l'UUID Supabase part.
  // ⚠️ **AUCUN Data Privacy Framework n'est revendiqué**, contrairement au DPA de
  // Resend. Ne pas recopier sa phrase : elle affirmerait un cadre inexistant ici.
  // Détail complet et question ouverte (OpenAI / Anthropic en Annexe 3) : RGPD-REGISTRE.md.
  //
  // ✅ ÉCHÉANCE HONORÉE LE 2026-08-18 : « aucun outil d'analyse tiers » a été retirée,
  // PostHog est nommé. Le texte est écrit au CONDITIONNEL DE CONSENTEMENT (« si vous
  // acceptez »), jamais au conditionnel d'existence — il reste donc vrai que la clé
  // soit posée ou non. Ce qui l'imposait : l'app DEMANDE déjà le consentement en
  // production (écran d'onboarding + Réglages) pour un outil que ce texte déclarait
  // inexistant. Deux surfaces se contredisaient ; c'est un énoncé faux qu'on corrige,
  // pas une anticipation.
  // ⚠️ CE QUE CE TEXTE NE DIT PAS, ET POURQUOI : l'adresse IP. PostHog la collecte par
  // défaut côté serveur (géolocalisation comprise) et le client n'envoie rien pour la
  // neutraliser. Elle est consignée comme collectée au registre, et sa coupure est une
  // CONDITION DURE à la pose de la clé — coupure et clé partent ensemble. Tant que la
  // clé n'est pas posée, rien ne part : ce silence n'est donc pas une omission.
  //
  // 🔴 ET UN SOUS-TRAITANT A MANQUÉ ICI PENDANT DEUX JOURS — ajouté le 2026-08-11.
  // L'expéditeur e-mail (Resend) est en production depuis le 2026-08-09 : il traite
  // l'adresse e-mail de chaque inscription. Cette section ne le nommait pas, et le
  // registre RGPD non plus. Le motif d'omission est instructif : la checklist qui l'a
  // trouvé le rangeait au FUTUR (« avant d'activer PostHog / Resend »), alors qu'il
  // était déjà branché. ➡️ Un sous-traitant se déclare le jour où il traite, pas le
  // jour où on l'avait prévu — et la phrase « aucun outil d'analyse tiers », elle,
  // restait vraie, ce qui rendait l'omission d'autant plus facile à ne pas voir.
  // ✅ **LE CADRE DE TRANSFERT EST LU — 2026-08-23, il n'est plus supposé.** Cette
  // note disait « à compléter une fois le contrat consulté » et attendait une
  // signature : le DPA de Resend ne se signe pas. Il devient contraignant à l'entrée
  // en vigueur du contrat (préambule + §12, ses blocs de signature étant « for
  // reference purposes only »), donc il liait déjà les parties depuis l'inscription.
  // ➡️ **Une case qui attend un geste inexistant reste cochée « à faire » pour
  // toujours.** Avant de porter un point comme bloquant, vérifier ce qu'il demande
  // vraiment — c'est le défaut déjà payé sur la DSA, présentée douze jours comme le
  // chemin critique alors qu'elle était validée.
  // Ce que le DPA dit, avec ses sections : clauses contractuelles types §6.2–6.5
  // (modules UE 1/2/3, addendum UK §6.4, Suisse §6.5), EU-U.S. Data Privacy Framework
  // §11.1–11.4 (extension UK comprise), mesures supplémentaires §6.6, sous-traitants
  // ultérieurs §4.2 avec préavis de 14 jours.
  // ⚠️ **Ce que ce texte ne dit toujours PAS, faute de l'avoir mesuré** : deux des 22
  // sous-traitants de Resend sont des fournisseurs d'IA (Anthropic PBC, RunPod), et
  // leur page ne dit pas si le contenu des messages y passe. Question ouverte au
  // registre, pas une phrase à écrire ici — même règle que pour le prestataire
  // d'abonnement ci-dessus : on nomme ce qu'on sait.
  {
    title: '5. Destinataires et sous-traitants',
    paragraphs: [
      `Vos données synchronisées sont hébergées par ${LEGAL.host}, sur des serveurs situés en ${LEGAL.hostRegion}.`,
      `L’envoi des e-mails de service (confirmation d’inscription, réinitialisation de mot de passe) est assuré par ${LEGAL.emailProvider} (${LEGAL.emailProviderLegalName}). Seules votre adresse e-mail et le contenu de ces messages lui sont transmis — aucune donnée de santé.`,
      `Ces e-mails, ainsi que les journaux d’envoi correspondants, sont stockés par ${LEGAL.emailProvider} ${LEGAL.emailProviderStorage}. Ce transfert hors de l’Union européenne est encadré par les clauses contractuelles types de la Commission européenne et par l’adhésion de ce prestataire au cadre de protection des données UE–États-Unis (EU-U.S. Data Privacy Framework).`,
      `Si vous acceptez le partage des statistiques d’usage, celles-ci sont traitées par ${LEGAL.analyticsProvider}. Elles sont stockées sur ses serveurs de ${LEGAL.analyticsStorage}. Lui sont transmis l’identifiant pseudonyme de votre appareil et les événements décrits au point 2 — aucune donnée de santé, aucun contenu de plan, ni votre adresse e-mail, ni l’identifiant de votre compte.`,
      `La gestion technique des abonnements Kyroz+ est confiée à ${LEGAL.subscriptionProvider} (${LEGAL.subscriptionProviderCountry}). Dès que vous êtes connecté, que vous soyez abonné ou non, l’identifiant technique de votre compte lui est transmis pour vérifier si un abonnement est actif ; s’y ajoutent, le cas échéant, l’état de votre abonnement et le reçu d’achat émis par l’App Store ou Google Play. Ne lui sont transmis ni votre adresse email, ni vos données de santé, ni aucune coordonnée bancaire.`,
      `Ces données sont stockées ${LEGAL.subscriptionProviderStorage}. Ce transfert hors de l’Union européenne est encadré par les clauses contractuelles types de la Commission européenne.`,
      "Le paiement lui-même est traité par l’App Store (Apple) ou Google Play. Kyroz ne voit ni ne conserve aucune coordonnée bancaire.",
      "Nous ne vendons, ne louons et ne partageons vos données avec aucun tiers à des fins commerciales. Aucun traceur publicitaire n’est utilisé, et aucun suivi ne vous relie à d’autres applications ou sites.",
    ],
  },
  {
    title: '6. Hébergement et localisation',
    paragraphs: [
      `Les données synchronisées — profil, objectif, suivi du poids — sont stockées dans l’Union européenne. Une copie de travail réside localement sur votre appareil (fonctionnement hors-ligne).`,
      `Deux exceptions, décrites au point 5 : les e-mails de service sont stockés ${LEGAL.emailProviderStorage}, et les statistiques d’usage, si vous les avez acceptées, à ${LEGAL.analyticsStorage}. Aucune donnée de santé ne quitte l’Union européenne.`,
    ],
  },
  {
    title: '7. Durée de conservation',
    paragraphs: [
      "Vos données sont conservées tant que votre compte est actif. Elles sont supprimées (serveur + appareil) lorsque vous supprimez votre compte.",
      `Les mesures d’usage, si vous les avez acceptées, sont conservées ${LEGAL.analyticsRetention} par PostHog — la durée garantie par son offre —, sans limite haute fixe au-delà. Vous pouvez à tout moment en demander la suppression (Réglages → Supprimer mes statistiques).`,
      "Une exception : si vous avez souscrit un abonnement, l’historique de facturation correspondant est conservé par le store concerné (Apple, Google) et par le prestataire mentionné au point 5, pour la durée qu’imposent leurs obligations légales et comptables. Cet historique ne contient aucune donnée de santé.",
    ],
  },
  {
    title: '8. Sécurité',
    paragraphs: [
      "Les échanges avec nos serveurs sont chiffrés en transit (HTTPS). L’accès aux données est cloisonné par utilisateur : un utilisateur ne peut accéder qu’à ses propres données.",
      "Les données stockées localement sur votre appareil ne sont pas chiffrées : protégez l’accès à votre appareil, en particulier sur un ordinateur partagé.",
    ],
  },
  {
    title: '9. Vos droits',
    paragraphs: [
      "Conformément au RGPD, vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité, ainsi que du droit de retirer votre consentement.",
      `Le droit à l’effacement s’exerce directement dans l’app (Profil → Supprimer mon compte) ou par email à ${LEGAL.dpoEmail}.`,
      "La suppression des statistiques d’usage déjà envoyées se demande depuis l’app (Réglages → Supprimer mes statistiques), qui prépare l’e-mail avec votre identifiant pseudonyme.",
      "Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).",
    ],
  },
  {
    title: '10. Mineurs',
    paragraphs: [
      "Kyroz est réservé aux personnes âgées de 18 ans et plus. Aucun compte ne peut être créé en deçà de cet âge.",
    ],
  },
  {
    title: '11. Modifications',
    paragraphs: [
      `La présente politique peut évoluer. Date de dernière mise à jour : ${LEGAL.effectiveDate}.`,
    ],
  },
];

// ── Conditions générales d’utilisation ───────────────────────────────────────
export const TERMS_OF_USE: LegalSection[] = [
  {
    title: '1. Objet',
    paragraphs: [
      `Les présentes conditions régissent l’utilisation de l’application ${LEGAL.appName}. En créant un compte ou en utilisant l’app, vous les acceptez.`,
    ],
  },
  {
    title: '2. Description du service',
    paragraphs: [
      "Kyroz génère des plans repas, des listes de courses et des recettes à visée nutritionnelle, à partir des informations que vous fournissez. Le cœur du service est gratuit.",
    ],
  },
  // ⚠️ Cette section est écrite AVANT la mise en vente : elle décrit un abonnement que
  // personne ne peut encore souscrire (`PAYWALL_LAUNCH` est `null`). Elle est rédigée
  // au conditionnel pour rester VRAIE aujourd'hui. Deux points qu'Apple contrôle à la
  // revue (Guideline 3.1.2) et qui doivent rester dans le texte : le renouvellement
  // automatique avec son délai de résiliation, et le fait que les remboursements
  // relèvent du store. Deux autres points sont des décisions fondateur, pas des
  // obligations : la gratuité à vie des comptes antérieurs (`lib/premium.ts`), et le
  // TARIF BLOQUÉ à la souscription (2026-08-25).
  // ⚠️ Ce dernier paragraphe est un ENGAGEMENT, pas une description : il nous
  // interdit de relever le prix d'un produit qui a déjà des abonnés. La mécanique
  // qui le tient est « un identifiant produit par palier tarifaire » — le palier
  // précédent sort de la vente sans être supprimé, et ses abonnés se renouvellent à
  // leur prix (comportement natif Apple / Google, rien à coder). Le jour où on
  // change un prix EN PLACE au lieu de créer un palier, ce paragraphe devient faux.
  {
    title: '3. Abonnement Kyroz+',
    paragraphs: [
      "Le cœur du service reste gratuit : plan de la semaine, liste de courses, recettes, réserve, favoris, série, pesée, réglage du rythme de la semaine et synchronisation. Kyroz+ est un abonnement facultatif qui donne accès à des outils complémentaires — objectif daté et suivi de transformation.",
      "L’abonnement est vendu par l’App Store ou Google Play, jamais directement par Kyroz. Le prix affiché au moment de l’achat fait foi. Le paiement, le renouvellement et la résiliation se gèrent dans les réglages de votre compte App Store ou Google Play.",
      "L’abonnement se renouvelle automatiquement à la fin de chaque période, sauf résiliation au moins 24 heures avant l’échéance. Les demandes de remboursement relèvent du store, pas de Kyroz.",
      "Le tarif de votre abonnement est celui affiché au moment où vous souscrivez, et il reste inchangé tant que votre abonnement demeure actif. Une évolution de nos tarifs ne s’applique qu’aux nouvelles souscriptions. En revanche, si vous résiliez puis souscrivez à nouveau plus tard, c’est le tarif en vigueur à cette date qui s’applique.",
      "Les comptes créés avant la mise en vente de Kyroz+ conservent l’accès à ces outils gratuitement, à vie, sans démarche à effectuer.",
    ],
  },
  {
    title: '4. Avertissement santé',
    paragraphs: [
      DISCLAIMER,
      "Kyroz ne s’adresse pas aux personnes atteintes de pathologies (diabète, insuffisance rénale, troubles cardiaques…), aux femmes enceintes ou allaitantes. En cas de doute, consultez un professionnel de santé. Vous restez seul responsable de votre alimentation.",
    ],
  },
  {
    title: '5. Compte',
    paragraphs: [
      "Vous vous engagez à fournir des informations exactes et à avoir au moins 18 ans. Vous êtes responsable de la confidentialité de vos identifiants.",
    ],
  },
  {
    title: '6. Propriété intellectuelle',
    paragraphs: [
      "Les recettes et contenus de l’app sont la propriété de Kyroz. Les données nutritionnelles sont issues de la table Ciqual (ANSES), réutilisées sous Licence Ouverte 2.0 (Etalab).",
    ],
  },
  {
    title: '7. Données personnelles',
    paragraphs: [
      "Le traitement de vos données est décrit dans la Politique de confidentialité ci-dessus, qui fait partie intégrante des présentes conditions.",
    ],
  },
  {
    title: '8. Résiliation',
    paragraphs: [
      "Vous pouvez supprimer votre compte à tout moment depuis l’app (Profil → Supprimer mon compte), ce qui efface vos données.",
      // E22 : le ⚠️ est parti et la phrase tient sans lui — l'emphase était déjà
      // portée par le « PAS » en capitales, pas par le pictogramme.
      "Supprimer votre compte Kyroz n’annule PAS un abonnement en cours : celui-ci continue d’être facturé tant qu’il n’est pas résilié dans les réglages de votre compte App Store ou Google Play.",
    ],
  },
  {
    title: '9. Responsabilité',
    paragraphs: [
      "Kyroz fournit un outil d’aide à la planification nutritionnelle sans garantie de résultat. Notre responsabilité ne saurait être engagée pour l’usage que vous faites des plans proposés.",
    ],
  },
  {
    title: '10. Droit applicable',
    paragraphs: [
      `Les présentes conditions sont soumises au droit français. Contact : ${LEGAL.supportEmail}. En cas de litige, vous pouvez recourir à un médiateur de la consommation ou saisir la CNIL pour les questions relatives aux données.`,
    ],
  },
];
