import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemePalette, Radius, Spacing, Type } from '../../constants/theme';
import { useCollapsingTitle, CompactTitleBar } from '../../components/CollapsingTitle';
import { useLayout } from '../../constants/layout';
import { DISCLAIMER } from '../../constants/legal';
import { MacroBar } from '../../components/MacroBar';
import { MealCard } from '../../components/MealCard';
import { RecipeDetail } from '../../components/RecipeDetail';
import { RecipeEditor } from '../../components/RecipeEditor';
import { Sheet } from '../../components/Sheet';
import { StreakProgress } from '../../components/StreakProgress';
import { StreakCelebration } from '../../components/StreakCelebration';
import { BirthdayCelebration } from '../../components/BirthdayCelebration';
import { FirstPlanReveal } from '../../components/FirstPlanReveal';
import { WeightCheckin } from '../../components/WeightCheckin';
import { PlanCheckin } from '../../components/PlanCheckin';
import { OffPlanSheet } from '../../components/OffPlanSheet';
import { DislikeSheet } from '../../components/DislikeSheet';
import { ActionSheet } from '../../components/ActionSheet';
import { PrimaryButton, SectionLabel } from '../../components/ui';
import { HydrationBar, useHydrationEnabled } from '../../components/HydrationBar';
import { AnalyticsConsentBanner } from '../../components/AnalyticsConsentBanner';
import { DatedGoalCard } from '../../components/DatedGoalCard';
import { useTourTarget, useTour, hasSeenTour, TourStep } from '../../components/GuidedTour';
import { useProfile } from '../../hooks/useProfile';
import { useFavorites } from '../../hooks/useFavorites';
import { useStreak } from '../../hooks/useStreak';
import { useWeightLog } from '../../hooks/useWeightLog';
import { usePlanCheckin } from '../../hooks/usePlanCheckin';
import { useRouter, useFocusEffect } from 'expo-router';
import { buildLocalPlan, carryTracking, nextPlanSeed, profileSignature, swapMeal, computeDailyTotals, rebalanceDay, resetTracking, adaptDayOptions, AdaptOption, mealIngredients, reAdaptMealRecipe, mealPoolSize, dayTargetKcal, ON_TARGET_TOLERANCE_KCAL } from '../../lib/planEngine';
import { DISLIKE_THRESHOLD, dislikeCandidates, applyDislikedIngredient } from '../../lib/dislike';
import { todayStamp } from '../../lib/weight';
import { recordOffPlan, resolveOffPlan, forgetOffPlan } from '../../lib/offPlanJournal';
import { isBirthday, ageOn } from '../../lib/birthday';
import { mealFiberFromIngredients, dailyFiberTarget } from '../../lib/fiber';
import { getRecipeById, getBaseRecipe } from '../../lib/recipes';
import { useRecipeOverrides } from '../../hooks/useRecipeOverrides';
import { loadPantry, savePantry, deductIngredients, recipeCoverage, PantryItem } from '../../lib/pantry';
import { loadFirstName } from '../../lib/profileName';
import { capture, Events } from '../../lib/analytics';
import { DayExtra, Macros, Meal, MealPlan, MealStatus, Recipe } from '../../lib/types';

const PLAN_KEY = '@kyroz:plan';
const LIST_KEY = '@kyroz:shopping';
const SEED_KEY = '@kyroz:planSeed';
// Drapeau posé par Profil (« Régénérer mon plan ») → l'écran Plan rejoue une
// génération « reroll » au prochain focus. Découple les deux écrans sans prop.
const REROLL_KEY = '@kyroz:planReroll';
// Reveal du 1er plan (J1) : posé après la toute première génération (depuis
// l'onboarding) → l'overlay ne s'affiche QU'UNE fois. Backfillé pour les profils
// qui ont déjà un plan (ne pas le montrer aux utilisateurs existants).
const FIRST_PLAN_KEY = '@kyroz:firstPlanSeen';
// Anniversaire déjà fêté — on stocke l'ANNÉE, pas un booléen : un booléen serait à
// remettre à zéro quelque part, et ce « quelque part » n'existe pas (personne ne
// tourne un cron dans une app locale). Comparer l'année stockée à l'année courante
// se suffit à lui-même, et survit à une année sautée.
const BIRTHDAY_KEY = '@kyroz:birthdaySeenYear';
const WD = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// Visite guidée de l'onglet Plan (pilote). Les bulles ne s'affichent que la 1re
// fois (mémorisé), et sont rejouables via le « ? » de l'en-tête.
const PLAN_TOUR: TourStep[] = [
  {
    targetId: 'plan-days',
    title: 'Navigue dans ta semaine',
    text: "Tes 7 jours de plan. Touche un jour pour voir ses repas — celui en surbrillance est affiché en dessous.",
  },
  {
    targetId: 'plan-macros',
    title: 'Tes cibles du jour',
    text: "Tes calories visées et la répartition protéines / glucides / lipides. La barre se remplit à mesure que tu marques tes repas comme cuisinés.",
  },
  {
    targetId: 'plan-offplan',
    title: 'Mangé hors plan ?',
    text: "Ajoute un écart ici : Kyroz recale automatiquement les repas restants pour absorber les calories en plus, sans casser ton objectif.",
  },
  {
    targetId: 'plan-meal',
    title: 'Ouvre une recette',
    text: "Touche un repas pour voir ses ingrédients ajustés à tes macros, ses badges d'adaptation, et le bouton « Échanger ce repas » si tu veux autre chose.",
  },
  {
    targetId: 'plan-cook',
    title: 'Marque-le comme cuisiné',
    text: "Quand tu as préparé un plat, tape « J'ai cuisiné » : les ingrédients se déduisent de ton frigo et ta journée se recale toute seule.",
  },
];

// Nb de jours du profil ramené dans [1, 7].
const clampDays = (n?: number) => Math.min(Math.max(n ?? 0, 1), 7);


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
  const layout = useLayout();
  const { profile, saveProfile } = useProfile();
  const { favorites } = useFavorites();
  const router = useRouter();
  const [hydrationEnabled] = useHydrationEnabled(); // réglage Profil : afficher/masquer la barre
  const { startTour } = useTour();
  const { streak, markActiveToday, celebration, clearCelebration, froze, clearFroze } = useStreak();
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
  // Élicitation « quel ingrédient tu n'aimes pas ? » : non-null = feuille ouverte
  // avec ces candidats (déclenchée par un 👎 qui vide trop le pool d'un repas).
  const [dislikeElicit, setDislikeElicit] = useState<{ label: string; kw: string; count: number }[] | null>(null);
  const [cookedNote, setCookedNote] = useState<string | null>(null);
  const [offPlanOpen, setOffPlanOpen] = useState(false);
  const [adaptPrompt, setAdaptPrompt] = useState<number | null>(null); // kcal de l'écart en attente de décision Oui/Non
  const [refreshing, setRefreshing] = useState(false);
  const [showReveal, setShowReveal] = useState(false); // overlay « 1er plan prêt » (J1)
  const [birthdayAge, setBirthdayAge] = useState<number | null>(null); // 🎂 une fois l'an
  const autoTried = React.useRef(false);
  const tourTried = React.useRef(false);
  const scrollRef = React.useRef<ScrollView>(null);
  const repli = useCollapsingTitle();
  // Cibles de la visite guidée (ref directe sur l'élément → spotlight aligné).
  const daysRef = useTourTarget('plan-days');
  const macrosRef = useTourTarget('plan-macros');
  const offplanRef = useTourTarget('plan-offplan');

  useEffect(() => { load(); }, []);
  useEffect(() => { loadFirstName().then(setFirstName); }, []);

  // Visite guidée : au 1er affichage d'un plan, on lance le tour s'il n'a jamais
  // été vu. Petit délai pour laisser la mise en page (et le ScrollView) se poser.
  useEffect(() => {
    // Le reveal du 1er plan passe AVANT le tour : tant qu'il est affiché, on
    // n'arme pas le tour (tourTried reste false) → il démarre à sa fermeture.
    if (loading || !plan || tourTried.current || showReveal) return;
    tourTried.current = true;
    hasSeenTour('plan').then((seen) => {
      if (!seen) setTimeout(() => startTour('plan', PLAN_TOUR, { scrollRef }), 650);
    });
  }, [loading, plan, startTour, showReveal]);

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
  useEffect(() => { if (profile) { markActiveToday(); capture(Events.planOpened); } }, [profile]);

  // Analytics : palier de série franchi (3/7/14…) — no-op tant que non consenti.
  useEffect(() => { if (celebration) capture(Events.streakMilestone, { days: celebration }); }, [celebration]);

  // 🎂 Anniversaire — une fois par an, à l'ouverture du Plan.
  // Il ne s'affiche QUE si la date de naissance est connue : les comptes créés
  // avant le 2026-08-02 n'en ont pas, et on n'en invente pas.
  useEffect(() => {
    if (!profile?.birth_date) return;
    const today = todayStamp();
    if (!isBirthday(profile.birth_date, today)) return;
    const annee = today.slice(0, 4);
    AsyncStorage.getItem(BIRTHDAY_KEY).then((vu) => {
      if (vu === annee) return;
      const age = ageOn(profile.birth_date, today);
      if (age != null) setBirthdayAge(age);
    });
  }, [profile?.birth_date]);
  const closeBirthday = useCallback(() => {
    setBirthdayAge(null);
    AsyncStorage.setItem(BIRTHDAY_KEY, todayStamp().slice(0, 4));
  }, []);

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
          // Ré-adapte la recette au budget macro courant du repas → ingrédients +
          // macros cohérents avec la recette affichée tout de suite (courses/frigo
          // /fibres lisent adapted_ingredients). Repli legacy géré dans le helper.
          return reAdaptMealRecipe(m, eff);
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
    if (raw) {
      setPlan(JSON.parse(raw));
      // Un plan existe déjà → utilisateur NON nouveau : on marque le reveal comme vu
      // (il ne doit s'afficher qu'aux vrais primo-arrivants depuis l'onboarding).
      AsyncStorage.setItem(FIRST_PLAN_KEY, '1');
    }
    setLoading(false);
  };

  // reroll = true (bouton « Nouveau plan ») → seed incrémenté = plan différent.
  // reroll = false (1re génération / auto-refresh) → on GARDE le seed courant.
  //
  // ⚠️ Avant le 2026-08-02, ce chemin remettait le seed à 0. Conséquence mesurée
  // (`npm run mesure:reglages`) : dès que l'utilisateur touchait UN réglage, l'auto-
  // refresh rejouait une génération canonique et détruisait 92 % de la semaine qu'il
  // s'était choisie EN PLUS de ce que le réglage changeait légitimement (66 %) —
  // et dans 2 cas sur 16 il retombait sur le plan canonique EXACT qu'il venait de
  // rejeter en régénérant. Le pire cas : ajouter un aliment évité ABSENT de son plan
  // (donc sans le moindre effet légitime) suffisait à tout effacer.
  // Garder le seed ne coûte rien en qualité — mesuré sur le panel de référence :
  // écart calorique du jour 0,21 → 0,43 % (la tolérance est à 5 %), drapeaux bloquants
  // 0,00 → 0,11 % des repas, aucun créneau monopolisé — et fait GAGNER sur la variété
  // (semaines avec quasi-doublon 26,7 % au canonique contre 20,7 % au régénéré).
  // Un nouvel utilisateur n'a pas de seed enregistré → 0 → plan canonique, inchangé.
  const generate = async (reroll = false) => {
    if (!profile) return;
    setGenerating(true);
    try {
      const seed = nextPlanSeed(await AsyncStorage.getItem(SEED_KEY), reroll);
      await AsyncStorage.setItem(SEED_KEY, String(seed));
      // Pause de transition VOLONTAIRE, pas une attente réseau : le moteur local
      // génère un plan 7 jours en ~8 ms (mesuré), donc sans elle le plan apparaît
      // avant que l'utilisateur ait vu que quelque chose se passait. Elle vivait
      // dans `generatePlan.ts` (supprimé le 2026-07-31 avec le chemin IA) où elle
      // était étiquetée « UX : transition fluide ». La retirer = décision d'UX.
      await new Promise((r) => setTimeout(r, 600));
      // Le SUIVI de la journée survit à la génération (cf. `carryTracking`). Sans ça,
      // régénérer en cours de journée effaçait les repas marqués « mangé » et les
      // écarts hors plan — mesuré : 1 448 kcal déjà avalées oubliées en moyenne, après
      // quoi l'app replanifiait une journée pleine par-dessus.
      // ⚠️ Y COMPRIS sur un reroll explicite, et c'est délibéré : ce qui a été mangé
      // est un FAIT, pas une préférence. « Repartir de zéro » veut dire de nouveaux
      // repas à venir, pas l'amnésie sur ce matin — sinon le budget restant est faux
      // exactement de la même façon. Le passage à une nouvelle journée, lui, reste géré
      // par `resetTracking` (effet dédié plus haut).
      const ancienRaw = await AsyncStorage.getItem(PLAN_KEY);
      const ancien = ancienRaw ? (JSON.parse(ancienRaw) as MealPlan) : null;
      const p = carryTracking(profile, ancien, buildLocalPlan(profile, seed));
      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(p));
      await AsyncStorage.removeItem(LIST_KEY);
      // Reveal J1 : seulement à la 1re génération (pas un reroll) et jamais revu.
      // setShowReveal AVANT setPlan → le tour guidé ne s'arme pas tant que le
      // reveal est ouvert (cf. effet du tour).
      if (!reroll && !(await AsyncStorage.getItem(FIRST_PLAN_KEY))) {
        await AsyncStorage.setItem(FIRST_PLAN_KEY, '1');
        setShowReveal(true);
        capture(Events.firstPlanViewed);
      }
      setPlan(p);
      await markActiveToday();
    } finally { setGenerating(false); }
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, []);

  // « Régénérer mon plan » depuis Profil : le drapeau est posé là-bas, on le
  // consomme au focus de l'écran Plan et on rejoue une génération « reroll ».
  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem(REROLL_KEY).then((v) => {
      if (v === '1') { AsyncStorage.removeItem(REROLL_KEY); generate(true); }
    });
  }, [profile]));

  const toast = (msg: string) => { setCookedNote(msg); setTimeout(() => setCookedNote(null), 2600); };

  // Bouclier de série : un jour manqué vient d'être pardonné → on rassure l'utilisateur.
  useEffect(() => {
    if (froze) { toast('🛡️ Série protégée — un jour manqué pardonné. Reviens demain 👊'); capture(Events.streakFrozen); clearFroze(); }
  }, [froze]);

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
    capture(Events.mealCooked, { meal_type: meal.meal_type });
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
  const logOffPlan = async (kcal: number, label?: string) => {
    if (!plan || !profile) return;
    // `label` = ce que c'était (E6). Étalé conditionnellement : une clé absente dit
    // « on ne sait pas », une chaîne vide dirait « ça s'appelle rien ».
    const extra: DayExtra = { kcal, protein_g: 0, carbs_g: 0, fat_g: 0, ...(label ? { label } : {}) };
    const day_extras = { ...(plan.day_extras ?? {}), [selectedDay]: extra };
    const updated: MealPlan = {
      ...plan,
      day_extras,
      tracking_date: todayStamp(),
      total_macros_per_day: computeDailyTotals(plan.meals, plan.days, day_extras),
    };
    await persistPlan(updated, false);
    // Journal des écarts (E6). Le plan est effacé au changement de jour, donc
    // l'écart n'y survit pas 24 h : ce qui doit RESTER vit dans un journal à part.
    await recordOffPlan(selectedDay, kcal, label);
    setAdaptPrompt(kcal); // → propose la réadaptation
  };

  // Applique une option d'adaptation choisie (répartir / sauter collation / dîner).
  const applyAdapt = async (opt: AdaptOption) => {
    if (!plan) { setAdaptPrompt(null); return; }
    await persistPlan({ ...opt.plan, tracking_date: todayStamp() }, false);
    // Ce que le recalage REPREND est la seule chose que l'historique a besoin de
    // retenir : sans elle, il ne resterait qu'une liste de dérapages.
    await resolveOffPlan(selectedDay, opt.absorbedKcal);
    setAdaptPrompt(null);
    toast('Journée réadaptée 👊');
  };
  // « Non, je garde mon plan » : on ne touche à rien, l'écart reste compté à part.
  const declineAdapt = async () => {
    setAdaptPrompt(null);
    toast('Ok, on garde ton plan 😎');
    await resolveOffPlan(selectedDay, 0); // 0 = journée gardée telle quelle
  };

  // Cœur du « changer de recette » (carte ET fiche) : échange UN repas contre une
  // alternative équivalente, en privilégiant les recettes aimées (👍) à fit comparable.
  const swapMealCore = async (meal: Meal) => {
    if (!plan || !profile) return;
    await persistPlan(swapMeal(profile, plan, meal, favorites)); // resync la fiche si ouverte
  };

  // Cœur du « j'aime pas » (👎, carte ET fiche) : masque la recette (souple,
  // réversible), change ce repas, et — si masquer vide trop le pool — demande quel
  // ingrédient gêne (cf. dislike.ts). Renvoie le repas remplacé, 'elicit' si on a
  // ouvert la question d'ingrédient, ou null. Ne touche PAS à selectedMeal (l'appelant gère).
  const dislikeMealCore = async (meal: Meal): Promise<Meal | 'elicit' | null> => {
    if (!plan || !profile) return null;
    const hidden = profile.hidden_recipes ?? [];
    const nextHidden = hidden.includes(meal.recipe.id) ? hidden : [...hidden, meal.recipe.id];
    const nextProfile = { ...profile, hidden_recipes: nextHidden };
    const newPlan = swapMeal(nextProfile, plan, meal, favorites);
    await saveProfile(nextProfile); // persiste le 👎 (hors signature → ne régénère pas tout)
    await persistPlan(newPlan, false);
    if (mealPoolSize(nextProfile, meal.meal_type) < DISLIKE_THRESHOLD) {
      const candidates = dislikeCandidates(nextProfile);
      if (candidates.length > 0) { setDislikeElicit(candidates); return 'elicit'; }
    }
    return newPlan.meals.find((m) => m.id === meal.id) ?? null;
  };

  // ── Actions depuis la FICHE ouverte (rafraîchissent/ferment la fiche) ──────
  const swapSelectedMeal = async () => { if (selectedMeal) await swapMealCore(selectedMeal); };
  const dislikeSelectedMeal = async () => {
    if (!selectedMeal) return;
    const r = await dislikeMealCore(selectedMeal);
    if (r === 'elicit') { setSelectedMeal(null); return; }
    setSelectedMeal(r);
    toast('Noté 👎 — on te change ça');
  };

  // ── Actions directement sur la CARTE (fiche fermée → on ne touche pas selectedMeal) ──
  const reloadMealOnCard = async (meal: Meal) => { await swapMealCore(meal); toast('Recette changée 🔄'); };
  const dislikeMealOnCard = async (meal: Meal) => {
    const r = await dislikeMealCore(meal);
    if (r !== 'elicit') toast('Noté 👎 — on te change ça');
  };

  // L'utilisateur a nommé l'ingrédient gênant : on l'évite partout (disliked_foods,
  // → régénère le plan via la signature) et on ré-affiche les plats masqués sans cet
  // ingrédient (« ceux-là, tu peux les aimer »).
  const applyDislikeIngredient = async (kw: string) => {
    if (!profile) return;
    await saveProfile(applyDislikedIngredient(profile, kw));
    setDislikeElicit(null);
    toast('Compris — on évite ça et on te ramène le reste 👌');
  };

  // Met la fiche ouverte à jour après personnalisation (le plan, lui, est
  // répercuté par l'effet sur `overrides`).
  const applyRecipeToSelected = (r: Recipe) => {
    setSelectedMeal((m) => (m ? reAdaptMealRecipe(m, r) : m));
  };

  const dayMeals = plan?.meals.filter((m) => m.day === selectedDay) ?? [];
  const dayMacros = plan?.total_macros_per_day[selectedDay - 1];
  // Cible DU JOUR, banque de calories comprise (= la cible du profil s'il n'y a pas
  // de banque). Avec la cible plate, un jour déclaré « resto +600 » s'affichait comme
  // 600 kcal de dépassement — alors que c'est exactement ce que l'utilisateur a demandé.
  const dayTarget = (plan && profile) ? dayTargetKcal(profile, plan.days, selectedDay) : profile?.target_kcal;
  const isRestDay = dayMeals.some((m) => m.rest_day);
  const restDayNums = new Set((plan?.meals ?? []).filter((m) => m.rest_day).map((m) => m.day));
  // Fibres : seuls les repas non sautés comptent (un repas sauté n'est pas mangé).
  // Estimées depuis les quantités EFFECTIVES (adaptées par ingrédient si présentes).
  const dayFiber = dayMeals.reduce((s, m) => (m.status === 'skipped' ? s : s + mealFiberFromIngredients(mealIngredients(m))), 0);
  const fiberTarget = profile ? dailyFiberTarget(profile) : 0;
  const dayExtraKcal = plan?.day_extras?.[selectedDay]?.kcal ?? 0;
  const dayExtraLabel = plan?.day_extras?.[selectedDay]?.label;
  // Déjà consommé aujourd'hui (repas mangés verrouillés + écarts hors-plan) → « restant ».
  const consumedDayKcal = (plan?.meals ?? [])
    .filter((m) => m.day === selectedDay && m.status === 'eaten')
    .reduce((s, m) => s + (m.locked_macros ?? m.macros).kcal, 0) + dayExtraKcal;

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
    await forgetOffPlan(selectedDay); // l'écart est annulé : l'historique ne le garde pas
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
  // Les tweaks (variété) changent la signature du profil → le plan se régénère tout
  // seul via l'effet d'auto-refresh. L'option « recettes trop longues » a disparu avec
  // le filtre de temps le 2026-07-29 : elle abaissait le curseur d'un cran sans le
  // moindre garde-fou et pouvait, en un clic, faire tomber le pool de repas à 0.
  const checkinSatisfied = () => { snoozeCheckin(); setCheckinOpen(false); toast('Parfait, on continue 👊'); };
  const checkinMoreVariety = () => { if (profile) saveProfile({ ...profile, variety: 'max' }); snoozeCheckin(); setCheckinOpen(false); toast('Variété au max — nouveau plan en route'); };
  const checkinNewPlan = () => { snoozeCheckin(); setCheckinOpen(false); generate(true); };
  const checkinAdjustProfile = () => { snoozeCheckin(); setCheckinOpen(false); router.push('/(tabs)/profil'); };
  const checkinOptOut = () => { optOutCheckin(); setCheckinOpen(false); toast('Ok. Réactivable dans Profil.'); };

  if (loading) {
    return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={t.textTertiary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[s.content, layout.content]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.textTertiary} />}
        {...repli.scrollProps}
      >
        {/* Header */}
        <View style={s.header} onLayout={repli.onHeaderLayout}>
          <View style={{ flex: 1 }}>
            <Text style={s.date}>{todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}</Text>
            <Text style={s.h1}>{firstName ? `Salut ${firstName} 👋` : 'Ton plan'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {plan && (
              <TouchableOpacity onPress={() => startTour('plan', PLAN_TOUR, { scrollRef })} hitSlop={8} activeOpacity={0.7}>
                <Ionicons name="help-circle-outline" size={24} color={t.textTertiary} />
              </TouchableOpacity>
            )}
            {/* La série se dit en toutes lettres, sans 🔥 : le compteur porte seul.
                La progression vers l'objectif 7 jours reste juste dessous. */}
            <View style={s.streak}>
              <Text style={s.streakN}>{streak.current_streak_days} j</Text>
              <Text style={s.streakLbl}>de série</Text>
            </View>
          </View>
        </View>

        {/* Progression vers l'objectif 7 jours (North Star) */}
        <StreakProgress t={t} streak={streak} variant="strip" />

        {/* Consentement analytics (RGPD) — prompt une fois, post-onboarding */}
        <AnalyticsConsentBanner />

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
            <View ref={daysRef} style={s.days}>
              {Array.from({ length: plan.days }).map((_, i) => {
                const n = i + 1; const on = selectedDay === n; const meta = dayMeta(i);
                return (
                  <TouchableOpacity key={n} onPress={() => setSelectedDay(n)} activeOpacity={0.85}
                    style={[s.day, { backgroundColor: on ? t.accent : t.card, borderColor: on ? t.accent : t.line }]}>
                    <Text style={[s.dayWd, { color: on ? t.onAccent : t.textTertiary }]}>{meta.wd}</Text>
                    <Text style={[s.dayNum, { color: on ? t.onAccent : t.textSecondary }]}>{meta.num}</Text>
                    <Text style={{ fontSize: 9, height: 12, lineHeight: 12 }}>{restDayNums.has(n) ? '🛌' : ''}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Synthèse du jour — SANS carte : c'est l'en-tête de l'écran, pas un
                bloc parmi d'autres. Les cartes blanches sont réservées aux repas,
                pour qu'un coup d'œil suffise à distinguer « le résumé » de « la
                liste ». */}
            {dayMacros && (
              <View ref={macrosRef}>
                <SectionLabel t={t}>Jour {selectedDay}</SectionLabel>
                {isRestDay && (
                  <Text style={{ color: t.textSecondary, fontSize: 14, lineHeight: 19, marginTop: 2 }}>
                    🛌 Jour de repos · glucides réduits, lipides relevés (mêmes kcal)
                  </Text>
                )}
                <View style={{ height: 12 }} />
                <MacroBar
                  protein_g={dayMacros.protein_g}
                  carbs_g={dayMacros.carbs_g}
                  fat_g={dayMacros.fat_g}
                  targetKcal={dayTarget ?? dayMacros.kcal}
                  plannedKcal={dayMacros.kcal}
                  consumedKcal={consumedDayKcal}
                />
                <MarginNote t={t} kcal={dayMacros.kcal} />
                <SousCibleNote t={t} manque={(dayTarget ?? dayMacros.kcal) - dayMacros.kcal} />
                {profile && <FiberRow t={t} actual={dayFiber} target={fiberTarget} />}
                {/* Découvrabilité de la perso macros (le fork a été retiré de l'onboarding) :
                    deep-link vers l'éditeur « Calories & macros » du Profil. */}
                <TouchableOpacity
                  onPress={async () => { await AsyncStorage.setItem('@kyroz:openEditor', 'macros'); router.push('/(tabs)/profil'); }}
                  activeOpacity={0.7}
                  style={{ marginTop: 12, alignSelf: 'flex-start' }}
                >
                  <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700' }}>⚙️ Personnaliser ma répartition (%)</Text>
                </TouchableOpacity>
                {dayExtraKcal > 0 && (
                  <View style={s.extraRow}>
                    <Text style={{ color: t.textSecondary, fontSize: 13 }}>
                      {(dayMacros.kcal - dayExtraKcal).toLocaleString('fr-FR')} plan
                      <Text style={{ color: t.text, fontWeight: '700' }}>{` + ${dayExtraKcal} kcal assumées 😎`}</Text>
                      {/* CE QUE C'ÉTAIT (E6) : deux jours plus tard, « +450 kcal » ne
                          dit plus rien. Ton inchangé — on nomme, on ne reproche pas. */}
                      {dayExtraLabel ? <Text style={{ color: t.textTertiary }}>{` · ${dayExtraLabel}`}</Text> : null}
                    </Text>
                    <TouchableOpacity onPress={clearOffPlan} hitSlop={8}>
                      <Text style={{ color: t.textTertiary, fontSize: 13, fontWeight: '700' }}>Retirer</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity ref={offplanRef} onPress={() => setOffPlanOpen(true)} activeOpacity={0.7} style={s.offPlanBtn}>
                  <Text style={s.offPlanTxt}>+ J'ai mangé hors plan</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Objectif daté (premium) — la trajectoire dans le geste quotidien.
                Ne s'affiche que s'il est posé ; tap = deep-link vers son éditeur. */}
            {profile?.goal_target && (
              <DatedGoalCard
                t={t}
                profile={profile}
                onPress={async () => { await AsyncStorage.setItem('@kyroz:openEditor', 'dated_goal'); router.push('/(tabs)/profil'); }}
              />
            )}

            {/* Suivi d'hydratation (feature test — voir components/HydrationBar.tsx) */}
            {hydrationEnabled && <HydrationBar />}

            {/* Meals — le titre de section porte le total prévu à droite, comme un
                compteur de résultats (même grammaire que Courses et Recettes). */}
            <View style={s.sectionRow}>
              <SectionLabel t={t}>Repas du jour</SectionLabel>
              {dayMacros && (
                <Text style={s.sectionCount}>{dayMacros.kcal.toLocaleString('fr-FR')} kcal prévus</Text>
              )}
            </View>
            <View style={{ gap: 10 }}>
              {dayMeals.map((m, i) => {
                const fridgeTracked = pantry.length > 0;
                const missing = fridgeTracked ? recipeCoverage(m.recipe, pantry).missing.map((i) => i.name) : undefined;
                return (
                  <MealCard
                    key={m.id}
                    meal={m}
                    onPress={m.fixed ? undefined : () => setSelectedMeal(m)}
                    onCook={m.fixed ? undefined : () => cookMeal(m)}
                    onReload={m.fixed ? undefined : () => reloadMealOnCard(m)}
                    onDislike={m.fixed ? undefined : () => dislikeMealOnCard(m)}
                    missing={m.fixed ? undefined : missing}
                    fridgeTracked={fridgeTracked}
                    tourId={i === 0 ? 'plan-meal' : undefined}
                    cookTourId={i === 0 ? 'plan-cook' : undefined}
                  />
                );
              })}
            </View>

            {/* Plus de bouton « Nouveau plan » : on ajuste recette par recette (👍/👎/
                changer dans la fiche). Régénérer toute la semaine reste possible,
                discrètement, depuis Profil. Indicateur visible seulement pendant. */}
            {generating && (
              <View style={s.regenHint}>
                <ActivityIndicator color={t.textTertiary} />
                <Text style={s.regenHintTxt}>Nouveau plan en route…</Text>
              </View>
            )}
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

      {/* ⚠️ « Plan » et non « Salut Kévin 👋 » : la barre compacte reprend le mot
          de la barre d'onglets, pour qu'un même écran n'ait pas deux noms selon
          l'endroit où on le regarde (même règle que « Courses »). */}
      <CompactTitleBar t={t} title="Plan" opacity={repli.opacity} />

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
            adaptGap={selectedMeal.adapt_gap}
            restrictionRelaxed={selectedMeal.restriction_relaxed}
            custom={isCustom(selectedMeal.recipe.id)}
            status={selectedMeal.status}
            onEdit={() => setEditingRecipe(selectedMeal.recipe)}
            onClose={() => setSelectedMeal(null)}
            onCook={() => cookMeal(selectedMeal)}
            onSkip={() => skipMeal(selectedMeal)}
            onResetStatus={() => resetMealStatus(selectedMeal)}
            onSwap={swapSelectedMeal}
            onDislike={dislikeSelectedMeal}
          />
        )}
      </Sheet>

      {/* « C'est quoi qui te gêne ? » — déclenchée par un 👎 qui vide trop le pool */}
      <Sheet visible={!!dislikeElicit} onClose={() => setDislikeElicit(null)}>
        {dislikeElicit && (
          <DislikeSheet
            t={t}
            candidates={dislikeElicit}
            onPick={applyDislikeIngredient}
            onClose={() => setDislikeElicit(null)}
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

      {/* Reveal du 1er plan (J1) : une seule fois, avant la visite guidée */}
      {profile && (
        <FirstPlanReveal
          visible={showReveal}
          profile={profile}
          firstName={firstName}
          previewMeals={plan ? plan.meals.filter((m) => m.day === 1).slice(0, 4) : []}
          onClose={() => setShowReveal(false)}
        />
      )}

      {/* Célébration quand un palier de série est franchi (3/7/14…) */}
      <StreakCelebration milestone={celebration} onClose={clearCelebration} />
      <BirthdayCelebration age={birthdayAge} firstName={firstName} onClose={closeBirthday} />

      {/* « J'ai mangé hors plan » → enregistre l'écart, puis propose de réadapter */}
      <Sheet visible={offPlanOpen} onClose={() => setOffPlanOpen(false)}>
        <OffPlanSheet t={t} onLog={logOffPlan} onClose={() => setOffPlanOpen(false)} />
      </Sheet>

      {/* Consentement : on ne réadapte le plan que si l'utilisateur le demande */}
      <ActionSheet visible={adaptPrompt !== null} onClose={declineAdapt}>
        <Text style={{ color: t.text, ...Type.h2 }}>
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
          // Aucune option ne rentre dans la cible ? On le DIT. L'écran promettait
          // « rentrer dans ta cible » sans jamais vérifier qu'il y arrivait : sur un
          // petit gabarit, la meilleure option restait 318 kcal au-dessus après un
          // écart de +600 (mesuré). On ne peut pas dé-manger — mais on peut arrêter
          // de faire semblant. Formulé sans alarme : ce qui est repris est mis en
          // avant, le reste est présenté comme sans conséquence, parce qu'il l'est.
          const rentreDansLaCible = opts.some((o) => o.overTargetKcal <= ON_TARGET_TOLERANCE_KCAL);
          return (
            <>
              <Text style={{ color: t.textSecondary, fontSize: 14, lineHeight: 20 }}>
                {rentreDansLaCible
                  ? 'Comment tu veux rentrer dans ta cible ? Tes protéines restent pleines dans tous les cas.'
                  : 'Une seule journée ne peut pas tout reprendre — tes repas restants ont une taille minimale. Voilà ce qu\'on peut faire aujourd\'hui ; le reste ne se rattrape pas, et une journée ne fait pas ta semaine. Tes protéines restent pleines dans tous les cas.'}
              </Text>
              {opts.map((o) => (
                <TouchableOpacity
                  key={o.key} onPress={() => applyAdapt(o)} activeOpacity={0.85}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: t.line, borderRadius: Radius.card, padding: 14 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>{o.label}</Text>
                    <Text style={{ color: t.textTertiary, fontSize: 12, marginTop: 2 }}>{o.detail}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: t.text, fontSize: 14, fontWeight: '700' }}>≈ {o.dayKcal.toLocaleString('fr-FR')}</Text>
                    {/* Le chiffre qui compte pour la personne : ce que l'option REPREND.
                        On n'affiche pas le reliquat option par option — ce serait trois
                        rappels de retard sur le même écran (règle produit : rassurer). */}
                    {o.absorbedKcal > 0 && (
                      <Text style={{ color: t.textTertiary, fontSize: 11, marginTop: 2 }}>
                        reprend {o.absorbedKcal.toLocaleString('fr-FR')} kcal
                      </Text>
                    )}
                  </View>
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
          onNewPlan={checkinNewPlan}
          onAdjustInProfile={checkinAdjustProfile}
          onOptOut={checkinOptOut}
        />
      </Sheet>
    </SafeAreaView>
  );
}

/**
 * Un jour qui n'atteint PAS sa cible, expliqué — et sans mise en pression.
 *
 * ⚠️ La barre affichait déjà l'écart (« Cible 2 104 kcal · −214 ») en couleur
 * d'alerte, sans un mot d'explication. Mesuré le 2026-07-31 : sur 20 combinaisons
 * profil × repas sauté, 19 tiennent dans ±90 kcal, mais une décroche — H 80 kg,
 * déjeuner sauté, la journée finit à 1890/2104 kcal et 132/149 g de protéines,
 * parce que les repas restants butent sur leur portion maximale. Ce n'est pas une
 * erreur de calcul, c'est une limite physique du catalogue : elle se DIT.
 *
 * Seuil à 100 kcal = celui de la barre (`MacroBar.onTarget`), pour que les deux ne
 * puissent pas se contredire à l'écran.
 */
function SousCibleNote({ t, manque }: { t: ThemePalette; manque: number }) {
  if (manque <= ON_TARGET_TOLERANCE_KCAL) return null;
  return (
    <Text style={{ color: t.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 8 }}>
      Ta journée s'arrête {Math.round(manque).toLocaleString('fr-FR')} kcal sous ta cible : les portions de tes repas
      ne peuvent pas monter plus haut. Une journée sous la cible ne compromet rien.
    </Text>
  );
}

function MarginNote({ t, kcal }: { t: ThemePalette; kcal: number }) {
  if (kcal <= 0) return null;
  // Note d'honnêteté discrète : les valeurs alimentaires sont des moyennes (Ciqual),
  // pas une pesée au gramme près. On n'affiche plus la fourchette ± (donnait
  // l'impression que le plan était imprécis ; cf. retour fondateur 2026-06-18).
  return (
    <Text style={{ color: t.textTertiary, fontSize: 12, marginTop: 8, lineHeight: 16 }}>
      Valeurs estimées (moyennes alimentaires)
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
  fiber: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
});

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: Spacing.xl, gap: 20, paddingBottom: 120 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    date: { color: t.textSecondary, fontSize: 14, lineHeight: 19 },
    h1: { color: t.text, ...Type.display, marginTop: 2 },
    streak: { alignItems: 'center', backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.card },
    streakN: { color: t.text, fontSize: 17, fontWeight: '700' },
    streakLbl: { color: t.textTertiary, fontSize: 11, fontWeight: '500', marginTop: 1 },
    banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: t.fill, borderRadius: Radius.card, padding: 16 },
    weighBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.card, borderRadius: Radius.card, padding: 16 },
    weighTitle: { color: t.text, fontSize: 15, fontWeight: '600' },
    weighSub: { color: t.textSecondary, fontSize: 14, lineHeight: 19, marginTop: 2 },
    bannerTxt: { flex: 1, color: t.textSecondary, fontSize: 14, lineHeight: 19 },
    bannerCta: { color: t.text, fontSize: 14, fontWeight: '600' },
    days: { flexDirection: 'row', gap: 8 },
    day: { flex: 1, height: 58, borderRadius: Radius.button, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
    dayWd: { fontSize: 11, fontWeight: '600' },
    dayNum: { fontSize: 15, fontWeight: '700' },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    sectionCount: { color: t.textTertiary, fontSize: 13 },
    extraRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    offPlanBtn: { marginTop: 14, alignItems: 'center', backgroundColor: t.fill, borderRadius: Radius.button, paddingVertical: 13 },
    offPlanTxt: { color: t.textSecondary, fontSize: 15, fontWeight: '600' },
    empty: { alignItems: 'center', gap: 10, paddingVertical: 24 },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    emptyTitle: { color: t.text, ...Type.h2 },
    emptySub: { color: t.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 21, paddingHorizontal: 10 },
    regenHint: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    regenHintTxt: { color: t.textTertiary, fontSize: 13, fontWeight: '600' },
    disclaimer: { color: t.textTertiary, fontSize: 11, lineHeight: 16, textAlign: 'center' },
    toast: { position: 'absolute', left: 20, right: 20, bottom: 28, backgroundColor: t.accent, borderRadius: Radius.button, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
    toastTxt: { color: t.onAccent, fontSize: 15, fontWeight: '600' },
  });
}
