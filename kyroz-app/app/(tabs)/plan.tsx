import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Presse } from '../../components/Presse';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemePalette, Radius, Spacing, Type, Trait, Icone, OPACITE_PRESSION , Fond } from '../../constants/theme';
import { useCollapsingTitle, CompactTitleBar } from '../../components/CollapsingTitle';
import { useLayout } from '../../constants/layout';
import { DISCLAIMER } from '../../constants/legal';
import { MacroBar } from '../../components/MacroBar';
import { MealCard } from '../../components/MealCard';
import { RecipeDetail } from '../../components/RecipeDetail';
import { RecipeEditor } from '../../components/RecipeEditor';
import { Sheet } from '../../components/Sheet';
import { StreakCelebration } from '../../components/StreakCelebration';
import { PeseeIcon, RepasIcon } from '../../components/Icons';
import { BirthdayCelebration } from '../../components/BirthdayCelebration';
import { FirstPlanReveal } from '../../components/FirstPlanReveal';
import { ReminderOffer, offrirLeRappel } from '../../components/ReminderOffer';
import { WeightCheckin } from '../../components/WeightCheckin';
import { PlanCheckin } from '../../components/PlanCheckin';
import { OffPlanSheet } from '../../components/OffPlanSheet';
import { DislikeSheet } from '../../components/DislikeSheet';
import { ActionSheet } from '../../components/ActionSheet';
import { PrimaryButton, SectionLabel } from '../../components/ui';
import { HydrationBar, useHydrationEnabled } from '../../components/HydrationBar';
import { useTourTarget, useScreenTour, TourButton, hasSeenTour } from '../../components/GuidedTour';
import { planTour } from '../../lib/tours';
import { useProfile } from '../../hooks/useProfile';
import { useFavorites } from '../../hooks/useFavorites';
import { useStreak } from '../../hooks/useStreak';
import { useWeightLog } from '../../hooks/useWeightLog';
import { usePlanCheckin } from '../../hooks/usePlanCheckin';
import { useNotificationIntent, consommerNotificationIntent } from '../../hooks/useNotificationIntent';
import { useReminder } from '../../hooks/useReminder';
import { useRouter, useFocusEffect } from 'expo-router';
import { buildLocalPlan, carryTracking, nextPlanSeed, profileSignature, swapMeal, computeDailyTotals, rebalanceDay, resetTracking, adaptDayOptions, AdaptOption, mealIngredients, reAdaptMealRecipe, mealPoolSize, dayTargetKcal, baseDayTargets, ON_TARGET_TOLERANCE_KCAL } from '../../lib/planEngine';
import { DISLIKE_THRESHOLD, dislikeCandidates, applyDislikedIngredient } from '../../lib/dislike';
import { todayStamp } from '../../lib/weight';
import { recordOffPlan, resolveOffPlan, forgetOffPlan } from '../../lib/offPlanJournal';
import { isBirthday, ageOn } from '../../lib/birthday';
import { getRecipeById, getBaseRecipe } from '../../lib/recipes';
import { useRecipeOverrides } from '../../hooks/useRecipeOverrides';
import { loadPantry, savePantry, deductIngredients, recipeCoverage, PantryItem } from '../../lib/pantry';
import { useFirstName } from '../../lib/profileName';
import { salutation } from '../../lib/salutation';
import { capture, Events } from '../../lib/analytics';
import { DayExtra, Macros, Meal, MealPlan, MealStatus, Recipe } from '../../lib/types';

const PLAN_KEY = '@kyroz:plan';
const LIST_KEY = '@kyroz:shopping';
const SEED_KEY = '@kyroz:planSeed';

/**
 * Ce qui a DÉCLENCHÉ une régénération (propriété de `plan_regenerated`, D4).
 * Beaucoup de `profil_modifie` = les réglages ne collent pas ; beaucoup de `manuel`
 * = le plan servi ne convient pas. Deux diagnostics opposés que le compte seul
 * confondrait.
 *
 * ⚠️ La synthèse du 2026-08-10 proposait un troisième motif, `recalage`. Il ne
 * correspond à AUCUN chemin du code : « recaler ma journée » rééquilibre les repas
 * restants (`applyAdapt` → `rebalanceDay`) et ne régénère jamais le plan. Le poser
 * aurait créé une valeur qui ne sort jamais — donc un zéro qu'on aurait fini par
 * lire comme « personne ne recale », alors que `off_plan_logged` le mesure déjà.
 */
type PlanOrigine = 'profil_modifie' | 'manuel';
// Drapeau posé par Profil (« Régénérer mon plan ») → l'écran Plan rejoue une
// génération « reroll » au prochain focus. Découple les deux écrans sans prop.
const REROLL_KEY = '@kyroz:planReroll';
// Reveal du 1er plan (J1) : posé après la toute première génération (depuis
// l'onboarding) → l'overlay ne s'affiche QU'UNE fois. Backfillé pour les profils
// qui ont déjà un plan (ne pas le montrer aux utilisateurs existants).
const FIRST_PLAN_KEY = '@kyroz:firstPlanSeen';
// Le rappel quotidien a été PROPOSÉ (accepté ou non — c'est la proposition qu'on
// ne répète pas). Clé distincte de `FIRST_PLAN_KEY`, qui est backfillé pour les
// comptes existants : le rappel, lui, doit pouvoir leur être proposé.
const REMINDER_OFFER_KEY = '@kyroz:reminderOffered';
// Anniversaire déjà fêté — on stocke l'ANNÉE, pas un booléen : un booléen serait à
// remettre à zéro quelque part, et ce « quelque part » n'existe pas (personne ne
// tourne un cron dans une app locale). Comparer l'année stockée à l'année courante
// se suffit à lui-même, et survit à une année sautée.
const BIRTHDAY_KEY = '@kyroz:birthdaySeenYear';
const WD = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// ⚠️ La visite guidée de cet écran vivait ICI, en dur, et trois de ses cinq
// bulles ont été trouvées FAUSSES le 2026-08-07 — dont « Kyroz recale
// automatiquement les repas restants », alors que le code demande d'abord (cf.
// `logOffPlan` plus bas). Le contenu est parti dans `lib/tours.ts`, qui n'importe
// rien et se teste (`lib/__tests__/visiteGuidee.test.ts`) : une bulle qui promet
// un comportement doit pouvoir être confrontée au code qui le rend.

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
  const { streak, markActiveToday, celebration, clearCelebration, froze, clearFroze } = useStreak();
  const { due: weighInDue } = useWeightLog();
  const [weighIn, setWeighIn] = useState(false);
  // Lecteur seul : le ré-armement vit au layout racine (E24). Sert ici à ne pas
  // proposer un rappel à quelqu'un qui en a déjà un.
  const { time: reminderTime } = useReminder();
  // Tap sur le rappel de pesée → la feuille s'ouvre ici. La notification demande
  // « trente secondes » : elle ne peut pas commencer par faire chercher l'écran.
  // ⚠️ L'intention se CONSOMME dans le même geste, sinon la feuille se rouvrirait
  // à chaque retour sur l'onglet.
  const notifIntent = useNotificationIntent();
  useEffect(() => {
    if (notifIntent === null) return;
    if (notifIntent === 'weigh-in') setWeighIn(true);
    consommerNotificationIntent();
  }, [notifIntent]);
  const { due: checkinDue, snooze: snoozeCheckin, optOutForever: optOutCheckin } = usePlanCheckin();
  const [checkinOpen, setCheckinOpen] = useState(false);
  const { overrides, saveOverride, resetOverride, isCustom } = useRecipeOverrides();
  const [editingRecipe, setEditingRecipe] = useState<Meal['recipe'] | null>(null);

  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  // Diffusé, pas lu au montage : le prénom se pose aussi depuis Profil →
  // Informations, et le titre doit suivre sans redémarrage (cf. lib/profileName.ts).
  const firstName = useFirstName();
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
  const [showOffer, setShowOffer] = useState(false);   // « un rappel par jour ? », juste après

  /**
   * Propose le rappel quotidien, une seule fois.
   *
   * 🔴 **C'est le SEUL endroit où le rappel est proposé de lui-même.** Avant, il
   * n'existait qu'à Profil → roue dentée → Notifications : la permission n'était
   * quasiment jamais demandée, donc le levier de rétention du North Star restait
   * éteint. On le pose juste après le reveal parce que c'est le premier instant
   * où la valeur est livrée — le plan vient d'apparaître derrière la carte.
   *
   * ⚠️ **Le web ne marque RIEN.** Il n'y a pas de notification locale dans un
   * navigateur (`offrirLeRappel` le sait) ; poser le drapeau là ferait perdre
   * l'offre à quelqu'un qui a découvert Kyroz sur le web — donc à la plupart des
   * testeurs — pour toujours. Sans marque, elle l'attend sur mobile.
   */
  const proposerLeRappel = async () => {
    if (!offrirLeRappel(reminderTime !== null)) return;
    if (await AsyncStorage.getItem(REMINDER_OFFER_KEY)) return;
    await AsyncStorage.setItem(REMINDER_OFFER_KEY, '1');
    setShowOffer(true);
  };

  const fermerReveal = async () => {
    setShowReveal(false);
    await proposerLeRappel();
  };
  const [birthdayAge, setBirthdayAge] = useState<number | null>(null); // 🎂 une fois l'an
  const autoTried = React.useRef(false);
  const tourTried = React.useRef(false);
  const scrollRef = React.useRef<ScrollView>(null);
  const repli = useCollapsingTitle();
  // Cibles de la visite guidée (ref directe sur l'élément → spotlight aligné).
  const serieRef = useTourTarget('plan-serie');
  const macrosRef = useTourTarget('plan-macros');
  const offplanRef = useTourTarget('plan-offplan');
  const repartitionRef = useTourTarget('plan-repartition');

  // Les cibles des jours diffèrent-elles réellement ? Sans sport déclaré, non —
  // `dayExpenditures` retombe alors sur une cible plate, et la bulle qui parle de
  // « jours d'entraînement » mentirait à qui n'en a pas. Même seuil et même
  // calcul que `FirstPlanReveal`, pour que les deux écrans ne se contredisent
  // pas sur la même question.
  const moduleParVolume = useMemo(() => {
    if (!profile) return false;
    const j = baseDayTargets(profile, Math.max(1, Math.min(profile.plan_days ?? 7, 7)));
    return Math.max(...j) - Math.min(...j) >= 40;
  }, [profile]);

  useEffect(() => { load(); }, []);

  // Visite guidée : au 1er affichage d'un plan, s'il n'a jamais été vu.
  // ⚠️ Le reveal du 1er plan passe AVANT le tour : tant qu'il est affiché, le
  // tour n'est pas « prêt » → il démarre à sa fermeture, pas par-dessus.
  const { rejouer: rejouerTour } = useScreenTour(
    'plan',
    planTour({ days: plan?.days ?? 7, moduleParVolume }),
    // ⚠️ `showOffer` compte autant que `showReveal` : les trois surfaces se
    // suivent (reveal → offre → tour) et deux modales superposées avalent les
    // taps l'une de l'autre.
    { pret: !loading && !!plan && !showReveal && !showOffer, scrollRef },
  );

  // ── L'offre du rappel doit aussi atteindre les comptes DÉJÀ créés ──────────
  //
  // Le chemin ci-dessus (`fermerReveal`) ne sert que les primo-arrivants : le
  // reveal est marqué comme vu d'office pour quiconque a déjà un plan. Sans ce
  // second chemin, tous les testeurs actuels — c'est-à-dire tout le monde
  // aujourd'hui — ne verraient jamais la proposition, et le défaut qu'on corrige
  // resterait entier pour eux.
  //
  // ⚠️ **Après le tour, jamais avant** : la visite guidée est une `Modal` et une
  // proposition posée par-dessus lui volerait ses taps. Si le tour n'a pas encore
  // été vu, on ne propose pas cette fois-ci — la prochaine ouverture le fera.
  const offreTentee = useRef(false);
  useEffect(() => {
    if (loading || !plan || showReveal || offreTentee.current) return;
    offreTentee.current = true;
    hasSeenTour('plan').then((vu) => { if (vu) proposerLeRappel(); });
  }, [loading, plan, showReveal]);

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
    generate(false, 'profil_modifie');
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
  const generate = async (reroll = false, origine: PlanOrigine = 'manuel') => {
    if (!profile) return;
    setGenerating(true);
    // D6 : l'étape en cours, pour que `plan_generation_failed` dise OÙ ça a cassé.
    // Sans elle, D4 est ininterprétable — un plan qui n'est pas suivi parce qu'il n'a
    // jamais réussi à se générer se lit exactement comme un désintérêt.
    let etape: 'seed' | 'moteur' | 'persistance' = 'seed';
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
      etape = 'moteur';
      // ⏱ D5 — ON CHRONOMÈTRE LE MOTEUR, PAS LA PAUSE DE 600 ms CI-DESSUS, et c'est
      // le cœur de la mesure. Les additionner rendrait ~608 ms à chaque fois : une
      // régression du moteur (8 → 80 ms, dix fois pire) se lirait 608 → 680, noyée
      // dans une constante qu'on a choisie nous-mêmes. On ne mesure que ce qu'on ne
      // connaît pas — le temps du moteur sur un vrai téléphone.
      const t0 = Date.now();
      const p = carryTracking(profile, ancien, buildLocalPlan(profile, seed));
      const dureeMoteurMs = Date.now() - t0;
      etape = 'persistance';
      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(p));
      await AsyncStorage.removeItem(LIST_KEY);
      // Une REgénération suppose qu'un plan existait déjà : sinon c'est la première,
      // et `first_plan_viewed` la porte. Compter les deux gonflerait le compteur de
      // régénérations d'exactement une par installation.
      if (ancien) capture(Events.planRegenerated, { origine });
      // Reveal J1 : seulement à la 1re génération (pas un reroll) et jamais revu.
      // setShowReveal AVANT setPlan → le tour guidé ne s'arme pas tant que le
      // reveal est ouvert (cf. effet du tour).
      if (!reroll && !(await AsyncStorage.getItem(FIRST_PLAN_KEY))) {
        await AsyncStorage.setItem(FIRST_PLAN_KEY, '1');
        setShowReveal(true);
        capture(Events.firstPlanViewed, { duree_generation_ms: dureeMoteurMs });
      }
      setPlan(p);
      await markActiveToday();
    } catch (e) {
      // On CAPTURE puis on relance : le comportement d'avant est inchangé (rien
      // n'attrapait ici, la frontière d'erreur globale reste seule maîtresse).
      // Avaler l'exception pour « faire propre » masquerait le défaut au lieu de le
      // mesurer — et §4 exige un fallback, pas un silence.
      capture(Events.planGenerationFailed, { etape });
      throw e;
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
    if (froze) { toast('Série protégée — un jour manqué pardonné. Reviens demain'); capture(Events.streakFrozen); clearFroze(); }
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
    toast('✓ Mangé — journée recalée');
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
    // D4 : l'écart part au moment de la DÉCISION, pas à `logOffPlan` — c'est le
    // « oui / non » qui porte l'information, et il n'existe pas encore quand l'écart
    // est enregistré. ⚠️ Aucun kcal n'accompagne l'event : combien quelqu'un a mangé
    // hors plan est un comportement alimentaire, donc §6 (« aucun texte libre, aucune
    // donnée de santé ») — le libellé de l'écart encore moins.
    capture(Events.offPlanLogged, { recale: true });
    setAdaptPrompt(null);
    toast('Journée réadaptée');
  };
  // « Non, je garde mon plan » : on ne touche à rien, l'écart reste compté à part.
  const declineAdapt = async () => {
    setAdaptPrompt(null);
    toast('Ok, on garde ton plan');
    capture(Events.offPlanLogged, { recale: false });
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
    toast('C\'est noté — on te change ça');
  };

  // ── Actions directement sur la CARTE (fiche fermée → on ne touche pas selectedMeal) ──
  const reloadMealOnCard = async (meal: Meal) => { await swapMealCore(meal); toast('Recette changée'); };
  const dislikeMealOnCard = async (meal: Meal) => {
    const r = await dislikeMealCore(meal);
    if (r !== 'elicit') toast('C\'est noté — on te change ça');
  };

  // L'utilisateur a nommé l'ingrédient gênant : on l'évite partout (disliked_foods,
  // → régénère le plan via la signature) et on ré-affiche les plats masqués sans cet
  // ingrédient (« ceux-là, tu peux les aimer »).
  const applyDislikeIngredient = async (kw: string) => {
    if (!profile) return;
    await saveProfile(applyDislikedIngredient(profile, kw));
    setDislikeElicit(null);
    toast('Compris — on évite ça et on te ramène le reste');
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
  const checkinSatisfied = () => { snoozeCheckin(); setCheckinOpen(false); toast('Parfait, on continue'); };
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
            {/* Sans émoji (2026-08-06) : chantier de fond, on les retire partout
                progressivement. Un titre d'écran n'a pas besoin d'être illustré.
                ⚠️ CE N'EST PLUS UN TITRE D'ÉCRAN depuis le 2026-08-14 (décision
                fondateur) : c'est une SALUTATION, elle tourne avec le moment de la
                journée et avec le jour, et elle tient même sans prénom. L'ancien
                repli « Ton plan » servait un titre à qui n'avait pas renseigné son
                prénom pendant que les autres recevaient un bonjour. Le mot vient de
                `lib/salutation.ts` — pas d'en dur ici, sinon il redevient figé. */}
            <Text style={s.h1}>{salutation(firstName, new Date())}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            {plan && (
              <TourButton onPress={rejouerTour} />
            )}
            {/* La série se dit en toutes lettres, sans 🔥 : le compteur porte seul.
                La progression vers l'objectif 7 jours reste juste dessous. */}
            <View ref={serieRef} style={s.streak}>
              <Text style={s.streakN}>{streak.current_streak_days} j</Text>
              <Text style={s.streakLbl}>de série</Text>
            </View>
          </View>
        </View>

        {/* ⚠️ Le bandeau de progression vers l'objectif 7 jours (`StreakProgress`
            variant="strip") a été RETIRÉ de cet écran le 2026-08-05 (décision
            fondateur). Le compteur de série reste dans l'en-tête ci-dessus, et le
            bandeau complet vit toujours dans le Profil (variant="card") — le
            composant n'est donc pas mort, il n'a plus sa place ICI. */}

        {/* ⚠️ La carte de consentement analytics a été RETIRÉE d'ici le 2026-08-10
            (décision fondateur : « ça gâche la page principale de l'app »). Elle est
            devenue un écran à part entière, posé AVANT l'assistant d'onboarding —
            `components/AnalyticsConsentStep.tsx`, monté par `(auth)/onboarding.tsx`.
            🔴 Ne pas la « remettre au cas où » : le consentement demandé APRÈS le
            premier plan supprimerait la mesure du tunnel d'entrée, définitivement,
            faute de tampon local. Le raisonnement complet est dans le composant. */}

        {/* Check-in poids hebdo : ramène l'utilisateur + garde le plan juste dans le temps */}
        {weighInDue && (
          <Presse style={s.weighBanner} onPress={() => setWeighIn(true)} activeOpacity={OPACITE_PRESSION}>
            <PeseeIcon color={t.text} size={Icone.action} />
            <View style={{ flex: 1 }}>
              <Text style={s.weighTitle}>C'est le moment de te peser</Text>
              <Text style={s.weighSub}>Mets à jour ton poids — on réajuste tes macros et ton plan.</Text>
            </View>
            <Text style={s.bannerCta}>→</Text>
          </Presse>
        )}

        {/* Proposition d'ajustement périodique (opt-out réactivable dans Profil) */}
        {checkinDue && (
          <Presse style={s.weighBanner} onPress={() => setCheckinOpen(true)} activeOpacity={OPACITE_PRESSION}>
            <RepasIcon color={t.text} size={Icone.action} />
            <View style={{ flex: 1 }}>
              <Text style={s.weighTitle}>Ton plan te convient toujours ?</Text>
              <Text style={s.weighSub}>Dis-nous ce qui coince — on ajuste en un tap.</Text>
            </View>
            <Text style={s.bannerCta}>→</Text>
          </Presse>
        )}

        {plan ? (
          <>
            {/* Plan désynchronisé du profil → mise à jour en 1 tap */}
            {planStale && !generating && (
              <Presse style={s.banner} onPress={() => generate(false, 'profil_modifie')} activeOpacity={OPACITE_PRESSION} disabled={generating}>
                <Text style={s.bannerTxt}>
                  Ton plan ({plan.days} j) ne correspond plus à tes réglages ({clampDays(intendedDays)} j).
                </Text>
                <Text style={s.bannerCta}>{generating ? 'Mise à jour…' : 'Mettre à jour →'}</Text>
              </Presse>
            )}

            {/* Day strip — ÉPURÉ (2026-08-05, maquette). Chaque jour était une carte
                bordée de 58 pt : sept cadres alignés sous un titre, ça pesait plus que
                le plan lui-même. Ne restent qu'une lettre, un chiffre, et une PASTILLE
                en accent sur le jour actif — la seule chose qui doit se voir.
                ⚠️ La rangée montre les jours DU PLAN (`plan.days`), pas les 7 jours du
                calendrier : un jour sans repas n'est pas sélectionnable, l'afficher
                promettrait une journée qui n'existe pas. */}
            <View style={s.days}>
              {Array.from({ length: plan.days }).map((_, i) => {
                const n = i + 1; const on = selectedDay === n; const meta = dayMeta(i);
                const repos = restDayNums.has(n);
                return (
                  <Presse
                    key={n}
                    onPress={() => setSelectedDay(n)}
                    activeOpacity={OPACITE_PRESSION}
                    style={s.day}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${meta.wd} ${meta.num}${repos ? ', jour de repos' : ''}`}
                  >
                    <Text style={s.dayWd}>{meta.wd}</Text>
                    <View style={[s.dayDot, on && { backgroundColor: t.accent }]}>
                      <Text style={[s.dayNum, { color: on ? t.onAccent : t.text }]}>{meta.num}</Text>
                    </View>
                    {/* Hauteur réservée même sans lune : sinon la rangée se décale
                        verticalement selon qu'un jour de repos est présent ou non. */}
                    <View style={s.dayMoon}>
                      {repos && <Ionicons name="moon" size={Icone.petite} color={t.textTertiary} />}
                    </View>
                  </Presse>
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
                {/* Même symbole que dans la rangée de jours : deux marqueurs différents
                    pour la même chose sur un même écran, c'est ce qu'on corrige.
                    ⚠️ Et le TEXTE disait « (mêmes kcal) » — vrai jusqu'au 2026-08-06,
                    faux depuis : le budget du jour suit la dépense du jour, donc un jour
                    de repos reçoit MOINS. La phrase contredisait le nombre affiché deux
                    lignes plus bas. On dit ce qui baisse, et on rassure sur la semaine —
                    un suivi rassure, il ne met pas la pression.
                    🔴 ET `moduleParVolume`, ajouté le 2026-08-07 : la phrase n'était
                    conditionnée qu'à `isRestDay`, donc elle promettait « un peu moins de
                    calories » à qui n'a déclaré AUCUN sport — or `dayExpenditures` retombe
                    alors sur une cible plate, et les sept jours valent le même chiffre.
                    Mesuré sur le moteur (H 30 ans, 83 kg, 18 % MG, sèche, NEAT desk) :
                    sans sport, 2042 kcal les sept jours, amplitude 0 ; avec 3 séances de
                    60 min, 2042/2303 alternés, amplitude 261. Le nombre affiché juste en
                    dessous démentait donc la phrase, sur l'écran le plus regardé de l'app.
                    ➡️ Trouvé en écrivant la bulle de visite guidée qui parle de la même
                    chose : elle, elle se conditionnait déjà — c'est la CAPTURE des deux
                    textes côte à côte qui a montré la contradiction. */}
                {isRestDay && moduleParVolume && (
                  <View style={s.restRow}>
                    <Ionicons name="moon" size={Icone.petite} color={t.textSecondary} />
                    <Text style={s.restTxt}>Jour de repos · un peu moins de calories et de glucides, tes protéines inchangées. Ta semaine garde son total.</Text>
                  </View>
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
                <SousCibleNote t={t} manque={(dayTarget ?? dayMacros.kcal) - dayMacros.kcal} />
                {dayExtraKcal > 0 && (
                  <View style={s.extraRow}>
                    <Text style={{ ...Type.caption, color: t.textSecondary }}>
                      {(dayMacros.kcal - dayExtraKcal).toLocaleString('fr-FR')} plan
                      <Text style={{ color: t.text, fontWeight: '700' }}>{` + ${dayExtraKcal} kcal assumées`}</Text>
                      {/* CE QUE C'ÉTAIT (E6) : deux jours plus tard, « +450 kcal » ne
                          dit plus rien. Ton inchangé — on nomme, on ne reproche pas. */}
                      {dayExtraLabel ? <Text style={{ color: t.textTertiary }}>{` · ${dayExtraLabel}`}</Text> : null}
                    </Text>
                    <Presse onPress={clearOffPlan} hitSlop={8}>
                      <Text style={{ ...Type.captionStrong, color: t.textTertiary }}>Retirer</Text>
                    </Presse>
                  </View>
                )}
                {/* Les deux actions du jour sur UNE ligne (décision fondateur, 2026-08-05).
                    La perso des macros était un lien en accent, l'écart hors plan un bouton
                    pleine largeur : deux grammaires pour deux gestes de même rang.
                    ⚠️ SANS FOND depuis le 2026-08-06 : deux pavés remplis juste sous le
                    chiffre du jour pesaient plus que lui. Ce sont des sorties de route,
                    pas l'action principale de l'écran — elles se fondent dans la page. */}
                <View style={s.actionsRow}>
                  <Presse ref={offplanRef} onPress={() => setOffPlanOpen(true)} activeOpacity={OPACITE_PRESSION} style={s.actionBtn}>
                    <Text style={s.actionTxt}>+ J'ai mangé hors plan</Text>
                  </Presse>
                  {/* Découvrabilité de la perso macros (le fork a été retiré de l'onboarding) :
                      deep-link vers l'éditeur « Calories & macros » du Profil. */}
                  <Presse
                    ref={repartitionRef}
                    onPress={async () => { await AsyncStorage.setItem('@kyroz:openEditor', 'macros'); router.push('/(tabs)/profil'); }}
                    activeOpacity={OPACITE_PRESSION}
                    style={s.actionBtn}
                  >
                    <Text style={s.actionTxt}>Ma répartition (%)</Text>
                  </Presse>
                </View>
              </View>
            )}

            {/* ⚠️ LA CARTE D'OBJECTIF DATÉ A ÉTÉ RETIRÉE D'ICI le 2026-08-14
                (décision fondateur : « l'objectif daté je ne le veux pas ici, on
                aura juste le rappel de pesée le jour où il devra y être »). Elle
                vit toujours dans le Profil — `profil.tsx`, juste au-dessus de
                Kyroz+ — donc rien n'est perdu : ce qui change est l'endroit où on
                la consulte, pas son existence.
                🔴 Ne pas la « remettre au cas où » : cet écran répond à « qu'est-ce
                que je mange aujourd'hui ». Une échéance à 13,6 semaines n'y répond
                pas, et un objectif lointain rappelé chaque matin met la pression au
                lieu de rassurer (CLAUDE.md §10, règle produit).
                ➡️ Le rendez-vous avec la trajectoire, c'est le RAPPEL DE PESÉE —
                `weighInDue` plus haut dans cet écran, qui n'apparaît que le jour
                où il a quelque chose à demander. */}

            {/* Suivi d'hydratation (feature test — voir components/HydrationBar.tsx) */}
            {hydrationEnabled && <HydrationBar />}

            {/* Meals. ⚠️ Le total prévu qui vivait à DROITE de ce titre a été
                retiré le 2026-08-14, en même temps que le sous-titre de la barre de
                macros qui disait la même chose douze pixels plus haut. Deux fois le
                même nombre sur un écran, c'est une redondance, pas une information —
                et chaque carte de repas porte déjà ses propres kcal. */}
            <SectionLabel t={t}>Repas du jour</SectionLabel>
            <View style={{ gap: Spacing.md }}>
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
                    onShopping={() => router.push('/(tabs)/courses')}
                    missing={m.fixed ? undefined : missing}
                    fridgeTracked={fridgeTracked}
                    cookTourId={i === 0 ? 'plan-cook' : undefined}
                    actionsTourId={i === 0 ? 'plan-actions' : undefined}
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
              <RepasIcon color={t.textTertiary} size={Icone.vide} />
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

      {/* Reveal du 1er plan (J1) : une seule fois, avant la visite guidée.
          `previewMeals` = le jour 1 EN ENTIER. Un `slice(0, 4)` traînait ici :
          invisible tant que 4 était le maximum, il coupait le dîner dès le 5ᵉ repas
          — l'aperçu montrait donc une journée qui n'est pas celle qu'on va servir. */}
      {profile && (
        <FirstPlanReveal
          visible={showReveal}
          profile={profile}
          firstName={firstName}
          previewMeals={plan ? plan.meals.filter((m) => m.day === 1) : []}
          onClose={fermerReveal}
        />
      )}

      {/* « Un rappel par jour ? » — une seule fois, juste après le reveal. */}
      <ReminderOffer visible={showOffer} onClose={() => setShowOffer(false)} />

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
          +{adaptPrompt ?? 0} kcal assumées, c'est noté
        </Text>
        {(() => {
          const opts = (plan && profile) ? adaptDayOptions(profile, plan, selectedDay, new Date().getHours()) : [];
          if (opts.length === 0) {
            return (
              <>
                <Text style={{ ...Type.bodySmall, color: t.textSecondary, lineHeight: 20 }}>
                  Tes repas du jour sont déjà passés — il n'y a plus rien à réadapter. On garde tout tel quel.
                </Text>
                <Presse onPress={declineAdapt} style={{ alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
                  <Text style={{ ...Type.bodyStrong, color: t.textSecondary }}>Compris</Text>
                </Presse>
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
              <Text style={{ ...Type.bodySmall, color: t.textSecondary, lineHeight: 20 }}>
                {rentreDansLaCible
                  ? 'Comment tu veux rentrer dans ta cible ? Tes protéines restent pleines dans tous les cas.'
                  : 'Une seule journée ne peut pas tout reprendre — tes repas restants ont une taille minimale. Voilà ce qu\'on peut faire aujourd\'hui ; le reste ne se rattrape pas, et une journée ne fait pas ta semaine. Tes protéines restent pleines dans tous les cas.'}
              </Text>
              {opts.map((o) => (
                <Presse
                  key={o.key} onPress={() => applyAdapt(o)} activeOpacity={OPACITE_PRESSION}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.card, padding: Spacing.lg }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...Type.bodyStrong, color: t.text }}>{o.label}</Text>
                    <Text style={{ ...Type.caption, color: t.textTertiary, marginTop: Spacing.xs }}>{o.detail}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ ...Type.bodySmallStrong, color: t.text }}>≈ {o.dayKcal.toLocaleString('fr-FR')}</Text>
                    {/* Le chiffre qui compte pour la personne : ce que l'option REPREND.
                        On n'affiche pas le reliquat option par option — ce serait trois
                        rappels de retard sur le même écran (règle produit : rassurer). */}
                    {o.absorbedKcal > 0 && (
                      <Text style={{ ...Type.micro, color: t.textTertiary, marginTop: Spacing.xs }}>
                        reprend {o.absorbedKcal.toLocaleString('fr-FR')} kcal
                      </Text>
                    )}
                  </View>
                </Presse>
              ))}
              <Presse onPress={declineAdapt} style={{ alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
                <Text style={{ ...Type.bodyStrong, color: t.textSecondary }}>Non, je garde mon plan</Text>
              </Presse>
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
    <Text style={{ ...Type.caption, color: t.textTertiary, lineHeight: 17, marginTop: Spacing.sm }}>
      Ta journée s'arrête {Math.round(manque).toLocaleString('fr-FR')} kcal sous ta cible : les portions de tes repas
      ne peuvent pas monter plus haut. Une journée sous la cible ne compromet rien.
    </Text>
  );
}

// ⚠️ `MarginNote` (« Valeurs estimées — moyennes alimentaires ») et `FiberRow`
// (« 🌾 Fibres 52 g / 35 g · ✓ Bon apport ») ont été RETIRÉS le 2026-08-05
// (décision fondateur). Le moteur n'a pas changé : il continue de viser les fibres
// exactement pareil (biais de sélection `FIBER_SELECT_W_*`, cf. CLAUDE.md §6), il
// ne le DIT simplement plus. « On donne un bon apport sans le faire remarquer. »
// ➡️ Ne pas les réintroduire en croyant réparer un oubli : c'est un choix.
// Le disclaimer OBLIGATOIRE de §6 (« ne remplace pas l'avis d'un médecin »), lui,
// est un autre texte et reste affiché — voir `s.disclaimer` plus bas.

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Fond.barreOnglets },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.md },
    date: { color: t.textSecondary, lineHeight: 19 },
    h1: { color: t.text, ...Type.display, marginTop: Spacing.xs },
    streak: { alignItems: 'center', backgroundColor: t.card, borderWidth: Trait.fin, borderColor: t.line, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.card },
    streakN: { color: t.text,  },
    streakLbl: { color: t.textTertiary, marginTop: Spacing.xs },
    banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, backgroundColor: t.fill, borderRadius: Radius.card, padding: Spacing.lg },
    weighBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.lg },
    weighTitle: { ...Type.bodyStrong, color: t.text },
    weighSub: { color: t.textSecondary, lineHeight: 19, marginTop: Spacing.xs },
    bannerTxt: { flex: 1, color: t.textSecondary, lineHeight: 19 },
    bannerCta: { ...Type.bodySmallStrong, color: t.text },
    days: { flexDirection: 'row' },
    day: { flex: 1, alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
    dayWd: { color: t.textTertiary,  },
    // Pastille : `Radius.pill` est son rôle exact (puce/badge), et l'objet a une
    // taille FIXE — c'est la condition posée par lib/__tests__/rayonsDA.test.ts.
    dayDot: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
    dayNum: {  },
    // ⚠️ La hauteur SUIT la taille de l'icône (2026-08-14). Elle valait 13 pour
    // une lune de 16 : la lune était rognée en haut et en bas, et ça ne se voit
    // que sur une capture — un croissant tronqué reste un croissant plausible.
    dayMoon: { height: Icone.petite, alignItems: 'center', justifyContent: 'center' },
    restRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
    restTxt: { flex: 1, color: t.textSecondary, lineHeight: 19 },
    extraRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
    // Les deux actions du jour partagent EXACTEMENT le même gabarit : elles sont de
    // même rang, donc rien ne doit laisser croire que l'une prime sur l'autre.
    // Aucun fond : elles se posent sur la page. La hauteur de 44 reste — c'est la
    // cible tactile minimale d'Apple, et elle ne se voit pas mais elle se touche.
    actionsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: Spacing.xl, marginTop: Spacing.sm },
    actionBtn: { minHeight: 44, justifyContent: 'center' },
    actionTxt: { ...Type.bodySmallStrong, color: t.textSecondary },
    empty: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
    emptyTitle: { color: t.text, ...Type.h2 },
    emptySub: { color: t.textSecondary, textAlign: 'center', lineHeight: 21, paddingHorizontal: Spacing.md },
    regenHint: { marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    regenHintTxt: { ...Type.bodySmallStrong, color: t.textTertiary },
    disclaimer: { color: t.textTertiary, lineHeight: 16, textAlign: 'center' },
    toast: { position: 'absolute', left: 20, right: 20, bottom: 28, backgroundColor: t.accent, borderRadius: Radius.button, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, alignItems: 'center' },
    toastTxt: { ...Type.bodyStrong, color: t.onAccent },
  });
}
