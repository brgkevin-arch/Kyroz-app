// Texte légal / sécurité affiché à l'onboarding, dans les paramètres et sur chaque
// plan (CLAUDE.md §6). Source UNIQUE pour ne jamais laisser diverger les copies.
//
// ⚠️ MIROIR STATIQUE : `public/legal.html` reprend le même contenu (politique +
// CGU) pour offrir une URL publique servie en 200 (App Store / partage), car le
// web est exporté en SPA et /legal renverrait un statut 404. Si tu modifies le
// texte ici, mets aussi À JOUR `public/legal.html`.
export const DISCLAIMER =
  "Kyroz est conçu pour des adultes en bonne santé. Ces informations ne remplacent pas l'avis d'un médecin ou diététicien-nutritionniste.";

// ── Identité du responsable de traitement ───────────────────────────────────
// Identité du responsable de traitement (RGPD art. 13 / mentions légales). Tout
// est regroupé ici : ne pas dupliquer ailleurs. Le miroir statique
// `public/legal.html` doit être tenu à jour à la main en parallèle.
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
  effectiveDate: '2 août 2026',
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
    ],
  },
  {
    title: '3. Finalités',
    paragraphs: [
      "Vos données servent exclusivement à : calculer vos besoins nutritionnels (calories, macros), générer vos plans repas, votre liste de courses et le suivi associé.",
      "Aucune donnée n’est utilisée à des fins publicitaires.",
    ],
  },
  {
    title: '4. Base légale',
    paragraphs: [
      "Le traitement des données de santé repose sur votre consentement explicite (RGPD art. 9-2-a), recueilli à l’inscription. Vous pouvez le retirer à tout moment en supprimant votre compte.",
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
  // ⚠️ Autre phrase datée ici : « aucun outil d'analyse tiers » devient FAUSSE le jour
  // où `EXPO_PUBLIC_POSTHOG_KEY` est posée (`lib/analytics.ts`, dormant aujourd'hui).
  {
    title: '5. Destinataires et sous-traitants',
    paragraphs: [
      `Vos données synchronisées sont hébergées par ${LEGAL.host}, sur des serveurs situés en ${LEGAL.hostRegion}.`,
      "Si vous souscrivez un jour un abonnement Kyroz+, sa gestion technique pourra être confiée à un prestataire spécialisé. Ne lui seraient transmis que l’identifiant technique de votre compte et l’état de votre abonnement — ni votre adresse email, ni vos données de santé, ni aucune coordonnée bancaire. Ce prestataire sera nommé ici avant toute mise en vente.",
      "Le paiement lui-même est traité par l’App Store (Apple) ou Google Play. Kyroz ne voit ni ne conserve aucune coordonnée bancaire.",
      "Nous ne vendons, ne louons et ne partageons vos données avec aucun tiers à des fins commerciales. Aucun traceur publicitaire ni outil d’analyse tiers n’est utilisé.",
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
      "Le cœur du service reste gratuit : plan de la semaine, liste de courses, recettes, garde-manger, favoris, série, pesée et synchronisation. Kyroz+ est un abonnement facultatif qui donne accès à des outils complémentaires — objectif daté, suivi de transformation, banque de calories.",
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
