import { MealSlot, MealPool, MealType, BUILTIN_MEAL_TYPES, BuiltinMealType, UserProfile } from './types';

// ── Créneaux de repas : 4 intégrés + autant que l'utilisateur en crée ────────
//
// AVANT (jusqu'au 2026-08-07) : `MealType` était une union FERMÉE de 4 valeurs.
// Le plafond n'était écrit nulle part — il était dans le TYPE — donc quelqu'un qui
// mange 6 fois par jour ne pouvait pas le dire à Kyroz, et l'app calculait sa
// journée sur 4 assiettes qu'il ne mangeait pas. Un plan faux, sans message d'erreur.
//
// MAINTENANT : un créneau est une DONNÉE (`MealSlot`), pas une valeur de type.
// Les 4 intégrés gardent leurs ids d'origine — `breakfast`, `lunch`, `dinner`,
// `snack` — ce qui est la raison pour laquelle rien de l'existant ne bouge :
// les profils enregistrés, les plans en cache, les repas « je gère »
// (`fixed_meals`) et les tags de recettes désignent tous ces mêmes ids.
//
// Ce module est la SOURCE UNIQUE : libellé, heure, poids de portion et vivier de
// recettes d'un créneau se lisent ici, et nulle part ailleurs. C'était déjà le
// problème avant lui — le libellé « Collation » était recopié dans cinq fichiers.

/** Préfixe des ids créés par l'utilisateur. Sert à les distinguer des intégrés. */
export const CUSTOM_SLOT_PREFIX = 'custom-';

/**
 * Plafond du nombre de repas par jour. **Mesuré, pas choisi** —
 * `npm run mesure:creneaux`, relevé du 2026-08-07 sur 5 gabarits × 5 tirages
 * × 7 jours. Ce n'est pas le TYPE qui limite (les créneaux sont libres), c'est le
 * CATALOGUE : plus il y a de repas, plus la part de chacun est petite, et sous une
 * certaine taille aucune recette ne sait viser la cible.
 *
 * | repas/j | écart calorique du jour | drapeaux vus par l'utilisateur |
 * |---|---|---|
 * | 4 (l'ancien plafond) | 0,66 % | 4 |
 * | 6 | 0,79 % | 40 |
 * | **8** | **0,92 %** | **81** |
 * | 9 | 1,19 % | 174 |
 * | 12 | 4,94 % | 712 |
 *
 * 8 est le dernier palier sous 1 % d'écart, et le dernier avant que le nombre de
 * drapeaux ne DOUBLE (81 → 174).
 *
 * ⚠️ **La dégradation est graduelle, pas une falaise** — et elle est CONCENTRÉE.
 * Jusqu'à 8 repas, la quasi-totalité des drapeaux tombe sur un seul gabarit :
 * F 55 kg en sèche VEGAN (74 des 81), qui est la limite de vivier déjà consignée
 * dans CLAUDE.md (« petits formats vegan »). Les autres gabarits sont à 0 ou 1.
 * À 9, ça déborde sur les petits gabarits omnivores (F 55 : 6 → 30). C'est ce
 * débordement qui fixe la borne, pas le seuil de 1 %.
 *
 * ℹ️ Et la mesure a trouvé un défaut HORS de son périmètre : à 3 repas, un gros
 * gabarit en prise de masse (H 95) est à **6,11 % d'écart et 41 drapeaux** — le
 * catalogue n'a pas de plat à 1 060 kcal. C'est antérieur aux créneaux libres
 * (3 repas se choisissaient déjà) ; noté, pas corrigé ici.
 */
export const MAX_MEAL_SLOTS = 8;

/** Bornes de saisie d'un libellé de créneau (l'UI les applique, le moteur les suppose). */
export const SLOT_LABEL_MAX = 24;

/**
 * Les 4 créneaux intégrés, dans l'ordre CHRONOLOGIQUE.
 *
 * ⚠️ Les heures sont celles de l'ancien `MEAL_HOUR` (mealtime.ts), au kcal près :
 * elles ne servent pas à imposer un horaire, seulement à savoir quels repas sont
 * encore devant soi (adaptation après un écart) et à ORDONNER la journée.
 *
 * ⚠️ `weight` est repris à l'identique de l'ancien `BASE_WEIGHT` du moteur. Le
 * déjeuner (1,1) pèse plus que le dîner (1,0) : ce n'est pas une coquille, c'est
 * la distribution mesurée d'origine, et la déplacer changerait tous les plans.
 */
export const BUILTIN_SLOTS: readonly MealSlot[] = [
  { id: 'breakfast', label: 'Petit-déj', hour: 8,  minute: 0, pool: 'breakfast' },
  { id: 'lunch',     label: 'Déjeuner',  hour: 13, minute: 0, pool: 'meal' },
  { id: 'snack',     label: 'Collation', hour: 16, minute: 0, pool: 'snack' },
  { id: 'dinner',    label: 'Dîner',     hour: 20, minute: 0, pool: 'meal' },
];

/** Poids de portion des créneaux intégrés — l'ancien `BASE_WEIGHT`, inchangé. */
const BUILTIN_WEIGHT: Record<BuiltinMealType, number> = {
  breakfast: 0.9, lunch: 1.1, dinner: 1.0, snack: 0.45,
};

/**
 * Poids par vivier, pour les créneaux CRÉÉS. Volontairement dérivé et non stocké :
 * un poids enregistré dans le profil de l'utilisateur figerait une constante du
 * moteur, et un futur ré-étalonnage ne l'atteindrait plus jamais.
 * `meal` = 1,05, la moyenne des deux repas complets intégrés (1,1 et 1,0).
 */
const POOL_WEIGHT: Record<MealPool, number> = { breakfast: 0.9, meal: 1.05, snack: 0.45 };

/**
 * Vivier → tags de recettes acceptés. `meal` couvre `lunch` ET `dinner` parce que
 * la catégorie `repas_complet` porte les deux tags (cf. recipeMap.ts) : les deux
 * désignent exactement le même ensemble de recettes.
 */
const POOL_TAGS: Record<MealPool, BuiltinMealType[]> = {
  breakfast: ['breakfast'],
  meal: ['lunch', 'dinner'],
  snack: ['snack'],
};

/** Libellés des viviers, pour l'UI de création d'un créneau. */
export const POOL_LABELS: Record<MealPool, string> = {
  breakfast: 'Petit-déj', meal: 'Repas complet', snack: 'Collation',
};

/** Un id désigne-t-il un créneau intégré ? */
export function isBuiltinSlot(id: MealType): id is BuiltinMealType {
  return (BUILTIN_MEAL_TYPES as readonly string[]).includes(id);
}

/** Minutes depuis minuit — la clé de tri chronologique de la journée. */
export function slotMinutes(slot: MealSlot): number {
  return slot.hour * 60 + (slot.minute ?? 0);
}

/**
 * Tous les créneaux CONNUS d'un profil (intégrés + créés), triés chronologiquement.
 *
 * ⚠️ Un créneau créé qui porterait l'id d'un intégré est IGNORÉ, pas fusionné :
 * laisser une donnée synchronisée redéfinir `dinner` permettrait à une ligne
 * abîmée de déplacer le dîner de tout le monde, et le moteur lirait alors deux
 * vérités pour le même id.
 */
export function knownSlots(profile: Pick<UserProfile, 'meal_slots'> | null | undefined): MealSlot[] {
  const custom = Array.isArray(profile?.meal_slots) ? profile.meal_slots : [];
  const seen = new Set<string>(BUILTIN_MEAL_TYPES);
  const extra: MealSlot[] = [];
  for (const s of custom) {
    if (!s || typeof s.id !== 'string' || seen.has(s.id)) continue;
    seen.add(s.id);
    extra.push(s);
  }
  return [...BUILTIN_SLOTS, ...extra].sort((a, b) => slotMinutes(a) - slotMinutes(b));
}

/**
 * Les créneaux RETENUS par l'utilisateur (`profile.meals`), triés chronologiquement.
 *
 * Repli sur les 4 intégrés quand `meals` est absent, vide ou n'est pas un tableau —
 * le MÊME repli que celui du moteur avant ce module, et il reste nécessaire : un
 * `meals` non-tableau (le NOMBRE 4) a déjà été vu en production (cf. syncGuard).
 */
export function activeSlots(profile: Pick<UserProfile, 'meals' | 'meal_slots'> | null | undefined): MealSlot[] {
  const all = knownSlots(profile);
  const chosen = Array.isArray(profile?.meals) ? profile.meals : [];
  const kept = all.filter((s) => chosen.includes(s.id));
  return kept.length > 0 ? kept : [...BUILTIN_SLOTS];
}

/** Le créneau d'un id, ou `undefined` s'il a été supprimé depuis. */
export function slotOf(slots: readonly MealSlot[], id: MealType): MealSlot | undefined {
  return slots.find((s) => s.id === id);
}

/**
 * Le créneau d'un id, TOUJOURS. Un plan en cache peut contenir un créneau que
 * l'utilisateur vient de supprimer, et le moteur doit pouvoir recaler un repas
 * qu'il a lui-même servi : sans repli, ce repas recevrait un poids nul, donc une
 * cible de 0 kcal, donc une assiette vide — un correctif silencieux bien pire que
 * la donnée périmée qu'il prétend gérer.
 *
 * Le repli prend le poids d'une COLLATION (le plus petit) : sous-estimer un repas
 * fantôme laisse le reste de la journée à sa cible, le sur-estimer l'affame.
 */
export function slotOrFallback(slots: readonly MealSlot[], id: MealType): MealSlot {
  return slotOf(slots, id) ?? slotOf(BUILTIN_SLOTS, id) ?? { id, label: id, hour: 24, minute: 0, pool: 'snack' };
}

/**
 * Libellé d'affichage d'un créneau.
 *
 * ⚠️ Le repli rend l'ID BRUT et non un tiret : un plan en cache peut contenir un
 * créneau que l'utilisateur vient de supprimer, et une carte sans titre se lit
 * comme un bug d'affichage alors que la donnée, elle, est juste périmée.
 */
export function slotLabel(slots: readonly MealSlot[], id: MealType): string {
  return slotOf(slots, id)?.label ?? slotOf(BUILTIN_SLOTS, id)?.label ?? id;
}

/** Poids de portion d'un créneau (part relative du budget du jour, avant normalisation). */
export function slotWeight(slot: MealSlot): number {
  return isBuiltinSlot(slot.id) ? BUILTIN_WEIGHT[slot.id] : POOL_WEIGHT[slot.pool];
}

/** Tags de recettes que ce créneau accepte. */
export function slotRecipeTags(slot: MealSlot): BuiltinMealType[] {
  return POOL_TAGS[slot.pool] ?? POOL_TAGS.snack;
}

/** Heure d'un créneau, avec repli à 24 h (« encore devant soi ») pour un id inconnu. */
export function slotHour(slots: readonly MealSlot[], id: MealType): number {
  const s = slotOf(slots, id) ?? slotOf(BUILTIN_SLOTS, id);
  return s ? s.hour + (s.minute ?? 0) / 60 : 24;
}

/**
 * Le « type » à passer à `IconeRepas`. Un créneau créé n'a pas d'icône à lui : il
 * emprunte celle de son vivier. Sans ça, `IconeRepas` retomberait sur l'assiette
 * pour toutes les collations créées — donc trois lignes du plan avec la même icône
 * qu'un dîner, ce qui se lit comme une erreur d'affichage.
 */
export function slotIconType(slot: MealSlot): string {
  if (isBuiltinSlot(slot.id)) return slot.id;
  return slot.pool === 'breakfast' ? 'breakfast' : slot.pool === 'meal' ? 'dinner' : 'snack';
}

/** « 18h30 » / « 8h » — format court FR, pour les puces et la feuille de création. */
export function formatSlotTime(slot: Pick<MealSlot, 'hour' | 'minute'>): string {
  const m = slot.minute ?? 0;
  return m === 0 ? `${slot.hour}h` : `${slot.hour}h${String(m).padStart(2, '0')}`;
}

/**
 * Ids triés chronologiquement, à partir d'un ensemble quelconque.
 * Un id inconnu (créneau supprimé, plan en cache) est conservé EN FIN de journée
 * plutôt que jeté : le moteur doit pouvoir recaler un repas qu'il a lui-même servi.
 */
export function orderSlotIds(slots: readonly MealSlot[], ids: readonly MealType[]): MealType[] {
  const rank = new Map<string, number>();
  slots.forEach((s) => rank.set(s.id, slotMinutes(s)));
  const uniq = Array.from(new Set(ids));
  return uniq.sort((a, b) => (rank.get(a) ?? 24 * 60) - (rank.get(b) ?? 24 * 60));
}

/**
 * Fabrique l'id d'un nouveau créneau. Numérote à partir du plus grand id déjà
 * pris — jamais depuis la LONGUEUR de la liste, sinon supprimer puis recréer
 * réattribue un id déjà servi, et le nouveau créneau hériterait du repas « je
 * gère » de l'ancien.
 */
export function nextCustomSlotId(existing: readonly MealSlot[]): string {
  let max = 0;
  for (const s of existing) {
    const n = parseInt(String(s.id).slice(CUSTOM_SLOT_PREFIX.length), 10);
    if (String(s.id).startsWith(CUSTOM_SLOT_PREFIX) && Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${CUSTOM_SLOT_PREFIX}${max + 1}`;
}

/** Borne un créneau saisi : libellé non vide et tronqué, heure et minute valides. */
export function sanitizeSlot(slot: MealSlot): MealSlot {
  const hour = Math.min(Math.max(Math.round(slot.hour) || 0, 0), 23);
  const minute = Math.min(Math.max(Math.round(slot.minute ?? 0) || 0, 0), 59);
  const label = String(slot.label ?? '').trim().slice(0, SLOT_LABEL_MAX);
  const pool: MealPool = slot.pool === 'breakfast' || slot.pool === 'meal' ? slot.pool : 'snack';
  return { id: slot.id, label: label || POOL_LABELS[pool], hour, minute, pool };
}
