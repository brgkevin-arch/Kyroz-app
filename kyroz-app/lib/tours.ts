// ── Visite guidée : le CONTENU, séparé du moteur ─────────────────────────────
//
// Ce fichier ne contient que des fonctions PURES et aucun import : il est donc
// testable sous vitest (`lib/__tests__/visiteGuidee.test.ts`), là où
// `components/GuidedTour.tsx` tire react-native et ne l'est pas. Même procédé
// que `lib/collapsingTitle.ts` pour le repli du titre et `lib/accentColor.ts`
// pour la palette : la DÉCISION vit dans une fonction pure, l'écran ne fait que
// la rendre.
//
// 🔴 **UNE SEULE VISITE, D'ONGLET EN ONGLET — LE 2026-09-30** (décision fondateur :
// « une seule visite qui montre toute l'app, pas de visite pour les trucs inutiles,
// bien fluide, sans trop d'excès de texte »).
//
// Il y avait un tour PAR ONGLET, déclenché à la première visite de cet onglet — et
// après les coupes du 2026-08-25, il n'en restait que deux bulles (Plan, Profil). Le
// défaut de ce découpage n'était pas le nombre : c'est que personne ne voyait l'app
// dans son ENSEMBLE. Courses, Réserve et Recettes ne se présentaient jamais, et la
// seule façon de découvrir qu'elles se parlent entre elles était de s'en servir.
// ➡️ Désormais : UNE visite, lancée une fois après le premier plan, qui passe par
// chaque onglet dans l'ordre de la barre. Un arrêt par onglet, et rien d'autre.
//
// ⚠️ **LA RÈGLE DE RÉDACTION D'UN ARRÊT** : le TITRE dit ce qu'est l'onglet, la LIGNE
// dit la seule chose qu'on ne voit pas en le regardant. Le critère des coupes d'août
// tient toujours, il s'applique à la ligne : **elle ne se garde que si elle explique
// quelque chose d'INVISIBLE** (un mécanisme, un lien entre deux onglets) — jamais un
// bouton qui dit déjà ce qu'il fait, jamais la phrase d'aide posée sur l'écran.
// Les deux bulles d'avant n'ont pas disparu, elles sont devenues les lignes de leur
// onglet : « J'ai cuisiné » ou l'auto-coche (Plan), la pesée qui recale tout (Profil).
//
// ⚠️ RÈGLE DE VÉRITÉ, non négociable (CLAUDE.md §5 et §10) : une ligne décrit ce que
// le code FAIT, jamais ce qu'on aimerait qu'il fasse. Trois des cinq bulles d'origine
// ont été trouvées fausses le 2026-08-07 — dont « Kyroz recale automatiquement les
// repas restants », alors que le code DEMANDAIT d'abord. Chaque arrêt ci-dessous
// porte en commentaire le chemin de code qui le prouve. Ne pas en ajouter un sans
// faire de même.
//
// ⚠️ Et le ton RASSURE, il ne met pas la pression : aucune ligne ne doit se lire
// comme un reproche ou une consigne à tenir.
//
// ⚠️ **Le coût d'un arrêt de trop n'est pas le temps qu'il prend** : c'est qu'il fait
// passer les autres pour du décor. D'où la borne `ETAPES_MAX`, et d'où aucun arrêt
// sur un réglage, un bouton secondaire ou un écran hors de la barre d'onglets.
//
// ℹ️ La visite désigne des ONGLETS, que le moteur pointe lui-même sur la barre
// (`GuidedTour.tsx::CarteVisite`). Une seule étape vise un objet — le premier repas à
// faire, sur le Plan — et seulement pour l'AMENER au-dessus de la carte : l'anneau et
// le trou du mécanisme d'origine ne servent plus (ils restent, avec leurs trois
// correctifs durement acquis). `visiteGuidee.test.ts` assène cet état exact.

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

/**
 * Les onglets de la barre, DANS SON ORDRE (`app/(tabs)/_layout.tsx`). La visite les
 * parcourt de gauche à droite, et le moteur en déduit où pointer sur la barre : le
 * rang d'un onglet ici EST sa place à l'écran. `visiteGuidee.test.ts` compare cette
 * liste aux `Tabs.Screen` du layout — un onglet ajouté, retiré ou déplacé la fait
 * rougir, au lieu de laisser la visite pointer à côté.
 */
export const ONGLETS = ['plan', 'courses', 'reserve', 'recettes', 'profil'] as const;
export type Onglet = typeof ONGLETS[number];

export interface TourStep {
  /**
   * Un objet de l'écran. Deux usages selon l'étape :
   *  · étape SANS onglet (bulle d'origine) : il est ENCERCLÉ — anneau et trou, et
   *    `forme` devient obligatoire ;
   *  · étape AVEC onglet (la visite) : il est seulement AMENÉ au-dessus de la carte,
   *    rien n'est dessiné autour, et l'arrêt se joue même quand la cible manque.
   */
  targetId?: string;
  /**
   * L'onglet que cet arrêt MONTRE. Présent, le moteur y navigue à l'arrivée sur
   * l'étape, laisse l'écran visible derrière un voile léger, et pose la carte au-dessus
   * de la barre d'onglets, pointée sur cet onglet.
   */
  onglet?: Onglet;
  title: string;
  text: string;
  /** Obligatoire QUAND il y a une cible, interdit sinon (rien à épouser). */
  forme?: FormeCible;
}

export type TourId = 'app';

/**
 * Les visites, et leur libellé dans « Revoir la visite » (réglages du Profil).
 * Une seule table : sinon la ligne du Profil oublie une visite le jour où on en
 * ajoute une (le défaut « copie stockée que personne ne relit », CLAUDE.md §10).
 */
export const TOURS: { id: TourId; label: string }[] = [
  { id: 'app', label: 'La visite de Kyroz' },
];

/**
 * Les anciens tours dont le « déjà vu » vaut pour une visite d'aujourd'hui.
 *
 * ⚠️ Décision du 2026-09-30 : **la visite se lance d'elle-même pour les NOUVEAUX
 * comptes seulement.** Quelqu'un qui a déjà vu la bulle du Plan connaît l'app ; lui
 * imposer cinq arrêts au lendemain d'une mise à jour serait l'interruption même que
 * le fondateur a retirée le 2026-08-25 (« une fois que l'user a lu, c'est bon »). Il
 * la retrouve dans « Revoir la visite ».
 * ℹ️ `profil` n'y figure pas : sa bulle ne se montrait qu'APRÈS celle du Plan (on
 * arrive toujours sur le Plan d'abord), donc « profil vu » implique « plan vu ».
 */
export const VU_PAR_HERITAGE: Record<TourId, readonly string[]> = {
  app: ['plan'],
};

// ── La visite de l'app ───────────────────────────────────────────────────────

export interface VisiteContext {
  /**
   * L'auto-coche est-elle allumée ? (`lib/repasAuto.ts`, défaut `true`)
   * ⚠️ La ligne du Plan qui l'annonce est CONDITIONNÉE : éteinte, elle promettrait un
   * automatisme qui n'a pas lieu — le défaut exact qu'E58 avait laissé passer sur
   * trois phrases du frigo. Une ligne est une affirmation sur le code.
   */
  repasAuto: boolean;
}

export function visiteApp({ repasAuto }: VisiteContext): TourStep[] {
  return [
    {
      onglet: 'plan',
      // 🔴 LA CIBLE SERT À MONTRER, PAS À ENCERCLER (2026-09-30, retour fondateur sur la
      // visite : « la carte parle d'un bouton qu'on ne voit pas »). Le bouton « J'ai
      // cuisiné » du premier repas tombait pile SOUS la carte, à toute heure. Le moteur
      // fait donc défiler le Plan jusqu'à ce repas pour l'amener au-dessus de la carte —
      // sans anneau ni trou (une visite d'onglets n'en dessine pas, d'où l'absence de
      // `forme`). Posée par plan.tsx sur le premier repas ENCORE À FAIRE, jamais sur un
      // rang fixe ; sans repas à faire, l'arrêt se joue quand même, sans défilement.
      targetId: 'plan-repas',
      title: 'Tes repas du jour',
      // Prouvé par : plan.tsx::cookMeal pour le bouton (`deductIngredients`, puis
      // `setMealStatus('eaten')` qui recale la journée par `rebalanceDay`) ; et, réglage
      // allumé, plan.tsx::autoCocher — `repasEchus` (lib/repasAuto.ts) rend les repas
      // dont l'heure limite est passée (début du repas suivant + 1 h) et leur applique
      // le même traitement. Éteint, seul le bouton coche : la ligne ne promet plus
      // l'automatisme et dit ce que le bouton déclenche.
      // ⚠️ Aucune porte de retour n'est promise : il n'existe plus de chemin de
      // « mangé » vers « planifié » depuis le retrait du bouton « Annuler » (2026-08-25).
      text: repasAuto
        ? "Tape « J'ai cuisiné » quand tu as mangé. Si tu oublies, Kyroz coche pour toi."
        : "Tape « J'ai cuisiné » quand tu as mangé : ta journée se recale.",
    },
    {
      onglet: 'courses',
      title: 'Ta liste de courses',
      // Prouvé par : courses.tsx::load → `buildShoppingList(plan, pantry, …)`
      // (lib/shoppingList.ts) — les quantités viennent des repas du plan, la réserve est
      // retranchée, et un article entièrement couvert est masqué.
      // ⚠️ Pas un mot sur « Courses terminées » : la ligne d'aide de l'écran le dit déjà,
      // douze pixels sous la carte. Le lien liste ↔ réserve, lui, ne se voit pas.
      text: 'Calculée sur ton plan, sans ce que tu as déjà.',
    },
    {
      onglet: 'reserve',
      title: 'Ce que tu as chez toi',
      // Prouvé par : plan.tsx::cookMeal → `deductIngredients(items, mealIngredients(meal))`
      // puis `savePantry` ; l'auto-coche passe par le même chemin (`autoCocher`).
      text: "Chaque repas cuisiné s'en déduit tout seul.",
    },
    {
      onglet: 'recettes',
      title: 'Toutes les recettes',
      // Prouvé par : recettes.tsx — le sélecteur « Catalogue / Réalisable », et
      // `cookableRecipes(reserve, profile)` derrière « Réalisable ». Le nom est celui du
      // bouton À L'ÉCRAN : la ligne désigne quelque chose qu'on voit derrière elle.
      text: 'Et dans « Réalisable », celles que ta réserve permet de cuisiner.',
    },
    {
      onglet: 'profil',
      title: 'Ton poids, tes réglages',
      // Prouvé par : hooks/useWeightLog.ts — une pesée repasse le profil par
      // `recalcProfile` ; ses cibles entrent dans `profileSignature` (lib/planEngine.ts),
      // et plan.tsx régénère le plan dès que la signature change (`profil_modifie`).
      // C'était la bulle du Profil, raccourcie : c'est ce que rien à l'écran ne dit.
      text: 'Note ton poids : tes calories et ton plan suivent.',
    },
  ];
}

// ── Construction générique ───────────────────────────────────────────────────

export type TourContext = VisiteContext;

/**
 * Point d'entrée unique : un écran demande une visite par son id, sans connaître la
 * forme des étapes. C'est ce qui permet à « Revoir la visite » de la relancer sans en
 * dupliquer la définition.
 */
export function tourSteps(id: TourId, ctx: TourContext): TourStep[] {
  switch (id) {
    case 'app': return visiteApp(ctx);
  }
}

/**
 * Bornes de rédaction, vérifiées par `lib/__tests__/visiteGuidee.test.ts`.
 * ⚠️ `TEXTE_MAX` est passé de 220 à 90 le 2026-09-30 (« sans trop d'excès de texte ») :
 * une ligne, deux au plus sur un petit téléphone. Une phrase qui ne tient pas dedans
 * explique trop de choses à la fois — c'est elle qu'il faut couper, pas la borne.
 */
export const TITRE_MAX = 28;
export const TEXTE_MAX = 90;
/** Au-delà, une visite est abandonnée en route — il ne s'agit plus d'aider. */
export const ETAPES_MAX = 6;
