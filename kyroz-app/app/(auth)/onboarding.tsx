import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing } from '../../constants/theme';
import {
  PrimaryButton, Chip, OptionCard, Field, SectionLabel, Segmented,
} from '../../components/ui';
import { BodyFatPicker } from '../../components/BodyFatPicker';
import { DislikedFoodsField } from '../../components/DislikedFoodsField';
import {
  ActivityLevel, DietaryRestriction, Goal, MEAL_ORDER, MealType, Sex, SportSession, UserProfile, VarietyPreference,
} from '../../lib/types';
import {
  validateProfile, goalLabel, recalcProfile,
} from '../../lib/tdee';
import { totalSessionsPerWeek } from '../../lib/sport';
import SportsEditor from '../../components/SportsEditor';
import { useProfile } from '../../hooks/useProfile';
import { saveFirstName } from '../../lib/profileName';

const TOTAL_STEPS = 7;

const GOALS: { value: Goal; sub: string }[] = [
  { value: 'cut_aggressive', sub: 'Perdre du gras vite, déficit marqué' },
  { value: 'cut', sub: 'Perdre du gras en gardant le muscle' },
  { value: 'recomp', sub: 'Affiner et prendre du muscle en parallèle' },
  { value: 'maintain', sub: 'Stabiliser poids et composition' },
  { value: 'lean_bulk', sub: 'Prendre du muscle avec un surplus propre' },
  { value: 'bulk', sub: 'Maximiser la prise de masse' },
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

const PREP_OPTIONS = [10, 15, 20, 30];

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

// Repas sélectionnables + emphase
const MEAL_OPTS: { label: string; val: MealType }[] = [
  { label: 'Petit-déj', val: 'breakfast' }, { label: 'Déjeuner', val: 'lunch' },
  { label: 'Dîner', val: 'dinner' }, { label: 'Collation', val: 'snack' },
];
function orderedMeals(selected: MealType[]): MealType[] {
  return MEAL_ORDER.filter((m) => selected.includes(m));
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
  const router = useRouter();
  const { saveProfile } = useProfile();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState<string | null>(null); // message affiché si on tente d'avancer sans tout remplir

  // État formulaire
  const [firstName, setFirstName] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bodyFat, setBodyFat] = useState<number | undefined>(undefined);
  const [sports, setSports] = useState<SportSession[]>([]);
  const [noSport, setNoSport] = useState(false); // « je ne fais pas de sport » → calcul base seule
  const [goal, setGoal] = useState<Goal>('cut');
  const [restrictions, setRestrictions] = useState<DietaryRestriction[]>([]);
  const [proteins, setProteins] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [maxPrep, setMaxPrep] = useState(15);
  const [variety, setVariety] = useState<VarietyPreference>('balanced');
  const [planWeekdays, setPlanWeekdays] = useState<number[]>([]); // rien coché par défaut → l'user sélectionne (noir = off, blanc = on)
  const [restWeekdays, setRestWeekdays] = useState<number[]>([]);  // jours de repos (sous-ensemble des jours du plan) → carb-cycling
  const [meals, setMeals] = useState<MealType[]>(['breakfast', 'lunch', 'dinner', 'snack']);

  const ageN = parseInt(age), wN = parseFloat(weight), hN = parseFloat(height);
  // Étapes à validation requise (les autres sont libres) :
  const firstNameValid = firstName.trim().length > 0;                                    // étape 1 — prénom
  const basicsValid = ageN >= 16 && ageN <= 100 && wN >= 40 && wN <= 250 && hN >= 120 && hN <= 230; // étape 2 — infos
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

  // Toggle d'un jour du plan : le retirer le retire aussi des jours de repos
  // (un jour de repos doit rester un jour planifié).
  const togglePlanDay = (v: number) => {
    const removing = planWeekdays.includes(v);
    setPlanWeekdays((arr) => removing ? arr.filter((x) => x !== v) : [...arr, v]);
    if (removing) setRestWeekdays((arr) => arr.filter((x) => x !== v));
  };
  const toggleRestDay = (v: number) =>
    setRestWeekdays((arr) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // Les macros (auto) sont calculées par recalcProfile au finish ; plus de calcul
  // en ligne ici depuis la suppression de l'étape récap (le reveal du 1er plan les affiche).

  // Pourquoi on ne peut pas avancer (message affiché au tap sur « Continuer »).
  const blockReason = (): string | null => {
    if (step === 1 && !firstNameValid) return 'Dis-nous comment t\'appeler pour commencer 🙂';
    if (step === 2 && !basicsValid) return 'Remplis ton âge, ton poids et ta taille pour continuer.';
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
      sex, age: ageN, weight_kg: wN, height_cm: hN,
      body_fat_pct: bodyFat,
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
      meals: orderedMeals(meals),
      meal_emphasis: 'even',
      variety,
      fixed_meals: undefined,
      dietary_restrictions: restrictions,
      disliked_foods: dislikes,
      preferred_proteins: proteins.map((p) => p.toLowerCase()),
      max_prep_time_min: maxPrep,
    };
    const profile = recalcProfile(draft); // ← source unique du TDEE et des macros
    const err = validateProfile(sex, ageN, profile.target_kcal);
    if (err) { Alert.alert('Attention', err); return; }
    setSaving(true);
    await saveFirstName(firstName);
    await saveProfile(profile);
    setSaving(false);
    router.replace('/(tabs)/plan');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />

      {/* Header : retour + progression */}
      <View style={s.header}>
        <TouchableOpacity onPress={back} disabled={step === 1} style={[s.backBtn, step === 1 && { opacity: 0 }]}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </TouchableOpacity>
        <View style={s.track}><View style={[s.fill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} /></View>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step > 1 && <SectionLabel t={t}>ÉTAPE {step - 1} / {TOTAL_STEPS - 1}</SectionLabel>}

        {step === 1 && <NameStep t={t} value={firstName} onChange={setFirstName} />}

        {step === 2 && (
          <View style={s.block}>
            <Text style={s.title}>Tes infos de base</Text>
            <Text style={s.sub}>Pour calculer ton métabolisme et tes macros au plus juste.</Text>
            <Segmented t={t} options={[{ label: 'Homme', value: 'male' }, { label: 'Femme', value: 'female' }]} value={sex} onChange={setSex} />
            <Field t={t} label="Âge" suffix="ans" value={age} onChangeText={setAge} placeholder="25" keyboardType="number-pad" />
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
            <BodyFatPicker t={t} sex={sex} value={bodyFat} onChange={setBodyFat} />
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
            <View style={{ gap: 10 }}>
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

            <SectionLabel t={t}>Temps de prépa max</SectionLabel>
            <View style={s.wrap}>
              {PREP_OPTIONS.map((p) => (
                <Chip key={p} t={t} label={`${p} min`} selected={maxPrep === p} onPress={() => setMaxPrep(p)} />
              ))}
            </View>

            <SectionLabel t={t}>Variété des repas</SectionLabel>
            <Text style={[s.sub, { marginTop: -4 }]}>Tu préfères la routine ou la diversité ?</Text>
            <View style={{ gap: 10 }}>
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
                  <TouchableOpacity key={d.val} onPress={() => togglePlanDay(d.val)} activeOpacity={0.8}
                    style={[s.dayCircle, { backgroundColor: on ? t.accent : t.fill, borderColor: on ? t.accent : t.line }]}>
                    <Text style={{ color: on ? t.onAccent : t.textTertiary, fontWeight: '700', fontSize: 13 }}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[s.sub, { marginTop: -4 }]}>{planWeekdays.length} jour{planWeekdays.length > 1 ? 's' : ''} par semaine</Text>

            {/* Jours de repos = sous-ensemble des jours du plan → carb-cycling. */}
            <SectionLabel t={t}>Jours de repos</SectionLabel>
            <Text style={[s.sub, { marginTop: -8, fontSize: 12 }]}>
              Tes jours sans entraînement : Kyroz baisse un peu les glucides et monte les lipides (mêmes calories) et privilégie les recettes « récup ».
            </Text>
            <View style={s.wrap}>
              {(planWeekdays.length ? WEEKDAY_OPTS.filter((o) => planWeekdays.includes(o.val)) : []).map((d) => (
                <Chip key={d.val} t={t} label={d.label} selected={restWeekdays.includes(d.val)} onPress={() => toggleRestDay(d.val)} />
              ))}
            </View>
            {planWeekdays.length === 0 && (
              <Text style={[s.sub, { marginTop: -4, fontSize: 12 }]}>Choisis d'abord tes jours de plan ci-dessus.</Text>
            )}

            <SectionLabel t={t}>Repas inclus</SectionLabel>
            <View style={s.wrap}>
              {MEAL_OPTS.map((m) => (
                <Chip key={m.val} t={t} label={m.label} selected={meals.includes(m.val)} onPress={() => toggleMeal(m.val)} />
              ))}
            </View>
            {meals.length === 0 && <Text style={[s.sub, { marginTop: -4 }]}>Sélectionne au moins 1 repas.</Text>}
          </View>
        )}
        {/* L'étape « récap » a été supprimée (2026-06-20) : le récap + le rappel
            quotidien + le disclaimer vivent désormais dans le reveal du 1er plan
            (components/FirstPlanReveal.tsx), affiché à l'arrivée sur l'écran Plan. */}
      </ScrollView>

      <View style={s.footer}>
        {hint && !canProceed && <Text style={s.hint}>{hint}</Text>}
        <PrimaryButton t={t} label={step === TOTAL_STEPS ? 'Générer mon plan' : 'Continuer'} onPress={next} loading={saving} />
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

  return (
    <View style={{ paddingTop: 36, gap: 14 }}>
      <Animated.Text style={[{ fontSize: 44 }, enter]}>👋</Animated.Text>
      <Animated.Text style={[{ color: t.text, fontSize: 32, fontWeight: '800', letterSpacing: -1, lineHeight: 38 }, enter]}>
        Bienvenue sur Kyroz
      </Animated.Text>
      <Animated.Text style={[{ color: t.textSecondary, fontSize: 16, lineHeight: 23 }, enter]}>
        On va te bâtir un plan nutrition sur-mesure en moins d'une minute. D'abord, comment on t'appelle ?
      </Animated.Text>
      <Animated.View style={{ opacity: field, marginTop: 8 }}>
        <Field t={t} label="Ton prénom" value={value} onChangeText={onChange} placeholder="Kévin" autoCapitalize="words" autoFocus />
      </Animated.View>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.xl, paddingTop: 4, paddingBottom: 8 },
    backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.fill },
    track: { flex: 1, height: 4, backgroundColor: t.fill, borderRadius: 2, overflow: 'hidden' },
    fill: { height: 4, backgroundColor: t.accent, borderRadius: 2 },
    content: { padding: Spacing.xl, paddingTop: Spacing.lg, gap: 16, paddingBottom: 24 },
    block: { gap: 16 },
    title: { color: t.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
    sub: { color: t.textSecondary, fontSize: 15, lineHeight: 21, marginTop: -8 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    daysRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
    dayCircle: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    footer: { padding: Spacing.xl, paddingTop: 8, backgroundColor: t.bg, borderTopWidth: 1, borderTopColor: t.line },
    hint: { color: t.warning, fontSize: 13, lineHeight: 18, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
    disclaimer: { color: t.textTertiary, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 4 },
  });
}
