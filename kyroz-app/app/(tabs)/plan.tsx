import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemePalette, Radius, Spacing, cardShadow } from '../../constants/theme';
import { DISCLAIMER } from '../../constants/legal';
import { MacroBar } from '../../components/MacroBar';
import { MealCard } from '../../components/MealCard';
import { RecipeDetail } from '../../components/RecipeDetail';
import { RecipeEditor } from '../../components/RecipeEditor';
import { Sheet } from '../../components/Sheet';
import { StreakProgress } from '../../components/StreakProgress';
import { StreakCelebration } from '../../components/StreakCelebration';
import { WeightCheckin } from '../../components/WeightCheckin';
import { PlanCheckin } from '../../components/PlanCheckin';
import { OffPlanSheet } from '../../components/OffPlanSheet';
import { ActionSheet } from '../../components/ActionSheet';
import { PrimaryButton, SectionLabel } from '../../components/ui';
import { useProfile } from '../../hooks/useProfile';
import { useStreak } from '../../hooks/useStreak';
import { useWeightLog } from '../../hooks/useWeightLog';
import { usePlanCheckin } from '../../hooks/usePlanCheckin';
import { useRouter, useFocusEffect } from 'expo-router';
import { generateMealPlan } from '../../lib/generatePlan';
import { profileSignature, swapMeal, computeDailyTotals, rebalanceDay, resetTracking, adaptDayOptions, AdaptOption, mealIngredients } from '../../lib/planEngine';
import { kcalMargin } from '../../lib/foods';
import { todayStamp } from '../../lib/weight';
import { mealFiberFromIngredients, dailyFiberTarget } from '../../lib/fiber';
import { getRecipeById, getBaseRecipe } from '../../lib/recipes';
import { useRecipeOverrides } from '../../hooks/useRecipeOverrides';
import { loadPantry, savePantry, deductIngredients, recipeCoverage, PantryItem } from '../../lib/pantry';
import { loadFirstName } from '../../lib/profileName';
import { Macros, Meal, MealPlan, MealStatus, Recipe } from '../../lib/types';

const PLAN_KEY = '@kyroz:plan';
const LIST_KEY = '@kyroz:shopping';
const SEED_KEY = '@kyroz:planSeed';
const WD = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// Nb de jours du profil ramené dans [1, 7].
const clampDays = (n?: number) => Math.min(Math.max(n ?? 0, 1), 7);

const scaleMacros = (m: Macros, p: number): Macros => ({
  kcal: Math.round(m.kcal * p),
  protein_g: Math.round(m.protein_g * p),
  carbs_g: Math.round(m.carbs_g * p),
  fat_g: Math.round(m.fat_g * p),
});

// Égalité « de contenu » sur les champs qu'une personnalisation peut changer
// (évite de réécrire le plan à chaque montage quand rien n'a bougé).
const sameRecipe = (a: Recipe, b: Recipe): boolean =>
  a.name_fr === b.name_fr &&
  a.prep_time_min === b.prep_time_min &&
  a.macros_per_portion.kcal === b.macros_per_portion.kcal &&
  a.macros_per_portion.protein_g === b.macros_per_portion.protein_g &&
  a.macros_per_portion.carbs_g === b.macros_per_portion.carbs_g &&
  a.macros_per_portion.fat_g === b.macros_per_portion.fat_g &&
  a.ingredients.length === b.ingredients.length &&
  a.steps.length === b.steps.length;

// Lundi 00:00 de la semaine contenant `d` (semaine FR lun→dim).
function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();                  // 0=Dim … 6=Sam
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function PlanScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const { profile, saveProfile } = useProfile();
  const router = useRouter();
  const { streak, markActiveToday, celebration, clearCelebration } = useStreak();
  const { due: weighInDue } = useWeightLog();
  const [weighIn, setWeighIn] = useState(false);
  const { due: checkinDue, snooze: snoozeCheckin, optOutForever: optOutCheckin } = usePlanCheckin();
  const [checkinOpen, setCheckinOpen] = useState(false);
  const { overrides, saveOverride, resetOverride, isCustom } = useRecipeOverrides();
  const [editingRecipe, setEditingRecipe] = useState<Meal['recipe'] | null>(null);

  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [cookedNote, setCookedNote] = useState<string | null>(null);
  const [offPlanOpen, setOffPlanOpen] = useState(false);
  const [adaptPrompt, setAdaptPrompt] = useState<number | null>(null); // kcal de l'écart en attente de décision Oui/Non
  const [refreshing, setRefreshing] = useState(false);
  const autoTried = React.useRef(false);

  useEffect(() => { load(); }, []);
  useEffect(() => { loadFirstName().then(setFirstName); }, []);

  // Garde-manger : rechargé à chaque fois qu'on revient sur l'onglet Plan, pour
  // refléter ce qui a été coché dans Courses (synchro plan ↔ frigo).
  useFocusEffect(useCallback(() => { loadPantry().then(setPantry); }, []));

  // Première arrivée (depuis l'onboarding) : génère automatiquement le plan
  useEffect(() => {
    if (!loading && !plan && profile && !generating && !autoTried.current) {
      autoTried.current = true;
      generate();
    }
  }, [loading, plan, profile, generating]);

  // North Star (jours d'usage consécutifs) : un utilisateur actif qui OUVRE son
  // plan compte pour la journée — qu'il régénère ou non. C'est l'usage qu'on
  // veut récompenser (suivre son plan), pas le fait de cliquer « Nouveau plan ».
  useEffect(() => { if (profile) markActiveToday(); }, [profile]);

  // Auto-refresh : dès qu'un réglage qui affecte le plan change (jours, repas,
  // macros, objectif, régime…), on régénère automatiquement — plus besoin de
  // cliquer « Nouveau plan » ni de recharger la page. Grâce au profil PARTAGÉ,
  // une modif faite dans l'onglet Profil déclenche ça même sans changer d'onglet.
  const syncedSig = React.useRef<string | null>(null);
  useEffect(() => {
    if (!profile || !plan || generating) return;
    const sig = profileSignature(profile);
    if (plan.profile_sig === sig || syncedSig.current === sig) return;
    syncedSig.current = sig;
    generate();
  }, [profile, plan, generating]);

  // On ouvre le plan sur AUJOURD'HUI s'il fait partie des jours du plan, sinon
  // sur le prochain jour de plan à venir (et non toujours le jour 1).
  const todayIdx = useMemo(() => {
    if (!plan) return 1;
    const wds = profile?.plan_weekdays;
    const todayWd = new Date().getDay();
    if (!wds || wds.length === 0) return 1;          // repli legacy : aujourd'hui = jour 1
    const active = wds.slice(0, plan.days);
    const exact = active.indexOf(todayWd);
    if (exact >= 0) return exact + 1;                // aujourd'hui EST un jour de plan
    let best = 1, bestDelta = 99;                    // sinon : le prochain à venir
    active.forEach((wd, idx) => {
      const delta = (wd - todayWd + 7) % 7;
      if (delta < bestDelta) { bestDelta = delta; best = idx + 1; }
    });
    return best;
  }, [profile, plan]);
  useEffect(() => { setSelectedDay(todayIdx); }, [todayIdx]);

  // Répercute les recettes personnalisées (overrides) sur le plan déjà affiché :
  // chaque repas concerné prend la version effective, macros + totaux recalculés.
  // Guard par contenu → pas de réécriture inutile au montage.
  useEffect(() => {
    setPlan((prev) => {
      if (!prev) return prev;
      let changed = false;
      const meals = prev.meals.map((m) => {
        const eff = getRecipeById(m.recipe.id);
        if (eff && !sameRecipe(eff, m.recipe)) {
          changed = true;
          // Repas adapté (scaling par ingrédient) : garder macros + adapted_ingredients
          // (la re-adaptation se fait au recalage / nouvelle journée). Sinon, legacy.
          return m.adapted_ingredients
            ? { ...m, recipe: eff }
            : { ...m, recipe: eff, macros: scaleMacros(eff.macros_per_portion, m.portions) };
        }
        return m;
      });
      if (!changed) return prev;
      const updated = { ...prev, meals, total_macros_per_day: computeDailyTotals(meals, prev.days, prev.day_extras) };
      AsyncStorage.setItem(PLAN_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [overrides, plan]);

  // Nouvelle journée → page blanche : si le suivi (mangé/sauté/hors plan) date
  // d'un jour calendaire passé, on l'efface et on restaure les portions
  // canoniques. Sans ça, un repas marqué « mangé » hier resterait verrouillé.
  const resetTried = React.useRef<string | null>(null);
  useEffect(() => {
    if (!plan || !profile) return;
    const today = todayStamp();
    if (!plan.tracking_date || plan.tracking_date === today) return;
    if (resetTried.current === today) return;
    resetTried.current = today;
    persistPlan(resetTracking(profile, plan), false);
  }, [plan, profile]);

  const load = async () => {
    const raw = await AsyncStorage.getItem(PLAN_KEY);
    if (raw) setPlan(JSON.parse(raw));
    setLoading(false);
  };

  // reroll = true (bouton « Nouveau plan ») → seed incrémenté = plan différent.
  // reroll = false (1re génération / auto-refresh) → seed 0 = plan canonique.
  const generate = async (reroll = false) => {
    if (!profile) return;
    setGenerating(true);
    try {
      let seed = 0;
      if (reroll) {
        const raw = await AsyncStorage.getItem(SEED_KEY);
        seed = (raw ? parseInt(raw, 10) : 0) + 1;
        await AsyncStorage.setItem(SEED_KEY, String(seed));
      } else {
        await AsyncStorage.setItem(SEED_KEY, '0');
      }
      const p = await generateMealPlan(profile, seed);
      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(p));
      await AsyncStorage.removeItem(LIST_KEY);
      setPlan(p);
      await markActiveToday();
    } finally { setGenerating(false); }
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, []);

  const toast = (msg: string) => { setCookedNote(msg); setTimeout(() => setCookedNote(null), 2600); };

  // Persiste un plan modifié + invalide les courses (portions/repas changés) et
  // resynchronise la fiche repas ouverte si besoin.
  const persistPlan = async (newPlan: MealPlan, syncSelected = true) => {
    await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(newPlan));
    await AsyncStorage.removeItem(LIST_KEY);
    setPlan(newPlan);
    if (syncSelected) {
      setSelectedMeal((cur) => (cur ? newPlan.meals.find((m) => m.id === cur.id) ?? null : cur));
    }
  };

  // Pose un statut de suivi (mangé / sauté / re-planifié) sur un repas et recale
  // aussitôt les repas restants du jour pour rester dans la cible.
  const setMealStatus = async (meal: Meal, status: MealStatus | undefined, locked?: Macros) => {
    if (!plan || !profile) return plan;
    const meals = plan.meals.map((m) =>
      m.id === meal.id ? { ...m, status, locked_macros: status === 'eaten' ? locked : undefined } : m
    );
    const rebalanced = rebalanceDay(profile, { ...plan, meals, tracking_date: todayStamp() }, meal.day);
    await persistPlan(rebalanced);
    return rebalanced;
  };

  // « J'ai mangé » : verrouille le repas (compte dans le consommé), déduit du
  // garde-manger, recale les repas restants, compte pour la série.
  const cookMeal = async (meal: Meal) => {
    const items = await loadPantry();
    const next = deductIngredients(items, mealIngredients(meal));
    await savePantry(next);
    setPantry(next);
    await setMealStatus(meal, 'eaten', meal.macros);
    await markActiveToday(); // manger selon le plan = adhésion réelle
    setSelectedMeal(null);
    toast('✓ Mangé — journée recalée 👊');
  };

  // « Je l'ai sauté » : le repas ne compte pas, son budget bascule sur les
  // repas restants (qui grossissent). On garde la fiche ouverte (état + annuler).
  const skipMeal = async (meal: Meal) => {
    await setMealStatus(meal, 'skipped');
    toast('Repas sauté — journée recalée');
  };

  // Annule le suivi d'un repas (revient à « planifié ») + recale.
  const resetMealStatus = async (meal: Meal) => {
    await setMealStatus(meal, undefined);
  };

  // « J'ai mangé hors plan » : on ENREGISTRE l'écart (compté à part dans le total)
  // SANS toucher au plan, puis on PROPOSE de réadapter (Oui/Non). Avant, ça recalait
  // tout seul — désormais on demande d'abord (le plan ne change que sur accord).
  const logOffPlan = async (kcal: number) => {
    if (!plan || !profile) return;
    const extra: Macros = { kcal, protein_g: 0, carbs_g: 0, fat_g: 0 };
    const day_extras = { ...(plan.day_extras ?? {}), [selectedDay]: extra };
    const updated: MealPlan = {
      ...plan,
      day_extras,
      tracking_date: todayStamp(),
      total_macros_per_day: computeDailyTotals(plan.meals, plan.days, day_extras),
    };
    await persistPlan(updated, false);
    setAdaptPrompt(kcal); // → propose la réadaptation
  };

  // Applique une option d'adaptation choisie (répartir / sauter collation / dîner).
  const applyAdapt = async (opt: AdaptOption) => {
    if (!plan) { setAdaptPrompt(null); return; }
    await persistPlan({ ...opt.plan, tracking_date: todayStamp() }, false);
    setAdaptPrompt(null);
    toast('Journée réadaptée 👊');
  };
  // « Non, je garde mon plan » : on ne touche à rien, l'écart reste compté à part.
  const declineAdapt = () => { setAdaptPrompt(null); toast('Ok, on garde ton plan 😎'); };

  // « Remplacer ce repas » : échange UN repas contre une alternative équivalente.
  const swapSelectedMeal = async () => {
    if (!plan || !profile || !selectedMeal) return;
    const newPlan = swapMeal(profile, plan, selectedMeal);
    await persistPlan(newPlan);
    // Rafraîchit la fiche ouverte avec la nouvelle recette + quantités/macros adaptées.
    const swapped = newPlan.meals.find((m) => m.id === selectedMeal.id);
    if (swapped) setSelectedMeal(swapped);
  };

  // Met la fiche ouverte à jour après personnalisation (le plan, lui, est
  // répercuté par l'effet sur `overrides`).
  const applyRecipeToSelected = (r: Recipe) => {
    setSelectedMeal((m) =>
      m
        ? m.adapted_ingredients
          ? { ...m, recipe: r } // garder macros + quantités adaptées
          : { ...m, recipe: r, macros: scaleMacros(r.macros_per_portion, m.portions) }
        : m,
    );
  };

  const dayMeals = plan?.meals.filter((m) => m.day === selectedDay) ?? [];
  const dayMacros = plan?.total_macros_per_day[selectedDay - 1];
  // Fibres : seuls les repas non sautés comptent (un repas sauté n'est pas mangé).
  // Estimées depuis les quantités EFFECTIVES (adaptées par ingrédient si présentes).
  const dayFiber = dayMeals.reduce((s, m) => (m.status === 'skipped' ? s : s + mealFiberFromIngredients(mealIngredients(m))), 0);
  const fiberTarget = profile ? dailyFiberTarget(profile) : 0;
  const dayExtraKcal = plan?.day_extras?.[selectedDay]?.kcal ?? 0;

  // Retire l'écart hors plan du jour. Cohérent avec le nouveau principe « on ne
  // touche au plan que sur demande » : on recompte juste le total, sans recaler.
  const clearOffPlan = async () => {
    if (!plan || !profile) return;
    const day_extras = { ...(plan.day_extras ?? {}) };
    delete day_extras[selectedDay];
    const updated: MealPlan = {
      ...plan,
      day_extras,
      total_macros_per_day: computeDailyTotals(plan.meals, plan.days, day_extras),
    };
    await persistPlan(updated, false);
  };

  const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Dates du bandeau : toujours ancrées sur la SEMAINE EN COURS (jamais figées
  // sur la date de génération → plus de dates périmées comme « 5/6/7 » un lundi 8).
  const dayMeta = (i: number) => {
    const today = new Date();
    const wds = profile?.plan_weekdays;
    if (wds && wds.length > i) {
      const target = wds[i];                          // getDay 0..6
      const monday = startOfWeekMonday(today);
      const offset = target === 0 ? 6 : target - 1;   // lun=0 … dim=6
      const d = new Date(monday); d.setDate(monday.getDate() + offset);
      return { wd: WD[target], num: d.getDate() };
    }
    // Repli legacy (profil sans jours) : jours consécutifs à partir d'aujourd'hui
    const d = new Date(today); d.setDate(today.getDate() + i);
    return { wd: WD[d.getDay()], num: d.getDate() };
  };

  // Plan désynchronisé du profil (ex. profil passé à 5 j, plan figé à 3 j).
  const intendedDays = profile?.plan_days;
  const planStale = !!(
    plan && typeof intendedDays === 'number' && intendedDays >= 1 &&
    clampDays(intendedDays) !== plan.days
  );

  // ── Actions du check-in « ton plan te convient ? » ─────────────────────────
  // Les tweaks (variété, prépa) changent la signature du profil → le plan se
  // régénère tout seul via l'effet d'auto-refresh.
  const lowerPrep = (cur: number) => (cur > 20 ? 20 : cur > 15 ? 15 : 10);
  const checkinSatisfied = () => { snoozeCheckin(); setCheckinOpen(false); toast('Parfait, on continue 👊'); };
  const checkinMoreVariety = () => { if (profile) saveProfile({ ...profile, variety: 'max' }); snoozeCheckin(); setCheckinOpen(false); toast('Variété au max — nouveau plan en route'); };
  const checkinLessPrep = () => { if (profile) saveProfile({ ...profile, max_prep_time_min: lowerPrep(profile.max_prep_time_min) }); snoozeCheckin(); setCheckinOpen(false); toast('Recettes plus rapides — nouveau plan en route'); };
  const checkinNewPlan = () => { snoozeCheckin(); setCheckinOpen(false); generate(true); };
  const checkinAdjustProfile = () => { snoozeCheckin(); setCheckinOpen(false); router.push('/(tabs)/profil'); };
  const checkinOptOut = () => { optOutCheckin(); setCheckinOpen(false); toast('Ok. Réactivable dans Profil.'); };

  if (loading) {
    return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={t.textTertiary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.textTertiary} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.date}>{todayLabel.toUpperCase()}</Text>
            <Text style={s.h1}>{firstName ? `Salut ${firstName} 👋` : 'Ton plan'}</Text>
          </View>
          <View style={s.streak}>
            <Text style={{ fontSize: 15 }}>🔥</Text>
            <Text style={s.streakN}>{streak.current_streak_days}</Text>
          </View>
        </View>

        {/* Progression vers l'objectif 7 jours (North Star) */}
        <StreakProgress t={t} streak={streak} variant="strip" />

        {/* Check-in poids hebdo : ramène l'utilisateur + garde le plan juste dans le temps */}
        {weighInDue && (
          <TouchableOpacity style={s.weighBanner} onPress={() => setWeighIn(true)} activeOpacity={0.85}>
            <Text style={{ fontSize: 18 }}>⚖️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.weighTitle}>C'est le moment de te peser</Text>
              <Text style={s.weighSub}>Mets à jour ton poids — on réajuste tes macros et ton plan.</Text>
            </View>
            <Text style={s.bannerCta}>→</Text>
          </TouchableOpacity>
        )}

        {/* Proposition d'ajustement périodique (opt-out réactivable dans Profil) */}
        {checkinDue && (
          <TouchableOpacity style={s.weighBanner} onPress={() => setCheckinOpen(true)} activeOpacity={0.85}>
            <Text style={{ fontSize: 18 }}>🍽️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.weighTitle}>Ton plan te convient toujours ?</Text>
              <Text style={s.weighSub}>Dis-nous ce qui coince — on ajuste en un tap.</Text>
            </View>
            <Text style={s.bannerCta}>→</Text>
          </TouchableOpacity>
        )}

        {plan ? (
          <>
            {/* Plan désynchronisé du profil → mise à jour en 1 tap */}
            {planStale && !generating && (
              <TouchableOpacity style={s.banner} onPress={() => generate()} activeOpacity={0.85} disabled={generating}>
                <Text style={s.bannerTxt}>
                  Ton plan ({plan.days} j) ne correspond plus à tes réglages ({clampDays(intendedDays)} j).
                </Text>
                <Text style={s.bannerCta}>{generating ? 'Mise à jour…' : 'Mettre à jour →'}</Text>
              </TouchableOpacity>
            )}

            {/* Day strip — réparti sur toute la largeur, tous les jours conservés */}
            <View style={s.days}>
              {Array.from({ length: plan.days }).map((_, i) => {
                const n = i + 1; const on = selectedDay === n; const meta = dayMeta(i);
                return (
                  <TouchableOpacity key={n} onPress={() => setSelectedDay(n)} activeOpacity={0.85}
                    style={[s.day, { backgroundColor: on ? t.accent : t.card, borderColor: on ? t.accent : t.line }]}>
                    <Text style={[s.dayWd, { color: on ? t.onAccent : t.textTertiary }]}>{meta.wd}</Text>
                    <Text style={[s.dayNum, { color: on ? t.onAccent : t.textSecondary }]}>{meta.num}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Summary */}
            {dayMacros && (
              <View style={[s.card, cardShadow(t)]}>
                <SectionLabel t={t}>Jour {selectedDay}</SectionLabel>
                <View style={{ height: 10 }} />
                <MacroBar {...dayMacros} targetKcal={profile?.target_kcal} />
                {profile && <TargetDelta t={t} actual={dayMacros.kcal} target={profile.target_kcal} />}
                <MarginNote t={t} kcal={dayMacros.kcal} />
                {profile && <FiberRow t={t} actual={dayFiber} target={fiberTarget} />}
                {dayExtraKcal > 0 && (
                  <View style={s.extraRow}>
                    <Text style={{ color: t.textSecondary, fontSize: 13 }}>
                      {(dayMacros.kcal - dayExtraKcal).toLocaleString('fr-FR')} plan
                      <Text style={{ color: t.text, fontWeight: '700' }}>{` + ${dayExtraKcal} kcal assumées 😎`}</Text>
                    </Text>
                    <TouchableOpacity onPress={clearOffPlan} hitSlop={8}>
                      <Text style={{ color: t.textTertiary, fontSize: 13, fontWeight: '700' }}>Retirer</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity onPress={() => setOffPlanOpen(true)} activeOpacity={0.7} style={s.offPlanBtn}>
                  <Text style={s.offPlanTxt}>+ J'ai mangé hors plan</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Meals */}
            <SectionLabel t={t}>Repas du jour</SectionLabel>
            <View style={{ gap: 10 }}>
              {dayMeals.map((m) => {
                const fridgeTracked = pantry.length > 0;
                const missing = fridgeTracked ? recipeCoverage(m.recipe, pantry).missing.map((i) => i.name) : undefined;
                return (
                  <MealCard
                    key={m.id}
                    meal={m}
                    onPress={() => setSelectedMeal(m)}
                    onCook={() => cookMeal(m)}
                    missing={missing}
                    fridgeTracked={fridgeTracked}
                  />
                );
              })}
            </View>

            <View style={{ marginTop: 6 }}>
              <PrimaryButton t={t} label="↻  Nouveau plan" onPress={() => generate(true)} loading={generating} />
            </View>
          </>
        ) : (
          <View style={s.empty}>
            <View style={[s.emptyIcon, { backgroundColor: t.fill }]}>
              <Text style={{ fontSize: 30 }}>🍽️</Text>
            </View>
            <Text style={s.emptyTitle}>Prêt à démarrer ?</Text>
            <Text style={s.emptySub}>Kyroz génère ton plan repas, les recettes et la liste de courses en un instant.</Text>
            <View style={{ height: 8 }} />
            <PrimaryButton t={t} label="Générer mon plan" onPress={() => generate()} loading={generating} />
          </View>
        )}

        <Text style={s.disclaimer}>{DISCLAIMER}</Text>
      </ScrollView>

      {/* Toast « cuisiné » */}
      {cookedNote && (
        <View style={[s.toast, { pointerEvents: 'none' }]}>
          <Text style={s.toastTxt}>{cookedNote}</Text>
        </View>
      )}

      {/* Fiche recette du repas sélectionné */}
      <Sheet visible={!!selectedMeal} onClose={() => setSelectedMeal(null)}>
        {selectedMeal && (
          <RecipeDetail
            recipe={selectedMeal.recipe}
            portions={selectedMeal.portions}
            adaptedIngredients={selectedMeal.adapted_ingredients}
            adaptedMacros={selectedMeal.adapted_ingredients ? selectedMeal.macros : undefined}
            adaptFlags={selectedMeal.adapt_flags}
            restrictionRelaxed={selectedMeal.restriction_relaxed}
            custom={isCustom(selectedMeal.recipe.id)}
            status={selectedMeal.status}
            onEdit={() => setEditingRecipe(selectedMeal.recipe)}
            onClose={() => setSelectedMeal(null)}
            onCook={() => cookMeal(selectedMeal)}
            onSkip={() => skipMeal(selectedMeal)}
            onResetStatus={() => resetMealStatus(selectedMeal)}
            onSwap={swapSelectedMeal}
          />
        )}
      </Sheet>

      {/* Personnalisation de la recette du repas */}
      <Sheet visible={!!editingRecipe} onClose={() => setEditingRecipe(null)}>
        {editingRecipe && (
          <RecipeEditor
            t={t}
            recipe={editingRecipe}
            isCustom={isCustom(editingRecipe.id)}
            onSave={(r) => { saveOverride(r); applyRecipeToSelected(r); setEditingRecipe(null); }}
            onReset={() => {
              const base = getBaseRecipe(editingRecipe.id);
              resetOverride(editingRecipe.id);
              if (base) applyRecipeToSelected(base);
              setEditingRecipe(null);
            }}
            onCancel={() => setEditingRecipe(null)}
          />
        )}
      </Sheet>

      {/* Célébration quand un palier de série est franchi (3/7/14…) */}
      <StreakCelebration milestone={celebration} onClose={clearCelebration} />

      {/* « J'ai mangé hors plan » → enregistre l'écart, puis propose de réadapter */}
      <Sheet visible={offPlanOpen} onClose={() => setOffPlanOpen(false)}>
        <OffPlanSheet t={t} onLog={logOffPlan} onClose={() => setOffPlanOpen(false)} />
      </Sheet>

      {/* Consentement : on ne réadapte le plan que si l'utilisateur le demande */}
      <ActionSheet visible={adaptPrompt !== null} onClose={declineAdapt}>
        <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 }}>
          +{adaptPrompt ?? 0} kcal assumées, c'est noté 😎
        </Text>
        {(() => {
          const opts = (plan && profile) ? adaptDayOptions(profile, plan, selectedDay, new Date().getHours()) : [];
          if (opts.length === 0) {
            return (
              <>
                <Text style={{ color: t.textSecondary, fontSize: 14, lineHeight: 20 }}>
                  Tes repas du jour sont déjà passés — il n'y a plus rien à réadapter. On garde tout tel quel.
                </Text>
                <TouchableOpacity onPress={declineAdapt} style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ color: t.textSecondary, fontSize: 15, fontWeight: '600' }}>Compris</Text>
                </TouchableOpacity>
              </>
            );
          }
          return (
            <>
              <Text style={{ color: t.textSecondary, fontSize: 14, lineHeight: 20 }}>
                Comment tu veux rentrer dans ta cible ? Tes protéines restent pleines dans tous les cas.
              </Text>
              {opts.map((o) => (
                <TouchableOpacity
                  key={o.key} onPress={() => applyAdapt(o)} activeOpacity={0.85}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: t.line, borderRadius: 14, padding: 14 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>{o.label}</Text>
                    <Text style={{ color: t.textTertiary, fontSize: 12, marginTop: 2 }}>{o.detail}</Text>
                  </View>
                  <Text style={{ color: t.text, fontSize: 14, fontWeight: '700' }}>≈ {o.dayKcal.toLocaleString('fr-FR')}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={declineAdapt} style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ color: t.textSecondary, fontSize: 15, fontWeight: '600' }}>Non, je garde mon plan</Text>
              </TouchableOpacity>
            </>
          );
        })()}
      </ActionSheet>

      {/* Check-in poids hebdo */}
      <Sheet visible={weighIn} onClose={() => setWeighIn(false)}>
        <WeightCheckin t={t} onClose={() => setWeighIn(false)} />
      </Sheet>

      {/* Check-in « ton plan te convient ? » */}
      <Sheet visible={checkinOpen} onClose={() => { snoozeCheckin(); setCheckinOpen(false); }}>
        <PlanCheckin
          t={t}
          onSatisfied={checkinSatisfied}
          onMoreVariety={checkinMoreVariety}
          onLessPrep={checkinLessPrep}
          onNewPlan={checkinNewPlan}
          onAdjustInProfile={checkinAdjustProfile}
          onOptOut={checkinOptOut}
        />
      </Sheet>
    </SafeAreaView>
  );
}

function TargetDelta({ t, actual, target }: { t: ThemePalette; actual: number; target: number }) {
  const delta = actual - target;
  const onTarget = Math.abs(delta) <= 100;
  const color = onTarget ? t.success : t.warning;
  const sign = delta > 0 ? '+' : '';
  return (
    <View style={[styles.target, { borderTopColor: t.line }]}>
      <Text style={{ color: t.textTertiary, fontSize: 13 }}>Objectif {target.toLocaleString('fr-FR')} kcal</Text>
      <Text style={{ color, fontSize: 13, fontWeight: '700' }}>{onTarget ? '✓ Dans la cible' : `${sign}${delta} kcal`}</Text>
    </View>
  );
}

function MarginNote({ t, kcal }: { t: ThemePalette; kcal: number }) {
  const margin = kcalMargin(kcal);
  if (kcal <= 0 || margin <= 0) return null;
  return (
    <Text style={{ color: t.textTertiary, fontSize: 12, marginTop: 8, lineHeight: 16 }}>
      ≈ {(kcal - margin).toLocaleString('fr-FR')}–{(kcal + margin).toLocaleString('fr-FR')} kcal · valeurs moyennes, marge ± {margin}
    </Text>
  );
}

function FiberRow({ t, actual, target }: { t: ThemePalette; actual: number; target: number }) {
  // Tolérance : on alerte seulement nettement sous la cible (−5 g), sinon ✓.
  const ok = actual >= target - 5;
  return (
    <View style={styles.fiber}>
      <Text style={{ color: t.textTertiary, fontSize: 13 }}>🌾 Fibres {actual} g / {target} g</Text>
      <Text style={{ color: ok ? t.success : t.warning, fontSize: 13, fontWeight: '700' }}>
        {ok ? '✓ Bon apport' : 'Un peu juste'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  target: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  fiber: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
});

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: Spacing.xl, gap: 20, paddingBottom: 120 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    date: { color: t.textTertiary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    h1: { color: t.text, fontSize: 30, fontWeight: '800', letterSpacing: -1, marginTop: 3 },
    streak: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill },
    streakN: { color: t.text, fontSize: 15, fontWeight: '800' },
    banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: t.fill, borderWidth: 1, borderColor: t.line, borderRadius: Radius.md, padding: 14 },
    weighBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: Radius.md, padding: 14 },
    weighTitle: { color: t.text, fontSize: 15, fontWeight: '700' },
    weighSub: { color: t.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 2 },
    bannerTxt: { flex: 1, color: t.textSecondary, fontSize: 13, lineHeight: 18 },
    bannerCta: { color: t.text, fontSize: 13, fontWeight: '700' },
    days: { flexDirection: 'row', gap: 8 },
    day: { flex: 1, height: 58, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
    dayWd: { fontSize: 11, fontWeight: '600' },
    dayNum: { fontSize: 15, fontWeight: '700' },
    card: { backgroundColor: t.card, borderRadius: Radius.xl, padding: Spacing.xxl },
    extraRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    offPlanBtn: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: t.line, alignItems: 'center' },
    offPlanTxt: { color: t.textSecondary, fontSize: 14, fontWeight: '600' },
    empty: { alignItems: 'center', gap: 10, paddingVertical: 24 },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    emptyTitle: { color: t.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    emptySub: { color: t.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 21, paddingHorizontal: 10 },
    disclaimer: { color: t.textTertiary, fontSize: 11, lineHeight: 16, textAlign: 'center' },
    toast: { position: 'absolute', left: 20, right: 20, bottom: 28, backgroundColor: t.accent, borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
    toastTxt: { color: t.onAccent, fontSize: 14, fontWeight: '700' },
  });
}
