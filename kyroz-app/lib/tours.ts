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
//
// 🔴 **DE 20 BULLES À 5, LE 2026-08-25** (décision fondateur : « on enlève les 3/4 »).
// Le critère appliqué, et c'est lui qu'il faut rejouer avant d'en rajouter une :
// **une bulle ne se garde que si elle explique quelque chose d'INVISIBLE.**
//
// Ce qui est parti tenait dans deux familles, et les deux se lisaient comme du
// remplissage :
//  · celles qui COMMENTENT un écran qui se lit tout seul — « Cocher, masquer,
//    défaire » décrivait trois boutons dont les libellés disent exactement ça ;
//  · celles qui RÉPÈTENT une phrase déjà affichée — « Un article, deux gestes »
//    redisait mot pour mot la ligne d'aide posée douze pixels plus bas, et
//    « Le frais et le sec » redisait « Touche une quantité pour la modifier ».
//
// ⚠️ Le coût d'une bulle de trop n'est pas le temps qu'elle prend : c'est qu'elle
// fait passer les autres pour du décor. Vingt interruptions modales apprennent
// qu'on peut toutes les passer sans rien perdre — y compris celle qui, elle,
// disait quelque chose.
//
// ➡️ Il en reste UNE PAR ONGLET, et chacune répond à une question que l'écran ne
// peut pas répondre : pourquoi mes repas se cochent seuls · d'où sort ma liste et
// pourquoi un article en disparaît · à quoi sert de remplir ma réserve · ce que
// contiennent les deux listes de Recettes · ce que déclenche une pesée.

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
  /**
   * L'auto-coche est-elle allumée ? (`lib/repasAuto.ts`, défaut `true`)
   * ⚠️ La bulle qui l'explique est CONDITIONNÉE : éteinte, elle promettrait un
   * automatisme qui n'a pas lieu — le défaut exact qu'E58 avait laissé passer sur
   * trois phrases du frigo. Une bulle est une affirmation sur le code.
   */
  repasAuto: boolean;
}

export function planTour({ days, moduleParVolume, repasAuto }: PlanTourContext): TourStep[] {
  // 🔴 UNE SEULE BULLE, ET ELLE A DEUX VERSIONS. Le Plan n'en garde qu'une (coupe
  // du 2026-08-25) : celle qui dit COMMENT un repas passe en « mangé », parce que
  // c'est le seul mécanisme de cet écran qu'on ne peut pas deviner en le regardant.
  //
  // ⚠️ Deux versions et non une bulle conditionnée à moitié : réglage ALLUMÉ, le
  // sujet est l'automatisme ; réglage ÉTEINT, c'est le bouton. Servir la première à
  // qui a coupé l'auto-coche promettrait un automatisme qui n'a pas lieu — le défaut
  // d'E58, où trois phrases ont survécu au mécanisme qu'elles décrivaient. Et ne
  // rien servir du tout laisserait un onglet avec un « ? » qui n'ouvre rien.
  //
  // ℹ️ `days` et `moduleParVolume` ne sont plus lus ici : ils l'étaient par les
  // bulles retirées (« Tes cibles du jour » parlait des jours d'entraînement). Le
  // contexte les garde — la modulation par volume reste une affirmation délicate,
  // et la prochaine bulle qui parlera de calories devra la relire.
  void days; void moduleParVolume;

  if (repasAuto) {
    return [{
      // Prouvé par : plan.tsx::autoCocher — `repasEchus` (lib/repasAuto.ts) rend les
      // repas dont l'heure limite est passée, puis le même traitement que `cookMeal`
      // (déduction de la réserve, `locked_macros`, `rebalanceDay`). Heure limite =
      // début du repas suivant + 1 h, fin de journée pour le dernier.
      targetId: 'plan-auto',
      // Forme : MealCard.tsx::styles.type — une ligne de texte, pas un bloc à fond.
      forme: 'carte',
      title: 'Ils se cochent tout seuls',
      text: "Pas besoin de tout marquer : un repas passe en « mangé » une heure après le début du suivant, le dernier en fin de journée. Ta journée se recale et ta réserve suit. Tu peux décocher, ou couper ça dans ton profil.",
    }];
  }

  return [{
    // Prouvé par : plan.tsx::cookMeal — `deductIngredients` retire de la réserve,
    // `setMealStatus('eaten')` déclenche `rebalanceDay`. C'est la version servie
    // quand l'auto-coche est éteint (lib/repasAuto.ts), donc quand ce bouton est le
    // SEUL chemin.
    targetId: 'plan-cook',
    // Forme : MealCard.tsx::cookBtn — `borderRadius: Radius.button`.
    forme: 'bouton',
    title: 'Marque-le comme cuisiné',
    text: "Quand tu as préparé un plat, tape « J'ai cuisiné » : les ingrédients quittent ta réserve et les repas qui restent se recalent pour tenir ta cible du jour.",
  }];
}

// ── Onglet Recettes ─────────────────────────────────────────────────────────

export function recettesTour(): TourStep[] {
  return [
    {
      // Prouvé par : recettes.tsx — le sélecteur bascule `vue`, et « Ma réserve »
      // sert `cookableRecipes(reserve, profile)` (lib/pantry.ts), qui compte les
      // QUANTITÉS et écarte le régime. Le catalogue, lui, montre tout, y compris
      // ce que le plan ne servirait pas — c'est ce contraste que la bulle explique.
      targetId: 'recettes-vues',
      // Forme : ui.tsx::Segmented — le rail porte `borderRadius: Radius.button`.
      forme: 'bouton',
      title: 'Deux listes, deux questions',
      text: "« Catalogue » montre les 512 recettes, y compris hors de ton régime. « Ma réserve » ne garde que ce que tu peux cuisiner avec ce que tu as — quantités comptées, régime respecté.",
    },
  ];
}

// ── Onglet Courses ──────────────────────────────────────────────────────────

export function coursesTour(): TourStep[] {
  return [
    {
      // Prouvé par : lib/shoppingList.ts — somme des ingrédients des repas du
      // plan, moins la réserve, hors condiments et hors repas que l'utilisateur
      // gère lui-même. Et courses.tsx garde la liste entre deux visites, le
      // RefreshControl la refait.
      //
      // ⚠️ C'est LA bulle qu'on garde ici, et pas celle des gestes : un article qui
      // n'apparaît pas parce que la réserve le couvre est le seul cas où l'écran ne
      // peut rien dire — il n'y a rien à voir. Les gestes, eux, sont écrits en toutes
      // lettres sous les boutons.
      targetId: 'courses-source',
      // Forme : courses.tsx::header — bloc sans fond.
      forme: 'carte',
      title: "D'où sort ta liste",
      text: "Kyroz additionne les ingrédients de ton plan, retire ce que tu as déjà en réserve, et laisse de côté sel, huile et épices. Tire l'écran vers le bas pour la refaire.",
    },
  ];
}

// ── Onglet Réserve ──────────────────────────────────────────────────────────

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
  ];
}

// ── Onglet Profil ────────────────────────────────────────────────────────────

export interface ProfilTourContext {
  /** L'utilisateur a-t-il déjà posé un objectif daté ? (la ligne existe toujours,
   *  mais la bulle n'a d'intérêt que si la fonctionnalité lui est ouverte)
   *  ℹ️ Plus lu depuis la coupe du 2026-08-25 : la bulle qui s'en servait est
   *  partie. Le champ reste — l'objectif daté est la valeur premium, et le jour où
   *  une bulle le reprend, elle devra se conditionner comme celle-là le faisait. */
  objectifDateDisponible: boolean;
}

export function profilTour({ objectifDateDisponible }: ProfilTourContext): TourStep[] {
  void objectifDateDisponible;
  // 🔴 UNE SEULE BULLE (coupe du 2026-08-25). Le Profil en portait SIX, cinq
  // desquelles commentaient des lignes de menu qui disent déjà ce qu'elles font
  // (« Ta dépense estimée » sur une ligne intitulée « TDEE »). Reste ce que rien
  // à l'écran ne dit : qu'une pesée ne se contente pas d'être enregistrée, elle
  // RECALCULE la cible et le plan.
  //
  // ⚠️ Avec une seule étape, la note d'ordre (« l'ordre suit l'écran, de haut en
  // bas ») n'a plus d'objet — elle est retirée avec les étapes qu'elle réglait. À
  // remettre le jour où le Profil en reçoit une deuxième : le va-et-vient de
  // défilement qu'elle évitait, lui, n'a pas disparu.
  return [
    {
      // Prouvé par : hooks/useWeightLog.ts appelle `recalcProfile` à
      // l'enregistrement d'une pesée, et le « Me peser » de WeightSummaryCard
      // n'apparaît qu'à l'échéance de la cadence choisie.
      targetId: 'profil-poids',
      // Forme : WeightSummaryCard.tsx::card — `borderRadius: Radius.card`.
      forme: 'carte',
      title: 'Ta pesée pilote tout',
      text: "Enregistre ton poids et Kyroz recale calories, macros et plan dans la foulée. Quand le bouton passe à « Me peser », c'est juste que ta cadence est arrivée à échéance.",
    },
  ];
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
