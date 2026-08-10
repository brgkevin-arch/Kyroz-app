import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing, Radius, Type, CIBLE_TACTILE_MIN, Trait, Icone, OPACITE_PRESSION } from '../../constants/theme';
import { useLayout } from '../../constants/layout';
import {
  PrimaryButton, Chip, OptionCard, Field, SectionLabel, Segmented,
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
  ActivityLevel, BodyFatSource, DietaryRestriction, Goal, MealSlot, MealType, Sex, SportSession, UserProfile, VarietyPreference,
} from '../../lib/types';
import { MealSlotsPicker } from '../../components/MealSlotsPicker';
import { knownSlots } from '../../lib/mealSlots';
import {
  validateProfile, goalLabel, recalcProfile,
} from '../../lib/tdee';
import { totalSessionsPerWeek } from '../../lib/sport';
import { deducedRestWeekdays } from '../../lib/planEngine';
import SportsEditor from '../../components/SportsEditor';
import { useProfile } from '../../hooks/useProfile';
import { saveFirstName } from '../../lib/profileName';
import { capture, Events } from '../../lib/analytics';
import { useAnalyticsConsent } from '../../hooks/useAnalyticsConsent';
import HealthScreening from '../../components/HealthScreening';
import AnalyticsConsentStep from '../../components/AnalyticsConsentStep';
import { hasPassedScreening } from '../../lib/healthScreening';

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
const GOALS: { value: Goal; sub: string }[] = [
  { value: 'cut', sub: 'Perdre du gras en gardant le muscle' },
  { value: 'recomp', sub: 'Affiner et prendre du muscle en parallèle' },
  { value: 'maintain', sub: 'Stabiliser poids et composition' },
  { value: 'lean_bulk', sub: 'Prendre du muscle avec un surplus propre' },
];

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

  // Dépistage santé bloquant (CLAUDE.md §6). null = flag pas encore lu ; false =
  // à faire (on affiche le portail avant l'assistant) ; true = passé.
  const [screened, setScreened] = useState<boolean | null>(null);
  useEffect(() => { hasPassedScreening().then(setScreened); }, []);

  // Consentement aux statistiques d'usage. `undefined` = en cours de lecture ;
  // `null` = pas encore répondu → l'écran de consentement remplace l'assistant.
  const { consent, choose: chooseConsent } = useAnalyticsConsent();

  // 🔴 `onboarding_started` NE PEUT PAS partir au montage, et ce n'est pas un détail
  // de placement. Au montage, la question du consentement n'a pas encore été posée :
  // `capture` sortirait à sa première ligne et l'event serait perdu pour tout le
  // monde, y compris pour ceux qui acceptent trois secondes plus tard. Il part donc
  // quand l'assistant DÉMARRE vraiment — dépistage passé et consentement répondu.
  const tunnelOuvert = useRef(false);
  useEffect(() => {
    if (screened !== true || consent === undefined || consent === null) return;
    if (tunnelOuvert.current) return;
    tunnelOuvert.current = true;
    capture(Events.onboardingStarted);
  }, [screened, consent]);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState<string | null>(null); // message affiché si on tente d'avancer sans tout remplir

  // D1 : l'étape ATTEINTE. C'est la seule mesure qui dise OÙ l'assistant fait
  // abandonner — `onboarding_completed` seul ne compte que ceux qui sont allés au
  // bout, donc il ne peut rien dire de ceux qui partent. Même garde que ci-dessus :
  // rien ne part tant que l'assistant n'est pas réellement à l'écran.
  const assistantActif = screened === true && consent !== undefined && consent !== null;
  useEffect(() => {
    if (!assistantActif) return;
    capture(Events.onboardingStepViewed, { step });
  }, [step, assistantActif]);

  // État formulaire
  const [firstName, setFirstName] = useState('');
  const [sex, setSex] = useState<Sex>('male');
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
  const [variety, setVariety] = useState<VarietyPreference>('balanced');
  const [planWeekdays, setPlanWeekdays] = useState<number[]>([]); // rien coché par défaut → l'user sélectionne (noir = off, blanc = on)
  const [restWeekdays, setRestWeekdays] = useState<number[]>([]);  // jours de repos (sous-ensemble des jours du plan) → cyclage
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
    ageN >= AGE_BOUNDS[0] && ageN <= AGE_BOUNDS[1] &&
    wN >= WEIGHT_BOUNDS[0] && wN <= WEIGHT_BOUNDS[1] &&
    hN >= HEIGHT_BOUNDS[0] && hN <= HEIGHT_BOUNDS[1]; // étape 2 — infos
  const bodyFatValid = bodyFat != null;                                                   // étape 3 — masse grasse
  const trainingValid = noSport || sports.length >= 1;                                     // étape 4 — activité (sports ou « aucun »)
  const trainingDaysEq = noSport ? 0 : Math.min(totalSessionsPerWeek(sports), 7);          // repli legacy (activity_level / training_days)
  const mealsValid = planWeekdays.length >= 1 && meals.length >= 1;                        // étape 7 — jours + repas
  const profileReady = basicsValid && bodyFatValid; // suffisant pour les calculs TDEE/macros

  const canProceed =
    (step === 1 && firstNameValid) ||
    (step === 2 && basicsValid) ||
    (step === 3 && bodyFatValid) ||
    (step === 4 && trainingValid) ||
    (step === 7 && mealsValid) ||
    ![1, 2, 3, 4, 7].includes(step);

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

  // Toggle d'un jour du plan : le retirer le retire aussi des jours de repos
  // (un jour de repos doit rester un jour planifié).
  const togglePlanDay = (v: number) => {
    const removing = planWeekdays.includes(v);
    setPlanWeekdays((arr) => removing ? arr.filter((x) => x !== v) : [...arr, v]);
    if (removing) setRestWeekdays((arr) => arr.filter((x) => x !== v));
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
  useEffect(() => {
    if (restTouched) return;
    const ordered = orderedWeekdays(planWeekdays);
    if (!ordered.length) { setRestWeekdays([]); return; }
    setRestWeekdays(deducedRestWeekdays(ordered, trainingDaysEq));
  }, [planWeekdays, trainingDaysEq, restTouched]);

  // Les macros (auto) sont calculées par recalcProfile au finish ; plus de calcul
  // en ligne ici depuis la suppression de l'étape récap (le reveal du 1er plan les affiche).

  // Pourquoi on ne peut pas avancer (message affiché au tap sur « Continuer »).
  const blockReason = (): string | null => {
    if (step === 1 && !firstNameValid) return 'Dis-nous comment t\'appeler pour commencer';
    if (step === 2 && !basicsValid) {
      if (ageN >= 1 && ageN < AGE_BOUNDS[0]) return `Kyroz est réservé aux ${AGE_BOUNDS[0]} ans et plus.`;
      return 'Remplis ta date de naissance, ton poids et ta taille pour continuer.';
    }
    if (step === 3 && !bodyFatValid)
      return 'On a besoin de ta masse grasse pour te calculer le plan le plus juste possible — choisis la silhouette la plus proche de toi, ou saisis ton % si tu le connais.';
    if (step === 4 && !trainingValid) return 'Choisis au moins un sport, ou indique que tu n\'en fais pas.';
    if (step === 7 && !mealsValid) return 'Choisis au moins un jour et un repas.';
    return null;
  };

  const next = () => {
    if (saving) return;
    if (!canProceed) { setHint(blockReason()); return; }
    setHint(null);
    if (step < TOTAL_STEPS) setStep(step + 1);
    else finish();
  };
  const back = () => { if (step > 1) { setHint(null); setStep(step - 1); } };

  const finish = async () => {
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
      sports: noSport ? [] : sports,
      goal,
      macro_mode: 'auto', // onboarding = macros calculées ; le mode « perso % » se règle dans le profil
      tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
      plan_days: planWeekdays.length,
      plan_weekdays: orderedWeekdays(planWeekdays),
      // Jours de repos choisis (sous-ensemble des jours du plan) → carb-cycling.
      // On filtre par sécurité contre planWeekdays. Repas fixes + emphase se règlent
      // dans le profil (MealsEditor) ; l'onboarding pose les valeurs neutres.
      rest_weekdays: orderedWeekdays(restWeekdays.filter((d) => planWeekdays.includes(d))),
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
    // et l'allaitement sont déjà bloqués en amont par le portail de dépistage santé
    // (lib/healthScreening.ts) — on ne duplique pas le champ dans le profil.
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

  // Portail de dépistage santé : tant qu'il n'est pas passé, il remplace l'assistant.
  // (Placé APRÈS tous les hooks → règles React respectées.)
  if (screened === null) return null; // lecture du flag (AsyncStorage, quasi instantané)
  if (!screened) return <HealthScreening onPass={() => setScreened(true)} />;

  // Consentement analytics — APRÈS le dépistage, AVANT la première question du profil.
  // L'ordre n'est pas cosmétique : le dépistage décide si Kyroz a le droit de servir un
  // plan (§6), le consentement décide seulement si on a le droit de MESURER. Poser le
  // second en premier ferait passer une question de confort avant une question de
  // sécurité. Et le poser plus tard supprimerait D1 (cf. AnalyticsConsentStep).
  if (consent === undefined) return null; // lecture du stockage, quasi instantané
  if (consent === null) return <AnalyticsConsentStep onChoose={chooseConsent} />;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />

      {/* Header : retour + progression */}
      <View style={[s.header, layout.header]}>
        <TouchableOpacity onPress={back} disabled={step === 1} style={[s.backBtn, step === 1 && { opacity: 0 }]}>
          <Ionicons name="chevron-back" size={Icone.action} color={t.text} />
        </TouchableOpacity>
        <View style={s.track}><View style={[s.fill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} /></View>
      </View>

      <ScrollView contentContainerStyle={[s.content, layout.content]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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

        {step === 3 && (
          <View style={s.block}>
            <Text style={s.title}>Ta masse grasse</Text>
            <Text style={s.sub}>
              Indispensable pour un plan vraiment adapté : deux personnes du même poids n'ont pas les mêmes besoins. Choisis la silhouette la plus proche de toi, ou saisis ton % si tu le connais.
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
            <Text style={s.sub}>Quels sports pratiques-tu, et à quelle fréquence ? On en déduit tes calories dépensées pour un plan plus juste.</Text>
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
                <OptionCard key={g.value} t={t} title={goalLabel(g.value)} subtitle={g.sub} selected={goal === g.value} onPress={() => setGoal(g.value)} />
              ))}
            </View>
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
            <Text style={s.title}>Tes jours de plan</Text>
            <Text style={s.sub}>Choisis les jours où tu veux suivre ton plan.</Text>
            <View style={s.daysRow}>
              {WEEKDAY_OPTS.map((d) => {
                const on = planWeekdays.includes(d.val);
                return (
                  <TouchableOpacity key={d.val} onPress={() => togglePlanDay(d.val)} activeOpacity={OPACITE_PRESSION}
                    style={[s.dayCircle, { backgroundColor: on ? t.accent : t.fill, borderColor: on ? t.accent : t.line }]}>
                    <Text style={{ ...Type.captionStrong, color: on ? t.onAccent : t.textTertiary }}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[s.sub, { marginTop: -Spacing.xs }]}>{planWeekdays.length} jour{planWeekdays.length > 1 ? 's' : ''} par semaine</Text>

            {/* Jours de repos = sous-ensemble des jours du plan → carb-cycling. */}
            <SectionLabel t={t}>Jours de repos</SectionLabel>
            {/* ⚠️ Ce texte promettait deux choses fausses — « (mêmes calories) », plus
                vrai depuis la répartition par volume, et « recettes récup », plus vrai
                depuis la suppression du tag `rest_day_ok` le 2026-08-03. Le STYLE vient
                de la passe de DA, le TEXTE du correctif moteur : deux axes, pas deux
                versions. */}
            <Text style={[s.sub, { ...Type.caption, marginTop: -Spacing.sm }]}>
              Tes jours sans entraînement : Kyroz y sert un peu moins de calories et de glucides, et reporte la différence sur tes jours d'entraînement. Tes protéines ne bougent pas, et ta semaine garde son total.
            </Text>
            <View style={s.wrap}>
              {(planWeekdays.length ? WEEKDAY_OPTS.filter((o) => planWeekdays.includes(o.val)) : []).map((d) => (
                <Chip key={d.val} t={t} label={d.label} selected={restWeekdays.includes(d.val)} onPress={() => toggleRestDay(d.val)} />
              ))}
              {planWeekdays.length > 0 && (
                <Chip t={t} label="Aucun" selected={restWeekdays.length === 0} onPress={setNoRestDay} />
              )}
            </View>
            {planWeekdays.length === 0 && (
              <Text style={[s.sub, { ...Type.caption, marginTop: -Spacing.xs }]}>Choisis d'abord tes jours de plan ci-dessus.</Text>
            )}

            <SectionLabel t={t}>Repas inclus</SectionLabel>
            <Text style={[s.sub, { ...Type.caption, marginTop: -Spacing.sm }]}>
              Coche ce que tu manges dans une journée. Tu en fais plus de quatre ? Ajoute
              tes propres repas — Kyroz répartit ton budget sur tous.
            </Text>
            <MealSlotsPicker
              t={t} customSlots={customSlots} selected={meals}
              onToggle={toggleMeal} onSaveSlot={saveSlot} onDeleteSlot={deleteSlot}
            />
            {meals.length === 0 && <Text style={[s.sub, { marginTop: -Spacing.xs }]}>Sélectionne au moins 1 repas.</Text>}
          </View>
        )}
        {/* L'étape « récap » a été supprimée (2026-06-20) : le récap + le rappel
            quotidien + le disclaimer vivent désormais dans le reveal du 1er plan
            (components/FirstPlanReveal.tsx), affiché à l'arrivée sur l'écran Plan. */}
      </ScrollView>

      <View style={[s.footer, layout.header]}>
        {hint && !canProceed && <Text style={s.hint}>{hint}</Text>}
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
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(lift, { toValue: 0, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(field, { toValue: 1, duration: 500, delay: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
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
        <Field t={t} label="Ton prénom" value={value} onChangeText={onChange} placeholder="Kévin" autoCapitalize="words" autoFocus />
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
    disclaimer: { ...Type.micro, color: t.textTertiary, lineHeight: 16, textAlign: 'center', marginTop: Spacing.xs },
  });
}
