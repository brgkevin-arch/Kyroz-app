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
// 🔴 **DE 20 À 5, PUIS 4, PUIS 2 — LE 2026-08-25** (trois décisions du fondateur dans
// la même journée : « on enlève les 3/4 », « supprime le tuto des courses », puis
// « Réserve / Recettes : supprime le tuto »).
//
// Le critère de la première coupe, et il tient toujours pour en RAJOUTER une :
// **une bulle ne se garde que si elle explique quelque chose d'INVISIBLE.** Ce qui
// est parti ce jour-là tenait dans deux familles — celles qui COMMENTENT un écran qui
// se lit tout seul (« Cocher, masquer, défaire » décrivait trois boutons dont les
// libellés disent exactement ça), et celles qui RÉPÈTENT une phrase déjà affichée
// (« Un article, deux gestes » redisait mot pour mot la ligne d'aide posée douze
// pixels plus bas).
//
// ⚠️ **Mais les deux coupes suivantes ont montré que ce critère ne suffit pas**, et
// c'est la leçon à garder :
//  · « D'où sort ta liste » (Courses) le passait — un article absent parce que la
//    réserve le couvre ne laisse rien à voir à l'écran. Elle disait pourtant le
//    mécanisme réserve ↔ liste que la bulle de la Réserve dit déjà à l'envers.
//    ➡️ **Un critère appliqué bulle par bulle ne voit pas les DOUBLONS entre onglets.**
//  · « Deux listes, deux questions » (Recettes) et « Dis ce que tu as » (Réserve) le
//    passaient aussi. Elles sont parties quand même : au-delà d'un certain nombre, ce
//    n'est plus le contenu d'une bulle qu'on arbitre, c'est le NOMBRE d'interruptions
//    qu'on accepte de poser entre quelqu'un et son app.
//
// ⚠️ Le coût d'une bulle de trop n'est pas le temps qu'elle prend : c'est qu'elle
// fait passer les autres pour du décor. Vingt interruptions modales apprennent
// qu'on peut toutes les passer sans rien perdre — y compris celle qui, elle,
// disait quelque chose.
//
// ➡️ **Il en reste DEUX**, et chacune répond à une question que son écran ne peut pas
// répondre : comment un repas passe en « mangé » (Plan) · ce qu'une pesée déclenche
// (Profil). Les deux se posent AU CENTRE, sans cible — voir `TourStep.targetId`.
//
// ⚠️ **Conséquence sur le moteur, et elle est mesurée** : plus aucune étape ne vise
// d'objet, donc tout le mécanisme de ciblage de `GuidedTour.tsx` (mesure, défilement,
// anneau, trou) et `lib/visee.ts` tournent à VIDE. Ils sont conservés à dessein — ils
// portent trois correctifs durement acquis — et `visiteGuidee.test.ts` porte un cas qui
// ASSÈNE cette dormance, pour que ses autres contrôles ne passent pas au vert en ne
// mesurant plus rien.

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
  /**
   * 🔴 **FACULTATIF DEPUIS LE 2026-08-25** (décision fondateur : « enlève le cercle
   * et mets le texte au milieu de la page en mode pop-up »).
   *
   * Absent = la bulle se pose au CENTRE, sans anneau et sans trou. Ce n'est pas un
   * repli technique — c'est le bon rendu quand la bulle parle de l'ÉCRAN et non
   * d'un objet : « tes repas se cochent » ne désigne pas un bouton, et l'anneau
   * qu'on posait sur la carte du prochain repas racontait autre chose que le texte.
   *
   * ⚠️ Et il ferme un trou RÉEL, mesuré le 2026-08-25 dans le navigateur : une
   * étape ciblée est écartée quand sa cible n'est pas montée (`startTour`), donc le
   * tour du Plan ne se jouait PAS du tout quand la journée était entièrement
   * mangée — ce qui, l'auto-coche allumée, arrive tous les soirs. Une bulle sans
   * cible ne peut plus disparaître pour cette raison.
   */
  targetId?: string;
  title: string;
  text: string;
  /** Obligatoire QUAND il y a une cible, interdit sinon (rien à épouser). */
  forme?: FormeCible;
}

export type TourId = 'plan' | 'profil';

/**
 * Les tours rejouables, dans l'ordre où l'utilisateur rencontre les onglets.
 * Sert au « ? » de chaque en-tête ET à l'écran « Revoir les tutos » du Profil :
 * une seule table, sinon la liste du Profil oublie un tour le jour où on en
 * ajoute un (le défaut « copie stockée que personne ne relit », CLAUDE.md §10).
 */
export const TOURS: { id: TourId; label: string }[] = [
  { id: 'plan', label: 'Ton plan du jour' },
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
  // ⚠️ Deux versions et non une bulle conditionnée à moitié : réglage ALLUMÉ, les
  // deux chemins existent (le bouton ET l'heure) ; réglage ÉTEINT, seul le bouton
  // coche, et promettre l'automatisme serait faux — le défaut d'E58, où trois
  // phrases ont survécu au mécanisme qu'elles décrivaient. Chaque version dit
  // quand même que l'AUTRE façon de faire existe : c'est ce que le fondateur a
  // demandé le 2026-08-25 (« soit tu coches, soit c'est automatique »), et ça
  // reste vrai dans les deux sens puisque le réglage se change.
  //
  // 🔴 **SANS CIBLE, DONC AU CENTRE** (même décision). L'anneau se posait sur le
  // surtitre du prochain repas cuisinable — « COLLATION · 25 MIN » — et désignait
  // donc UN repas pour une phrase qui parle de TOUS. Et il coûtait plus que ça :
  // pas de repas cuisinable, pas de cible, donc `startTour` renonçait et la bulle
  // ne se jouait pas du tout. Mesuré le 2026-08-25 dans le navigateur, journée
  // entièrement mangée : aucun tour, aucune trace. Sans cible, ce cas n'existe plus.
  //
  // ℹ️ `days` et `moduleParVolume` ne sont plus lus ici : ils l'étaient par les
  // bulles retirées (« Tes cibles du jour » parlait des jours d'entraînement). Le
  // contexte les garde — la modulation par volume reste une affirmation délicate,
  // et la prochaine bulle qui parlera de calories devra la relire.
  void days; void moduleParVolume;

  if (repasAuto) {
    return [{
      // Prouvé par : plan.tsx::cookMeal pour le bouton, et plan.tsx::autoCocher pour
      // l'heure — `repasEchus` (lib/repasAuto.ts) rend les repas dont l'heure limite
      // est passée, puis le même traitement que `cookMeal` (déduction de la réserve,
      // `locked_macros`, `rebalanceDay`). Heure limite = début du repas suivant + 1 h,
      // fin de journée pour le dernier. Décocher : MealCard::onPress → feuille du repas.
      // 🔴 CETTE PHRASE A PERDU SA FIN DEUX FOIS DANS LA MÊME JOURNÉE, et les deux
      // fois pour la même raison de fond : elle promettait un retour en arrière.
      //  1. « et tu peux toujours décocher » — retiré, le mot était faux (il n'existe
      //     aucune case à décocher) ;
      //  2. « ouvre le repas et tape Annuler » — exact au moment où il a été écrit,
      //     périmé deux heures plus tard : le bouton « Annuler » a été retiré du
      //     bandeau (décision fondateur). ➡️ **Il n'existe plus AUCUN chemin de
      //     « mangé » vers « planifié »**, donc la bulle n'en propose plus.
      // ⚠️ Ne pas y remettre une échappatoire sans rouvrir `RecipeDetail`.
      title: 'Coche, ou laisse faire',
      text: "Tu as mangé ? Tape « J'ai cuisiné ». Et si tu oublies, Kyroz le coche pour toi une heure après le début du repas suivant : ta journée se recale et ta réserve suit.",
    }];
  }

  return [{
    // Prouvé par : plan.tsx::cookMeal — `deductIngredients` retire de la réserve,
    // `setMealStatus('eaten')` déclenche `rebalanceDay`. C'est la version servie
    // quand l'auto-coche est éteint (lib/repasAuto.ts), donc quand ce bouton est le
    // SEUL chemin. Le renvoi « tes réglages de repas » est exact : le sélecteur
    // Automatique / À la main vit dans l'éditeur des repas du Profil, sous
    // « Repas cochés automatiquement ».
    title: "C'est toi qui coches",
    text: "Quand tu as mangé, tape « J'ai cuisiné » : les ingrédients quittent ta réserve et le reste de ta journée se recale. Si tu préfères que ça se fasse tout seul, ça s'allume dans tes réglages de repas.",
  }];
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
  // 🔴 UNE SEULE BULLE (coupe du 2026-08-25), ET AU CENTRE (même décision que le
  // Plan). Le Profil en portait SIX, cinq desquelles commentaient des lignes de
  // menu qui disent déjà ce qu'elles font (« Ta dépense estimée » sur une ligne
  // intitulée « TDEE »). Reste ce que rien à l'écran ne dit : qu'une pesée ne se
  // contente pas d'être enregistrée, elle RECALCULE la cible et le plan.
  //
  // ⚠️ Le texte a été réécrit le 2026-08-25 (« on voit beaucoup que c'est toi qui
  // parles ») : il disait « Enregistre ton poids et Kyroz recale calories, macros
  // et plan » — l'app se citant elle-même à la troisième personne, et trois noms
  // techniques à la file. La phrase part maintenant de ce que la personne FAIT, et
  // la dernière proposition existe pour désamorcer, pas pour informer : un bouton
  // qui change de nom tout seul inquiète plus qu'il n'aide.
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
      title: 'Ta pesée met tout à jour',
      text: "Note ton poids quand tu veux : tes calories, tes macros et ton plan se recalent dans la foulée. Et si le bouton passe à « Me peser », c'est juste que le moment est venu — rien de plus.",
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
    case 'profil': return profilTour(ctx);
  }
}

/** Bornes de rédaction, vérifiées par `lib/__tests__/visiteGuidee.test.ts`. */
export const TITRE_MAX = 28;
export const TEXTE_MAX = 220;
/** Au-delà, un tour est abandonné en route — il ne s'agit plus d'aider. */
export const ETAPES_MAX = 6;
