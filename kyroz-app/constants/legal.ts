// Texte légal / sécurité affiché à l'onboarding, dans les paramètres et sur chaque
// plan (CLAUDE.md §6). Source UNIQUE pour ne jamais laisser diverger les copies.
export const DISCLAIMER =
  "Kyroz est conçu pour des adultes en bonne santé. Ces informations ne remplacent pas l'avis d'un médecin ou diététicien-nutritionniste.";

// ── Identité du responsable de traitement ───────────────────────────────────
// ⚠️ À COMPLÉTER par le fondateur : SIREN + adresse (obligatoires pour identifier
// le responsable de traitement — RGPD art. 13 / mentions légales). Tout est
// regroupé ici : ne pas dupliquer ailleurs.
export const LEGAL = {
  appName: 'Kyroz',
  controllerName: 'Kévin Berger',
  controllerStatus: 'Entrepreneur individuel (micro-entreprise)',
  siren: '[À COMPLÉTER — n° SIREN à 9 chiffres]',
  address: '2 rue du moulin, 64570 Arette',
  dpoEmail: 'dpo@kyroz.app',
  supportEmail: 'support@kyroz.app',
  host: 'Supabase Inc.',
  hostRegion: 'Union européenne (UE)',
  effectiveDate: '15 juin 2026',
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
  {
    title: '5. Destinataires et sous-traitants',
    paragraphs: [
      `Vos données synchronisées sont hébergées par ${LEGAL.host}, sur des serveurs situés en ${LEGAL.hostRegion}.`,
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
      "Vos données sont conservées tant que votre compte est actif. Elles sont supprimées définitivement (serveur + appareil) lorsque vous supprimez votre compte.",
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
      "Kyroz est réservé aux personnes âgées de 16 ans et plus. Aucun compte ne peut être créé en deçà de cet âge.",
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
  {
    title: '3. Avertissement santé',
    paragraphs: [
      DISCLAIMER,
      "Kyroz ne s’adresse pas aux personnes atteintes de pathologies (diabète, insuffisance rénale, troubles cardiaques…), aux femmes enceintes ou allaitantes. En cas de doute, consultez un professionnel de santé. Vous restez seul responsable de votre alimentation.",
    ],
  },
  {
    title: '4. Compte',
    paragraphs: [
      "Vous vous engagez à fournir des informations exactes et à avoir au moins 16 ans. Vous êtes responsable de la confidentialité de vos identifiants.",
    ],
  },
  {
    title: '5. Propriété intellectuelle',
    paragraphs: [
      "Les recettes et contenus de l’app sont la propriété de Kyroz. Les données nutritionnelles sont issues de la table Ciqual (ANSES), réutilisées sous Licence Ouverte 2.0 (Etalab).",
    ],
  },
  {
    title: '6. Données personnelles',
    paragraphs: [
      "Le traitement de vos données est décrit dans la Politique de confidentialité ci-dessus, qui fait partie intégrante des présentes conditions.",
    ],
  },
  {
    title: '7. Résiliation',
    paragraphs: [
      "Vous pouvez supprimer votre compte à tout moment depuis l’app (Profil → Supprimer mon compte), ce qui efface définitivement vos données.",
    ],
  },
  {
    title: '8. Responsabilité',
    paragraphs: [
      "Kyroz fournit un outil d’aide à la planification nutritionnelle sans garantie de résultat. Notre responsabilité ne saurait être engagée pour l’usage que vous faites des plans proposés.",
    ],
  },
  {
    title: '9. Droit applicable',
    paragraphs: [
      `Les présentes conditions sont soumises au droit français. Contact : ${LEGAL.supportEmail}. En cas de litige, vous pouvez recourir à un médiateur de la consommation ou saisir la CNIL pour les questions relatives aux données.`,
    ],
  },
];
