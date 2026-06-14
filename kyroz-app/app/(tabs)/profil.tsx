import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTheme, ThemePalette, Radius, Spacing, cardShadow } from '../../constants/theme';
import { DISCLAIMER } from '../../constants/legal';
import { CIQUAL_ATTRIBUTION } from '../../lib/foods';
import { Card, PrimaryButton, Chip, OptionCard, Field, SectionLabel, Segmented } from '../../components/ui';
import { Sheet } from '../../components/Sheet';
import { ActionSheet } from '../../components/ActionSheet';
import { StreakProgress } from '../../components/StreakProgress';
import { BodyFatPicker } from '../../components/BodyFatPicker';
import { MacroSplit } from '../../components/MacroSplit';
import { WeightCheckin } from '../../components/WeightCheckin';
import { useProfile } from '../../hooks/useProfile';
import { useStreak } from '../../hooks/useStreak';
import { useReminder } from '../../hooks/useReminder';
import { usePlanCheckin } from '../../hooks/usePlanCheckin';
import { useAuth } from '../../hooks/useAuth';
import { ReminderSlot, remindersSupported } from '../../lib/notifications';
import { deleteAccount, deleteCloudData } from '../../lib/sync';
import {
  calculateTDEE, calculateMacros, goalLabel, validateProfile, recalcProfile, macrosPercent, DEFAULT_CARB_RATIO, recommendedProteinPerKg,
} from '../../lib/tdee';
import {
  ActivityLevel, DietaryRestriction, Goal, MEAL_ORDER, MealEmphasis, MealType, Sex, SportSession, UserProfile, VarietyPreference,
} from '../../lib/types';
import { totalSessionsPerWeek } from '../../lib/sport';
import SportsEditor from '../../components/SportsEditor';

// ── Options ──────────────────────────────────────────────────────────────────
const GOALS: Goal[] = ['cut_aggressive', 'cut', 'recomp', 'maintain', 'lean_bulk', 'bulk'];
const RESTRICTIONS: { label: string; value: DietaryRestriction }[] = [
  { label: 'Végétarien', value: 'vegetarian' }, { label: 'Pescétarien', value: 'pescatarian' },
  { label: 'Sans porc', value: 'no_pork' }, { label: 'Sans lactose', value: 'lactose_free' },
  { label: 'Sans gluten', value: 'gluten_free' },
];
const PROTEINS = ['Poulet', 'Bœuf', 'Poisson', 'Œufs', 'Whey', 'Végétal'];
const DISLIKE_CHIPS = [
  { label: 'Saumon', kw: 'saumon' }, { label: 'Thon', kw: 'thon' }, { label: 'Œufs', kw: 'œuf' },
  { label: 'Brocolis', kw: 'brocolis' }, { label: 'Avocat', kw: 'avocat' }, { label: 'Quinoa', kw: 'quinoa' },
  { label: 'Patate douce', kw: 'patate douce' },
];
const PREP_OPTIONS = [10, 15, 20, 30];
const WEEKDAY_OPTS = [
  { label: 'Lun', val: 1 }, { label: 'Mar', val: 2 }, { label: 'Mer', val: 3 }, { label: 'Jeu', val: 4 },
  { label: 'Ven', val: 5 }, { label: 'Sam', val: 6 }, { label: 'Dim', val: 0 },
];
const VARIETY: { value: VarietyPreference; title: string; sub: string }[] = [
  { value: 'repetitive', title: 'Répétitif', sub: 'Souvent les mêmes plats' },
  { value: 'balanced', title: 'Équilibré', sub: 'Routine et variété' },
  { value: 'max', title: 'Variété max', sub: 'Le plus de diversité' },
];
const SEX_LABELS: Record<Sex, string> = { male: 'Homme', female: 'Femme' };
const VARIETY_LABELS: Record<VarietyPreference, string> = { repetitive: 'Répétitif', balanced: 'Équilibré', max: 'Variété max' };
const RESTRICTION_LABELS: Record<DietaryRestriction, string> = {
  vegetarian: 'Végétarien', pescatarian: 'Pescétarien', no_pork: 'Sans porc', lactose_free: 'Sans lactose', gluten_free: 'Sans gluten',
};

function activityFromDays(d: number): ActivityLevel {
  if (d <= 0) return 'sedentary'; if (d <= 2) return 'light'; if (d <= 4) return 'moderate'; if (d <= 6) return 'active'; return 'very_active';
}
function orderedWeekdays(sel: number[]): number[] {
  return WEEKDAY_OPTS.map((o) => o.val).filter((v) => sel.includes(v));
}
const MEAL_OPTS: { label: string; val: MealType }[] = [
  { label: 'Petit-déj', val: 'breakfast' }, { label: 'Déjeuner', val: 'lunch' },
  { label: 'Dîner', val: 'dinner' }, { label: 'Collation', val: 'snack' },
];
function orderedMeals(sel: MealType[]): MealType[] {
  return MEAL_ORDER.filter((m) => sel.includes(m));
}
const EMPHASIS_OPTS: { label: string; val: MealEmphasis }[] = [
  { label: 'Équilibré', val: 'even' }, { label: 'Plus le matin', val: 'breakfast' },
  { label: 'Plus le midi', val: 'lunch' }, { label: 'Plus le soir', val: 'dinner' },
];
const EMPHASIS_LABELS: Record<MealEmphasis, string> = {
  even: 'Équilibré', breakfast: 'Matin', lunch: 'Midi', dinner: 'Soir',
};
// Recalcule TDEE (toujours) et macros (si mode auto)
// Délègue à la source unique (lib/tdee) — même calcul partout (profil + check-in).
const withRecalc = recalcProfile;

type EditorKey = 'info' | 'sports' | 'goal' | 'macros' | 'prefs' | 'meals';

export default function ProfilScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const { profile, saveProfile, clearProfile } = useProfile();
  const { streak } = useStreak();
  const { slot, choose, busy } = useReminder();
  const { enabled: checkinEnabled, setEnabled: setCheckinEnabled } = usePlanCheckin();
  const { signOut } = useAuth();
  const router = useRouter();
  const [editor, setEditor] = useState<EditorKey | null>(null);
  const [weighIn, setWeighIn] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async (updated: UserProfile) => { await saveProfile(updated); setEditor(null); };

  // Déconnexion : couper la session NE redirige pas tout seul l'écran déjà monté
  // (expo-router ne re-route que l'index). On navigue donc explicitement vers le login.
  const doLogout = async () => { await signOut(); router.replace('/(auth)/login'); };

  // Droit à l'effacement (RGPD §12) : données serveur + locales + déconnexion.
  const doDelete = async () => {
    setDeleting(true);
    const res = await deleteAccount();          // supprime auth.users + cascade
    if (res.error) await deleteCloudData();     // repli : au moins effacer les données
    await signOut();
    await AsyncStorage.clear();
    await clearProfile();
    setDeleting(false);
    setConfirmDelete(false);
    router.replace('/(auth)/login');
  };

  if (!profile) return null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Streak — progression vers l'objectif 7 jours (North Star) */}
        <StreakProgress t={t} streak={streak} variant="card" />

        {/* Suivi du poids → recalcul auto des macros/plan */}
        <View style={[s.menu, cardShadow(t)]}>
          <MenuRow t={t} icon="trending-down-outline" label="Suivi du poids" value={`${profile.weight_kg} kg`} onPress={() => setWeighIn(true)} last />
        </View>

        {/* Macros cibles (affichage) */}
        <SectionLabel t={t}>MACROS CIBLES / JOUR</SectionLabel>
        <View style={s.grid}>
          <Box t={t} v={profile.target_kcal} l="kcal" />
          <Box t={t} v={profile.target_protein_g} l="Protéines" u="g" c={t.protein} />
          <Box t={t} v={profile.target_carbs_g} l="Glucides" u="g" c={t.carbs} />
          <Box t={t} v={profile.target_fat_g} l="Lipides" u="g" c={t.fat} />
        </View>

        {/* Réglages — édition par catégorie */}
        <SectionLabel t={t}>RÉGLAGES</SectionLabel>
        <View style={[s.menu, cardShadow(t)]}>
          <MenuRow t={t} icon="person-outline" label="Informations" value={`${SEX_LABELS[profile.sex]} · ${profile.age} ans · ${profile.weight_kg} kg${profile.body_fat_pct != null ? ` · ${profile.body_fat_pct}% MG` : ''}`} onPress={() => setEditor('info')} />
          <MenuRow t={t} icon="barbell-outline" label="Sports" value={profile.sports?.length ? `${profile.sports.length} sport${profile.sports.length > 1 ? 's' : ''}` : 'Aucun'} onPress={() => setEditor('sports')} />
          <MenuRow t={t} icon="flag-outline" label="Objectif" value={goalLabel(profile.goal)} onPress={() => setEditor('goal')} />
          <MenuRow t={t} icon="flame-outline" label="Calories & macros" value={profile.macro_mode === 'manual' ? 'Manuelles' : 'Calculées'} onPress={() => setEditor('macros')} />
          <MenuRow t={t} icon="restaurant-outline" label="Préférences alimentaires" value={profile.dietary_restrictions.length || profile.disliked_foods.length ? 'Personnalisées' : 'Aucune'} onPress={() => setEditor('prefs')} />
          <MenuRow t={t} icon="calendar-outline" label="Paramètres des repas" value={`${profile.plan_days} j · ${(profile.meals?.length || 4)} repas · ${EMPHASIS_LABELS[profile.meal_emphasis ?? 'even']}`} onPress={() => setEditor('meals')} last />
        </View>

        {/* TDEE */}
        <View style={[s.tdee, cardShadow(t)]}>
          <Text style={s.tdeeL}>TDEE (dépense énergétique)</Text>
          <Text style={s.tdeeV}>{profile.tdee_kcal} kcal</Text>
        </View>

        {/* Rappel quotidien (spec §5) — ramène l'utilisateur chaque jour */}
        <SectionLabel t={t}>RAPPEL QUOTIDIEN</SectionLabel>
        <Segmented<ReminderSlot>
          t={t}
          value={slot}
          onChange={async (v) => {
            if (busy) return;
            const ok = await choose(v);
            if (!ok && v !== 'off') {
              Alert.alert(
                remindersSupported ? 'Notifications désactivées' : 'Indisponible sur le web',
                remindersSupported
                  ? 'Active les notifications de Kyroz dans les réglages de ton téléphone pour recevoir le rappel.'
                  : 'Le rappel quotidien fonctionne sur l’app mobile (iOS/Android), pas dans le navigateur.',
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
        <Text style={s.reminderHint}>
          {slot === 'off'
            ? 'Un rappel par jour pour ne pas casser ta série.'
            : `Chaque jour à ${slot === 'morning' ? '8h00' : slot === 'midday' ? '12h00' : '18h30'}.`}
        </Text>

        {/* Propositions d'ajustement du plan (le check-in « ton plan te convient ? ») */}
        <SectionLabel t={t}>PROPOSITIONS D'AJUSTEMENT</SectionLabel>
        <Segmented<'on' | 'off'>
          t={t}
          value={checkinEnabled ? 'on' : 'off'}
          onChange={(v) => setCheckinEnabled(v === 'on')}
          options={[{ label: 'Activées', value: 'on' }, { label: 'Désactivées', value: 'off' }]}
        />
        <Text style={s.reminderHint}>
          {checkinEnabled
            ? 'On te demandera de temps en temps si ton plan te va, avec des ajustements en un tap.'
            : 'On ne te proposera plus d’ajuster ton plan.'}
        </Text>

        <TouchableOpacity style={s.logoutBtn} onPress={doLogout} activeOpacity={0.8}><Text style={s.logoutTxt}>Se déconnecter</Text></TouchableOpacity>
        <TouchableOpacity style={s.delBtn} onPress={() => setConfirmDelete(true)}><Text style={s.delTxt}>Supprimer mon compte</Text></TouchableOpacity>

        <Text style={s.disclaimer}>{DISCLAIMER}</Text>
        <Text style={s.disclaimer}>{CIQUAL_ATTRIBUTION}</Text>
      </ScrollView>

      {/* Feuilles d'édition */}
      <Sheet visible={editor !== null} onClose={() => setEditor(null)}>
        {editor === 'info' && <InfoEditor t={t} profile={profile} onSave={save} />}
        {editor === 'sports' && <SportsProfileEditor t={t} profile={profile} onSave={save} />}
        {editor === 'goal' && <GoalEditor t={t} profile={profile} onSave={save} />}
        {editor === 'macros' && <MacroEditor t={t} profile={profile} onSave={save} />}
        {editor === 'prefs' && <PrefEditor t={t} profile={profile} onSave={save} />}
        {editor === 'meals' && <MealsEditor t={t} profile={profile} onSave={save} />}
      </Sheet>

      {/* Suivi du poids */}
      <Sheet visible={weighIn} onClose={() => setWeighIn(false)}>
        <WeightCheckin t={t} onClose={() => setWeighIn(false)} />
      </Sheet>

      {/* Confirmation suppression de compte (RGPD) */}
      <ActionSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>Supprimer mon compte ?</Text>
        <Text style={{ color: t.textSecondary, fontSize: 15, lineHeight: 21 }}>
          Toutes tes données (profil, plans, streak, favoris, garde-manger) seront définitivement supprimées, sur cet appareil et sur le serveur.
        </Text>
        <View style={{ height: 6 }} />
        <TouchableOpacity onPress={doDelete} disabled={deleting} activeOpacity={0.85}
          style={{ backgroundColor: t.danger, borderRadius: Radius.md, paddingVertical: 17, alignItems: 'center', opacity: deleting ? 0.6 : 1 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>{deleting ? 'Suppression…' : 'Supprimer définitivement'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setConfirmDelete(false)} style={{ alignItems: 'center', paddingVertical: 6 }}>
          <Text style={{ color: t.textSecondary, fontSize: 15, fontWeight: '600' }}>Annuler</Text>
        </TouchableOpacity>
      </ActionSheet>
    </SafeAreaView>
  );
}

// ── Lignes / boîtes ──────────────────────────────────────────────────────────
function MenuRow({ t, icon, label, value, onPress, last }: { t: ThemePalette; icon: any; label: string; value: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 }, !last && { borderBottomWidth: 1, borderBottomColor: t.line }]}>
      <Ionicons name={icon} size={20} color={t.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: t.textTertiary, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.textQuaternary} />
    </TouchableOpacity>
  );
}

function Box({ t, v, l, u = '', c }: { t: ThemePalette; v: number; l: string; u?: string; c?: string }) {
  return (
    <View style={[{ flex: 1, backgroundColor: t.card, borderRadius: Radius.md, padding: 14, alignItems: 'center', gap: 4 }, cardShadow(t)]}>
      <Text style={{ fontSize: 19, fontWeight: '800', letterSpacing: -0.5, color: c ?? t.text }}>{v}{u}</Text>
      <Text style={{ fontSize: 10, color: t.textSecondary, textAlign: 'center' }}>{l}</Text>
    </View>
  );
}

// ── Coquille d'éditeur (en-tête + scroll + bouton) ───────────────────────────
function EditorShell({
  t, title, children, onSave, canSave = true, dragHandlers,
}: { t: ThemePalette; title: string; children: React.ReactNode; onSave: () => void; canSave?: boolean; dragHandlers?: any }) {
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingHorizontal: Spacing.xxl, paddingBottom: 8 }} {...(dragHandlers ?? {})}>
        <Text style={{ color: t.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: Spacing.xxl, paddingTop: 12, gap: 16 }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      <View style={{ padding: Spacing.xxl, paddingTop: 8, borderTopWidth: 1, borderTopColor: t.line }}>
        <PrimaryButton t={t} label="Enregistrer" onPress={onSave} disabled={!canSave} />
      </View>
    </View>
  );
}

type EditorProps = { t: ThemePalette; profile: UserProfile; onSave: (p: UserProfile) => void; dragHandlers?: any };

// ── Éditeurs ─────────────────────────────────────────────────────────────────
function InfoEditor({ t, profile, onSave, dragHandlers }: EditorProps) {
  const [sex, setSex] = useState<Sex>(profile.sex);
  const [age, setAge] = useState(String(profile.age));
  const [weight, setWeight] = useState(String(profile.weight_kg));
  const [height, setHeight] = useState(String(profile.height_cm));
  const [bodyFat, setBodyFat] = useState<number | undefined>(profile.body_fat_pct);
  const aN = parseInt(age), wN = parseFloat(weight), hN = parseFloat(height);
  const valid = aN >= 16 && aN <= 100 && wN >= 40 && wN <= 250 && hN >= 120 && hN <= 230;
  // Les sports vivent dans leur propre éditeur — on préserve `...profile` (donc
  // `sports`), et withRecalc recalcule le TDEE avec le nouveau poids/%MG.
  const submit = () => onSave(withRecalc({ ...profile, sex, age: aN, weight_kg: wN, height_cm: hN, body_fat_pct: bodyFat }));
  return (
    <EditorShell t={t} title="Informations" onSave={submit} canSave={valid} dragHandlers={dragHandlers}>
      <Segmented t={t} options={[{ label: 'Homme', value: 'male' }, { label: 'Femme', value: 'female' }]} value={sex} onChange={setSex} />
      <Field t={t} label="Âge" suffix="ans" value={age} onChangeText={setAge} keyboardType="number-pad" />
      <Field t={t} label="Poids" suffix="kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
      <Field t={t} label="Taille" suffix="cm" value={height} onChangeText={setHeight} keyboardType="number-pad" />
      <SectionLabel t={t}>Masse grasse (optionnel)</SectionLabel>
      <BodyFatPicker t={t} sex={sex} value={bodyFat} onChange={setBodyFat} />
    </EditorShell>
  );
}

function SportsProfileEditor({ t, profile, onSave, dragHandlers }: EditorProps) {
  const [sports, setSports] = useState<SportSession[]>(profile.sports ?? []);
  const trainingDaysEq = Math.min(totalSessionsPerWeek(sports), 7);
  const submit = () => onSave(withRecalc({ ...profile, sports, training_days_per_week: trainingDaysEq, activity_level: activityFromDays(trainingDaysEq) }));
  return (
    <EditorShell t={t} title="Sports" onSave={submit} dragHandlers={dragHandlers}>
      <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 4 }}>Tes sports servent à estimer tes calories dépensées. Plus c'est précis, plus ton plan l'est.</Text>
      <SportsEditor sports={sports} weight={profile.weight_kg} onChange={setSports} />
    </EditorShell>
  );
}

function GoalEditor({ t, profile, onSave, dragHandlers }: EditorProps) {
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const submit = () => onSave(withRecalc({ ...profile, goal }));
  return (
    <EditorShell t={t} title="Objectif" onSave={submit} dragHandlers={dragHandlers}>
      {GOALS.map((g) => <OptionCard key={g} t={t} title={goalLabel(g)} selected={goal === g} onPress={() => setGoal(g)} />)}
    </EditorShell>
  );
}

function MacroEditor({ t, profile, onSave, dragHandlers }: EditorProps) {
  // 'manual' (legacy) est ramené sur 'percent' : on ne propose plus les grammes fixes.
  const [mode, setMode] = useState<'auto' | 'percent'>(profile.macro_mode === 'auto' ? 'auto' : 'percent');
  const [carbRatio, setCarbRatio] = useState(profile.carb_ratio ?? DEFAULT_CARB_RATIO);
  const [proteinPerKg, setProteinPerKg] = useState(profile.protein_per_kg ?? recommendedProteinPerKg(profile.goal));

  const tdee = calculateTDEE(profile.sex, profile.weight_kg, profile.height_cm, profile.age, profile.training_days_per_week, profile.body_fat_pct, profile.sports);
  const auto = calculateMacros(tdee, profile.goal, profile.weight_kg, profile.sex, profile.body_fat_pct);

  const submit = () => {
    if (mode === 'auto') {
      onSave({ ...profile, macro_mode: 'auto', target_kcal: auto.target_kcal, target_protein_g: auto.protein_g, target_carbs_g: auto.carbs_g, target_fat_g: auto.fat_g });
    } else {
      const m = macrosPercent(tdee, profile.goal, profile.weight_kg, profile.sex, profile.body_fat_pct, carbRatio, proteinPerKg);
      const err = validateProfile(profile.sex, profile.age, m.target_kcal); // garde-fou §11
      if (err) { Alert.alert('Attention', err); return; }
      onSave({ ...profile, macro_mode: 'percent', carb_ratio: carbRatio, protein_per_kg: proteinPerKg, target_kcal: m.target_kcal, target_protein_g: m.protein_g, target_carbs_g: m.carbs_g, target_fat_g: m.fat_g });
    }
  };

  return (
    <EditorShell t={t} title="Calories & macros" onSave={submit} dragHandlers={dragHandlers}>
      <Segmented<'auto' | 'percent'> t={t} options={[{ label: 'Calculées', value: 'auto' }, { label: 'Perso %', value: 'percent' }]} value={mode} onChange={setMode} />
      {mode === 'auto' ? (
        <Card t={t} style={{ gap: 12 }}>
          <Row t={t} l="Objectif calorique" v={`${auto.target_kcal} kcal`} strong />
          <Row t={t} l="Protéines" v={`${auto.protein_g} g`} c={t.protein} />
          <Row t={t} l="Glucides" v={`${auto.carbs_g} g`} c={t.carbs} />
          <Row t={t} l="Lipides" v={`${auto.fat_g} g`} c={t.fat} />
        </Card>
      ) : (
        <MacroSplit
          t={t} tdee={tdee} goal={profile.goal} weight={profile.weight_kg} sex={profile.sex}
          bodyFat={profile.body_fat_pct} carbRatio={carbRatio} proteinPerKg={proteinPerKg}
          onCarbChange={setCarbRatio} onProteinChange={setProteinPerKg}
        />
      )}
    </EditorShell>
  );
}

function PrefEditor({ t, profile, onSave, dragHandlers }: EditorProps) {
  const [restrictions, setRestrictions] = useState<DietaryRestriction[]>(profile.dietary_restrictions);
  const [proteins, setProteins] = useState<string[]>(profile.preferred_proteins);
  const [dislikes, setDislikes] = useState<string[]>(profile.disliked_foods);
  const [maxPrep, setMaxPrep] = useState(profile.max_prep_time_min);
  const tog = <T,>(arr: T[], v: T, set: (x: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const submit = () => onSave({ ...profile, dietary_restrictions: restrictions, preferred_proteins: proteins, disliked_foods: dislikes, max_prep_time_min: maxPrep });
  return (
    <EditorShell t={t} title="Préférences" onSave={submit} dragHandlers={dragHandlers}>
      <SectionLabel t={t}>Régime</SectionLabel>
      <View style={styles.wrap}>{RESTRICTIONS.map((r) => <Chip key={r.value} t={t} label={r.label} selected={restrictions.includes(r.value)} onPress={() => tog(restrictions, r.value, setRestrictions)} />)}</View>
      <SectionLabel t={t}>Protéines préférées</SectionLabel>
      <View style={styles.wrap}>{PROTEINS.map((p) => <Chip key={p} t={t} label={p} selected={proteins.includes(p.toLowerCase())} onPress={() => tog(proteins, p.toLowerCase(), setProteins)} />)}</View>
      <SectionLabel t={t}>Aliments à éviter</SectionLabel>
      <View style={styles.wrap}>{DISLIKE_CHIPS.map((d) => <Chip key={d.kw} t={t} label={d.label} selected={dislikes.includes(d.kw)} onPress={() => tog(dislikes, d.kw, setDislikes)} />)}</View>
      <SectionLabel t={t}>Temps de prépa max</SectionLabel>
      <View style={styles.wrap}>{PREP_OPTIONS.map((p) => <Chip key={p} t={t} label={`${p} min`} selected={maxPrep === p} onPress={() => setMaxPrep(p)} />)}</View>
    </EditorShell>
  );
}

function MealsEditor({ t, profile, onSave, dragHandlers }: EditorProps) {
  const [weekdays, setWeekdays] = useState<number[]>(profile.plan_weekdays ?? [1, 2, 3, 4, 5, 6, 0]);
  const [meals, setMeals] = useState<MealType[]>(profile.meals ?? ['breakfast', 'lunch', 'dinner', 'snack']);
  const [emphasis, setEmphasis] = useState<MealEmphasis>(profile.meal_emphasis ?? 'even');
  const [variety, setVariety] = useState<VarietyPreference>(profile.variety);
  const togDay = (v: number) => setWeekdays((arr) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const togMeal = (v: MealType) => {
    const next = meals.includes(v) ? meals.filter((x) => x !== v) : [...meals, v];
    setMeals(next);
    if (emphasis !== 'even' && !next.includes(emphasis as MealType)) setEmphasis('even');
  };
  const emphasisOpts = EMPHASIS_OPTS.filter((e) => e.val === 'even' || meals.includes(e.val as MealType));
  const submit = () => onSave({ ...profile, plan_weekdays: orderedWeekdays(weekdays), plan_days: weekdays.length, meals: orderedMeals(meals), meal_emphasis: emphasis, variety });
  return (
    <EditorShell t={t} title="Paramètres des repas" onSave={submit} canSave={weekdays.length >= 1 && meals.length >= 1} dragHandlers={dragHandlers}>
      <SectionLabel t={t}>Jours du plan</SectionLabel>
      <View style={styles.wrap}>{WEEKDAY_OPTS.map((d) => <Chip key={d.val} t={t} label={d.label} selected={weekdays.includes(d.val)} onPress={() => togDay(d.val)} />)}</View>
      <SectionLabel t={t}>Repas inclus</SectionLabel>
      <View style={styles.wrap}>{MEAL_OPTS.map((m) => <Chip key={m.val} t={t} label={m.label} selected={meals.includes(m.val)} onPress={() => togMeal(m.val)} />)}</View>
      {meals.length === 0 && <Text style={{ color: t.danger, fontSize: 12 }}>Sélectionne au moins 1 repas.</Text>}
      <SectionLabel t={t}>Tu manges plus à quel moment ?</SectionLabel>
      <View style={styles.wrap}>{emphasisOpts.map((e) => <Chip key={e.val} t={t} label={e.label} selected={emphasis === e.val} onPress={() => setEmphasis(e.val)} />)}</View>
      <SectionLabel t={t}>Variété</SectionLabel>
      <View style={{ gap: 10 }}>{VARIETY.map((v) => <OptionCard key={v.value} t={t} title={v.title} subtitle={v.sub} selected={variety === v.value} onPress={() => setVariety(v.value)} />)}</View>
      <Text style={{ color: t.textTertiary, fontSize: 12, textAlign: 'center', lineHeight: 17 }}>
        Ton plan se met à jour automatiquement après enregistrement.
      </Text>
    </EditorShell>
  );
}

function Row({ t, l, v, c, strong }: { t: ThemePalette; l: string; v: string; c?: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: t.textSecondary, fontSize: 14 }}>{l}</Text>
      <Text style={{ color: c ?? t.text, fontSize: strong ? 18 : 15, fontWeight: '700' }}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    content: { padding: Spacing.xl, gap: 16, paddingBottom: 120 },
    grid: { flexDirection: 'row', gap: 8 },
    menu: { backgroundColor: t.card, borderRadius: Radius.lg, paddingHorizontal: Spacing.xl },
    tdee: { backgroundColor: t.card, borderRadius: Radius.md, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tdeeL: { color: t.textSecondary, fontSize: 13 },
    tdeeV: { color: t.text, fontSize: 16, fontWeight: '700' },
    reminderHint: { color: t.textTertiary, fontSize: 12, lineHeight: 16, marginTop: -8 },
    disclaimer: { color: t.textTertiary, fontSize: 11, lineHeight: 16, textAlign: 'center' },
    logoutBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 8, borderRadius: Radius.md, borderWidth: 1.5, borderColor: t.lineStrong },
    logoutTxt: { color: t.text, fontSize: 15, fontWeight: '700' },
    delBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
    delTxt: { color: t.danger, fontSize: 13 },
  });
}
