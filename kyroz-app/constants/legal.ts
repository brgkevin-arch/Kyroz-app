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
  // ⚠️ « ou D'UN diététicien-nutritionniste » : la même phrase vit dans
// `lib/methodologie.ts` (avertissement dispositif médical), et les deux seront
// comparées mot à mot en revue de store et à l'étape 9. Deux variantes d'une phrase
// obligatoire sont deux occasions de diverger (6b-bis-08, 2026-08-27).
  "Kyroz est conçu pour des adultes en bonne santé. Ces informations ne remplacent pas l'avis d'un médecin ou d'un diététicien-nutritionniste.";

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
  // 🔴 LES CONSTANTES DE MESURE D'AUDIENCE ONT ÉTÉ RETIRÉES LE 2026-08-26
  // (`analyticsProvider`, `analyticsStorage`, `analyticsRetention`). Les statistiques
  // d'usage sont éteintes et **aucun texte ne les mentionne plus** : décision
  // fondateur, « fais comme si posthog n'existait pas ». Ce qui avait été collecté
  // — quelques jours, son propre appareil et un testeur — est supprimé à la source.
  // ⚠️ Les garder « au cas où » aurait laissé trois valeurs sans lecteur dans le
  // fichier qui fait foi pour les textes opposables. Le jour d'un retour, elles se
  // réécrivent en trois lignes ; c'est l'arbitrage qui coûte, pas la constante.
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
  effectiveDate: '27 août 2026',
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
      "Aucune statistique d’usage n’est collectée : l’application ne mesure pas comment vous vous en servez.",
    ],
  },
  {
    title: '3. Finalités',
    paragraphs: [
      "Vos données de compte et de santé servent exclusivement à : calculer vos besoins nutritionnels (calories, macros), générer vos plans repas, votre liste de courses et le suivi associé.",
      "Aucune donnée n’est utilisée à des fins publicitaires.",
    ],
  },
  {
    title: '4. Base légale',
    paragraphs: [
      "Le traitement des données de santé repose sur votre consentement explicite (RGPD art. 9-2-a), recueilli à l’inscription. Vous pouvez le retirer à tout moment en supprimant votre compte.",
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
  // 🔴 LA MESURE D'AUDIENCE A QUITTÉ CE FICHIER LE 2026-08-26 (décision fondateur,
  // « fais comme si posthog n'existait pas »). Les paragraphes qui la décrivaient dans
  // les §2, 3, 4, 5, 6, 7 et 9 sont SUPPRIMÉS, pas passés au passé : la collecte est
  // coupée dans le code, la clé retirée d'EAS, et le peu qui avait été collecté en
  // huit jours — l'appareil du fondateur et un testeur — est supprimé à la source.
  // ⚠️ LE PRÉCÉDENT QUI S'APPLIQUE ICI EST L'INVERSE DE CELUI DE RESEND, et il vaut
  // d'être écrit : *un sous-traitant se déclare le jour où il traite* (leçon payée
  // deux jours durant, plus bas). La réciproque est vraie — un sous-traitant qui ne
  // traite plus, dont les données sont effacées, cesse d'être déclaré. Le garder
  // « au cas où » ferait décrire un traitement inexistant, ce qui est le même défaut
  // dans l'autre sens.
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
      // 🔴 CETTE PHRASE ÉTAIT FAUSSE, et c'est l'audit V1 qui l'a montré (constat 09-02).
      // Elle est ABSOLUE et VÉRIFIABLE — donc c'était la plus exposée de toute la
      // politique. Les données locales (profil, pesées) vivent en clair dans
      // AsyncStorage, et rien ne les excluait des sauvegardes du système : elles
      // partaient donc vers Apple et Google, hors UE, sans que personne ne l'ait décidé.
      // ✅ Android : `android.allowBackup: false` (app.json, 2026-08-26) — la sauvegarde
      //    Google n'emporte plus rien de l'app.
      // 🔴 **ET LA MOITIÉ iOS ÉTAIT DÉJÀ VRAIE — la phrase est restée prudente pendant
      //    un jour en attendant quelque chose qui existait.** Cette ligne disait :
      //    « l'exclusion iCloud demande un plugin natif, donc un nouveau binaire ».
      //    C'est FAUX, et c'est la lecture du paquet qui l'a montré (2026-08-27) :
      //    `RNCAsyncStorage.mm:518-527` — `// by default, we want to exclude AsyncStorage
      //    data from backup`, `isExcludedFromBackup = @YES`. Aucune surcharge
      //    `RCTAsyncStorageExcludeFromBackup` dans `ios/` ni `app.json` (vérifié), donc
      //    le défaut s'applique. Et les photos de progression vivent dans le répertoire
      //    de CACHE (`lib/photos.ts`), qu'iOS ne sauvegarde pas non plus.
      // ➡️ La condition que la version précédente posait — « les DEUX plateformes
      //    traitées » — était donc REMPLIE le jour où elle a été écrite. Durcir la
      //    phrase aujourd'hui ne l'enfreint pas : ça la satisfait.
      // ⚠️ **La prudence coûtait quelque chose, et c'est ce qui rendait la correction
      //    urgente** : le texte demandait à l'utilisateur de couper sa sauvegarde iCloud
      //    pour protéger ses données de santé — un geste réel, pour un risque qui n'a
      //    pas lieu. Une politique trop prudente n'est pas neutre : elle fait agir.
      // ⚠️ Les deux exclusions restent des DÉFAUTS de bibliothèque et de configuration,
      //    pas des promesses contractuelles. Si `allowBackup` bougeait, ou si
      //    AsyncStorage changeait son défaut, cette phrase redeviendrait fausse — d'où
      //    le compteur de `legal.test.ts`, qui lit les deux sources.
      `Une exception, décrite au point 5 : les e-mails de service sont stockés ${LEGAL.emailProviderStorage}. Vos données de santé ne sont transmises à aucun destinataire hors de l’Union européenne, et les sauvegardes automatiques de votre téléphone ne les emportent pas : sur Android l’application est exclue de la sauvegarde Google, et sur iPhone son stockage local est exclu de la sauvegarde iCloud.`,
    ],
  },
  {
    title: '7. Durée de conservation',
    paragraphs: [
      "Vos données sont conservées tant que votre compte est actif. Elles sont supprimées (serveur + appareil) lorsque vous supprimez votre compte.",
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
      "Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).",
    ],
  },
  {
    title: '10. Mineurs',
    paragraphs: [
      "Kyroz est réservé aux personnes âgées de 18 ans et plus.",
      "Votre date de naissance vous est demandée dès la configuration de votre profil, avant tout calcul : en deçà de 18 ans, aucun plan n’est établi et le service ne peut pas être utilisé. La création du compte, elle, ne demande qu’une adresse email et un mot de passe — elle ne vérifie donc pas votre âge.",
      `Si un compte a été créé par une personne mineure, écrivez à ${LEGAL.dpoEmail} : il sera supprimé, ainsi que les données associées.`,
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
      // 🔴 LA MENTION DU MÉDIATEUR A ÉTÉ RETIRÉE LE 2026-08-26 (audit V1, constat 09-04),
      // et le sens du retrait compte : ce n'était pas une phrase de trop, c'était une
      // phrase FAUSSE. Elle annonçait « vous pouvez recourir à un médiateur de la
      // consommation » alors qu'aucune adhésion n'existe — donc un recours promis et
      // introuvable, sur le seul paragraphe que quelqu'un lit quand ça va mal.
      // 🔴 **LE DÉCLENCHEUR A ÉTÉ ARMÉ LE 2026-08-27 — `PAYWALL_LAUNCH` PORTE UNE DATE.**
      // Cette note disait « elle ne mord pas encore, Kyroz étant intégralement gratuit ».
      // La prémisse est tombée : le paywall est posé, et il partira au build (7).
      // ⚠️ L'obligation d'adhésion (L.612-1) ne vise que le professionnel qui VEND, donc
      // elle mord à la PREMIÈRE VENTE — pas à la pose de la date, pas au merge. La
      // fenêtre entre les deux est tout ce qui reste pour s'en occuper.
      // 🔴 **AUCUNE ADHÉSION N'EXISTE À CE JOUR**, et ce n'est pas une ligne de texte à
      // écrire : c'est un contrat avec un organisme de médiation, payant, à souscrire.
      // Les CGU devront ensuite porter son NOM et ses COORDONNÉES (L.616-1 impose les
      // coordonnées, pas la simple existence).
      // ➡️ **C'est un préalable à la mise en vente, au même titre que le bac à sable** —
      // écrit comme tel dans `PROCEDURE-2026-08-25-mise-en-vente-kyroz-plus.md` et dans
      // `lib/premium.ts`. Ne pas le laisser vivre en commentaire seulement : une inconnue
      // consignée n'est pas une inconnue traitée.
      `Les présentes conditions sont soumises au droit français. Contact : ${LEGAL.supportEmail}. Pour toute question relative à vos données, vous pouvez saisir la CNIL.`,
    ],
  },
];
