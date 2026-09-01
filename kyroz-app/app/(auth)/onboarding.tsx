import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Presse } from '../../components/Presse';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing,
} from 'react-native';
import { DUREE, dureeReduite } from '../../lib/motion';
import { reduceMotionActif } from '../../lib/reduceMotion';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing, Radius, Type, CIBLE_TACTILE_MIN, Trait, Icone, OPACITE_PRESSION } from '../../constants/theme';
import { useLayout } from '../../constants/layout';
import {
  PrimaryButton, Chip, OptionCard, Field, SectionLabel, Segmented, Card, clavierScrollProps,
} from '../../components/ui';
import { BodyFatPicker } from '../../components/BodyFatPicker';
import { useDialog } from '../../components/Dialog';
import { BirthDateField } from '../../components/BirthDateField';
import { ageOn } from '../../lib/birthday';
import { todayStamp } from '../../lib/weight';
import {
  AGE_BOUNDS, WEIGHT_BOUNDS, HEIGHT_BOUNDS, checkEligibility, eligibilityMessage,
} from '../../lib/safety';
import { DislikedFoodsField } from '../../components/DislikedFoodsField';
import {
  ActivityLevel, BodyFatSource, DietaryRestriction, Goal, MealSlot, MealType, NeatLevel, Sex, SportSession, UserProfile, VarietyPreference,
} from '../../lib/types';
import { MealSlotsPicker } from '../../components/MealSlotsPicker';
import { NeatPicker } from '../../components/NeatPicker';
import { knownSlots } from '../../lib/mealSlots';
import {
  validateProfile, goalLabel, goalSubtitle, recalcProfile, DEFAULT_NEAT_LEVEL,
} from '../../lib/tdee';
import { totalSessionsPerWeek } from '../../lib/sport';
import { deducedRestWeekdays } from '../../lib/planEngine';
import SportsEditor from '../../components/SportsEditor';
import { useProfile } from '../../hooks/useProfile';
import { saveFirstName } from '../../lib/profileName';
import { capture, Events } from '../../lib/analytics';
import { STATISTIQUES_USAGE_ACTIVES } from '../../lib/featureFlags';
import { useAnalyticsConsent } from '../../hooks/useAnalyticsConsent';
import AnalyticsConsentStep from '../../components/AnalyticsConsentStep';
import { DISCLAIMER, AVERTISSEMENT_MEDICAL } from '../../constants/legal';

const TOTAL_STEPS = 7;

// `cut_aggressive` retiré le 2026-07-29 : il servait le MÊME plan que `cut` (le
// plancher de sécurité absorbait l'écart), donc le choix était fantôme. La vitesse
// se pilote par l'objectif daté. Cf. lib/syncGuard.ts::normalizeGoal.
//
// `bulk` retiré le 2026-08-10 (décision fondateur), pour la MÊME raison portée d'un
// cran plus loin : il ne diffère de `lean_bulk` que par +200 kcal, c'est-à-dire par
// la VITESSE — et la vitesse est le métier de l'objectif daté, pas d'un cran de menu.
// Et sa seule autre différence allait à l'envers : les protéines BAISSAIENT (2,0 →
// 1,8 g/kg) précisément là où il en faut le plus pour que la prise soit du muscle.
// Cette case ne proposait pas un plan différent, elle proposait un plan moins bon.
//
// ⚠️ `recomp` RESTE, et ce n'est pas une inconséquence : c'est le seul objectif où la
// personne ne veut PAS que son poids bouge. Il n'a donc pas de poids cible, donc la
// date n'a rien à piloter — le mécanisme qui absorbe les autres crans ne l'atteint pas.
// ⚠️ Les PHRASES ne sont plus ici : elles sont dans `GOAL_CONFIG` (lib/tdee.ts),
// lues par `goalSubtitle`. Profil → Objectif pose la même question et montre les
// mêmes cartes ; deux listes auraient divergé sans que personne ne le voie.
const GOALS: Goal[] = ['cut', 'recomp', 'maintain', 'lean_bulk'];

const RESTRICTIONS: { label: string; value: DietaryRestriction }[] = [
  { label: 'Végétarien', value: 'vegetarian' },
  { label: 'Vegan', value: 'vegan' },
  { label: 'Pescétarien', value: 'pescatarian' },
  { label: 'Halal', value: 'halal' },
  { label: 'Sans porc', value: 'no_pork' },
  { label: 'Sans lactose', value: 'lactose_free' },
  { label: 'Sans gluten', value: 'gluten_free' },
];

const PROTEINS = ['Poulet', 'Bœuf', 'Poisson', 'Œufs', 'Whey', 'Végétal'];


const VARIETY: { value: VarietyPreference; title: string; sub: string }[] = [
  { value: 'repetitive', title: 'Répétitif', sub: "J'aime manger souvent les mêmes choses" },
  { value: 'balanced', title: 'Équilibré', sub: 'Un mélange de routine et de variété' },
  { value: 'max', title: 'Variété max', sub: 'Le plus de diversité possible sur la semaine' },
];

// Jours de la semaine (format getDay : 0=Dim … 6=Sam), affichés Lun→Dim
const WEEKDAY_OPTS: { label: string; val: number }[] = [
  { label: 'Lun', val: 1 }, { label: 'Mar', val: 2 }, { label: 'Mer', val: 3 },
  { label: 'Jeu', val: 4 }, { label: 'Ven', val: 5 }, { label: 'Sam', val: 6 }, { label: 'Dim', val: 0 },
];

/** Les sept jours, dans l'ordre d'affichage — les jours de repos les proposent TOUS. */
const TOUS_LES_JOURS = WEEKDAY_OPTS.map((o) => o.val);

// Renvoie les jours sélectionnés dans l'ordre Lun→Dim
function orderedWeekdays(selected: number[]): number[] {
  return WEEKDAY_OPTS.map((o) => o.val).filter((v) => selected.includes(v));
}

// Repas retenus, dans l'ordre CHRONOLOGIQUE de la journée — créneaux créés compris.
function orderedMeals(selected: MealType[], custom: MealSlot[]): MealType[] {
  return knownSlots({ meal_slots: custom }).filter((s) => selected.includes(s.id)).map((s) => s.id);
}

function activityFromDays(d: number): ActivityLevel {
  if (d <= 0) return 'sedentary';
  if (d <= 2) return 'light';
  if (d <= 4) return 'moderate';
  if (d <= 6) return 'active';
  return 'very_active';
}

export default function Onboarding() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const router = useRouter();
  const { saveProfile } = useProfile();
  const { notify } = useDialog();

  // Consentement aux statistiques d'usage. `undefined` = en cours de lecture ;
  // `null` = pas encore répondu → l'écran de consentement remplace l'assistant.
  const { consent, choose: chooseConsent } = useAnalyticsConsent();

  // 🔴 `onboarding_started` NE PEUT PAS partir au montage, et ce n'est pas un détail
  // de placement. Au montage, la question du consentement n'a pas encore été posée :
  // `capture` sortirait à sa première ligne et l'event serait perdu pour tout le
  // monde, y compris pour ceux qui acceptent trois secondes plus tard. Il part donc
  // quand l'assistant DÉMARRE vraiment — c'est-à-dire une fois le consentement
  // répondu, seule chose qui le précède encore depuis la suppression de l'écran
  // d'avertissement santé (2026-08-12).
  const tunnelOuvert = useRef(false);
  useEffect(() => {
    if (consent === undefined || consent === null) return;
    if (tunnelOuvert.current) return;
    tunnelOuvert.current = true;
    capture(Events.onboardingStarted);
  }, [consent]);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  // 🔴 ON MÉMORISE LE GESTE, PAS LA PHRASE. C'était `useState<string | null>` : le
  // motif était gelé au moment du tap, donc il MENTAIT dès que la personne corrigeait.
  // Vu à l'écran le 2026-09-01 — « Indique si tu es un homme ou une femme » restait
  // affiché après avoir touché « Femme », parce que l'étape 2 restait incomplète pour
  // une AUTRE raison. Un état vrai à un instant et faux la seconde d'après est pire
  // qu'un silence : il envoie corriger ce qui l'est déjà.
  // ➡️ Le booléen dit « quelqu'un a tenté d'avancer » ; la phrase, elle, se recalcule
  // à chaque rendu par `blockReason()` et suit donc la saisie en direct.
  const [avanceTentee, setAvanceTentee] = useState(false);

  // D1 : l'étape ATTEINTE. C'est la seule mesure qui dise OÙ l'assistant fait
  // abandonner — `onboarding_completed` seul ne compte que ceux qui sont allés au
  // bout, donc il ne peut rien dire de ceux qui partent. Même garde que ci-dessus :
  // rien ne part tant que l'assistant n'est pas réellement à l'écran.
  const assistantActif = consent !== undefined && consent !== null;
  useEffect(() => {
    if (!assistantActif) return;
    capture(Events.onboardingStepViewed, { step });
  }, [step, assistantActif]);

  // État formulaire
  const [firstName, setFirstName] = useState('');
  // 🔴 AUCUN SEXE PRÉSÉLECTIONNÉ — il l'était sur `'male'` jusqu'au 2026-09-01.
  // C'est le défaut du NEAT (fermé le 2026-08-19) dans sa version GRAVE : un NEAT par
  // défaut sert le cran le plus prudent, un sexe par défaut sert un plan FAUX. Le sexe
  // entre dans Mifflin-St Jeor à ±166 kcal (`lib/tdee.ts:95`), dans les bornes de %MG
  // (`lib/safety.ts:43`) et dans les silhouettes du sélecteur. Une femme qui ne
  // touchait pas au segmenté n'était jamais bloquée : elle recevait, en silence, un
  // plan calculé sur un métabolisme d'homme.
  // ⚠️ Et il n'y a PAS de repli `?? 'male'` en fin de parcours, contrairement au NEAT :
  // ici, deviner, c'est se tromper.
  const [sex, setSex] = useState<Sex | null>(null);
  // Date de naissance et NON âge : un âge saisi pourrit au premier anniversaire,
  // et il entre dans Mifflin-St Jeor donc dans les calories servies (lib/birthday.ts).
  const [birthDate, setBirthDate] = useState<string | undefined>(undefined);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bodyFat, setBodyFat] = useState<number | undefined>(undefined);
  // Provenance du %MG : elle décide de la formule du BMR (cf. lib/tdee.ts).
  // `undefined` tant que rien n'est choisi → le moteur calcule comme « estimé ».
  const [bodyFatSource, setBodyFatSource] = useState<BodyFatSource | undefined>(undefined);
  const [sports, setSports] = useState<SportSession[]>([]);
  const [noSport, setNoSport] = useState(false); // « je ne fais pas de sport » → calcul base seule
  const [goal, setGoal] = useState<Goal>('cut');
  const [restrictions, setRestrictions] = useState<DietaryRestriction[]>([]);
  const [proteins, setProteins] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  // ⚠️ `null` ET PAS `DEFAULT_NEAT_LEVEL` : rien n'est présélectionné, et l'étape ne
  // se valide pas tant que la réponse manque. Pré-cocher « journées assises » aurait
  // laissé le défaut passer pour une réponse — c'est exactement le défaut que poser
  // la question corrige (cf. `DEFAULT_NEAT_LEVEL` dans lib/tdee.ts).
  const [neat, setNeat] = useState<NeatLevel | null>(null);
  const [variety, setVariety] = useState<VarietyPreference>('balanced');
  const [planWeekdays, setPlanWeekdays] = useState<number[]>([]); // rien coché par défaut → l'user sélectionne (noir = off, blanc = on)
  const [restWeekdays, setRestWeekdays] = useState<number[]>([]);  // jours SANS entraînement, sur la semaine entière → cyclage
  // ⚠️ Tant que l'utilisateur n'y a pas touché, les jours de repos sont PRÉ-COCHÉS
  // depuis le nombre de séances déclaré (cf. l'effet plus bas). Ce drapeau existe
  // pour que la pré-sélection ne réécrive JAMAIS un choix déjà fait — même règle
  // que pour les champs contrôlés : on ne resynchronise que ce qui vient du dehors.
  const [restTouched, setRestTouched] = useState(false);
  const [meals, setMeals] = useState<MealType[]>(['breakfast', 'lunch', 'dinner', 'snack']);
  // Créneaux CRÉÉS à l'onboarding (« Shaker post-training », 18h30). Vide par défaut :
  // les 4 intégrés couvrent la majorité, et qui mange 6 fois par jour l'ajoute ici.
  const [customSlots, setCustomSlots] = useState<MealSlot[]>([]);

  const ageN = ageOn(birthDate, todayStamp()) ?? NaN;
  const wN = parseFloat(weight), hN = parseFloat(height);
  // Étapes à validation requise (les autres sont libres) :
  const firstNameValid = firstName.trim().length > 0;                                    // étape 1 — prénom
  // Bornes de saisie (P0.4). L'âge minimum est passé de 16 à 18 ans : Mifflin-St Jeor
  // n'est pas validée sous 19 ans, et un moteur de déficit calorique n'a pas à être
  // servi à un mineur (sécurité ET conformité). Cf. lib/safety.ts.
  const basicsValid =
    sex !== null &&
    ageN >= AGE_BOUNDS[0] && ageN <= AGE_BOUNDS[1] &&
    wN >= WEIGHT_BOUNDS[0] && wN <= WEIGHT_BOUNDS[1] &&
    hN >= HEIGHT_BOUNDS[0] && hN <= HEIGHT_BOUNDS[1]; // étape 2 — infos
  const bodyFatValid = bodyFat != null;                                                   // étape 3 — masse grasse
  // Étape 4 — DEUX réponses, comptées séparément par le moteur (`TDEE = BMR × NEAT +
  // dépense sportive`) : les journées hors sport, et les séances. La première est
  // EXIGÉE depuis le 2026-08-19 ; jusque-là elle ne vivait que dans le Profil, donc
  // le défaut le plus prudent était la valeur réellement servie à presque tout le monde.
  const trainingValid = neat !== null && (noSport || sports.length >= 1);
  // Du sport a-t-il été DÉCLARÉ ? C'est ce qui décide si les jours de repos changent
  // quoi que ce soit (cf. le texte de l'étape 7) : `saveProfile` envoie
  // `sports: noSport ? [] : sports`, et sans séance `dayExpenditures` rend une cible
  // plate — sept jours identiques.
  const sportDeclare = !noSport && sports.length > 0;
  const trainingDaysEq = noSport ? 0 : Math.min(totalSessionsPerWeek(sports), 7);          // repli legacy (activity_level / training_days)
  const mealsValid = planWeekdays.length >= 1 && meals.length >= 1;                        // étape 7 — jours + repas
  const profileReady = basicsValid && bodyFatValid; // suffisant pour les calculs TDEE/macros

  // Étape 5 — L'OBJECTIF SE REFUSE ICI, PAS AU DERNIER TAP (2026-08-20).
  //
  // 🔴 Le défaut : sous IMC 18,5, `finish()` refusait la sèche à la SEPTIÈME étape,
  // par une boîte de dialogue, sans issue autre que revenir en arrière deviner quoi
  // changer. Sept étapes remplies pour un mur — et `checkEligibility` dit pourtant
  // noir sur blanc que ce blocage-là vise « l'objectif concerné, pas l'app entière ».
  // Le corps nécessaire est connu dès l'étape 2 : la question se pose donc au moment
  // où la personne CHOISIT, avec la porte de sortie sous les yeux.
  //
  // ⚠️ On ne passe PAS les séances : elles se déclarent à l'étape 4, mais faire
  // remonter ici « plus de 20 h d'entraînement » brouillerait l'écran de l'objectif
  // avec un reproche qui ne le concerne pas. Ce blocage-là reste au filet de `finish()`.
  // `sex !== null` est déjà dans `basicsValid`, donc dans `profileReady` : le test est
  // là pour que TypeScript le VOIE, pas pour couvrir un cas. Le supprimer ne changerait
  // rien à l'exécution et casserait la compilation — ce qui est la bonne façon d'être
  // redondant.
  const objectifBloque = profileReady && sex !== null
    ? eligibilityMessage(checkEligibility({ sex, age: ageN, weight_kg: wN, height_cm: hN, goal }))
    : null;

  const canProceed =
    (step === 1 && firstNameValid) ||
    (step === 2 && basicsValid) ||
    (step === 3 && bodyFatValid) ||
    (step === 4 && trainingValid) ||
    (step === 5 && !objectifBloque) ||
    (step === 7 && mealsValid) ||
    ![1, 2, 3, 4, 5, 7].includes(step);

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const toggleMeal = (v: MealType) =>
    setMeals((arr) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // Un créneau créé est RETENU d'office : on ne demande pas à quelqu'un qui vient
  // d'ajouter « Shaker post-training » de le cocher ensuite pour qu'il compte.
  const saveSlot = (s: MealSlot) => {
    setCustomSlots((arr) => arr.some((x) => x.id === s.id) ? arr.map((x) => (x.id === s.id ? s : x)) : [...arr, s]);
    setMeals((arr) => (arr.includes(s.id) ? arr : [...arr, s.id]));
  };
  const deleteSlot = (id: MealType) => {
    setCustomSlots((arr) => arr.filter((x) => x.id !== id));
    setMeals((arr) => arr.filter((x) => x !== id));
  };

  // ⚠️ Retirer un jour du plan ne touche PLUS aux jours de repos (2026-08-26) : les
  // deux réglages ne parlent plus du même objet. Les jours du plan disent ce que
  // Kyroz planifie ; les jours de repos disent quand l'utilisateur ne s'entraîne pas.
  const togglePlanDay = (v: number) => {
    setPlanWeekdays((arr) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };
  const toggleRestDay = (v: number) => {
    setRestTouched(true);
    setRestWeekdays((arr) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };
  // « Aucun jour de repos » — une réponse À PART ENTIÈRE, pas une case laissée vide.
  // Avant, l'onboarding démarrait à zéro jour coché et enregistrait ce vide tel quel :
  // « je n'ai pas répondu » devenait « je m'entraîne 7 j/7 », et le plan repartait
  // PLAT (mesuré). Le Profil, lui, pré-cochait déjà la déduction — deux écrans, deux
  // comportements pour le même réglage.
  const setNoRestDay = () => { setRestTouched(true); setRestWeekdays([]); };

  // Pré-sélection : les jours de repos que le moteur déduirait de toute façon
  // (`restDaySet`, la MÊME fonction qu'il utilise), projetés sur les jours du plan.
  // On ne devine pas mieux qu'avant — on rend l'hypothèse VISIBLE, donc corrigeable.
  // Un utilisateur ne peut pas rectifier ce qu'on ne lui montre pas.
  // 🔴 ET LA DÉDUCTION PORTE SUR LA SEMAINE, PLUS SUR LE PLAN (2026-08-26). Projetée
  // sur les seuls jours du plan, elle pré-cochait UN jour de repos pour 4 séances
  // déclarées et un plan du lundi au vendredi — le moteur en déduisait alors
  // `7 − 1 = 6` jours d'entraînement, et le cyclage naissait faux sur un compte
  // neuf. Sur les sept jours, la même fonction en déduit trois.
  useEffect(() => {
    if (restTouched) return;
    setRestWeekdays(deducedRestWeekdays(TOUS_LES_JOURS, trainingDaysEq));
  }, [trainingDaysEq, restTouched]);

  // Les macros (auto) sont calculées par recalcProfile au finish ; plus de calcul
  // en ligne ici depuis la suppression de l'étape récap (le reveal du 1er plan les affiche).

  // Pourquoi on ne peut pas avancer (message affiché au tap sur « Continuer »).
  const blockReason = (): string | null => {
    if (step === 1 && !firstNameValid) return 'Dis-nous comment t\'appeler pour commencer';
    if (step === 2 && !basicsValid) {
      if (ageN >= 1 && ageN < AGE_BOUNDS[0]) return `Kyroz est réservé aux ${AGE_BOUNDS[0]} ans et plus.`;
      // Un choix manquant se dit à part d'un champ vide : l'écran montre déjà POURQUOI
      // on le demande (« pour calculer ton métabolisme »), le blocage dit seulement
      // CE QUI MANQUE — la règle posée le 2026-08-26 sur l'étape 3.
      if (sex === null) return 'Indique si tu es un homme ou une femme pour continuer.';
      return 'Remplis ta date de naissance, ton poids et ta taille pour continuer.';
    }
    if (step === 3 && !bodyFatValid)
      // ⚠️ La phrase s'arrête ICI depuis le 2026-08-26. Elle continuait par
      // « — choisis la silhouette la plus proche de toi, ou saisis ton % si tu le
      // connais », qui est MOT POUR MOT le sous-titre de l'étape, déjà affiché deux
      // centimètres plus haut. Un message de blocage dit ce qui manque ; l'écran
      // dit déjà comment le donner.
      return 'On a besoin de ta masse grasse pour te calculer le plan le plus juste possible.';
    if (step === 4 && !trainingValid) {
      if (neat === null) return 'Choisis à quoi ressemblent tes journées, hors sport.';
      return 'Choisis au moins un sport, ou indique que tu n\'en fais pas.';
    }
    // ⚠️ UNE LIGNE COURTE, PAS LE MESSAGE COMPLET — vu à l'écran le 2026-08-20.
    // Renvoyer `objectifBloque` ici affichait le même paragraphe de quatre lignes
    // DEUX fois : dans la carte, et en accent juste au-dessus du bouton, où il
    // recouvrait la carte qu'il répétait. Le bandeau dit l'ACTION, la carte dit le
    // POURQUOI — et le pourquoi n'a toujours qu'une seule rédaction.
    if (step === 5 && objectifBloque) return 'Sèche n\'est pas disponible ici — choisis Maintien, ou un autre objectif.';
    if (step === 7 && !mealsValid) return 'Choisis au moins un jour et un repas.';
    return null;
  };

  const next = () => {
    if (saving) return;
    if (!canProceed) { setAvanceTentee(true); return; }
    setAvanceTentee(false);
    if (step < TOTAL_STEPS) setStep(step + 1);
    else finish();
  };
  const back = () => { if (step > 1) { setAvanceTentee(false); setStep(step - 1); } };

  const finish = async () => {
    // 🔴 LE SEXE NE SE DEVINE PAS. L'étape 2 interdit d'arriver ici sans lui, donc ce
    // filet ne se déclenche pas — et s'il se déclenchait, il RENVOIE à l'étape qui
    // manque au lieu de choisir à la place de quelqu'un. C'est la différence assumée
    // avec le `neat ?? DEFAULT_NEAT_LEVEL` vingt lignes plus bas : un repli n'est
    // acceptable que quand la valeur de repli est défendable.
    if (sex === null) { setStep(2); setAvanceTentee(true); return; }
    // Profil « brut » (inputs uniquement). recalcProfile est l'UNIQUE producteur
    // de tdee_kcal + macros — pas de calcul en ligne parallèle ici (cohérence
    // garantie avec le check-in poids et les éditeurs du profil).
    const draft: UserProfile = {
      id: `user-${Date.now()}`,
      sex, age: ageN, birth_date: birthDate, weight_kg: wN, height_cm: hN,
      body_fat_pct: bodyFat,
      body_fat_source: bodyFatSource,
      activity_level: activityFromDays(trainingDaysEq),
      training_days_per_week: trainingDaysEq,
      // Le repli `??` n'est jamais emprunté — `trainingValid` interdit d'atteindre
      // `finish()` avec `neat === null`. Il est là pour que le type reste honnête,
      // pas pour couvrir un cas : si l'étape 4 perdait sa garde, un profil partirait
      // au cran le plus prudent plutôt qu'à un cran inventé.
      neat_level: neat ?? DEFAULT_NEAT_LEVEL,
      sports: noSport ? [] : sports,
      goal,
      macro_mode: 'auto', // onboarding = macros calculées ; le mode « perso % » se règle dans le profil
      tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
      plan_days: planWeekdays.length,
      plan_weekdays: orderedWeekdays(planWeekdays),
      // Jours SANS entraînement, sur la semaine entière → carb-cycling.
      // ⚠️ Plus de filtre contre `planWeekdays` (2026-08-26) : un jour de repos hors
      // plan n'est pas une erreur à corriger, c'est une information sur la semaine de
      // l'utilisateur — et c'est elle qui donne au moteur son nombre d'entraînements.
      // Repas fixes + emphase se règlent dans le profil (MealsEditor) ; l'onboarding
      // pose les valeurs neutres.
      rest_weekdays: orderedWeekdays(restWeekdays),
      meals: orderedMeals(meals, customSlots),
      meal_slots: customSlots.length ? customSlots : undefined,
      meal_emphasis: 'even',
      variety,
      fixed_meals: undefined,
      dietary_restrictions: restrictions,
      disliked_foods: dislikes,
      preferred_proteins: proteins.map((p) => p.toLowerCase()),
    };
    const profile = recalcProfile(draft); // ← source unique du TDEE et des macros
    // Éligibilité (P0.4) : mineur, IMC de départ, volume d'entraînement. La grossesse
    // et l'allaitement n'y figurent PAS et ne doivent pas y revenir (CLAUDE.md §6,
    // AGENTS.md E39) : subordonner l'accès à l'un ou l'autre est un refus de service
    // fondé sur un critère de discrimination, et la réponse serait elle-même une
    // donnée de santé. Ce qui reste est DIT (AVERTISSEMENT_MEDICAL, sous le bouton de
    // l'étape 1) ; ce qui protège, ce sont les blocages qui MESURENT.
    const blocked = eligibilityMessage(checkEligibility(profile));
    // ⚠️ `Alert.alert` est une fonction VIDE sur le web : un profil REFUSÉ (mineur,
    // IMC de départ, volume d'entraînement) voyait le bouton final ne rien faire,
    // sans le moindre message. Un refus muet se lit comme une app cassée.
    if (blocked) {
      // 🔴 AUCUNE PROPRIÉTÉ, ET C'EST DÉLIBÉRÉ — la synthèse du 2026-08-10 se
      // contredit sur ce point. Son §5 propose `motif: age | volume | autre`, son §6
      // interdit « tout motif de blocage lié à » l'âge, au sport ou à l'IMC. Les
      // trois motifs proposés tombent donc sous l'interdit absolu, et §6 gagne : dire
      // « cette installation a été refusée pour un motif non-âge » désigne un corps
      // (IMC bas, grossesse, cible hors bornes) sur un identifiant qui, lui, est
      // supprimable — donc pas anonyme. Le COMPTE seul répond déjà à la question
      // posée (« est-ce que je perds du monde au portail ? ») ; le POURQUOI ne
      // changerait aucune décision, ces garde-fous n'étant pas négociables (§6).
      capture(Events.onboardingBlocked);
      await notify({ title: 'Attention', message: blocked });
      return;
    }
    const err = validateProfile(sex, ageN, profile.target_kcal);
    if (err) { await notify({ title: 'Attention', message: err }); return; }
    setSaving(true);
    await saveFirstName(firstName);
    await saveProfile(profile);
    // ⚠️ `goal`, `restrictions` et `has_sport` ONT ÉTÉ RETIRÉS le 2026-08-10. Ce sont
    // l'objectif, le régime et la pratique sportive — trois données de santé au sens
    // de l'art. 9, nommées une par une dans l'interdit absolu (§6). Elles partaient
    // depuis la première version de ce fichier, sans que rien ne les envoie jamais
    // (clé PostHog absente) : le défaut était DORMANT, pas inexistant. Ne restent que
    // deux COMPTES — combien de jours, combien de repas — qui ne décrivent aucun corps.
    capture(Events.onboardingCompleted, {
      plan_days: planWeekdays.length, meals: meals.length,
    });
    setSaving(false);
    router.replace('/(tabs)/plan');
  };

  // Consentement analytics — AVANT la première question du profil, et c'est le SEUL
  // écran qui précède encore l'assistant. Le poser plus tard supprimerait D1 (cf.
  // AnalyticsConsentStep).
  //
  // ⚠️ L'écran d'avertissement santé le précédait ; il a été SUPPRIMÉ le 2026-08-12
  // (décision fondateur). Ses deux phrases sont servies sous le bouton de l'étape 1 —
  // voir le pied de page plus bas et constants/legal.ts. Ne pas le « rétablir » :
  // depuis le 2026-08-11 il ne posait plus aucune question et ne bloquait plus
  // personne, donc il coûtait un tap pour un texte qui n'a pas besoin d'un écran.
  // (Placé APRÈS tous les hooks → règles React respectées.)
  // 🔴 ÉTEINT (2026-08-26) : plus aucune question posée. Demander un consentement
  // pour une mesure qui n'a pas lieu serait la pire des deux options — un écran de
  // plus avant le prénom, ET une promesse sans objet.
  // ⚠️ L'écran et son composant ne sont PAS supprimés : rallumer la constante les
  // remet exactement où ils étaient (`lib/featureFlags.ts`).
  if (STATISTIQUES_USAGE_ACTIVES) {
    if (consent === undefined) return null; // lecture du stockage, quasi instantané
    if (consent === null) return <AnalyticsConsentStep onChoose={chooseConsent} />;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />

      {/* Header : retour + progression */}
      <View style={[s.header, layout.header]}>
        <Presse onPress={back} disabled={step === 1} style={[s.backBtn, step === 1 && { opacity: 0 }]}>
          <Ionicons name="chevron-back" size={Icone.action} color={t.text} />
        </Presse>
        <View style={s.track}><View style={[s.fill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} /></View>
      </View>

      <ScrollView contentContainerStyle={[s.content, layout.content]} {...clavierScrollProps} showsVerticalScrollIndicator={false}>
        {step > 1 && <SectionLabel t={t}>ÉTAPE {step - 1} / {TOTAL_STEPS - 1}</SectionLabel>}

        {step === 1 && <NameStep t={t} value={firstName} onChange={setFirstName} />}

        {step === 2 && (
          <View style={s.block}>
            <Text style={s.title}>Tes infos de base</Text>
            <Text style={s.sub}>Pour calculer ton métabolisme et tes macros au plus juste.</Text>
            <Segmented t={t} options={[{ label: 'Homme', value: 'male' }, { label: 'Femme', value: 'female' }]} value={sex} onChange={setSex} />
            <BirthDateField t={t} value={birthDate} onChange={setBirthDate} />
            <Field t={t} label="Poids" suffix="kg" value={weight} onChangeText={setWeight} placeholder="80" keyboardType="decimal-pad" />
            <Field t={t} label="Taille" suffix="cm" value={height} onChangeText={setHeight} placeholder="178" keyboardType="number-pad" />
          </View>
        )}

        {/* ⚠️ `&& sex` : le sélecteur de %MG est SEXUÉ — planches de silhouettes
            (`components/BodyFatPicker.tsx:88`) et bornes (`lib/safety.ts:43`). L'étape 2
            garantit déjà le sexe ; la garde rend cette dépendance visible ici, là où on
            la lirait, plutôt que dans le type d'un composant deux fichiers plus loin. */}
        {step === 3 && sex && (
          <View style={s.block}>
            <Text style={s.title}>Ta masse grasse</Text>
            <Text style={s.sub}>
              Choisis la silhouette la plus proche de toi, ou saisis ton % si tu le connais.
            </Text>
            {/* Le corps est déjà saisi à l'étape 2 → le repère de plausibilité peut
                chiffrer l'impact. Les séances (étape 4) ne comptent pas ici : elles
                s'ajoutent au TDEE sans dépendre du %MG. */}
            <BodyFatPicker
              t={t} sex={sex} value={bodyFat} source={bodyFatSource}
              onChange={(pct, src) => { setBodyFat(pct); setBodyFatSource(src); }}
              body={{ sex, age: ageN, weight_kg: wN, height_cm: hN }}
            />
          </View>
        )}

        {step === 4 && (
          <View style={s.block}>
            <Text style={s.title}>Ton activité</Text>
            <Text style={s.sub}>Deux choses, comptées séparément : ce que tu dépenses dans une journée ordinaire, et ce que tes séances y ajoutent.</Text>
            {/* Le NEAT AVANT les séances, et le composant est partagé avec le Profil :
                voir l'en-tête de `NeatPicker` — l'ordre et la rédaction sont des
                garde-fous contre le double-comptage sport/journées, pas une mise en page. */}
            <NeatPicker t={t} value={neat} onChange={setNeat} />

            <SectionLabel t={t}>TES SÉANCES</SectionLabel>
            <SportsEditor
              sports={sports}
              weight={profileReady ? wN : undefined}
              onChange={(next) => { setSports(next); if (next.length) setNoSport(false); }}
            />
            <Chip
              t={t} label="Je ne fais pas de sport"
              selected={noSport}
              onPress={() => { const v = !noSport; setNoSport(v); if (v) setSports([]); }}
            />
          </View>
        )}

        {step === 5 && (
          <View style={s.block}>
            <Text style={s.title}>Ton objectif</Text>
            <Text style={s.sub}>Le plan sera calibré précisément pour ça.</Text>
            <View style={{ gap: Spacing.md }}>
              {GOALS.map((g) => (
                <OptionCard key={g} t={t} title={goalLabel(g)} subtitle={goalSubtitle(g)} selected={goal === g} onPress={() => setGoal(g)} />
              ))}
            </View>
            {/* L'objectif refusé s'explique ICI, avec sa sortie en un tap — c'est ce
                qui distingue une bifurcation d'un mur. Le bouton n'est pas un confort :
                sans lui, la seule issue est de deviner lequel des trois autres objectifs
                l'app accepte, et la personne repart ressaisir ses chiffres. */}
            {!!objectifBloque && (
              <Card t={t}>
                <Text style={{ ...Type.caption, color: t.text, lineHeight: 19 }}>{objectifBloque}</Text>
                <Presse
                  onPress={() => setGoal('maintain')}
                  activeOpacity={OPACITE_PRESSION}
                  style={{
                    marginTop: Spacing.md, borderRadius: Radius.button, minHeight: CIBLE_TACTILE_MIN,
                    justifyContent: 'center', alignItems: 'center',
                    borderWidth: Trait.fin, borderColor: t.lineStrong,
                  }}
                >
                  <Text style={{ ...Type.bodySmallStrong, color: t.text }}>Passer en Maintien</Text>
                </Presse>
              </Card>
            )}
          </View>
        )}

        {step === 6 && (
          <View style={s.block}>
            <Text style={s.title}>Tes préférences</Text>
            <Text style={s.sub}>Pour des recettes qui te ressemblent vraiment.</Text>

            <SectionLabel t={t}>Régime</SectionLabel>
            <View style={s.wrap}>
              {RESTRICTIONS.map((r) => (
                <Chip key={r.value} t={t} label={r.label} selected={restrictions.includes(r.value)} onPress={() => toggle(restrictions, r.value, setRestrictions)} />
              ))}
            </View>

            <SectionLabel t={t}>Protéines préférées</SectionLabel>
            <View style={s.wrap}>
              {PROTEINS.map((p) => (
                <Chip key={p} t={t} label={p} selected={proteins.includes(p)} onPress={() => toggle(proteins, p, setProteins)} />
              ))}
            </View>

            <DislikedFoodsField t={t} value={dislikes} onChange={setDislikes} />

            <SectionLabel t={t}>Variété des repas</SectionLabel>
            <Text style={[s.sub, { marginTop: -Spacing.xs }]}>Tu préfères la routine ou la diversité ?</Text>
            <View style={{ gap: Spacing.md }}>
              {VARIETY.map((v) => (
                <OptionCard key={v.value} t={t} title={v.title} subtitle={v.sub} selected={variety === v.value} onPress={() => setVariety(v.value)} />
              ))}
            </View>
          </View>
        )}

        {step === 7 && (
          <View style={s.block}>
            {/* Le sous-titre « Choisis les jours où tu veux suivre ton plan » est parti
                (2026-08-12) : il paraphrasait le titre au-dessus d'une rangée de jours
                qu'on ne peut que taper. La ligne « N jours par semaine » sous la rangée
                dit, elle, quelque chose que le titre ne dit pas. */}
            <Text style={s.title}>Tes jours de plan</Text>
            <View style={s.daysRow}>
              {WEEKDAY_OPTS.map((d) => {
                const on = planWeekdays.includes(d.val);
                return (
                  <Presse key={d.val} onPress={() => togglePlanDay(d.val)} activeOpacity={OPACITE_PRESSION}
                    style={[s.dayCircle, { backgroundColor: on ? t.accent : t.fill, borderColor: on ? t.accent : t.line }]}>
                    <Text style={{ ...Type.captionStrong, color: on ? t.onAccent : t.textTertiary }}>{d.label}</Text>
                  </Presse>
                );
              })}
            </View>
            <Text style={[s.sub, { marginTop: -Spacing.xs }]}>{planWeekdays.length} jour{planWeekdays.length > 1 ? 's' : ''} par semaine</Text>

            {/* Jours de repos = jours SANS entraînement, sur la semaine entière — ils ne
                dépendent pas des jours du plan (2026-08-26). */}
            <SectionLabel t={t}>Jours de repos</SectionLabel>
            {/* ⚠️ Ce texte a déjà promis deux choses fausses — « (mêmes calories) », plus
                vrai depuis la répartition par volume, et « recettes récup », plus vrai
                depuis la suppression du tag `rest_day_ok` le 2026-08-03.

                🔴 IL EN PROMETTAIT UNE TROISIÈME, ET C'EST LE MÊME DÉFAUT QUE SUR
                L'ÉCRAN PLAN (CLAUDE.md §8, corrigé là-bas le 2026-08-08) : la modulation
                par volume n'existe QUE si du sport est déclaré — sans lui,
                `dayExpenditures` retombe sur une cible plate et les sept jours sont
                identiques. La phrase annonçait pourtant « moins de calories les jours de
                repos » à tout le monde, y compris à qui vient de cocher « Je ne fais pas
                de sport » deux étapes plus tôt.
                ➡️ Le prédicat est ici la DÉCLARATION de sport, et non le seuil de 40 kcal
                de `moduleParVolume` : à cette étape le profil n'existe pas encore, donc
                aucune amplitude n'est calculable. C'est le même fait, lu à la seule
                source disponible à ce moment-là. */}
            <Text style={[s.sub, { ...Type.caption, marginTop: -Spacing.sm }]}>
              {sportDeclare
                ? "Moins de calories et de glucides ces jours-là, reportées sur tes jours d'entraînement. Tes protéines et ton total de la semaine ne bougent pas."
                : "Tes jours sans entraînement. Ils ne changeront tes calories que si tu déclares du sport."}
            </Text>
            {/* Les SEPT jours, quels que soient les jours du plan : on peut ne pas
                s'entraîner un jour que Kyroz ne planifie pas. La note « choisis d'abord
                tes jours de plan » est partie avec la dépendance qu'elle expliquait. */}
            <View style={s.wrap}>
              {WEEKDAY_OPTS.map((d) => (
                <Chip key={d.val} t={t} label={d.label} selected={restWeekdays.includes(d.val)} onPress={() => toggleRestDay(d.val)} />
              ))}
              <Chip t={t} label="Aucun" selected={restWeekdays.length === 0} onPress={setNoRestDay} />
            </View>

            <SectionLabel t={t}>Repas inclus</SectionLabel>
            {/* La deuxième phrase — « Tu en fais plus de quatre ? Ajoute tes propres
                repas » — est partie le 2026-08-12 : le bouton « + Ajouter un repas »
                est juste en dessous et le dit mieux qu'elle. */}
            <Text style={[s.sub, { ...Type.caption, marginTop: -Spacing.sm }]}>
              Coche ce que tu manges dans une journée.
            </Text>
            <MealSlotsPicker
              t={t} customSlots={customSlots} selected={meals}
              onToggle={toggleMeal} onSaveSlot={saveSlot} onDeleteSlot={deleteSlot}
            />
            {meals.length === 0 && <Text style={[s.sub, { marginTop: -Spacing.xs }]}>Sélectionne au moins 1 repas.</Text>}
          </View>
        )}
        {/* L'étape « récap » a été supprimée (2026-06-20) : le récap et le
            disclaimer vivent dans le reveal du 1er plan
            (components/FirstPlanReveal.tsx), affiché à l'arrivée sur l'écran Plan.

            🔴 Cette phrase disait « le récap + LE RAPPEL QUOTIDIEN + le
            disclaimer ». C'était FAUX, et ça l'a été des mois : le rappel n'a
            jamais atteint le reveal, il n'existait qu'à Profil → roue dentée →
            Notifications. Conséquence — la permission n'était quasiment jamais
            demandée, donc le seul levier de rétention que §5 autorise restait
            éteint pour presque tout le monde. Il est désormais proposé, juste
            APRÈS le reveal : components/ReminderOffer.tsx.
            ⚠️ Et pas ici : un prompt de permission iOS ne se pose qu'UNE fois. Le
            demander avant d'avoir livré quoi que ce soit, c'est le faire refuser
            sans recours. */}
      </ScrollView>

      <View style={[s.footer, layout.header]}>
        {avanceTentee && !canProceed && <Text style={s.hint}>{blockReason()}</Text>}
        {/* `muted` et non `disabled` : le bouton reste cliquable, c'est lui qui
            affiche `blockReason()`. Il est simplement atténué pour ne plus
            promettre d'avancer quand l'étape est incomplète. */}
        <PrimaryButton
          t={t}
          label={step === TOTAL_STEPS ? 'Générer mon plan' : 'Continuer'}
          onPress={next}
          loading={saving}
          muted={!canProceed}
        />
        {/* Les deux phrases de l'ancien écran « Avant de commencer », servies là où il
            servait : juste avant que quiconque commence. Le renvoi vers un médecin est
            exigé par Apple (1.4.1) et Google, le disclaimer par §6 (« onboarding,
            paramètres, chaque plan »).
            ⚠️ Étape 1 SEULEMENT — les répéter sur les sept étapes en ferait du décor
            qu'on ne lit plus. Garde-fou : lib/__tests__/avertissementMedical.test.ts. */}
        {step === 1 && (
          <View style={s.mentions}>
            <Text style={s.disclaimer}>{AVERTISSEMENT_MEDICAL}</Text>
            <Text style={s.disclaimer}>{DISCLAIMER}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────────────

// Écran d'accueil : la toute première chose que voit l'utilisateur. Entrée animée
// (fondu + montée du titre, puis apparition du champ) → première impression soignée.
function NameStep({ t, value, onChange }: { t: ThemePalette; value: string; onChange: (s: string) => void }) {
  const fade = useRef(new Animated.Value(0)).current;   // opacité du bloc titre
  const lift = useRef(new Animated.Value(22)).current;  // léger glissement vers le haut
  const field = useRef(new Animated.Value(0)).current;  // apparition différée du champ

  useEffect(() => {
    // ⚠️ Ces trois-là avaient DÉJÀ leur courbe (`Easing.out`) — ce sont les
    // seules de l'app dans ce cas. Ce qui manquait : le token, et surtout la
    // réduction du mouvement. `lift` DÉPLACE le bloc de 22 pt : c'est
    // exactement ce qu'un réglage « Réduire les animations » vise. Il est donc
    // posé à 0 d'emblée, pendant que les opacités, elles, restent — elles
    // informent sans bouger.
    const reduire = reduceMotionActif();
    if (reduire) lift.setValue(0);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: dureeReduite(DUREE.entree, reduire), easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ...(reduire ? [] : [
        Animated.timing(lift, { toValue: 0, duration: DUREE.entree, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(field, { toValue: 1, duration: dureeReduite(DUREE.entree, reduire), delay: reduire ? 0 : 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fade, lift, field]);

  const enter = { opacity: fade, transform: [{ translateY: lift }] };

  // Tokens d'espacement de la passe DA, mais PAS le 👋 : main a retiré tous les
  // émojis de l'interface le 2026-08-06, décision postérieure.
  // ⚠️ Le commentaire est ICI et non entre `return (` et l'élément : à cet endroit
  // `{/* … */}` n'est pas un commentaire JSX mais un objet, et `tsc` casse.
  return (
    <View style={{ paddingTop: Spacing.xxxl, gap: Spacing.lg }}>
      <Animated.Text style={[{ color: t.text, ...Type.display, lineHeight: 40 }, enter]}>
        Bienvenue sur Kyroz
      </Animated.Text>
      <Animated.Text style={[{ ...Type.body, color: t.textSecondary, lineHeight: 23 }, enter]}>
        On va te bâtir un plan nutrition sur-mesure en moins d'une minute. D'abord, comment on t'appelle ?
      </Animated.Text>
      <Animated.View style={{ opacity: field, marginTop: Spacing.sm }}>
        {/* ⚠️ Le placeholder REPREND le libellé, il ne donne pas d'exemple. C'était
            « Kévin » — le prénom du fondateur, servi comme suggestion à tout le monde.
            Décision du 2026-08-12 : aucun prénom réel dans un champ vide. Même
            correction dans Profil → Prénom, qui portait le même. */}
        <Field t={t} label="Ton prénom" value={value} onChangeText={onChange} placeholder="Ton prénom" autoCapitalize="words" autoFocus />
      </Animated.View>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xs, paddingBottom: Spacing.sm },
    backBtn: { width: CIBLE_TACTILE_MIN, height: CIBLE_TACTILE_MIN, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: t.fill },
    track: { flex: 1, height: 4, backgroundColor: t.fill, borderRadius: 2, overflow: 'hidden' },
    fill: { height: 4, backgroundColor: t.accent, borderRadius: 2 },
    content: { padding: Spacing.xl, paddingTop: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
    block: { gap: Spacing.lg },
    title: { color: t.text, ...Type.h1 },
    sub: { ...Type.body, color: t.textSecondary, lineHeight: 21, marginTop: -Spacing.sm },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    daysRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'space-between' },
    dayCircle: { flex: 1, height: 52, borderRadius: Radius.button, borderWidth: Trait.fin, alignItems: 'center', justifyContent: 'center' },
    footer: { padding: Spacing.xl, paddingTop: Spacing.sm, backgroundColor: t.bg },
    hint: { ...Type.captionStrong, color: t.warning, lineHeight: 18, marginBottom: Spacing.md, textAlign: 'center' },
    mentions: { gap: Spacing.xs, marginTop: Spacing.md },
    disclaimer: { ...Type.micro, color: t.textTertiary, lineHeight: 16, textAlign: 'center' },
  });
}
