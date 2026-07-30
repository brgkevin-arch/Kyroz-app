import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme, ThemePalette, Radius, Spacing, cardShadow } from '../../constants/theme';
import { ThemeMode, useThemeMode, setThemeMode } from '../../lib/themeMode';
import { DISCLAIMER } from '../../constants/legal';
import { CIQUAL_ATTRIBUTION } from '../../lib/foods';
import { Card, PrimaryButton, Chip, OptionCard, Field, SectionLabel, Segmented } from '../../components/ui';
import { bankedDailyTargets, offsetsForPlan } from '../../lib/calorieBank';
import { Sheet } from '../../components/Sheet';
import { ActionSheet } from '../../components/ActionSheet';
import { StreakProgress } from '../../components/StreakProgress';
import { BodyFatPicker } from '../../components/BodyFatPicker';
import { DislikedFoodsField } from '../../components/DislikedFoodsField';
import { MacroSplit } from '../../components/MacroSplit';
import { WeightCheckin } from '../../components/WeightCheckin';
import { useHydrationEnabled } from '../../components/HydrationBar';
import { useAnalyticsConsent } from '../../hooks/useAnalyticsConsent';
import { useProfile } from '../../hooks/useProfile';
import { useStreak } from '../../hooks/useStreak';
import { useReminder } from '../../hooks/useReminder';
import { usePlanCheckin } from '../../hooks/usePlanCheckin';
import { useAuth } from '../../hooks/useAuth';
import { ReminderSlot, remindersSupported } from '../../lib/notifications';
import { deleteAccount, deleteCloudData } from '../../lib/sync';
import { exportMyData } from '../../lib/exportData';
import {
  calculateTDEE, computePlan, goalLabel, planFlags, validateProfile, recalcProfile, DEFAULT_CARB_RATIO, recommendedProteinPerKg,
  DEFAULT_NEAT_LEVEL, NEAT_ORDER, NEAT_LABEL, NEAT_HINT, NEAT_SHORT, dismissEngineNotice,
  bankFloorKcal,
} from '../../lib/tdee';
import {
  lowEaWeeksForFloor, checkEligibility, eligibilityMessage, LowEaEscalation,
  AGE_BOUNDS, WEIGHT_BOUNDS, HEIGHT_BOUNDS,
} from '../../lib/safety';
import { datedGoalStatus, datedGoalKcalDelta, addDaysStamp, daysBetween } from '../../lib/datedGoal';
import { DatedGoalCard, formatFR } from '../../components/DatedGoalCard';
import { todayStamp } from '../../lib/weight';
import {
  ActivityLevel, DietaryRestriction, EngineNotice, FixedMeals, Goal, GoalTarget, MEAL_ORDER, MealEmphasis, MealType, NeatLevel, Sex, SportSession, UserProfile, VarietyPreference,
} from '../../lib/types';
import { totalSessionsPerWeek } from '../../lib/sport';
import { restDaySet } from '../../lib/planEngine';
import { getRecipeById } from '../../lib/recipes';
import SportsEditor from '../../components/SportsEditor';
import { FixedMealSheet } from '../../components/FixedMealSheet';

// ── Options ──────────────────────────────────────────────────────────────────
// `cut_aggressive` retiré le 2026-07-29 (cf. lib/syncGuard.ts::normalizeGoal) : il
// servait le même plan que `cut`. La vitesse se pilote par l'objectif daté.
const GOALS: Goal[] = ['cut', 'recomp', 'maintain', 'lean_bulk', 'bulk'];
const CUT_GOALS: Goal[] = ['cut', 'recomp'];
const RESTRICTIONS: { label: string; value: DietaryRestriction }[] = [
  { label: 'Végétarien', value: 'vegetarian' }, { label: 'Vegan', value: 'vegan' },
  { label: 'Pescétarien', value: 'pescatarian' }, { label: 'Halal', value: 'halal' },
  { label: 'Sans porc', value: 'no_pork' }, { label: 'Sans lactose', value: 'lactose_free' },
  { label: 'Sans gluten', value: 'gluten_free' },
];
const PROTEINS = ['Poulet', 'Bœuf', 'Poisson', 'Œufs', 'Whey', 'Végétal'];
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
  vegetarian: 'Végétarien', vegan: 'Vegan', pescatarian: 'Pescétarien', halal: 'Halal', no_pork: 'Sans porc', lactose_free: 'Sans lactose', gluten_free: 'Sans gluten',
};

function activityFromDays(d: number): ActivityLevel {
  if (d <= 0) return 'sedentary'; if (d <= 2) return 'light'; if (d <= 4) return 'moderate'; if (d <= 6) return 'active'; return 'very_active';
}
function orderedWeekdays(sel: number[]): number[] {
  return WEEKDAY_OPTS.map((o) => o.val).filter((v) => sel.includes(v));
}
// Jours de repos pré-cochés à l'ouverture d'un éditeur : choix explicite de l'user
// (rest_weekdays) si présent, sinon mapping des jours de repos AUTO (déduits du nb
// d'entraînements) sur les jours de semaine du plan → enregistrer sans rien changer
// ne modifie pas le plan.
function effectiveRestWeekdays(profile: UserProfile): number[] {
  if (Array.isArray(profile.rest_weekdays)) return orderedWeekdays(profile.rest_weekdays);
  const wd = profile.plan_weekdays ?? [];
  const days = wd.length || Math.min(Math.max(profile.plan_days ?? 7, 1), 7);
  const idx = restDaySet(days, profile.training_days_per_week); // index 1..days
  return orderedWeekdays([...idx].map((d) => wd[d - 1]).filter((v): v is number => v !== undefined));
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

type EditorKey = 'info' | 'sports' | 'goal' | 'dated_goal' | 'macros' | 'prefs' | 'meals' | 'calorie_bank';

// Objectif daté : horizons proposés (semaines) — évite un date-picker (lourd sur
// web) et cadre l'UX sur « dans N semaines » ; la date exacte est dérivée + affichée.
const HORIZONS = [4, 8, 12, 16, 24];
function closestHorizon(weeks: number): number {
  return HORIZONS.reduce((best, h) => (Math.abs(h - weeks) < Math.abs(best - weeks) ? h : best), HORIZONS[0]);
}

export default function ProfilScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const { profile, saveProfile, clearProfile } = useProfile();
  const { streak } = useStreak();
  const { slot, choose, busy } = useReminder();
  const { enabled: checkinEnabled, setEnabled: setCheckinEnabled } = usePlanCheckin();
  const { signOut } = useAuth();
  const themeMode = useThemeMode();
  const [hydrationOn, setHydrationOn] = useHydrationEnabled();
  const { consent: analyticsConsent, choose: chooseConsent } = useAnalyticsConsent();
  const router = useRouter();
  const [editor, setEditor] = useState<EditorKey | null>(null);
  const [weighIn, setWeighIn] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async (updated: UserProfile) => { await saveProfile(updated); setEditor(null); };

  // Deep-link depuis l'écran Plan (« Personnaliser ma répartition ») : ouvre direct
  // l'éditeur demandé au focus, via un drapeau (même principe que REROLL_KEY).
  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('@kyroz:openEditor').then((v) => {
      if (v) { AsyncStorage.removeItem('@kyroz:openEditor'); setEditor(v as EditorKey); }
    });
  }, []));

  // « Régénérer mon plan » : escape hatch discret (le bouton « Nouveau plan » de
  // l'écran Plan a été retiré au profit de l'ajustement recette-par-recette). On
  // pose un drapeau consommé au focus de l'écran Plan (REROLL_KEY), puis on y va.
  const regenPlan = () => {
    Alert.alert(
      'Régénérer tout ton plan ?',
      'Kyroz reconstruit une semaine complète de repas (tes 👍/👎 et préférences sont gardés).',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Régénérer', style: 'destructive',
          onPress: async () => { await AsyncStorage.setItem('@kyroz:planReroll', '1'); router.push('/(tabs)/plan'); },
        },
      ],
    );
  };

  // Déconnexion : couper la session NE redirige pas tout seul l'écran déjà monté
  // (expo-router ne re-route que l'index). On navigue donc explicitement vers le login.
  const doLogout = async () => {
    await signOut();
    // Sécurité : sur web, AsyncStorage = localStorage et survivrait à la
    // déconnexion (données de santé + session lisibles sur un poste partagé).
    // On purge tout SAUF les préférences d'appareil non personnelles.
    const KEEP = new Set(['@kyroz:theme', '@kyroz:reminder']);
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) => !KEEP.has(k));
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    await clearProfile();
    router.replace('/(auth)/login');
  };

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

  // Contact support : ouvre le client mail. Si rien ne peut l'ouvrir (web sans
  // client mail), on copie l'adresse dans une alerte plutôt que d'échouer en silence.
  const SUPPORT_EMAIL = 'contact@kyroz.app';
  const contactSupport = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Kyroz — aide')}`;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) Linking.openURL(url);
    else Alert.alert('Nous contacter', SUPPORT_EMAIL);
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  // Droit à la portabilité (RGPD art. 20) : exporter toutes ses données.
  const doExport = async () => {
    const res = await exportMyData();
    if (!res.ok) { Alert.alert('Export', 'Impossible d’exporter tes données pour le moment.'); return; }
    if (res.method === 'download') Alert.alert('Export terminé', 'Tes données ont été téléchargées (kyroz-mes-donnees.json).');
  };

  if (!profile) return null;

  // Dérive sous IMC 18,5 : le moteur a ramené le plan à la maintenance. On le DIT,
  // sinon les calories remontent sans explication et la personne continue de croire
  // qu'elle sèche. Le verdict vient du producteur unique (planFlags → computePlan) :
  // aucun seuil n'est réécrit ici, l'écran ne fait que rendre visible sa décision.
  // UN SEUL appel au producteur : `planFlags` recalculait déjà tout le plan pour n'en
  // garder que les drapeaux, et la remontée d'énergie disponible a besoin du même
  // calcul. Deux appels, c'était deux vérités possibles à un instant de bascule.
  const plan = computePlan(profile);
  const underweightCapped = plan.flags.includes('UNDERWEIGHT_NO_DEFICIT');
  const lowEaRise = plan.low_ea_escalation;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Streak — progression vers l'objectif 7 jours (North Star) */}
        <StreakProgress t={t} streak={streak} variant="card" />

        {/* Suivi du poids → recalcul auto des macros/plan */}
        <View style={[s.menu, cardShadow(t)]}>
          <MenuRow t={t} icon="trending-down-outline" label="Suivi du poids" value={`${profile.weight_kg} kg`} onPress={() => setWeighIn(true)} last />
        </View>

        {/* Révision du moteur : la cible a bougé sans que l'utilisateur touche à rien.
            On l'explique UNE fois, factuellement, avec l'action qui permet d'affiner —
            plutôt que de laisser découvrir un budget différent sans un mot. */}
        {profile.engine_notice && (
          <EngineNoticeCard t={t} notice={profile.engine_notice}
            onAdjust={() => { saveProfile(dismissEngineNotice(profile)); setEditor('sports'); }}
            onDismiss={() => saveProfile(dismissEngineNotice(profile))} />
        )}

        {/* Objectif daté (premium) — suivi de trajectoire quand il est posé */}
        {profile.goal_target && <DatedGoalCard t={t} profile={profile} onPress={() => setEditor('dated_goal')} />}

        {/* Sécurité : plan ramené au maintien parce que le poids est descendu trop bas.
            Ton informatif et non alarmant (anti charge mentale) : on explique et on
            offre l'action, on ne dramatise pas et on ne bloque rien. */}
        {underweightCapped && (
          <TouchableOpacity activeOpacity={0.85} onPress={() => setEditor('goal')}>
            <Card t={t}>
              <Text style={{ color: t.text, fontSize: 13, lineHeight: 19 }}>
                Ton poids est descendu sous la plage de référence pour ta taille. Kyroz a ramené ton plan à ta maintenance : plus de déficit tant que tu es dans cette zone. Tu n'as rien à faire dans l'immédiat — touche ici quand tu veux choisir un autre objectif.
              </Text>
            </Card>
          </TouchableOpacity>
        )}

        {/* Sortie de déficit après un long séjour en énergie disponible basse.
            SANS cette carte, la cible remonte de ~23 kcal/j chaque semaine pendant
            dix semaines sans un mot — une sèche dont les calories augmentent toutes
            les semaines, ce qui se lit comme une app qui déraille. On explique, on
            chiffre SUR SON CORPS, et on promet une fin (la remontée est bornée). */}
        {lowEaRise && <LowEaRiseCard t={t} rise={lowEaRise} onPress={() => setEditor('goal')} />}

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
          <MenuRow t={t} icon="barbell-outline" label="Sport & activité" value={`${profile.sports?.length ? `${profile.sports.length} sport${profile.sports.length > 1 ? 's' : ''}` : 'Aucun sport'} · ${NEAT_SHORT[profile.neat_level ?? DEFAULT_NEAT_LEVEL]}`} onPress={() => setEditor('sports')} />
          <MenuRow t={t} icon="flag-outline" label="Objectif" value={goalLabel(profile.goal)} onPress={() => setEditor('goal')} />
          <MenuRow t={t} icon="rocket-outline" label="Objectif daté" value={profile.goal_target ? `${profile.goal_target.target_weight_kg} kg · ${formatFR(profile.goal_target.target_date)}` : 'Aucun'} onPress={() => setEditor('dated_goal')} />
          <MenuRow t={t} icon="flame-outline" label="Calories & macros" value={profile.macro_mode === 'percent' ? 'Perso %' : 'Calculées'} onPress={() => setEditor('macros')} />
          <MenuRow t={t} icon="restaurant-outline" label="Préférences alimentaires" value={profile.dietary_restrictions.length || profile.disliked_foods.length || profile.hidden_recipes?.length ? 'Personnalisées' : 'Aucune'} onPress={() => setEditor('prefs')} />
          <MenuRow t={t} icon="calendar-outline" label="Paramètres des repas" value={`${profile.plan_days} j · ${(profile.meals?.length || 4)} repas · ${EMPHASIS_LABELS[profile.meal_emphasis ?? 'even']}`} onPress={() => setEditor('meals')} />
          <MenuRow t={t} icon="wallet-outline" label="Banque de calories" value={bankResume(profile)} onPress={() => setEditor('calorie_bank')} />
          <MenuRow t={t} icon="refresh-outline" label="Régénérer mon plan" value="Repartir de zéro" onPress={regenPlan} last />
        </View>

        {/* TDEE */}
        <View style={[s.tdee, cardShadow(t)]}>
          <Text style={s.tdeeL}>Dépense estimée · maintenance (TDEE)</Text>
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
          {!remindersSupported && slot !== 'off' ? ' La notif arrive sur l’app mobile (pas sur le web).' : ''}
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

        {/* Paramètres de l'application — préférences générales */}
        <SectionLabel t={t}>APPLICATION</SectionLabel>
        <Text style={s.settingLabel}>Apparence</Text>
        <Segmented<ThemeMode>
          t={t}
          value={themeMode}
          onChange={setThemeMode}
          options={[
            { label: 'Système', value: 'system' },
            { label: 'Clair', value: 'light' },
            { label: 'Sombre', value: 'dark' },
          ]}
        />
        <Text style={s.reminderHint}>
          {themeMode === 'system' ? 'Suit le réglage clair/sombre de ton téléphone.' : `Thème ${themeMode === 'light' ? 'clair' : 'sombre'} forcé.`}
        </Text>

        <Text style={s.settingLabel}>Suivi d'hydratation</Text>
        <Segmented<'on' | 'off'>
          t={t}
          value={hydrationOn ? 'on' : 'off'}
          onChange={(v) => setHydrationOn(v === 'on')}
          options={[{ label: 'Affiché', value: 'on' }, { label: 'Masqué', value: 'off' }]}
        />
        <Text style={s.reminderHint}>
          {hydrationOn
            ? 'Une mini-barre de suivi d’hydratation s’affiche au-dessus de tes repas du jour.'
            : 'La barre d’hydratation est masquée.'}
        </Text>

        {/* Consentement analytics (RGPD) — opt-in, modifiable à tout moment */}
        <Text style={s.settingLabel}>Statistiques d'usage</Text>
        <Segmented<'on' | 'off'>
          t={t}
          value={analyticsConsent === 'granted' ? 'on' : 'off'}
          onChange={(v) => chooseConsent(v === 'on' ? 'granted' : 'denied')}
          options={[{ label: 'Partagées', value: 'on' }, { label: 'Non', value: 'off' }]}
        />
        <Text style={s.reminderHint}>
          {analyticsConsent === 'granted'
            ? 'Tu partages des stats d’usage anonymes (jamais ton nom ni tes données perso) pour aider à améliorer Kyroz.'
            : 'Aucune statistique d’usage n’est partagée.'}
        </Text>

        <View style={[s.menu, cardShadow(t)]}>
          <MenuRow t={t} icon="mail-outline" label="Aide & contact" value={SUPPORT_EMAIL} onPress={contactSupport} />
          <MenuRow t={t} icon="download-outline" label="Exporter mes données" value="Télécharger tout (RGPD)" onPress={doExport} />
          <MenuRow t={t} icon="shield-checkmark-outline" label="Confidentialité & CGU" value="RGPD, données de santé" onPress={() => router.push('/legal')} />
          <MenuRow t={t} icon="information-circle-outline" label="Version" value={appVersion} onPress={() => {}} readonly last />
        </View>

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
        {editor === 'dated_goal' && <DatedGoalEditor t={t} profile={profile} onSave={save} />}
        {editor === 'macros' && <MacroEditor t={t} profile={profile} onSave={save} />}
        {editor === 'prefs' && <PrefEditor t={t} profile={profile} onSave={save} />}
        {editor === 'meals' && <MealsEditor t={t} profile={profile} onSave={save} />}
        {editor === 'calorie_bank' && <CalorieBankEditor t={t} profile={profile} onSave={save} />}
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
          <Text style={{ color: t.onDanger, fontSize: 17, fontWeight: '700' }}>{deleting ? 'Suppression…' : 'Supprimer définitivement'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setConfirmDelete(false)} style={{ alignItems: 'center', paddingVertical: 6 }}>
          <Text style={{ color: t.textSecondary, fontSize: 15, fontWeight: '600' }}>Annuler</Text>
        </TouchableOpacity>
      </ActionSheet>
    </SafeAreaView>
  );
}

// ── Lignes / boîtes ──────────────────────────────────────────────────────────
function MenuRow({ t, icon, label, value, onPress, last, readonly }: { t: ThemePalette; icon: any; label: string; value: string; onPress: () => void; last?: boolean; readonly?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={readonly ? 1 : 0.7} disabled={readonly}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 }, !last && { borderBottomWidth: 1, borderBottomColor: t.line }]}>
      <Ionicons name={icon} size={20} color={t.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: t.textTertiary, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{value}</Text>
      </View>
      {!readonly && <Ionicons name="chevron-forward" size={18} color={t.textQuaternary} />}
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
  // Bornes tirées de lib/safety.ts, PAS réécrites en dur : elles divergeaient de
  // l'onboarding (16 ans ici contre 18 là-bas — le relèvement MIN_AGE n'avait été
  // câblé que côté onboarding, donc on pouvait saisir 18 puis repasser à 16 ici ;
  // et 40–250 kg contre 30–300, ce qui verrouillait l'écran pour un profil onboardé
  // hors de cette plage : bouton « Enregistrer » désactivé en permanence).
  const draft = { ...profile, sex, age: aN, weight_kg: wN, height_cm: hN, body_fat_pct: bodyFat };
  const inBounds =
    aN >= AGE_BOUNDS[0] && aN <= AGE_BOUNDS[1] &&
    wN >= WEIGHT_BOUNDS[0] && wN <= WEIGHT_BOUNDS[1] &&
    hN >= HEIGHT_BOUNDS[0] && hN <= HEIGHT_BOUNDS[1];
  // Un blocage ne doit empêcher l'enregistrement QUE si cet écran permet d'y
  // remédier. L'âge se corrige ici (donc bloquant) ; un objectif incompatible avec
  // le poids se corrige dans l'éditeur d'Objectif — bloquer ici enfermerait
  // l'utilisatrice, qui ne pourrait plus rectifier sa taille ni son âge. On le
  // signale sans verrouiller, en pointant vers le bon écran.
  const blocks = inBounds ? checkEligibility(draft, profile.goal_target) : [];
  const blockMsg = blocks.includes('MINOR') ? eligibilityMessage(['MINOR']) : null;
  const warnMsg = blockMsg ? null : eligibilityMessage(blocks);
  const valid = inBounds && !blockMsg;
  // Les sports vivent dans leur propre éditeur — on préserve `...profile` (donc
  // `sports`), et withRecalc recalcule le TDEE avec le nouveau poids/%MG.
  const submit = () => { if (valid) onSave(withRecalc(draft)); };
  return (
    <EditorShell t={t} title="Informations" onSave={submit} canSave={valid} dragHandlers={dragHandlers}>
      {blockMsg && (
        <Card t={t}>
          <Text style={{ color: t.danger, fontSize: 13, lineHeight: 19, fontWeight: '600' }}>{blockMsg}</Text>
        </Card>
      )}
      {warnMsg && (
        <Card t={t}>
          <Text style={{ color: t.warning, fontSize: 13, lineHeight: 19 }}>
            {warnMsg} Tu peux le changer dans « Objectif ».
          </Text>
        </Card>
      )}
      <Segmented t={t} options={[{ label: 'Homme', value: 'male' }, { label: 'Femme', value: 'female' }]} value={sex} onChange={setSex} />
      <Field t={t} label="Âge" suffix="ans" value={age} onChangeText={setAge} keyboardType="number-pad" />
      <Field t={t} label="Poids" suffix="kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
      <Field t={t} label="Taille" suffix="cm" value={height} onChangeText={setHeight} keyboardType="number-pad" />
      <SectionLabel t={t}>Masse grasse (optionnel)</SectionLabel>
      <BodyFatPicker t={t} sex={sex} value={bodyFat} onChange={setBodyFat} />
    </EditorShell>
  );
}

/**
 * Sortie progressive de déficit après un long séjour en énergie disponible basse.
 *
 * ⚠️ Ce n'est PAS un avertissement — rien n'est cassé et la personne n'a rien fait
 * de mal. C'est l'explication d'un mouvement du moteur qui, sans elle, est
 * indétectable : sa cible monte de quelques dizaines de kcal chaque semaine alors
 * qu'elle est en sèche. Le ton suit la règle anti charge mentale — le moteur porte
 * la charge, elle n'a rien à faire.
 *
 * Deux états, parce que la remontée est BORNÉE (30 → 35 kcal/kg, dix crans) :
 * pendant, on annonce le rythme et la fin ; une fois au plafond, dire « ta cible
 * remonte » serait faux — elle a cessé de monter, et c'est le déficit qui n'existe
 * plus. À ce moment-là la seule chose utile est de proposer de changer d'objectif.
 */
function LowEaRiseCard({ t, rise, onPress }: {
  t: ThemePalette; rise: LowEaEscalation; onPress: () => void;
}) {
  const enCours = rise.weeksToPlateau > 0;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Card t={t}>
        <Text style={{ color: t.text, fontSize: 15, fontWeight: '700', marginBottom: 6 }}>
          {enCours ? '🛡️ Ta cible remonte, c\'est voulu' : '🛡️ Kyroz a mis ta sèche en pause'}
        </Text>
        {enCours ? (
          <Text style={{ color: t.text, fontSize: 13, lineHeight: 19 }}>
            Tu sèches depuis plus de 3 mois. Pour protéger ton énergie sur la durée, Kyroz remonte doucement tes calories — environ {rise.weeklyKcal} kcal par semaine, encore {rise.weeksToPlateau} semaine{rise.weeksToPlateau > 1 ? 's' : ''}. Tu n'as rien à changer.
          </Text>
        ) : (
          <Text style={{ color: t.text, fontSize: 13, lineHeight: 19 }}>
            Après un long déficit, Kyroz t'a ramenée à un niveau qui protège ton énergie : tes calories ne baisseront plus tant que tu restes ici. Tu n'as rien à faire dans l'immédiat — touche ici quand tu veux choisir un autre objectif.
          </Text>
        )}
      </Card>
    </TouchableOpacity>
  );
}

/**
 * Avertissement one-shot de révision du moteur.
 *
 * Ton informatif, jamais alarmant (anti charge mentale) : on donne le chiffre, la
 * raison en une phrase, et la seule action utile — affiner son activité. Pas de
 * « attention », pas de rouge : rien n'est cassé, c'est un calcul qui s'est corrigé.
 */
function EngineNoticeCard({ t, notice, onAdjust, onDismiss }: {
  t: ThemePalette; notice: EngineNotice; onAdjust: () => void; onDismiss: () => void;
}) {
  const delta = notice.to - notice.from;
  return (
    <Card t={t}>
      <Text style={{ color: t.text, fontSize: 13, lineHeight: 19 }}>
        Ton budget est passé de {notice.from} à {notice.to} kcal/jour ({delta > 0 ? '+' : ''}{delta}). Kyroz a corrigé deux choses : tes séances étaient comptées en double avec ta dépense de repos, et le niveau d'activité de tes journées était supposé au lieu d'être demandé.
      </Text>
      <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 8 }}>
        Par défaut, Kyroz part de journées plutôt assises. Si les tiennes sont plus actives, dis-le — ton budget remontera.
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <TouchableOpacity onPress={onAdjust} activeOpacity={0.85} style={{ flex: 1, backgroundColor: t.accent, borderRadius: Radius.sm, paddingVertical: 11, alignItems: 'center' }}>
          <Text style={{ color: t.onAccent, fontSize: 14, fontWeight: '700' }}>Régler mon activité</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDismiss} activeOpacity={0.85} style={{ flex: 1, borderRadius: Radius.sm, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: t.lineStrong }}>
          <Text style={{ color: t.text, fontSize: 14, fontWeight: '600' }}>C'est noté</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

function SportsProfileEditor({ t, profile, onSave, dragHandlers }: EditorProps) {
  const [sports, setSports] = useState<SportSession[]>(profile.sports ?? []);
  const [neat, setNeat] = useState<NeatLevel>(profile.neat_level ?? DEFAULT_NEAT_LEVEL);
  const [restDays, setRestDays] = useState<number[]>(effectiveRestWeekdays(profile));
  const planWeekdays = profile.plan_weekdays ?? [];
  const togRestDay = (v: number) => setRestDays((arr) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const trainingDaysEq = Math.min(totalSessionsPerWeek(sports), 7);
  const submit = () => onSave(withRecalc({
    ...profile, sports, neat_level: neat,
    training_days_per_week: trainingDaysEq, activity_level: activityFromDays(trainingDaysEq),
    rest_weekdays: orderedWeekdays(restDays.filter((d) => !planWeekdays.length || planWeekdays.includes(d))),
  }));
  return (
    <EditorShell t={t} title="Sport & activité" onSave={submit} dragHandlers={dragHandlers}>
      {/* Le NEAT vient EN PREMIER : c'est la base sur laquelle le sport s'ajoute, et
          l'ordre inverse invite à répondre « je suis actif » en pensant à ses séances
          — qui sont déjà comptées juste en dessous. */}
      <SectionLabel t={t}>TES JOURNÉES, HORS SPORT</SectionLabel>
      <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 4 }}>
        Ce que tu dépenses sans y penser : boulot, trajets, courses. Ne compte pas tes séances ici, elles sont comptées juste en dessous.
      </Text>
      {NEAT_ORDER.map((lvl) => (
        <OptionCard key={lvl} t={t} title={NEAT_LABEL[lvl]} subtitle={NEAT_HINT[lvl]} selected={neat === lvl} onPress={() => setNeat(lvl)} />
      ))}

      <SectionLabel t={t}>TES SÉANCES</SectionLabel>
      <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 4 }}>Tes sports servent à estimer tes calories dépensées. Plus c'est précis, plus ton plan l'est.</Text>
      <SportsEditor sports={sports} weight={profile.weight_kg} onChange={setSports} />
      <RestDaysPicker t={t} available={planWeekdays} value={restDays} onToggle={togRestDay} />
    </EditorShell>
  );
}

function GoalEditor({ t, profile, onSave, dragHandlers }: EditorProps) {
  const [goal, setGoal] = useState<Goal>(profile.goal);
  // L'éligibilité était branchée sur l'onboarding et l'objectif daté seulement :
  // une personne en insuffisance pondérale se voyait refuser la sèche à l'inscription
  // mais pouvait l'activer depuis cet écran.
  const blockMsg = eligibilityMessage(checkEligibility({ ...profile, goal }, profile.goal_target));
  const submit = () => { if (!blockMsg) onSave(withRecalc({ ...profile, goal })); };
  return (
    <EditorShell t={t} title="Objectif" onSave={submit} canSave={!blockMsg} dragHandlers={dragHandlers}>
      {GOALS.map((g) => <OptionCard key={g} t={t} title={goalLabel(g)} selected={goal === g} onPress={() => setGoal(g)} />)}
      {/* « Sèche rapide » a été retiré parce qu'il servait le même plan que « Sèche » :
          le plancher de sécurité absorbait l'écart. Plutôt que de laisser croire à un
          choix de rythme qui n'existait pas, on renvoie vers le seul mécanisme qui
          sache dire honnêtement si un rythme est tenable — l'objectif daté. */}
      {CUT_GOALS.includes(goal) && !blockMsg && (
        <Card t={t}>
          <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 19 }}>
            Tu veux aller plus vite ? Le rythme se règle avec un objectif daté : tu poses un poids et une date, et Kyroz te dit franchement si c'est tenable — plutôt que de creuser un déficit que ton corps refusera.
          </Text>
        </Card>
      )}
      {blockMsg && (
        <Card t={t}>
          <Text style={{ color: t.danger, fontSize: 13, lineHeight: 19, fontWeight: '600' }}>{blockMsg}</Text>
        </Card>
      )}
    </EditorShell>
  );
}

function DatedGoalEditor({ t, profile, onSave, dragHandlers }: EditorProps) {
  const today = todayStamp();
  const existing = profile.goal_target;
  const [targetWeight, setTargetWeight] = useState(
    String(existing?.target_weight_kg ?? Math.max(40, Math.round(profile.weight_kg) - 4)),
  );
  const [weeks, setWeeks] = useState<number>(
    existing ? closestHorizon(Math.max(1, Math.round(daysBetween(today, existing.target_date) / 7))) : 8,
  );
  // L'horizon est un ARRONDI de l'échéance stockée (7,9 sem → « 8 sem »). Tant que
  // l'user n'a pas touché aux puces, on garde la date EXACTE enregistrée : ré-ouvrir
  // et enregistrer sans rien changer ne doit pas décaler l'échéance (même principe
  // que RestDaysPicker).
  const [horizonTouched, setHorizonTouched] = useState(false);
  const pickWeeks = (h: number) => { setWeeks(h); setHorizonTouched(true); };

  const twN = parseFloat(targetWeight.replace(',', '.'));
  const validWeight = twN >= 40 && twN <= 250;
  const targetDate = existing && !horizonTouched ? existing.target_date : addDaysStamp(today, weeks * 7);
  const provisional: GoalTarget | undefined = validWeight
    ? { target_weight_kg: twN, target_date: targetDate, start_weight_kg: profile.weight_kg, start_date: existing?.start_date ?? today }
    : undefined;
  const tdee = calculateTDEE(profile);

  // Aperçu calculé par le PRODUCTEUR UNIQUE (computePlan) et non par un chemin
  // parallèle : ce que la carte annonce est exactement ce qui sera enregistré,
  // plancher de sécurité compris.
  const previewPlan = provisional ? computePlan({ ...profile, goal_target: provisional }, today) : null;
  // Le plancher de l'APERÇU (pas celui du profil actuel) alimente la projection :
  // c'est la cible qu'on s'apprête à enregistrer qui doit dater l'échéance (P1.6).
  const status = datedGoalStatus(provisional, profile, today, tdee, previewPlan?.floor_kcal ?? null);
  const preview = previewPlan?.profile ?? null;
  const floored = previewPlan?.flags.includes('FLOOR_APPLIED') ?? false;
  const kcalDelta = preview ? preview.target_kcal - tdee : 0;
  const gapKg = status ? Math.round(Math.abs(status.currentWeightKg - status.targetWeightKg) * 10) / 10 : 0;
  const dirLabel = status?.direction === 'gain' ? 'Prendre' : status?.direction === 'maintain' ? 'Maintenir' : 'Perdre';

  // Éligibilité de la CIBLE (P0.4). `validWeight` ne borne que la saisie (40–250 kg) :
  // un poids syntaxiquement valide peut rester physiologiquement absurde (40 kg pour
  // 1 m 80 = IMC 12,3). Sans cet appel, `checkEligibility` existait mais n'était
  // interrogée qu'à l'onboarding — l'éditeur laissait passer n'importe quelle cible.
  const goalBlockMsg = provisional ? eligibilityMessage(checkEligibility(profile, provisional)) : null;

  const submit = () => {
    if (!provisional || goalBlockMsg) return;
    onSave(withRecalc({ ...profile, goal_target: provisional }));
  };
  const remove = () => onSave(withRecalc({ ...profile, goal_target: undefined }));

  return (
    <EditorShell t={t} title="Objectif daté" onSave={submit} canSave={validWeight && !goalBlockMsg} dragHandlers={dragHandlers}>
      <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 18 }}>
        Fixe un poids et une échéance : Kyroz ajuste tes calories jour après jour pour t'y amener au rythme le plus rapide — mais sûr.
      </Text>

      <Field t={t} label="Poids cible" suffix="kg" value={targetWeight} onChangeText={setTargetWeight} keyboardType="decimal-pad" />

      <SectionLabel t={t}>Échéance</SectionLabel>
      <View style={styles.wrap}>
        {HORIZONS.map((h) => <Chip key={h} t={t} label={`${h} sem`} selected={weeks === h} onPress={() => pickWeeks(h)} />)}
      </View>
      <Text style={{ color: t.textSecondary, fontSize: 13 }}>Cible le {formatFR(targetDate)}.</Text>

      {/* Cible refusée → on affiche le motif SEUL. Montrer une trajectoire crédible
          (« Perdre 48 kg · 1982 kcal/j ») au-dessus d'un refus revient à valider
          visuellement un objectif qu'on rejette la ligne d'après. */}
      {goalBlockMsg && (
        <Card t={t}>
          <Text style={{ color: t.danger, fontSize: 13, lineHeight: 19, fontWeight: '600' }}>{goalBlockMsg}</Text>
        </Card>
      )}

      {!goalBlockMsg && status && preview && (
        <Card t={t} style={{ gap: 12 }}>
          <Row t={t} l="Trajectoire" v={status.direction === 'maintain' ? dirLabel : `${dirLabel} ${gapKg} kg`} strong />
          {status.direction !== 'maintain' && <Row t={t} l="Rythme sûr" v={`${Math.abs(status.safeWeeklyKg)} kg / sem`} />}
          <Row t={t} l="Calories ajustées" v={`${preview.target_kcal} kcal/j`} strong />
          <Row t={t} l="vs maintenance" v={`${kcalDelta >= 0 ? '+' : ''}${kcalDelta} kcal/j`} c={kcalDelta < 0 ? t.carbs : t.protein} />
        </Card>
      )}
      {!goalBlockMsg && status?.directionMismatch && (
        <Card t={t}>
          <Text style={{ color: t.text, fontSize: 13, lineHeight: 19 }}>
            Ce poids cible va dans le sens inverse de ton objectif « {goalLabel(profile.goal)} ». Kyroz ne pilote pas tes calories tant que les deux ne concordent pas.
          </Text>
        </Card>
      )}
      {/* NB : pas de branche « insuffisance pondérale » ici. Quand l'utilisatrice
          passe sous IMC 18,5, toute cible en PERTE est déjà refusée en amont par
          `goalBlockMsg` (sèche interdite, ou IMC cible hors plage — une cible plus
          basse que son poids ne peut pas être au-dessus du seuil). L'état est
          annoncé sur les surfaces qui, elles, restent visibles : la carte de suivi
          (DatedGoalCard) et l'avertissement en tête du profil. */}
      {/* « Objectif ambitieux » = un plafond de RYTHME a mordu. On ne dit plus
          « un peu après ta date » : l'écart médian mesuré est de 32 jours, 89 au
          90ᵉ centile. Un adverbe qui minimise un trimestre est un mensonge poli. */}
      {!goalBlockMsg && status?.clamped && !status.directionMismatch && !status.floorCapped && (
        <Card t={t}>
          <Text style={{ color: t.text, fontSize: 13, lineHeight: 19 }}>
            Objectif ambitieux : au rythme le plus sûr tu atteins {status.targetWeightKg} kg
            {status.projectable ? ` vers le ${formatFR(status.projectedDate)}` : ' plus tard que prévu'}, après ta date. Kyroz garde le rythme sûr.
          </Text>
        </Card>
      )}
      {/* Le PLANCHER qui mord n'est pas une ambition mal calibrée, c'est une contrainte
          physiologique : message distinct, et on propose la correction en un geste
          plutôt que de laisser l'utilisateur deviner quelle date serait tenable. */}
      {!goalBlockMsg && status?.floorCapped && !status.directionMismatch && preview && (
        <Card t={t}>
          <Text style={{ color: t.text, fontSize: 13, lineHeight: 19 }}>
            {status.projectable ? (
              <>Ton plan ne peut pas descendre sous {preview.target_kcal} kcal/jour en sécurité — c'est ton plancher, pas un réglage. À ce rythme tu atteins {status.targetWeightKg} kg vers le {formatFR(status.projectedDate)}. Tu peux viser cette date-là, ou choisir un poids cible plus proche : Kyroz ne creusera pas davantage.</>
            ) : (
              <>Ton plan ne peut pas descendre sous {preview.target_kcal} kcal/jour en sécurité — c'est ton plancher, pas un réglage. À ce rythme, ce poids cible n'est pas atteignable quelle que soit la date. Choisis une cible plus proche, ou laisse le temps faire : ton poids qui baisse fera baisser le plancher avec lui.</>
            )}
          </Text>
        </Card>
      )}
      {/* `!floored` : le plancher de sécurité décale la date sans que `clamped` le
          sache (il ne juge que le RYTHME). Sans cette condition, on rassurait
          « dans les clous de ta date » juste au-dessus du message qui annonce
          l'inverse. La projection réellement corrigée est du ressort de P1.6. */}
      {!goalBlockMsg && status && status.reachableByDate && !status.directionMismatch && status.direction !== 'maintain' && (
        <Text style={{ color: t.textSecondary, fontSize: 12, lineHeight: 17 }}>
          Rythme sûr, dans les clous de ta date.
        </Text>
      )}
      {/* Le plancher mord SANS rogner la trajectoire (objectif déjà atteignable) :
          on explique le mécanisme, sans annoncer de décalage — il n'y en a pas.
          `!floorCapped` évite le doublon avec la carte ci-dessus. */}
      {!goalBlockMsg && floored && preview && !status?.floorCapped && (
        <Card t={t}>
          <Text style={{ color: t.text, fontSize: 13, lineHeight: 19 }}>
            Ton plancher de sécurité est à {preview.target_kcal} kcal/jour : en dessous, ton corps n'a plus assez d'énergie pour fonctionner correctement. Plus tu t'entraînes, plus ce plancher monte — c'est normal, l'énergie de tes séances ne compte pas comme énergie disponible.
          </Text>
        </Card>
      )}
      {!goalBlockMsg && status?.direction === 'maintain' && (
        <Text style={{ color: t.textSecondary, fontSize: 12, lineHeight: 17 }}>
          Tu es déjà à ton poids cible : Kyroz vise le maintien.
        </Text>
      )}

      {existing && (
        <TouchableOpacity onPress={remove} style={{ alignItems: 'center', paddingVertical: 10 }}>
          <Text style={{ color: t.danger, fontSize: 15, fontWeight: '600' }}>Retirer l'objectif daté</Text>
        </TouchableOpacity>
      )}
    </EditorShell>
  );
}

function MacroEditor({ t, profile, onSave, dragHandlers }: EditorProps) {
  // 'manual' (legacy) est ramené sur 'percent' : on ne propose plus les grammes fixes.
  const [mode, setMode] = useState<'auto' | 'percent'>(profile.macro_mode === 'auto' ? 'auto' : 'percent');
  const [carbRatio, setCarbRatio] = useState(profile.carb_ratio ?? DEFAULT_CARB_RATIO);
  const [proteinPerKg, setProteinPerKg] = useState(profile.protein_per_kg ?? recommendedProteinPerKg(profile.goal));

  const today = todayStamp();
  const tdee = calculateTDEE(profile);
  // Objectif daté actif → le delta calorique daté prime (même cerveau macro que recalcProfile).
  const datedDelta = datedGoalKcalDelta(profile.goal_target, profile, today, tdee) ?? undefined;
  const lowEaWeeks = lowEaWeeksForFloor(profile.low_ea_weeks, today); // même compteur que computePlan
  // Aperçu par le producteur unique : ce qui s'affiche = ce qui sera enregistré.
  const auto = computePlan({ ...profile, macro_mode: 'auto' }, today).profile;

  const submit = () => {
    // `withRecalc` dans les deux branches : recalcProfile reste le SEUL producteur
    // des valeurs stockées (plancher de sécurité + registre d'énergie disponible
    // compris). En mode 'percent' il recalcule depuis carb_ratio/protein_per_kg,
    // donc il reproduit exactement ce que l'aperçu affiche.
    if (mode === 'auto') {
      onSave(withRecalc({ ...profile, macro_mode: 'auto' }));
    } else {
      const next = withRecalc({ ...profile, macro_mode: 'percent', carb_ratio: carbRatio, protein_per_kg: proteinPerKg });
      const err = validateProfile(profile.sex, profile.age, next.target_kcal); // garde-fou §6
      if (err) { Alert.alert('Attention', err); return; }
      onSave(next);
    }
  };

  return (
    <EditorShell t={t} title="Calories & macros" onSave={submit} dragHandlers={dragHandlers}>
      <Segmented<'auto' | 'percent'> t={t} options={[{ label: 'Calculées', value: 'auto' }, { label: 'Perso %', value: 'percent' }]} value={mode} onChange={setMode} />
      {mode === 'auto' ? (
        <Card t={t} style={{ gap: 12 }}>
          <Row t={t} l="Objectif calorique" v={`${auto.target_kcal} kcal`} strong />
          <Row t={t} l="Protéines" v={`${auto.target_protein_g} g`} c={t.protein} />
          <Row t={t} l="Glucides" v={`${auto.target_carbs_g} g`} c={t.carbs} />
          <Row t={t} l="Lipides" v={`${auto.target_fat_g} g`} c={t.fat} />
        </Card>
      ) : (
        <MacroSplit
          t={t} tdee={tdee} goal={profile.goal} body={profile}
          carbRatio={carbRatio} proteinPerKg={proteinPerKg}
          kcalDeltaOverride={datedDelta} lowEaWeeks={lowEaWeeks}
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
  // Recettes masquées (👎) : on retire l'id pour la ré-afficher (rien n'est définitif).
  const [hidden, setHidden] = useState<string[]>(profile.hidden_recipes ?? []);
  const hiddenNamed = hidden.map((id) => ({ id, name: getRecipeById(id)?.name_fr ?? 'Recette' }));
  const tog = <T,>(arr: T[], v: T, set: (x: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const submit = () => onSave({ ...profile, dietary_restrictions: restrictions, preferred_proteins: proteins, disliked_foods: dislikes, hidden_recipes: hidden });
  return (
    <EditorShell t={t} title="Préférences" onSave={submit} dragHandlers={dragHandlers}>
      <SectionLabel t={t}>Régime</SectionLabel>
      <View style={styles.wrap}>{RESTRICTIONS.map((r) => <Chip key={r.value} t={t} label={r.label} selected={restrictions.includes(r.value)} onPress={() => tog(restrictions, r.value, setRestrictions)} />)}</View>
      <SectionLabel t={t}>Protéines préférées</SectionLabel>
      <View style={styles.wrap}>{PROTEINS.map((p) => <Chip key={p} t={t} label={p} selected={proteins.includes(p.toLowerCase())} onPress={() => tog(proteins, p.toLowerCase(), setProteins)} />)}</View>
      <DislikedFoodsField t={t} value={dislikes} onChange={setDislikes} />
      {hiddenNamed.length > 0 && (
        <>
          <SectionLabel t={t}>Recettes masquées ({hiddenNamed.length})</SectionLabel>
          <Text style={{ color: t.textTertiary, fontSize: 12, lineHeight: 17, marginTop: -8 }}>
            Les recettes que tu as marquées « j'aime pas ». Touche-en une pour la réafficher.
          </Text>
          <View style={styles.wrap}>{hiddenNamed.map((r) => <Chip key={r.id} t={t} label={`${r.name}  ✕`} selected onPress={() => tog(hidden, r.id, setHidden)} />)}</View>
        </>
      )}
    </EditorShell>
  );
}

// Sélecteur de jours de repos, partagé par les éditeurs Repas et Sports.
// `available` = jours de semaine du plan (on ne se repose que sur un jour planifié) ;
// vide → on propose les 7 jours (repli profils sans jours définis).
function RestDaysPicker({ t, available, value, onToggle }: { t: ThemePalette; available: number[]; value: number[]; onToggle: (v: number) => void }) {
  const opts = available.length ? WEEKDAY_OPTS.filter((o) => available.includes(o.val)) : WEEKDAY_OPTS;
  return (
    <>
      <SectionLabel t={t}>Jours de repos</SectionLabel>
      <Text style={{ color: t.textTertiary, fontSize: 12, lineHeight: 17, marginTop: -8 }}>
        Tes jours sans entraînement : Kyroz baisse un peu les glucides et monte les lipides (mêmes calories) et privilégie les recettes « récup ».
      </Text>
      <View style={styles.wrap}>
        {opts.map((d) => <Chip key={d.val} t={t} label={d.label} selected={value.includes(d.val)} onPress={() => onToggle(d.val)} />)}
      </View>
    </>
  );
}

function MealsEditor({ t, profile, onSave, dragHandlers }: EditorProps) {
  const [weekdays, setWeekdays] = useState<number[]>(profile.plan_weekdays ?? [1, 2, 3, 4, 5, 6, 0]);
  const [restDays, setRestDays] = useState<number[]>(effectiveRestWeekdays(profile));
  const [meals, setMeals] = useState<MealType[]>(profile.meals ?? ['breakfast', 'lunch', 'dinner', 'snack']);
  const [emphasis, setEmphasis] = useState<MealEmphasis>(profile.meal_emphasis ?? 'even');
  const [variety, setVariety] = useState<VarietyPreference>(profile.variety);
  const [fixedMeals, setFixedMeals] = useState<FixedMeals>(profile.fixed_meals ?? {});
  const [definingMeal, setDefiningMeal] = useState<MealType | null>(null);
  // Retirer un jour du plan le retire aussi des jours de repos (un repos doit être un jour planifié).
  const togDay = (v: number) => {
    const removing = weekdays.includes(v);
    setWeekdays((arr) => removing ? arr.filter((x) => x !== v) : [...arr, v]);
    if (removing) setRestDays((arr) => arr.filter((x) => x !== v));
  };
  const togRestDay = (v: number) => setRestDays((arr) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const togMeal = (v: MealType) => {
    const next = meals.includes(v) ? meals.filter((x) => x !== v) : [...meals, v];
    setMeals(next);
    if (emphasis !== 'even' && !next.includes(emphasis as MealType)) setEmphasis('even');
    // Déselectionner un repas retire aussi sa version « je gère ».
    if (!next.includes(v)) setFixedMeals((prev) => { if (!prev[v]) return prev; const n = { ...prev }; delete n[v]; return n; });
  };
  const removeFixed = (mt: MealType) => setFixedMeals((prev) => { const n = { ...prev }; delete n[mt]; return n; });
  const mealLabel = (mt: MealType) => MEAL_OPTS.find((o) => o.val === mt)?.label ?? mt;
  const emphasisOpts = EMPHASIS_OPTS.filter((e) => e.val === 'even' || meals.includes(e.val as MealType));
  const submit = () => {
    const cleaned: FixedMeals = {};
    for (const mt of orderedMeals(meals)) if (fixedMeals[mt]) cleaned[mt] = fixedMeals[mt];
    onSave({
      ...profile, plan_weekdays: orderedWeekdays(weekdays), plan_days: weekdays.length,
      rest_weekdays: orderedWeekdays(restDays.filter((d) => weekdays.includes(d))),
      meals: orderedMeals(meals), meal_emphasis: emphasis, variety,
      fixed_meals: Object.keys(cleaned).length ? cleaned : undefined,
    });
  };

  // Sous-vue : définir le repas géré par l'user (remplace l'éditeur le temps de la saisie).
  if (definingMeal) {
    return (
      <FixedMealSheet
        t={t} mealType={definingMeal} initial={fixedMeals[definingMeal]}
        onSave={(fm) => setFixedMeals((prev) => ({ ...prev, [definingMeal]: fm }))}
        onClose={() => setDefiningMeal(null)} dragHandlers={dragHandlers}
      />
    );
  }

  return (
    <EditorShell t={t} title="Paramètres des repas" onSave={submit} canSave={weekdays.length >= 1 && meals.length >= 1} dragHandlers={dragHandlers}>
      <SectionLabel t={t}>Jours du plan</SectionLabel>
      <View style={styles.wrap}>{WEEKDAY_OPTS.map((d) => <Chip key={d.val} t={t} label={d.label} selected={weekdays.includes(d.val)} onPress={() => togDay(d.val)} />)}</View>
      <RestDaysPicker t={t} available={weekdays} value={restDays} onToggle={togRestDay} />
      <SectionLabel t={t}>Repas inclus</SectionLabel>
      <View style={styles.wrap}>{MEAL_OPTS.map((m) => <Chip key={m.val} t={t} label={m.label} selected={meals.includes(m.val)} onPress={() => togMeal(m.val)} />)}</View>
      {meals.length === 0 && <Text style={{ color: t.danger, fontSize: 12 }}>Sélectionne au moins 1 repas.</Text>}

      <SectionLabel t={t}>Repas que tu gères toi-même</SectionLabel>
      <Text style={{ color: t.textTertiary, fontSize: 12, lineHeight: 17, marginTop: -8 }}>
        Définis-les une fois : Kyroz les compte dans ton total et cale tes autres repas autour, sans te les redemander chaque jour.
      </Text>
      <View style={{ gap: 8 }}>
        {orderedMeals(meals).map((mt) => {
          const fm = fixedMeals[mt];
          return (
            <View key={mt} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.card, borderRadius: Radius.md, padding: 14 }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ color: t.text, fontSize: 14, fontWeight: '700' }}>{mealLabel(mt)}</Text>
                <Text style={{ color: fm ? t.textSecondary : t.textTertiary, fontSize: 12, marginTop: 3 }} numberOfLines={1}>
                  {fm ? `🔒 ${fm.label} · ${fm.macros.kcal} kcal` : 'Kyroz le planifie'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                {fm && (
                  <TouchableOpacity onPress={() => removeFixed(mt)} hitSlop={8}>
                    <Text style={{ color: t.textTertiary, fontSize: 13, fontWeight: '700' }}>Retirer</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setDefiningMeal(mt)} hitSlop={8}>
                  <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700' }}>{fm ? 'Modifier' : 'Je gère'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

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
    settingLabel: { color: t.text, fontSize: 15, fontWeight: '600', marginBottom: -8 },
    disclaimer: { color: t.textTertiary, fontSize: 11, lineHeight: 16, textAlign: 'center' },
    logoutBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 8, borderRadius: Radius.md, borderWidth: 1.5, borderColor: t.lineStrong },
    logoutTxt: { color: t.text, fontSize: 15, fontWeight: '700' },
    delBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
    delTxt: { color: t.danger, fontSize: 13 },
  });
}

// ── Banque de calories (Kyroz+) ──────────────────────────────────────────────
// « Resto samedi » : l'utilisateur déclare un écart sur un jour, Kyroz le reprend
// sur les autres jours du plan. Le calcul vit dans lib/calorieBank.ts ; ici on ne
// fait que le montrer et l'éditer.
//
// TON : la règle produit anti-charge-mentale s'applique (CLAUDE.md §10). Ce
// module sert à s'autoriser un écart SANS culpabiliser — donc on annonce ce qui
// est repris, on ne reproche rien, et le pire cas reste une phrase neutre.

/** Résumé d'une ligne de menu : « Samedi +600 » / « Aucun écart ». */
function bankResume(p: UserProfile): string {
  const bank = p.calorie_bank ?? {};
  const jours = WEEKDAY_OPTS.filter((o) => bank[String(o.val)]);
  if (!jours.length) return 'Aucun écart prévu';
  return jours
    .map((o) => `${o.label} ${bank[String(o.val)]! > 0 ? '+' : ''}${bank[String(o.val)]}`)
    .join(' · ');
}

const BANK_PRESETS = [200, 400, 600, 900];

function CalorieBankEditor({ t, profile, onSave, dragHandlers }: EditorProps) {
  const [bank, setBank] = useState<Record<string, number>>(profile.calorie_bank ?? {});
  const [jour, setJour] = useState<number | null>(null);

  // Seuls les jours DU PLAN peuvent porter un écart : un écart posé ailleurs ne
  // serait jamais servi (cf. offsetsForPlan).
  const joursDuPlan = WEEKDAY_OPTS.filter((o) => (profile.plan_weekdays ?? []).includes(o.val));
  const days = Math.max(1, Math.min(profile.plan_days ?? joursDuPlan.length, 7));

  const apercu = bankedDailyTargets({
    days,
    baseTargetKcal: profile.target_kcal,
    offsets: offsetsForPlan(bank, profile.plan_weekdays, days),
    floorKcal: Math.min(bankFloorKcal(profile), profile.target_kcal),
  });

  const set = (val: number, kcal: number | null) => {
    setBank((prev) => {
      const n = { ...prev };
      if (kcal === null || kcal === 0) delete n[String(val)];
      else n[String(val)] = kcal;
      return n;
    });
  };
  const courant = jour !== null ? (bank[String(jour)] ?? 0) : 0;

  return (
    <EditorShell t={t} title="Banque de calories" onSave={() => onSave({ ...profile, calorie_bank: Object.keys(bank).length ? bank : undefined })} dragHandlers={dragHandlers}>
      <Text style={{ color: t.textSecondary, fontSize: 14, lineHeight: 20 }}>
        Un resto, un anniversaire ? Dis-le à Kyroz : il répartit l'écart sur tes autres
        jours de la semaine. Tes protéines ne bougent pas, et aucun jour ne descend sous
        ton plancher de sécurité.
      </Text>

      <SectionLabel t={t}>Le jour concerné</SectionLabel>
      <View style={styles.wrap}>
        {joursDuPlan.map((o) => (
          <Chip
            key={o.val} t={t}
            label={bank[String(o.val)] ? `${o.label} ${bank[String(o.val)]! > 0 ? '+' : ''}${bank[String(o.val)]}` : o.label}
            selected={jour === o.val}
            onPress={() => setJour(jour === o.val ? null : o.val)}
          />
        ))}
      </View>
      {joursDuPlan.length === 0 && (
        <Text style={{ color: t.textTertiary, fontSize: 13 }}>
          Choisis d'abord tes jours de plan dans « Paramètres des repas ».
        </Text>
      )}

      {jour !== null && (
        <>
          <SectionLabel t={t}>Combien en plus ce jour-là ?</SectionLabel>
          <View style={styles.wrap}>
            {BANK_PRESETS.map((k) => (
              <Chip key={k} t={t} label={`+${k}`} selected={courant === k} onPress={() => set(jour, k)} />
            ))}
            <Chip t={t} label="Aucun" selected={courant === 0} onPress={() => set(jour, null)} />
          </View>
          <Field
            t={t} label="Ou une valeur précise" suffix="kcal"
            value={courant ? String(courant) : ''}
            placeholder="600"
            keyboardType="numbers-and-punctuation"
            // onBlur et NON onEndEditing : ce dernier est un no-op sur react-native-web
            // (CLAUDE.md §11 — c'est le bug « %MG 23 → 33 »).
            onChangeText={(v) => {
              const n = parseInt(v.replace(/[^\d-]/g, ''), 10);
              set(jour, Number.isFinite(n) ? n : null);
            }}
          />
        </>
      )}

      <SectionLabel t={t}>Ta semaine après répartition</SectionLabel>
      <Card t={t}>
        {apercu.targets.map((kcal, i) => {
          const wd = (profile.plan_weekdays ?? [])[i];
          const label = WEEKDAY_OPTS.find((o) => o.val === wd)?.label ?? `J${i + 1}`;
          const ecart = kcal - profile.target_kcal;
          return (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 }}>
              <Text style={{ color: t.textSecondary, fontSize: 14 }}>{label}</Text>
              <Text style={{ color: ecart === 0 ? t.textSecondary : t.text, fontSize: 14, fontWeight: ecart === 0 ? '500' : '700' }}>
                {kcal} kcal{ecart !== 0 ? `  (${ecart > 0 ? '+' : ''}${ecart})` : ''}
              </Text>
            </View>
          );
        })}
      </Card>

      {apercu.uncompensatedKcal > 0 && (
        // Ni alarme ni reproche : un fait, et ce que ça implique. On ne masque pas
        // l'écart non repris — l'avaler en silence serait un mensonge (§10).
        <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 19 }}>
          Sur cette semaine, {apercu.uncompensatedKcal} kcal ne peuvent pas être reprises :
          les autres jours sont déjà à ton plancher de sécurité. Ta semaine finira un peu
          au-dessus de sa cible, et c'est très bien — le plancher passe avant.
        </Text>
      )}
    </EditorShell>
  );
}
