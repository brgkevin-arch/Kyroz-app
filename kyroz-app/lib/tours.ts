// ── Visite guidée : le CONTENU, séparé du moteur ─────────────────────────────
//
// Ce fichier ne contient que des fonctions PURES et aucun import : il est donc
// testable sous vitest (`lib/__tests__/visiteGuidee.test.ts`), là où
// `components/GuidedTour.tsx` tire react-native et ne l'est pas. Même procédé
// que `lib/collapsingTitle.ts` pour le repli du titre et `lib/accentColor.ts`
// pour la palette : la DÉCISION vit dans une fonction pure, l'écran ne fait que
// la rendre.
//
// ⚠️ POURQUOI DES FONCTIONS ET NON DES CONSTANTES. Le précédent est écrit dans
// l'app : la première bulle du Plan annonçait « Tes 7 jours de plan » EN DUR
// alors que le plan suit `plan_days` (on peut n'en choisir que 3), donc le
// tutoriel comptait des jours que l'écran ne montrait pas. Une étape dont le
// texte dépend du profil DOIT se construire, et une étape qui ne serait vraie
// que pour certains profils ne doit pas être servie aux autres.
//
// ⚠️ RÈGLE DE RÉDACTION, non négociable (CLAUDE.md §5 et §10) :
// une bulle décrit ce que le code FAIT, jamais ce qu'on aimerait qu'il fasse.
// Trois des cinq bulles d'origine ont été trouvées fausses le 2026-08-07 — dont
// « Kyroz recale automatiquement les repas restants », alors que le code
// DEMANDE d'abord (plan.tsx::logOffPlan → setAdaptPrompt, et « Non, je garde
// mon plan » ne recale rien). Chaque affirmation ci-dessous porte en commentaire
// le chemin de code qui la prouve. Ne pas en ajouter une sans faire de même.
//
// ⚠️ Et le ton RASSURE, il ne met pas la pression : aucune bulle ne doit se lire
// comme un reproche ou une consigne à tenir.

/**
 * La FORME de l'objet surligné, dans le vocabulaire de la DA (CLAUDE.md §8) —
 * pas son rayon en pixels.
 *
 * 🔴 **POURQUOI UN NOM ET PAS UN NOMBRE.** Ce champ s'appelait `rayon?: number`.
 * Écrire `22` ici aurait recopié un token de `constants/theme.ts` dans un fichier
 * qui ne peut pas l'importer (le thème tire react-native, ce fichier doit rester
 * pur) : une deuxième source de vérité pour la même valeur, qui se désaccorde à
 * la première refonte de la DA. Le contenu déclare ce que la cible EST, le moteur
 * traduit en pixels — `GuidedTour::RAYON_CIBLE`.
 *
 * ⚠️ Et `rayon` n'était RENSEIGNÉ NULLE PART : les 21 étapes retombaient sur le
 * rayon de carte, donc l'anneau dessinait une carte autour d'un bouton et une
 * lozange autour d'un cœur. Le mécanisme existait, il ne servait à rien — un
 * réglage qui ne pilote rien (CLAUDE.md, A23). D'où le défaut resté visible
 * jusqu'au 2026-08-14, signalé par le fondateur sur capture.
 *
 * ⚠️ Ce n'est PAS le rayon de l'anneau : celui-ci est plus GRAND que la cible
 * (une marge tout autour), donc reprendre le même rayon à l'identique donne un
 * coin plus carré que l'objet surligné. Le moteur ajoute la marge.
 */
export type FormeCible =
  /** Bloc de contenu, carte, ou élément SANS fond dont on entoure la zone. */
  | 'carte'
  /** Tout ce qui se presse ou se remplit : bouton, champ, ligne de menu. */
  | 'bouton'
  /** Puce, pastille, bouton rond, rangée de puces. */
  | 'pastille';

export interface TourStep {
  targetId: string;
  title: string;
  text: string;
  /** Défaut : `'carte'`, le rayon dominant de la DA. */
  forme?: FormeCible;
}

export type TourId = 'plan' | 'recettes' | 'courses' | 'reserve' | 'profil';

/**
 * Les tours rejouables, dans l'ordre où l'utilisateur rencontre les onglets.
 * Sert au « ? » de chaque en-tête ET à l'écran « Revoir les tutos » du Profil :
 * une seule table, sinon la liste du Profil oublie un tour le jour où on en
 * ajoute un (le défaut « copie stockée que personne ne relit », CLAUDE.md §10).
 */
export const TOURS: { id: TourId; label: string }[] = [
  { id: 'plan', label: 'Ton plan du jour' },
  { id: 'recettes', label: 'Le catalogue de recettes' },
  { id: 'courses', label: 'Tes courses' },
  { id: 'reserve', label: 'Ta réserve' },
  { id: 'profil', label: 'Ton profil et tes réglages' },
];

// ── Onglet Plan ──────────────────────────────────────────────────────────────

export interface PlanTourContext {
  /** `plan.days` — le nombre de jours réellement affichés. */
  days: number;
  /**
   * Les cibles des jours diffèrent-elles réellement ? Faux sans sport déclaré :
   * `dayExpenditures` retombe alors sur une cible plate et parler de jours
   * d'entraînement mentirait à qui n'en a pas.
   */
  moduleParVolume: boolean;
}

export function planTour({ days, moduleParVolume }: PlanTourContext): TourStep[] {
  return [
    {
      // Prouvé par : plan.tsx:198 — `markActiveToday()` part au MONTAGE, donc à
      // la simple ouverture de l'onglet, cuisiné ou pas.
      //
      // ⚠️ LA DEUXIÈME PHRASE A ÉTÉ RETIRÉE LE 2026-08-12 (décision fondateur).
      // Elle décrivait le bouclier : « si tu manques un jour, il est pardonné une
      // fois, la protection revient tous les sept jours ». Ce n'était pas faux —
      // `streak.ts::advanceStreak` le fait, et `FREEZE_RECHARGE` vaut bien 7 —
      // c'était une RÈGLE DE JEU expliquée à quelqu'un qui vient d'ouvrir l'app
      // pour la première fois. Le titre promet « sans pression » ; détailler un
      // mécanisme de rattrapage à ce moment-là fait exactement l'inverse.
      // ➡️ Ne pas la remettre en croyant compléter une bulle incomplète : ce qui
      // reste est ce qu'il faut savoir, le reste s'apprend en s'en servant.
      targetId: 'plan-serie',
      // Forme : plan.tsx::s.streak — `borderRadius: Radius.card`.
      forme: 'carte',
      title: 'Ta série, sans pression',
      text: "Elle avance dès que tu ouvres ton plan, cuisiné ou pas.",
    },
    {
      // Prouvé par : MacroBar.tsx (le ruban est un jeu de PROPORTIONS, toujours
      // plein — ce qui se remplit est le chiffre de gauche, alimenté par
      // `consumedDayKcal`) et lib/planEngine.ts::dayExpenditures pour la
      // modulation. L'ancien texte disait « la barre se remplit » et envoyait
      // l'œil au mauvais endroit.
      targetId: 'plan-macros',
      // Forme : plan.tsx — bloc sans fond ni rayon : on entoure sa zone.
      forme: 'carte',
      title: 'Tes cibles du jour',
      text: moduleParVolume
        ? "Le grand chiffre, c'est ce que tu as déjà mangé sur ta cible du jour affiché. Tes jours de repos en reçoivent un peu moins, tes jours d'entraînement un peu plus, et ta semaine garde son total."
        : `Le grand chiffre, c'est ce que tu as déjà mangé sur ta cible du jour affiché. En dessous, la répartition entre protéines, glucides et lipides ${days > 1 ? 'de ce jour' : 'de ta journée'}.`,
    },
    // 🔴 L'ÉTAPE `plan-offplan` A ÉTÉ RETIRÉE ICI le 2026-08-18, avec le bouton
    // qu'elle désignait (cf. PARCOURS_HORS_PLAN_ACTIF, lib/offPlanJournal.ts).
    // Elle NE POUVAIT PAS rester : une étape dont la cible n'est pas montée
    // assombrit l'écran sans bulle ni « Passer », donc sans sortie (AGENTS.md E50).
    // Son texte, à remettre tel quel le jour où le bouton revient :
    //   title : « Mangé hors plan ? »
    //   text  : « Déclare un écart ici. Kyroz le compte à part, puis te propose de
    //            réadapter les repas qui restent — c'est toi qui décides, et rien
    //            ne bouge si tu préfères garder ton plan. »
    //   forme : 'bouton'
    {
      // Prouvé par : plan.tsx, le bouton pose `@kyroz:openEditor = 'macros'`
      // puis pousse vers le Profil ; et plan.tsx::carryTracking conserve les
      // repas déjà marqués quand un changement de réglage refait le plan.
      targetId: 'plan-repartition',
      // Forme : plan.tsx::s.actionBtn — idem.
      forme: 'bouton',
      title: 'Ta répartition',
      text: "Ce raccourci ouvre « Calories & macros » dans ton profil, où tu peux passer en pourcentages perso. Ton plan se refait alors seul, sans effacer ce que tu as déjà marqué aujourd'hui.",
    },
    {
      // Prouvé par : plan.tsx::cookMeal — `deductIngredients` retire de la
      // réserve, `setMealStatus('eaten')` déclenche `rebalanceDay`. Et
      // plan.tsx::autoCocher fait exactement la même chose quand l'heure du repas
      // suivant est passée (lib/repasAuto.ts), sauf si le réglage est éteint.
      targetId: 'plan-cook',
      // Forme : MealCard.tsx::cookBtn — `borderRadius: Radius.button`.
      forme: 'bouton',
      title: 'Marque-le comme cuisiné',
      text: "Tape « J'ai cuisiné » : les ingrédients quittent ta réserve et les repas qui restent se recalent. Un repas dont l'heure est passée se coche seul — tu peux couper ça dans ton profil.",
    },
    {
      // Prouvé par : plan.tsx::dislikeMealCore (la recette entre dans
      // `hidden_recipes`, réversible depuis Profil → Préférences alimentaires,
      // et l'élicitation s'ouvre quand le vivier du repas passe sous le seuil de
      // lib/dislike.ts) et lib/planEngine.ts::swapMeal (même cible macro, biais
      // favoris). Deux icônes voisines qui répondent à la même question — les
      // séparer en deux bulles coûterait une étape pour rien.
      targetId: 'plan-actions',
      // Forme : MealCard.tsx::iconGroup — trois `iconBtn` en Radius.button.
      forme: 'bouton',
      title: 'Tu veux autre chose',
      text: "Le pouce écarte ce plat de tes prochains plans, et ça se défait dans ton profil. La flèche, elle, ne change que ce repas-ci, au même budget, en piochant d'abord dans tes favoris.",
    },
  ];
}

// ── Onglet Recettes ──────────────────────────────────────────────────────────

export function recettesTour(): TourStep[] {
  return [
    {
      // Prouvé par : recettes.tsx filtre sur le NOM seulement, et la liste sert
      // tout le catalogue — le régime n'est appliqué qu'à la génération du plan
      // (lib/planEngine.ts::recipeAllowed).
      targetId: 'recettes-recherche',
      // Forme : recettes.tsx::searchBox — `borderRadius: Radius.button`.
      forme: 'bouton',
      title: 'Tout le catalogue',
      text: "La recherche porte sur le nom du plat, et la liste montre tout le catalogue — y compris des recettes hors de ton régime. Ton plan, lui, ne retient que celles qui te vont.",
    },
    {
      // Prouvé par : recettes.tsx affiche `macros_per_portion`, quand le plan
      // sert des quantités mises à l'échelle de la cible du jour
      // (lib/planEngine.ts::adaptRecipe → `adapted_ingredients`).
      targetId: 'recettes-carte',
      // Forme : recettes.tsx::recipe — `borderRadius: Radius.card`.
      forme: 'carte',
      title: 'Macros de la recette',
      text: "Ces chiffres sont ceux de la recette, pour une portion. Dans ton plan, les quantités sont ajustées à ta cible du jour : le même plat peut donc y afficher d'autres valeurs.",
    },
    {
      // Prouvé par : lib/planEngine.ts::swapMeal reçoit les favoris et privilégie
      // les recettes aimées à qualité d'ajustement comparable.
      targetId: 'recettes-favori',
      // Forme : recettes.tsx::heart — un coeur seul, sans fond : rond.
      forme: 'pastille',
      title: 'À quoi sert le cœur',
      text: "Mettre une recette en favori ne l'impose pas à ton plan : quand tu changes un repas, Kyroz pioche d'abord parmi celles que tu as aimées.",
    },
  ];
}

// ── Onglet Courses ───────────────────────────────────────────────────────────

export function coursesTour(): TourStep[] {
  return [
    {
      // Prouvé par : lib/shoppingList.ts — somme des ingrédients des repas du
      // plan, moins la réserve, hors condiments et hors repas que l'utilisateur
      // gère lui-même. Et courses.tsx garde la liste entre deux visites, le
      // RefreshControl la refait.
      targetId: 'courses-source',
      // Forme : courses.tsx::header — bloc sans fond.
      forme: 'carte',
      title: "D'où sort ta liste",
      text: "Kyroz additionne les ingrédients de ton plan, retire ce que tu as déjà en réserve, et laisse de côté sel, huile et épices. Tire l'écran vers le bas pour la refaire.",
    },
    {
      // Prouvé par : courses.tsx — `checkAll` coche tout, `reset` décoche, ni
      // l'un ni l'autre ne touche à la réserve (c'est `terminer` qui range). Le
      // bouton « Réinitialiser » n'apparaît qu'à partir d'un article coché.
      targetId: 'courses-controles',
      // Forme : courses.tsx::controls — une rangee de puces.
      forme: 'pastille',
      title: 'Cocher, masquer, défaire',
      text: "« Tout cocher » coche la liste entière. Dès qu'un article est coché, « Réinitialiser » apparaît : il décoche tout, sans refaire ta liste.",
    },
    {
      // Prouvé par : courses.tsx::toggle (cocher ne touche qu'à la liste) et
      // courses.tsx::terminer (les articles cochés entrent en réserve à la
      // clôture, et seulement là) ; courses.tsx::ecarterArticle pour l'appui long,
      // qui écarte sans toucher au plan (cf. lib/shoppingRemoved.ts).
      // ⚠️ L'appui long n'a AUCUNE affordance — c'est précisément le genre de
      // geste que cette visite existe pour dire. Fusionné avec l'aller-retour du
      // cochage plutôt qu'ajouté en 4ᵉ étape : même ligne, même question (« que
      // puis-je faire sur cet article ? »), et deux bulles sur une même cible ne
      // se départageraient pas.
      targetId: 'courses-article',
      // Forme : courses.tsx — 1re ligne d'une carte groupee.
      forme: 'carte',
      title: 'Un article, deux gestes',
      text: "Coche ce que tu prends : « Courses terminées » rangera le tout dans ta réserve. Appui long : l'article quitte ta liste sans toucher à ton plan, et tu le récupères en tirant vers le bas.",
    },
  ];
}

// ── Onglet Réserve ───────────────────────────────────────────────────────────

export function reserveTour(): TourStep[] {
  return [
    {
      // Prouvé par : lib/shoppingList.ts soustrait la réserve à CHAQUE calcul
      // (plus d'interrupteur depuis le 2026-08-24), et courses.tsx::terminer la
      // remplit avec ce qui est coché.
      targetId: 'reserve-ajouter',
      // Forme : reserve.tsx::addBtn — `borderRadius: Radius.pill`, 44x44.
      forme: 'pastille',
      title: 'Dis ce que tu as',
      text: "Ajoute ce que tu as déjà chez toi : ta liste de courses le déduit de ce qu'elle te propose, pour ne pas te faire racheter ce que tu as.",
    },
    {
      // Prouvé par : lib/pantry.ts::conservationDe — le rangement se déduit de la
      // catégorie de l'aliment, et le champ n'est écrit qu'à la correction.
      targetId: 'reserve-compteur',
      // Forme : reserve.tsx — bloc sans fond.
      forme: 'carte',
      title: 'Le frais et le sec',
      text: "Kyroz range chaque aliment au frais ou au sec selon ce que c'est. Touche une quantité pour la corriger — ou pour changer de rangement.",
    },
  ];
}

// ── Onglet Profil ────────────────────────────────────────────────────────────

export interface ProfilTourContext {
  /** L'utilisateur a-t-il déjà posé un objectif daté ? (la ligne existe toujours,
   *  mais la bulle n'a d'intérêt que si la fonctionnalité lui est ouverte) */
  objectifDateDisponible: boolean;
}

// ⚠️ L'ORDRE DES ÉTAPES SUIT L'ÉCRAN, DE HAUT EN BAS — poids · dépense · sport ·
// objectif daté · régénérer, puis la roue. Ce n'est pas une préférence de
// rédaction : chaque étape fait DÉFILER l'écran jusqu'à sa cible, donc une étape
// mal placée fait remonter puis redescendre, et ce va-et-vient se lit comme un
// bug plutôt que comme une visite. `profil-tdee` était en avant-dernier quand le
// bloc TDEE vivait tout en bas ; il a suivi le bloc quand celui-ci est remonté
// sous « Tes cibles » (2026-08-10). ➡️ Déplacer un élément de l'écran Profil, c'est
// aussi relire cette liste. Seule la dernière étape remonte volontairement : la
// roue est en haut, et c'est là que le tour se termine.
export function profilTour({ objectifDateDisponible }: ProfilTourContext): TourStep[] {
  const steps: TourStep[] = [
    {
      // Prouvé par : hooks/useWeightLog.ts appelle `recalcProfile` à
      // l'enregistrement d'une pesée, et le « Me peser » de WeightSummaryCard
      // n'apparaît qu'à l'échéance de la cadence choisie.
      targetId: 'profil-poids',
      // Forme : WeightSummaryCard.tsx::card — `borderRadius: Radius.card`.
      forme: 'carte',
      title: 'Ta pesée pilote tout',
      text: "Enregistre ton poids et Kyroz recale calories, macros et plan dans la foulée. Quand le bouton passe à « Me peser », c'est juste que ta cadence est arrivée.",
    },
    {
      // Prouvé par : lib/tdee.ts::calculateTDEE — métabolisme de base, multiplié
      // par le niveau d'activité quotidienne, plus la dépense des séances.
      // Recalculé par `recalcProfile` à chaque changement de corps ou d'activité.
      targetId: 'profil-tdee',
      // Forme : ui.tsx::MenuRow — une ligne de menu, ca se presse.
      forme: 'bouton',
      title: 'Ta dépense estimée',
      text: "Ton métabolisme, tes journées et tes séances réunis. Elle se recalcule dès que tu changes ton poids ou ton activité — tu n'as rien à relancer.",
    },
    {
      // Prouvé par : lib/tdee.ts — `DEFAULT_NEAT_LEVEL = 'desk'` (1,30), et la
      // question ne vit QUE dans le Profil : ce défaut est donc la valeur servie
      // à la plupart des gens. Les séances, elles, se comptent à part en MET nets.
      targetId: 'profil-sport',
      // Forme : ui.tsx::MenuRow.
      forme: 'bouton',
      title: 'Tes journées, hors sport',
      text: "Décris ici tes journées en dehors des séances : tant que tu ne l'as pas fait, Kyroz part de journées assises. Tes entraînements, eux, se comptent à part.",
    },
  ];

  if (objectifDateDisponible) {
    steps.push({
      // Prouvé par : lib/datedGoal.ts — le rythme servi est le plus rapide qui
      // reste sûr, et la date affichée est celle de la trajectoire SIMULÉE, pas
      // celle qui a été saisie.
      targetId: 'profil-objectif-date',
      // Forme : ui.tsx::MenuRow.
      forme: 'bouton',
      title: 'Piloter dans le temps',
      text: "Pose un poids et une date : Kyroz ajuste tes calories vers cette cible et t'annonce la date qu'il tiendra vraiment, plutôt que de creuser un déficit que ton corps refuserait.",
    });
  }

  steps.push(
    {
      // Prouvé par : lib/planEngine.ts::carryTracking conserve les repas déjà
      // marqués, y compris sur le chemin « Régénérer » (décision fondateur du
      // 2026-08-02 : régénérer renouvelle les repas à venir, il n'efface pas la
      // journée).
      targetId: 'profil-regenerer',
      // Forme : ui.tsx::MenuRow.
      forme: 'bouton',
      title: 'Régénérer sans rien perdre',
      text: "Cette ligne reconstruit une semaine complète de repas. Tes goûts, tes réglages et ce que tu as déjà marqué comme cuisiné aujourd'hui restent en place.",
    },
    {
      // ⚠️ CETTE ÉTAPE A CHANGÉ DE CIBLE le 2026-08-10, en même temps que son
      // sujet a déménagé. Elle visait le bloc de bas de page (« Exporter mes
      // données », « Confidentialité & CGU ») ; ce bloc vit maintenant dans la
      // feuille Réglages, donc il n'est PAS monté quand le tour se joue — et
      // `startTour` écarte silencieusement une étape dont la cible manque. Elle
      // pointe désormais la roue dentée, c'est-à-dire l'endroit où l'on trouve
      // ce dont elle parle. Le texte suit : une bulle qui désigne un bouton doit
      // dire ce qu'il y a derrière, sinon elle décrit un écran qui n'est plus là.
      // Prouvé par : lib/sync.ts synchronise profil, pesées et favoris ; les
      // photos de progression et le journal des repas hors plan restent
      // volontairement LOCAL-ONLY (CLAUDE.md §3 et §7, données de santé).
      targetId: 'profil-donnees',
      // Forme : ui.tsx::MenuRow.
      forme: 'bouton',
      title: 'Tes réglages, et tes données',
      text: "Derrière cette roue : notifications, apparence, confidentialité, compte. Ton profil, tes pesées et tes favoris te suivent d'un appareil à l'autre — tes photos et ton journal hors plan, eux, ne quittent pas ce téléphone.",
    },
  );

  return steps;
}

// ── Construction générique ───────────────────────────────────────────────────

export interface TourContext extends PlanTourContext, ProfilTourContext {}

/**
 * Point d'entrée unique : un écran demande son tour par son id, sans connaître
 * la forme des étapes. C'est ce qui permet à « Revoir les tutos » de proposer la
 * liste complète sans dupliquer les définitions.
 */
export function tourSteps(id: TourId, ctx: TourContext): TourStep[] {
  switch (id) {
    case 'plan': return planTour(ctx);
    case 'recettes': return recettesTour();
    case 'courses': return coursesTour();
    case 'reserve': return reserveTour();
    case 'profil': return profilTour(ctx);
  }
}

/** Bornes de rédaction, vérifiées par `lib/__tests__/visiteGuidee.test.ts`. */
export const TITRE_MAX = 28;
export const TEXTE_MAX = 220;
/** Au-delà, un tour est abandonné en route — il ne s'agit plus d'aider. */
export const ETAPES_MAX = 6;
