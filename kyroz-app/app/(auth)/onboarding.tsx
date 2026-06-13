import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing } from '../../constants/theme';
import { DISCLAIMER } from '../../constants/legal';
import {
  Card, PrimaryButton, Chip, OptionCard, Field, SectionLabel, Segmented,
} from '../../components/ui';
import { BodyFatPicker } from '../../components/BodyFatPicker';
import {
  ActivityLevel, DietaryRestriction, Goal, MEAL_ORDER, MealEmphasis, MealType, Sex, UserProfile, VarietyPreference,
} from '../../lib/types';
import {
  calculateTDEE, calculateMacros, validateProfile, goalLabel, macrosPercent, DEFAULT_CARB_RATIO, recommendedProteinPerKg,
} from '../../lib/tdee';
import { MacroSplit } from '../../components/MacroSplit';
import { useProfile } from '../../hooks/useProfile';
import { saveFirstName } from '../../lib/profileName';
import { useReminder } from '../../hooks/useReminder';
import { ReminderSlot, remindersSupported } from '../../lib/notifications';

const TOTAL_STEPS = 10;

const GOALS: { value: Goal; sub: string }[] = [
  { value: 'cut_aggressive', sub: 'Perdre du gras vite, déficit marqué' },
  { value: 'cut', sub: 'Perdre du gras en gardant le muscle' },
  { value: 'recomp', sub: 'Affiner et prendre du muscle en parallèle' },
  { value: 'maintain', sub: 'Stabiliser poids et composition' },
  { value: 'lean_bulk', sub: 'Prendre du muscle avec un surplus propre' },
  { value: 'bulk', sub: 'Maximiser la prise de masse' },
];

const TRAINING_OPTIONS = [
  { label: 'Aucune', days: 0 },
  { label: '1–2 / sem', days: 2 },
  { label: '3–4 / sem', days: 4 },
  { label: '5–6 / sem', days: 6 },
  { label: '7+ / sem', days: 7 },
];

const RESTRICTIONS: { label: string; value: DietaryRestriction }[] = [
  { label: 'Végétarien', value: 'vegetarian' },
  { label: 'Pescétarien', value: 'pescatarian' },
  { label: 'Sans porc', value: 'no_pork' },
  { label: 'Sans lactose', value: 'lactose_free' },
  { label: 'Sans gluten', value: 'gluten_free' },
];

const PROTEINS = ['Poulet', 'Bœuf', 'Poisson', 'Œufs', 'Whey', 'Végétal'];

const DISLIKE_CHIPS: { label: string; kw: string }[] = [
  { label: 'Saumon', kw: 'saumon' },
  { label: 'Thon', kw: 'thon' },
  { label: 'Œufs', kw: 'œuf' },
  { label: 'Brocolis', kw: 'brocolis' },
  { label: 'Avocat', kw: 'avocat' },
  { label: 'Quinoa', kw: 'quinoa' },
  { label: 'Patate douce', kw: 'patate douce' },
];

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
const EMPHASIS_OPTS: { label: string; val: MealEmphasis }[] = [
  { label: 'Équilibré', val: 'even' }, { label: 'Plus le matin', val: 'breakfast' },
  { label: 'Plus le midi', val: 'lunch' }, { label: 'Plus le soir', val: 'dinner' },
];

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
  const { slot: reminderSlot, choose: chooseReminder, busy: reminderBusy } = useReminder();

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
  const [trainingDays, setTrainingDays] = useState<number | null>(null); // rien coché par défaut → l'user choisit
  const [goal, setGoal] = useState<Goal>('cut');
  const [macroMode, setMacroMode] = useState<'auto' | 'percent'>('auto');
  const [carbRatio, setCarbRatio] = useState(DEFAULT_CARB_RATIO);
  const [proteinPerKg, setProteinPerKg] = useState(recommendedProteinPerKg('cut'));
  const [restrictions, setRestrictions] = useState<DietaryRestriction[]>([]);
  const [proteins, setProteins] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [maxPrep, setMaxPrep] = useState(15);
  const [variety, setVariety] = useState<VarietyPreference>('balanced');
  const [planWeekdays, setPlanWeekdays] = useState<number[]>([]); // rien coché par défaut → l'user sélectionne (noir = off, blanc = on)
  const [meals, setMeals] = useState<MealType[]>(['breakfast', 'lunch', 'dinner', 'snack']);
  const [emphasis, setEmphasis] = useState<MealEmphasis>('even');

  // La protéine conseillée dépend de l'objectif → on aligne le défaut quand il change.
  useEffect(() => { setProteinPerKg(recommendedProteinPerKg(goal)); }, [goal]);

  const ageN = parseInt(age), wN = parseFloat(weight), hN = parseFloat(height);
  // Étapes à validation requise (les autres sont libres) :
  const firstNameValid = firstName.trim().length > 0;                                    // étape 1 — prénom
  const basicsValid = ageN >= 16 && ageN <= 100 && wN >= 40 && wN <= 250 && hN >= 120 && hN <= 230; // étape 2 — infos
  const bodyFatValid = bodyFat != null;                                                   // étape 3 — masse grasse
  const trainingValid = trainingDays != null;                                             // étape 4 — activité
  const mealsValid = planWeekdays.length >= 1 && meals.length >= 1;                        // étape 9 — jours + repas
  const profileReady = basicsValid && bodyFatValid; // suffisant pour les calculs TDEE/macros

  const canProceed =
    (step === 1 && firstNameValid) ||
    (step === 2 && basicsValid) ||
    (step === 3 && bodyFatValid) ||
    (step === 4 && trainingValid) ||
    (step === 9 && mealsValid) ||
    ![1, 2, 3, 4, 9].includes(step);

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // Toggle d'un repas : si on retire le repas mis en avant, on remet « équilibré »
  const toggleMeal = (v: MealType) => {
    const next = meals.includes(v) ? meals.filter((x) => x !== v) : [...meals, v];
    setMeals(next);
    if (emphasis !== 'even' && !next.includes(emphasis as MealType)) setEmphasis('even');
  };
  // L'emphase n'est proposée que pour les repas réellement sélectionnés
  const emphasisOpts = EMPHASIS_OPTS.filter((e) => e.val === 'even' || meals.includes(e.val as MealType));

  // Calculs dérivés
  const tdee = profileReady ? calculateTDEE(sex, wN, hN, ageN, trainingDays ?? 0, bodyFat) : 0;
  const autoMacros = profileReady ? calculateMacros(tdee, goal, wN, sex, bodyFat) : { target_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  const finalMacros = macroMode === 'percent' && profileReady
    ? macrosPercent(tdee, goal, wN, sex, bodyFat, carbRatio, proteinPerKg)
    : autoMacros;

  // Pourquoi on ne peut pas avancer (message affiché au tap sur « Continuer »).
  const blockReason = (): string | null => {
    if (step === 1 && !firstNameValid) return 'Dis-nous comment t\'appeler pour commencer 🙂';
    if (step === 2 && !basicsValid) return 'Remplis ton âge, ton poids et ta taille pour continuer.';
    if (step === 3 && !bodyFatValid)
      return 'On a besoin de ta masse grasse pour te calculer le plan le plus juste possible — choisis la silhouette la plus proche de toi, ou saisis ton % si tu le connais.';
    if (step === 4 && !trainingValid) return 'Indique combien de fois par semaine tu t\'entraînes.';
    if (step === 9 && !mealsValid) return 'Choisis au moins un jour et un repas.';
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
    const err = validateProfile(sex, ageN, finalMacros.target_kcal);
    if (err) { Alert.alert('Attention', err); return; }
    setSaving(true);
    const profile: UserProfile = {
      id: `user-${Date.now()}`,
      sex, age: ageN, weight_kg: wN, height_cm: hN,
      body_fat_pct: bodyFat,
      activity_level: activityFromDays(trainingDays ?? 0),
      training_days_per_week: trainingDays ?? 0,
      goal,
      macro_mode: macroMode,
      carb_ratio: macroMode === 'percent' ? carbRatio : undefined,
      protein_per_kg: macroMode === 'percent' ? proteinPerKg : undefined,
      tdee_kcal: tdee,
      target_kcal: finalMacros.target_kcal,
      target_protein_g: finalMacros.protein_g,
      target_carbs_g: finalMacros.carbs_g,
      target_fat_g: finalMacros.fat_g,
      plan_days: planWeekdays.length,
      plan_weekdays: orderedWeekdays(planWeekdays),
      meals: orderedMeals(meals),
      meal_emphasis: emphasis,
      variety,
      dietary_restrictions: restrictions,
      disliked_foods: dislikes,
      preferred_proteins: proteins.map((p) => p.toLowerCase()),
      max_prep_time_min: maxPrep,
    };
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
            <Text style={s.sub}>Combien de séances de sport par semaine ?</Text>
            <View style={s.wrap}>
              {TRAINING_OPTIONS.map((o) => (
                <Chip key={o.days} t={t} label={o.label} selected={trainingDays === o.days} onPress={() => setTrainingDays(o.days)} />
              ))}
            </View>
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
            <Text style={s.title}>Tes macros</Text>
            <Text style={s.sub}>On les calcule pour toi, ou tu choisis ta répartition (les grammes suivent ton poids).</Text>
            <Segmented t={t} options={[{ label: 'Calculées', value: 'auto' }, { label: 'Perso %', value: 'percent' }]} value={macroMode} onChange={setMacroMode} />
            {macroMode === 'auto' ? (
              <Card t={t} style={{ gap: 12 }}>
                <RecapRow t={t} label="Objectif calorique" value={`${autoMacros.target_kcal} kcal`} strong />
                <Sep t={t} />
                <RecapRow t={t} label="Protéines" value={`${autoMacros.protein_g} g`} color={t.protein} />
                <RecapRow t={t} label="Glucides" value={`${autoMacros.carbs_g} g`} color={t.carbs} />
                <RecapRow t={t} label="Lipides" value={`${autoMacros.fat_g} g`} color={t.fat} />
              </Card>
            ) : (
              <MacroSplit
                t={t} tdee={tdee} goal={goal} weight={wN} sex={sex}
                bodyFat={bodyFat} carbRatio={carbRatio} proteinPerKg={proteinPerKg}
                onCarbChange={setCarbRatio} onProteinChange={setProteinPerKg}
              />
            )}
          </View>
        )}

        {step === 7 && (
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

            <SectionLabel t={t}>Aliments à éviter</SectionLabel>
            <View style={s.wrap}>
              {DISLIKE_CHIPS.map((d) => (
                <Chip key={d.kw} t={t} label={d.label} selected={dislikes.includes(d.kw)} onPress={() => toggle(dislikes, d.kw, setDislikes)} />
              ))}
            </View>

            <SectionLabel t={t}>Temps de prépa max</SectionLabel>
            <View style={s.wrap}>
              {PREP_OPTIONS.map((p) => (
                <Chip key={p} t={t} label={`${p} min`} selected={maxPrep === p} onPress={() => setMaxPrep(p)} />
              ))}
            </View>
          </View>
        )}

        {step === 8 && (
          <View style={s.block}>
            <Text style={s.title}>Variété des repas</Text>
            <Text style={s.sub}>Tu préfères la routine ou la diversité ?</Text>
            <View style={{ gap: 10 }}>
              {VARIETY.map((v) => (
                <OptionCard key={v.value} t={t} title={v.title} subtitle={v.sub} selected={variety === v.value} onPress={() => setVariety(v.value)} />
              ))}
            </View>
          </View>
        )}

        {step === 9 && (
          <View style={s.block}>
            <Text style={s.title}>Tes jours de plan</Text>
            <Text style={s.sub}>Choisis les jours où tu veux suivre ton plan.</Text>
            <View style={s.daysRow}>
              {WEEKDAY_OPTS.map((d) => {
                const on = planWeekdays.includes(d.val);
                return (
                  <TouchableOpacity key={d.val} onPress={() => toggle(planWeekdays, d.val, setPlanWeekdays)} activeOpacity={0.8}
                    style={[s.dayCircle, { backgroundColor: on ? t.accent : t.fill, borderColor: on ? t.accent : t.line }]}>
                    <Text style={{ color: on ? t.onAccent : t.textTertiary, fontWeight: '700', fontSize: 13 }}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[s.sub, { marginTop: -4 }]}>{planWeekdays.length} jour{planWeekdays.length > 1 ? 's' : ''} par semaine</Text>

            <SectionLabel t={t}>Repas inclus</SectionLabel>
            <View style={s.wrap}>
              {MEAL_OPTS.map((m) => (
                <Chip key={m.val} t={t} label={m.label} selected={meals.includes(m.val)} onPress={() => toggleMeal(m.val)} />
              ))}
            </View>
            {meals.length === 0 && <Text style={[s.sub, { marginTop: -4 }]}>Sélectionne au moins 1 repas.</Text>}

            <SectionLabel t={t}>Tu manges plus à quel moment ?</SectionLabel>
            <View style={s.wrap}>
              {emphasisOpts.map((e) => (
                <Chip key={e.val} t={t} label={e.label} selected={emphasis === e.val} onPress={() => setEmphasis(e.val)} />
              ))}
            </View>
          </View>
        )}

        {step === 10 && (
          <View style={s.block}>
            <Text style={s.title}>Ton plan nutritionnel</Text>
            <Text style={s.sub}>Voici ce qu'on a préparé pour toi.</Text>
            <Card t={t} style={{ gap: 12 }}>
              <RecapRow t={t} label="Objectif" value={goalLabel(goal)} />
              {bodyFat != null && <RecapRow t={t} label="Masse grasse" value={`${bodyFat} %`} />}
              <RecapRow t={t} label="Calories / jour" value={`${finalMacros.target_kcal} kcal`} strong />
              <Sep t={t} />
              <RecapRow t={t} label="Protéines" value={`${finalMacros.protein_g} g`} color={t.protein} />
              <RecapRow t={t} label="Glucides" value={`${finalMacros.carbs_g} g`} color={t.carbs} />
              <RecapRow t={t} label="Lipides" value={`${finalMacros.fat_g} g`} color={t.fat} />
              <Sep t={t} />
              <RecapRow t={t} label="Plan" value={`${planWeekdays.length} jours · ${meals.length} repas`} />
            </Card>

            {/* Rappel quotidien (spec §5) — proposé dès l'onboarding : c'est le levier
                #1 de rétention (revenir chaque jour = série 7 jours = North Star). */}
            <SectionLabel t={t}>UN RAPPEL CHAQUE JOUR ?</SectionLabel>
            <Text style={[s.sub, { marginTop: -8 }]}>
              Un petit coup de pouce quotidien pour consulter ton plan et ne pas casser ta série.
            </Text>
            <Segmented<ReminderSlot>
              t={t}
              value={reminderSlot}
              onChange={async (v) => {
                if (reminderBusy) return;
                const ok = await chooseReminder(v);
                if (!ok && v !== 'off') {
                  Alert.alert(
                    remindersSupported ? 'Notifications désactivées' : 'Indisponible sur le web',
                    remindersSupported
                      ? 'Active les notifications de Kyroz dans les réglages de ton téléphone pour recevoir le rappel.'
                      : 'Le rappel quotidien fonctionne sur l’app mobile (iOS/Android). Tu pourras l’activer là-bas.',
                  );
                }
              }}
              options={[
                { label: 'Aucun', value: 'off' },
                { label: 'Matin', value: 'morning' },
                { label: 'Midi', value: 'midday' },
                { label: 'Soir', value: 'evening' },
              ]}
            />
            <Text style={[s.sub, { marginTop: -8, fontSize: 12 }]}>
              {reminderSlot === 'off'
                ? 'Modifiable à tout moment dans ton profil.'
                : `Chaque jour à ${reminderSlot === 'morning' ? '8h00' : reminderSlot === 'midday' ? '12h00' : '18h30'}. Tu peux le changer dans ton profil.`}
            </Text>

            <Text style={s.disclaimer}>{DISCLAIMER}</Text>
          </View>
        )}
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

function RecapRow({ t, label, value, color, strong }: { t: ThemePalette; label: string; value: string; color?: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: t.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: color ?? t.text, fontSize: strong ? 18 : 15, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

function Sep({ t }: { t: ThemePalette }) {
  return <View style={{ height: 1, backgroundColor: t.line }} />;
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
