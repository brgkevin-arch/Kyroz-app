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
  emailProvider: 'Resend',
  // Mesure d'audience (PostHog Cloud EU) — cf. `lib/analytics.ts`. Le consentement
  // est demandé séparément à l'onboarding et se retire dans Réglages.
  // ⚠️ On écrit le STOCKAGE, pas « hébergé dans l'UE » : les données sont stockées à
  // Francfort, mais le transit est routé par Cloudflare sur des points de présence
  // mondiaux (liste des sous-traitants PostHog, consultée le 2026-08-18). Une
  // localisation de serveurs ne se transforme pas en promesse plus large qu'elle.
  analyticsProvider: 'PostHog',
  analyticsStorage: 'Francfort, en Allemagne',
  analyticsRetention: 'au moins un an',
  effectiveDate: '18 août 2026',
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
      "Données d’usage de l’app : plans générés, suivi du poids, série (streak), favoris, garde-manger.",
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
  // ⚠️ **ON NE NOMME AUCUN PRESTATAIRE D'ABONNEMENT, ET C'EST DÉLIBÉRÉ.** Une première
  // version (2026-08-02) écrivait « RevenueCat, Inc. (États-Unis) » alors qu'AUCUN
  // contrat n'existe avec eux et que le choix technique n'est pas définitivement
  // arrêté. Nommer un sous-traitant qui n'en est pas un est le même mensonge que
  // taire celui qui l'est — juste dans l'autre sens. Le RGPD (art. 13-1-e) autorise
  // explicitement les **catégories** de destinataires, ce que fait le texte ci-dessous.
  // ➡️ Le jour où le contrat est signé : remplacer « un prestataire spécialisé » par
  // le nom, et AJOUTER le cadre du transfert hors UE (clauses contractuelles types /
  // Data Privacy Framework), exigé par l'art. 13-1-f et qui ne peut se lire que dans
  // le contrat. Une politique de confidentialité n'est pas l'endroit où supposer.
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
  // ⚠️ Ce que ce texte NE dit PAS, faute de l'avoir vérifié : le cadre du transfert
  // hors UE (clauses contractuelles types / Data Privacy Framework), exigé par
  // l'art. 13-1-f. Il ne peut se lire que dans le DPA signé avec Resend — à compléter
  // ici une fois le contrat consulté. Même règle que pour le prestataire d'abonnement
  // ci-dessus : on nomme ce qu'on sait, on ne suppose pas ce qu'on n'a pas lu.
  {
    title: '5. Destinataires et sous-traitants',
    paragraphs: [
      `Vos données synchronisées sont hébergées par ${LEGAL.host}, sur des serveurs situés en ${LEGAL.hostRegion}.`,
      `L’envoi des e-mails de service (confirmation d’inscription, réinitialisation de mot de passe) est assuré par ${LEGAL.emailProvider}. Seules votre adresse e-mail et le contenu de ces messages lui sont transmis — aucune donnée de santé.`,
      `Si vous acceptez le partage des statistiques d’usage, celles-ci sont traitées par ${LEGAL.analyticsProvider}. Elles sont stockées sur ses serveurs de ${LEGAL.analyticsStorage}. Lui sont transmis l’identifiant pseudonyme de votre appareil et les événements décrits au point 2 — aucune donnée de santé, aucun contenu de plan, ni votre adresse e-mail, ni l’identifiant de votre compte.`,
      "Si vous souscrivez un jour un abonnement Kyroz+, sa gestion technique pourra être confiée à un prestataire spécialisé. Ne lui seraient transmis que l’identifiant technique de votre compte et l’état de votre abonnement — ni votre adresse email, ni vos données de santé, ni aucune coordonnée bancaire. Ce prestataire sera nommé ici avant toute mise en vente.",
      "Le paiement lui-même est traité par l’App Store (Apple) ou Google Play. Kyroz ne voit ni ne conserve aucune coordonnée bancaire.",
      "Nous ne vendons, ne louons et ne partageons vos données avec aucun tiers à des fins commerciales. Aucun traceur publicitaire n’est utilisé, et aucun suivi ne vous relie à d’autres applications ou sites.",
    ],
  },
  {
    title: '6. Hébergement et localisation',
    paragraphs: [
      `Les données synchronisées sont stockées dans l’Union européenne. Une copie de travail réside localement sur votre appareil (fonctionnement hors-ligne).`,
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
  // relèvent du store. Un troisième point est une décision fondateur, pas une
  // obligation : la gratuité à vie des comptes antérieurs (`lib/premium.ts`).
  {
    title: '3. Abonnement Kyroz+',
    paragraphs: [
      "Le cœur du service reste gratuit : plan de la semaine, liste de courses, recettes, garde-manger, favoris, série, pesée, réglage du rythme de la semaine et synchronisation. Kyroz+ est un abonnement facultatif qui donne accès à des outils complémentaires — objectif daté et suivi de transformation.",
      "L’abonnement est vendu par l’App Store ou Google Play, jamais directement par Kyroz. Le prix affiché au moment de l’achat fait foi. Le paiement, le renouvellement et la résiliation se gèrent dans les réglages de votre compte App Store ou Google Play.",
      "L’abonnement se renouvelle automatiquement à la fin de chaque période, sauf résiliation au moins 24 heures avant l’échéance. Les demandes de remboursement relèvent du store, pas de Kyroz.",
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
