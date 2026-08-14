import React, { useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Presse } from '../../components/Presse';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme, ThemePalette, Radius, Spacing, Type, Fond, CIBLE_TACTILE_MIN, Trait, Icone, OPACITE_PRESSION } from '../../constants/theme';
import { useCollapsingTitle, CompactTitleBar } from '../../components/CollapsingTitle';
import { useLayout } from '../../constants/layout';
import { ThemeMode, useThemeMode, setThemeMode } from '../../lib/themeMode';
import { ACCENTS, ACCENT_IDS, useAccentId, setAccentId, readableOn } from '../../lib/accentColor';
import { DISCLAIMER } from '../../constants/legal';
import { CIQUAL_ATTRIBUTION } from '../../lib/foods';
import { Card, PrimaryButton, Chip, OptionCard, Field, SectionLabel, Segmented, SectionTitle, MenuRow } from '../../components/ui';
import { bankedDailyTargets, offsetsForPlan } from '../../lib/calorieBank';
import { usePremium } from '../../hooks/usePremium';
import { PremiumFeature, AccessReason } from '../../lib/premium';
import { Sheet } from '../../components/Sheet';
import { ReglagesSheet } from '../../components/ReglagesSheet';
import { useDialog } from '../../components/Dialog';
import { BirthDateField } from '../../components/BirthDateField';
import { DateInput } from '../../components/DateInput';
import { ageOn } from '../../lib/birthday';
import { ActionSheet } from '../../components/ActionSheet';
import { WeightSummaryCard } from '../../components/WeightSummaryCard';
import { useTourTarget, useScreenTour, TourButton, resetAllTours } from '../../components/GuidedTour';
import { profilTour, TOURS } from '../../lib/tours';
import { BodyFatPicker } from '../../components/BodyFatPicker';
import { DislikedFoodsField } from '../../components/DislikedFoodsField';
import { MacroSplit } from '../../components/MacroSplit';
import { WeightCheckin } from '../../components/WeightCheckin';
import { OffPlanHistory } from '../../components/OffPlanHistory';
import { useHydrationEnabled } from '../../components/HydrationBar';
import { useFirstName, saveFirstName } from '../../lib/profileName';
import { ProtectionIcon, RepasLibreIcon } from '../../components/Icons';
import { MealSlotsPicker } from '../../components/MealSlotsPicker';
import { BUILTIN_SLOTS, knownSlots, slotLabel } from '../../lib/mealSlots';
import { useProfile } from '../../hooks/useProfile';
import { useStreak } from '../../hooks/useStreak';
import { useWeightLog } from '../../hooks/useWeightLog';
import { useOffPlanJournal } from '../../hooks/useOffPlanJournal';
import { journalSummary } from '../../lib/offPlanJournal';
import { useReminder } from '../../hooks/useReminder';
import { usePlanCheckin } from '../../hooks/usePlanCheckin';
import { useAuth } from '../../hooks/useAuth';
import { remindersSupported } from '../../lib/notifications';
import { DEFAULT_REMINDER_TIME, ReminderTime, formatReminderTime } from '../../lib/reminder';
import { ReminderTimeField } from '../../components/ReminderTimeField';
import { deleteAccount, deleteCloudData } from '../../lib/sync';
import { exportMyData } from '../../lib/exportData';
import {
  calculateTDEE, computePlan, goalLabel, planFlags, validateProfile, recalcProfile, DEFAULT_CARB_RATIO, recommendedProteinPerKg,
  DEFAULT_NEAT_LEVEL, NEAT_ORDER, NEAT_LABEL, NEAT_HINT, NEAT_SHORT, dismissEngineNotice,
  bankFloorKcal, makeWeeklyProjector, trackingTarget,
} from '../../lib/tdee';
import {
  lowEaWeeksForFloor, checkEligibility, eligibilityMessage, LowEaEscalation,
  AGE_BOUNDS, WEIGHT_BOUNDS, HEIGHT_BOUNDS,
} from '../../lib/safety';
import { datedGoalStatus, datedGoalKcalDelta, addDaysStamp } from '../../lib/datedGoal';
import { deadlineLadder, checkEcheance, messageEcheance } from '../../lib/goalLadder';
import { DatedGoalCard, formatFR } from '../../components/DatedGoalCard';
import { todayStamp, DEFAULT_WEIGH_IN_FREQUENCY } from '../../lib/weight';
import { applyWeighInReminder } from '../../lib/notifications';
import {
  ActivityLevel, BodyFatSource, DietaryRestriction, EngineNotice, FixedMeals, Goal, GoalTarget, MealEmphasis, MealSlot, MealType, NeatLevel, Sex, SportSession, UserProfile, VarietyPreference,
} from '../../lib/types';
import { totalSessionsPerWeek } from '../../lib/sport';
import { baseDayTargets, deducedRestWeekdays } from '../../lib/planEngine';
import { getRecipeById } from '../../lib/recipes';
import SportsEditor from '../../components/SportsEditor';
import { FixedMealSheet } from '../../components/FixedMealSheet';

// ── Options ──────────────────────────────────────────────────────────────────
// `cut_aggressive` retiré le 2026-07-29 (cf. lib/syncGuard.ts::normalizeGoal) : il
// servait le même plan que `cut`. La vitesse se pilote par l'objectif daté.
// `bulk` retiré le 2026-08-10, même motif : +200 kcal sur `lean_bulk`, donc de la
// VITESSE, et des protéines qui BAISSAIENT là où il en faut le plus.
// ⚠️ Cette liste doit rester d'accord avec celle de l'onboarding : un objectif
// proposé ici mais pas là (ou l'inverse) est un réglage que `normalizeGoal` refermerait
// sous les doigts de la personne au rechargement — un choix qui ne tient pas.
const GOALS: Goal[] = ['cut', 'recomp', 'maintain', 'lean_bulk'];
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
  const wd = orderedWeekdays(profile.plan_weekdays ?? []);
  if (!wd.length) return [];
  // Source unique avec l'onboarding (`deducedRestWeekdays`) : les deux écrans
  // pré-cochent la MÊME chose, sinon le réglage change de sens selon l'endroit.
  return orderedWeekdays(deducedRestWeekdays(wd, profile.training_days_per_week));
}
// Repas retenus, dans l'ordre CHRONOLOGIQUE de la journée — créneaux créés compris.
function orderedMeals(sel: MealType[], custom: MealSlot[]): MealType[] {
  return knownSlots({ meal_slots: custom }).filter((s) => sel.includes(s.id)).map((s) => s.id);
}

// Libellés d'emphase des 4 créneaux intégrés. Un créneau CRÉÉ n'en a pas — il prend
// son propre nom (« Plus : Shaker post-training »), parce qu'inventer « Plus le soir »
// pour un créneau que l'utilisateur a nommé lui-même effacerait précisément ce nom.
const EMPHASIS_BUILTIN: Record<string, { opt: string; court: string }> = {
  breakfast: { opt: 'Plus le matin', court: 'Matin' },
  lunch: { opt: 'Plus le midi', court: 'Midi' },
  dinner: { opt: 'Plus le soir', court: 'Soir' },
};
function emphasisOptions(slots: MealSlot[], sel: MealType[]): { label: string; val: MealEmphasis }[] {
  return [
    { label: 'Équilibré', val: 'even' as MealEmphasis },
    ...slots.filter((s) => sel.includes(s.id)).map((s) => ({
      label: EMPHASIS_BUILTIN[s.id]?.opt ?? `Plus : ${s.label}`,
      val: s.id as MealEmphasis,
    })),
  ];
}
function emphasisResume(p: UserProfile): string {
  const e = p.meal_emphasis ?? 'even';
  if (e === 'even') return 'Équilibré';
  return EMPHASIS_BUILTIN[e]?.court ?? slotLabel(knownSlots(p), e);
}
// Recalcule TDEE (toujours) et macros (si mode auto)
// Délègue à la source unique (lib/tdee) — même calcul partout (profil + check-in).
const withRecalc = recalcProfile;

type EditorKey = 'info' | 'sports' | 'goal' | 'dated_goal' | 'macros' | 'prefs' | 'meals' | 'calorie_bank';

// Éditeurs réservés à Kyroz+ une fois le paywall lancé. Les autres n'y figurent
// pas et restent ouverts à tout le monde, définitivement.
const EDITEURS_PREMIUM: Partial<Record<EditorKey, PremiumFeature>> = {
  dated_goal: 'dated_goal',
  calorie_bank: 'calorie_bank',
};

// Valeur de la ligne de menu « Kyroz+ », selon la raison de l'accès. Aujourd'hui
// seule `not_launched` est atteignable (`PAYWALL_LAUNCH === null`).
const KYROZ_PLUS_VALEUR: Record<AccessReason, string> = {
  not_launched: 'Tout est déjà ouvert',
  grandfathered: 'Inclus à vie',
  entitled: 'Abonnement actif',
  locked: 'En savoir plus',
};

// Objectif daté : durées de REPLI (semaines).
//
// ⚠️ PLUS AUCUNE DURÉE N'EST AFFICHÉE (2026-08-07) — la rangée de puces est retirée,
// l'échéance se tape. L'échelle dérivée du corps (A27, `lib/goalLadder.ts`) survit
// pour une seule chose : fournir la date PRÉ-REMPLIE, qui doit tenir. Ces cinq durées
// en dur sont son repli, quand rien n'est tenable dans l'horizon de projection — le
// poids visé est alors hors de portée quelle que soit la date, et c'est la phrase sous
// le champ qui le dit.
const HORIZONS_REPLI = [4, 8, 12, 16, 24];

/**
 * Échéance TAPÉE dans l'éditeur d'objectif daté.
 * `stamp` absent = la saisie n'est pas (encore) une date ; `complete` dit pourquoi.
 *
 * ⚠️ **LA RANGÉE DE PUCES A ÉTÉ RETIRÉE le 2026-08-07 (décision fondateur)** : on ne
 * propose plus de durées, on demande une date. Deux morceaux sont partis avec elle,
 * et il faut savoir lequel est un manque :
 *  • `closestHorizon` — bon débarras : il allumait la puce la plus PROCHE de
 *    l'échéance enregistrée, donc une cible au 14 novembre affichait « 16 sem » en
 *    surbrillance au-dessus d'une ligne annonçant une AUTRE date ;
 *  • le raccourci « adopter la date réellement tenable en un tap » (A14) — celui-là
 *    est une PERTE assumée. Il vivait dans la première puce depuis A27. La phrase
 *    sous le champ continue d'annoncer la date que Kyroz tiendra ; il faut désormais
 *    la retaper à la main pour la viser.
 *
 * ⚠️ `deadlineLadder` reste appelé, et ce n'est pas un reliquat : la date PRÉ-REMPLIE
 * est maintenant la seule échéance que l'app propose, donc elle doit tenir. Elle est
 * la 2ᵉ marche de l'échelle dérivée du corps — la 1ʳᵉ est le rythme sûr MAXIMAL, et
 * un défaut ne pousse pas d'office quelqu'un au plafond de ce que la sécurité
 * autorise (CLAUDE.md §10).
 */
type EcheanceSaisie = { stamp?: string; complete: boolean };

export default function ProfilScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const repli = useCollapsingTitle();
  const { profile, saveProfile, clearProfile } = useProfile();
  // Prénom : DIFFUSÉ, pas lu au montage (lib/profileName.ts) — il se pose depuis
  // l'éditeur « Informations » de cet écran même, donc le surtitre doit suivre
  // sans changer d'onglet ni redémarrer.
  const prenom = useFirstName();
  const { streak } = useStreak();
  // Le suivi du poids est désormais une CARTE (courbe + écart) et non une ligne de
  // menu : il lui faut les pesées, pas seulement le poids courant du profil.
  const { entries: weightEntries, delta: weightDelta, due: weighInDue } = useWeightLog();
  const { time: reminderTime, choose: chooseReminder } = useReminder();
  const { enabled: checkinEnabled, setEnabled: setCheckinEnabled } = usePlanCheckin();
  const { signOut } = useAuth();
  const { confirm, notify } = useDialog();
  const themeMode = useThemeMode();
  const accentId = useAccentId();
  const [hydrationOn, setHydrationOn] = useHydrationEnabled();
  const router = useRouter();
  const [editor, setEditor] = useState<EditorKey | null>(null);
  const [weighIn, setWeighIn] = useState(false);
  // Historique des repas hors plan (E6). Les écarts se posent depuis l'onglet
  // Plan, donc on RECHARGE à l'ouverture — la liste du montage est périmée.
  const journal = useOffPlanJournal();
  const [offPlanOpen, setOffPlanOpen] = useState(false);
  const openOffPlan = () => { journal.reload(); setOffPlanOpen(true); };
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Ce qu'il faudra ouvrir UNE FOIS la feuille Réglages démontée (cf. son `onClosed`).
  const [apresReglages, setApresReglages] = useState<'supprimer' | null>(null);
  // 🔴 MÊME MÉCANIQUE POUR L'ÉDITEUR, et elle manquait — « Me peser » était MORT sur
  // iPhone. Mesuré au simulateur le 2026-08-14 : deux captures à cinq secondes
  // d'intervalle, IDENTIQUES AU BIT PRÈS, l'éditeur refermé et aucune feuille de
  // pesée. Le geste ne rendait rien depuis le jour où le poids a quitté cet
  // éditeur pour y être RENVOYÉ.
  // ⚠️ Le commentaire de l'appelant disait pourtant « on ferme l'éditeur AVANT
  // d'ouvrir la pesée » — et c'était sincère : les deux `set` étaient bien écrits
  // dans cet ordre. Mais ils partent dans le MÊME lot d'état, et `Sheet` garde sa
  // `Modal` montée le temps de son animation de sortie : au moment où iOS reçoit
  // la seconde, la première est encore présentée. **Écrire les setters dans le bon
  // ordre ne ferme pas cette porte** — seul le démontage réel la ferme.
  const [apresEditeur, setApresEditeur] = useState<'peser' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reglages, setReglages] = useState(false);

  const save = async (updated: UserProfile) => { await saveProfile(updated); setEditor(null); };

  // ── Verrou Kyroz+ ──────────────────────────────────────────────────────────
  // `openEditor` est le point d'étranglement UNIQUE : toute ouverture d'éditeur
  // passe par lui, y compris le deep-link ci-dessous. C'est ce qui rend le verrou
  // impossible à contourner en ajoutant une surface — le piège serait de garder
  // seulement les `onPress` des lignes de menu.
  // ⚠️ INERTE tant que `PAYWALL_LAUNCH` vaut `null` : `can()` renvoie alors true
  // pour tout le monde, donc aucun comportement ne change aujourd'hui.
  const premium = usePremium();
  // Ref plutôt que dépendance : le deep-link ci-dessous doit rester enregistré une
  // seule fois (sinon il relit AsyncStorage à chaque rendu), mais il doit lire le
  // verdict À JOUR au moment du clic, pas celui du premier rendu.
  const premiumRef = useRef(premium);
  const scrollRef = useRef<ScrollView>(null);
  premiumRef.current = premium;

  const openEditor = (key: EditorKey) => {
    const feature = EDITEURS_PREMIUM[key];
    if (feature && !premiumRef.current.can(feature)) { router.push('/kyroz-plus'); return; }
    setEditor(key);
  };

  // Deep-link depuis l'écran Plan (« Personnaliser ma répartition ») : ouvre direct
  // l'éditeur demandé au focus, via un drapeau (même principe que REROLL_KEY).
  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('@kyroz:openEditor').then((v) => {
      if (v) { AsyncStorage.removeItem('@kyroz:openEditor'); openEditor(v as EditorKey); }
    });
  }, []));

  // « Régénérer mon plan » : escape hatch discret (le bouton « Nouveau plan » de
  // l'écran Plan a été retiré au profit de l'ajustement recette-par-recette). On
  // pose un drapeau consommé au focus de l'écran Plan (REROLL_KEY), puis on y va.
  // ⚠️ `Alert.alert` était une FONCTION VIDE sur le web → ce bouton ne faisait
  // rien du tout, sans erreur ni trace (cf. components/Dialog.tsx).
  const regenPlan = async () => {
    const ok = await confirm({
      title: 'Régénérer tout ton plan ?',
      message: 'Kyroz reconstruit une semaine complète de repas (tes goûts et tes préférences sont gardés).',
      confirmLabel: 'Régénérer',
      destructive: true,
    });
    if (!ok) return;
    await AsyncStorage.setItem('@kyroz:planReroll', '1');
    router.push('/(tabs)/plan');
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

  // ⚠️ `contactSupport` vivait ici et N'ÉTAIT PLUS APPELÉ depuis E25 (2026-08-10) :
  // la ligne « Aide & contact » est partie dans `ReglagesSheet`, où elle pousse
  // `/avis` au lieu d'ouvrir un `mailto:`. Le helper, sa constante d'adresse et
  // l'import `Linking` sont donc restés en place à faire semblant. Retirés le
  // 2026-08-10 — l'adresse a une source unique, `lib/feedback.ts::SUPPORT_EMAIL`,
  // et l'écran `/avis` la montre lui-même en repli quand aucun client mail ne
  // répond. Deux adresses en dur, c'est la première qui ment le jour où elle change.

  // « Revoir les tutos » : on oublie les cinq tours, puis on relance TOUT DE SUITE
  // celui de cet écran. Sans ce lancement immédiat, l'action n'aurait aucun effet
  // visible — la personne resterait devant une ligne de menu qui a l'air de n'avoir
  // rien fait, et les autres tours ne reviendraient qu'en changeant d'onglet.
  // ⚠️ Pas de `notify` de confirmation : le dialogue est lui aussi une modale, et
  // il se poserait PAR-DESSUS la bulle qu'on vient de lancer (ou l'inverse). Le
  // tour qui démarre EST le retour visuel — c'est plus clair qu'un message qui
  // annonce ce que l'écran est en train de faire.
  const revoirTutos = async () => {
    await resetAllTours();
    rejouerTour();
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  // Droit à la portabilité (RGPD art. 20) : exporter toutes ses données.
  const doExport = async () => {
    const res = await exportMyData();
    if (!res.ok) { notify({ title: 'Export', message: 'Impossible d’exporter tes données pour le moment.' }); return; }
    if (res.method === 'download') notify({ title: 'Export terminé', message: 'Tes données ont été téléchargées (kyroz-mes-donnees.json).' });
  };

  // Amplitude réelle des cibles quotidiennes. Le plan n'est plus isocalorique depuis
  // le 2026-08-06 : afficher UN chiffre « du jour » serait annoncer un nombre
  // qu'aucune journée ne sert. On montre donc la moyenne ET la fourchette.
  // Ton volontairement rassurant (règle produit) : c'est le moteur qui module, ce
  // n'est ni un effort demandé, ni un écart à rattraper.
  // ⚠️ AVANT le `if (!profile) return null` ci-dessous : un hook posé après un retour
  // anticipé n'existe pas à tous les rendus, et React casse à la bascule
  // (« Rendered more hooks than during the previous render »). Le même oubli a fait
  // tomber `FirstPlanReveal` dans l'ErrorBoundary — invisible de `tsc` comme des tests.
  const modulation = useMemo(() => {
    if (!profile) return null;
    const jours = baseDayTargets(profile, Math.max(1, Math.min(profile.plan_days ?? 7, 7)));
    const bas = Math.min(...jours);
    const haut = Math.max(...jours);
    return haut - bas >= 40 ? { bas, haut } : null;
  }, [profile]);

  // Cibles de la visite guidée qui ne passent pas par un composant (les lignes de
  // menu, elles, reçoivent un `tourId`). ⚠️ Comme `modulation` ci-dessus : AVANT
  // le retour anticipé.
  const tdeeRef = useTourTarget('profil-tdee');
  // « Régénérer » est devenu un BOUTON, hors de la liste de réglages : il ne peut
  // donc plus porter le `tourId` de `MenuRow`, il lui faut sa propre ref. Sans elle
  // l'étape n'aurait pas de cible montée — et une étape sans cible est écartée EN
  // SILENCE, laissant un tour plus court qui a l'air complet (cf. E25).
  const regenRef = useTourTarget('profil-regenerer');
  const donneesRef = useTourTarget('profil-donnees');
  const { rejouer: rejouerTour } = useScreenTour(
    'profil',
    profilTour({ objectifDateDisponible: premium.can('dated_goal') }),
    { pret: !!profile, scrollRef },
  );

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
  const dietBreakWeek = plan.flags.includes('DIET_BREAK_WEEK');
  const lowEaRise = plan.low_ea_escalation;

  // La cible affichée EST le plancher de sécurité, et rien ne le disait ici.
  // Conséquence mesurée : deux profils dont seule la composition diffère peuvent
  // afficher la MÊME cible (le plancher vaut 30 kcal/kg de masse maigre, identique
  // aux deux sexes), et l'écran laissait croire à un moteur qui ne calcule rien.
  // Exclu quand l'insuffisance pondérale a déjà sa propre carte au-dessus : deux
  // messages pour une même cause se contrediraient à l'œil.
  //
  // ⚠️ DEUX lectures distinctes, et les confondre a déjà cassé cet écran :
  //  • `floorBinding` (= le prédicat de FLOOR_APPLIED) décide de l'AFFICHAGE. Tester
  //    `clampedByKcal > 0` à la place testerait une TRANSITION : en mode manual la
  //    correction est persistée dans les grammes, donc la note ne s'afficherait
  //    JAMAIS sur ces comptes — précisément ceux dont la cible ne bouge plus.
  //  • `source` choisit le TEXTE. Chaque plancher a une raison et un avenir
  //    différents ; en nommer un pour un autre est un mensonge, pas une nuance.
  const clamp = plan.clamp.floorBinding && !underweightCapped ? plan.clamp : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* `ref` : la visite guidée en a besoin pour amener ses cibles basses (la
          dépense estimée, le bloc « ce qui suit ton compte ») dans le champ
          visible. En natif, sans cette ref, une cible sous la ligne de flottaison
          se mesure hors écran et son étape s'ouvre sur le vide. */}
      <ScrollView ref={scrollRef} contentContainerStyle={[s.content, layout.content]} showsVerticalScrollIndicator={false} {...repli.scrollProps}>
        {/* En-tête — l'écran n'en avait AUCUN : il démarrait direct sur la carte
            poids. Sur un écran aussi long, arriver sans savoir où on est coûte plus
            cher que les 60 px que ça prend. Le surtitre dit qui tu es, le titre dit
            où tu es.
            ⚠️ Le surtitre disait « Homme · 30 ans · Sèche » — soit MOT POUR MOT ce
            que les lignes « Informations » et « Objectif » redisent 600 px plus bas.
            Une ligne qui répète n'informe pas, elle occupe. Il porte désormais le
            prénom, la seule chose de cet écran qui ne soit écrite nulle part
            ailleurs. Pas de prénom (compte antérieur à la question) → pas de ligne :
            mieux vaut un en-tête plus court qu'un remplissage. */}
        <View style={s.header} onLayout={repli.onHeaderLayout}>
          <View style={{ flex: 1 }}>
            {!!prenom && <Text style={s.sub}>{prenom}</Text>}
            <Text style={s.h1}>Profil</Text>
          </View>
          {/* 🔴 LE « ? » EST PARTI le 2026-08-14 (décision fondateur), et LA SÉRIE
              prend sa place — très discrète, exactement comme l'en-tête du Plan.
              ⚠️ La porte de sortie du tuto ne disparaît PAS avec lui : « Revoir
              les tutos » vit dans la roue dentée juste à droite, sur ce même
              écran. CLAUDE.md §8 exige qu'un écran à tour garde un recours ; il
              en garde un, il change simplement d'endroit. */}
          <View style={s.serie}>
            <Text style={s.serieN}>{streak.current_streak_days} j</Text>
            <Text style={s.serieLbl}>de série</Text>
          </View>
          {/* 🔴 LA ROUE DENTÉE — décision fondateur du 2026-08-09. Tout ce qui
              n'est ni toi ni ton plan vit derrière : notifications, apparence,
              accent, confidentialité, compte. L'écran empilait 6 interrupteurs
              système entre « Régénérer mon plan » et « Supprimer mon compte ».
              ⚠️ Elle porte la cible `profil-donnees` : l'étape de visite guidée
              qui parle de synchronisation visait le bloc de bas de page, parti
              dans la feuille. Une étape dont la cible n'est pas MONTÉE est
              écartée en silence — le tour se serait joué plus court en ayant
              l'air complet (cf. `visiteGuidee.test.ts`, qui l'exige désormais). */}
          <Presse
            ref={donneesRef}
            onPress={() => setReglages(true)}
            hitSlop={10}
            activeOpacity={OPACITE_PRESSION}
            accessibilityRole="button"
            accessibilityLabel="Réglages"
            style={s.roue}
          >
            <Ionicons name="settings-outline" size={Icone.nav} color={t.textSecondary} />
          </Presse>
        </View>

        {/* ⚠️ ORDRE INVERSÉ le 2026-08-02 (décision fondateur), et ce n'est pas
            cosmétique : le POIDS alimente le moteur — chaque pesée recalcule TDEE,
            macros et plan — alors que la série ne raconte que l'assiduité. Le premier
            tenait dans une ligne de menu, la seconde occupait tout le haut de l'écran.
            Ils ont échangé leur place. */}
        <WeightSummaryCard
          t={t}
          profileWeightKg={profile.weight_kg}
          entries={weightEntries}
          delta={weightDelta}
          due={weighInDue}
          goalTarget={trackingTarget(profile, todayStamp())}
          onPress={() => setWeighIn(true)}
          tourId="profil-poids"
        />

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
          <Presse activeOpacity={OPACITE_PRESSION} onPress={() => setEditor('goal')}>
            <Card t={t}>
              <Text style={{ ...Type.caption, color: t.text, lineHeight: 19 }}>
                Ton poids est descendu sous la plage de référence pour ta taille. Kyroz a ramené ton plan à ta maintenance : plus de déficit tant que tu es dans cette zone. Tu n'as rien à faire dans l'immédiat — touche ici quand tu veux choisir un autre objectif.
              </Text>
            </Card>
          </Presse>
        )}

        {/* Semaine de pause à la maintenance (2026-08-10).

            SANS cette carte, la personne voit son budget monter de plusieurs centaines
            de kcal du jour au lendemain, en pleine sèche, sans avoir rien changé — et
            elle en conclut que l'app déraille. C'est exactement le défaut que
            `LowEaRiseCard` a été écrite pour fermer, sur un mécanisme voisin.

            ⚠️ Ton de §10 : la pause est un ACQUIS, pas une sanction ni un retard. On ne
            dit ni « tu dois », ni « tu as trop », ni « rattrapage ». Et on annonce la
            FIN dès la première phrase — un palier dont on ne voit pas le bout se lit
            comme un échec. Aucun bouton : il n'y a rien à faire, et proposer une action
            suggérerait qu'il faut la corriger. */}
        {dietBreakWeek && (
          <Card t={t}>
            <Text style={{ ...Type.caption, color: t.text, lineHeight: 19 }}>
              Cette semaine, tu manges à ta maintenance. C'est prévu : après huit semaines de déficit d'affilée, Kyroz en intercale une à l'équilibre. Ton déficit reprend tout seul la semaine prochaine, et ta date d'objectif en tient déjà compte.
            </Text>
          </Card>
        )}

        {/* Sortie de déficit après un long séjour en énergie disponible basse.
            SANS cette carte, la cible remonte de ~23 kcal/j chaque semaine pendant
            dix semaines sans un mot — une sèche dont les calories augmentent toutes
            les semaines, ce qui se lit comme une app qui déraille. On explique, on
            chiffre SUR SON CORPS, et on promet une fin (la remontée est bornée). */}
        {lowEaRise && <LowEaRiseCard t={t} rise={lowEaRise} onPress={() => setEditor('goal')} />}

        {/* Cibles du jour — les quatre macros perdent leurs quatre couleurs : même
            graisse, même encre, la valeur porte seule. Il n'y a rien à comparer
            entre quatre boîtes côte à côte (cf. la note en tête de theme.ts). */}
        <SectionTitle t={t}>Tes cibles</SectionTitle>
        <View style={s.grid}>
          <Box t={t} v={profile.target_kcal} l="kcal en moyenne" />
          <Box t={t} v={profile.target_protein_g} l="protéines" u=" g" />
          <Box t={t} v={profile.target_carbs_g} l="glucides" u=" g" />
          <Box t={t} v={profile.target_fat_g} l="lipides" u=" g" />
        </View>

        {/* 🔴 DEUX PARAGRAPHES ONT ÉTÉ RETIRÉS ICI le 2026-08-14 (décision
            fondateur : « enlève le blabla entre les macro et le TDEE »).
            · la modulation par volume (« ton plan module ces calories… ») ;
            · l'explication du plancher de sécurité (« ces N kcal, c'est ton
              plancher — pas le résultat de ton déficit… »).
            ⚠️ CE QU'ON A TROQUÉ, pour que personne ne le redécouvre par surprise :
            la seconde répondait à « pourquoi ma cible ne bouge plus quand je change
            mes réglages ? ». Sans elle, une cible bornée par la sécurité se lit
            comme un moteur en panne — c'est le motif écrit dans CLAUDE.md §6 le jour
            où elle a été ajoutée. Les deux explications survivent en entier dans
            **Méthodologie & sources** (roue dentée → Aide et retours), qui est la
            surface qu'Apple 1.4.1 impose de toute façon.
            ➡️ Ne pas les remettre ici sans nouvelle décision : c'est cet écran-ci
            que le fondateur voulait alléger. */}

        {/* TDEE — le libellé prend la place qui reste, le chiffre ne se coupe jamais
            en deux lignes (`flexShrink: 0`). Sans ça, « 2 369 kcal » passait à la
            ligne au milieu de lui-même.
            ⚠️ REMONTÉ ICI le 2026-08-10. Il vivait tout en bas, APRÈS les onze
            lignes de menu — à peu près 900 px sous les cibles qu'il explique. C'est
            pourtant la seule ligne de l'écran qui réponde à « pourquoi 2 293 ? » :
            la dépense et la cible se lisent ensemble ou ne se lisent pas.
            ➡️ L'étape de visite guidée qui le vise a suivi (lib/tours.ts) : laissée
            en avant-dernier, elle aurait fait remonter l'écran de tout en bas vers
            le haut, puis redescendre. Une bulle qui déplace l'écran à contresens de
            sa propre progression se lit comme un bug, pas comme une visite. */}
        <View ref={tdeeRef} style={s.tdee}>
          <Text style={s.tdeeL}>Dépense estimée · maintenance (TDEE)</Text>
          <Text style={s.tdeeV}>{profile.tdee_kcal.toLocaleString('fr-FR')} kcal</Text>
        </View>

        {/* Réglages — TOI d'abord (corps, sport, objectif), TON PLAN ensuite. Dix
            lignes d'affilée étaient un mur : les couper en deux blocs nommés donne
            un repère, et ça ne coûte rien. Les icônes sont parties — à 17 px
            semi-gras le libellé suffit, et la ligne respire.
            🔴 CE TITRE DISAIT « Réglages », ET C'ÉTAIT LE NOM D'AUTRE CHOSE. Depuis
            E25, la roue dentée en haut de cet écran ouvre une feuille intitulée
            « Réglages » (ReglagesSheet) dont le contenu est DISJOINT de ce bloc-ci :
            là-bas notifications, affichage, confidentialité, compte ; ici ce qui
            pilote le moteur. Deux destinations, un seul mot, sur le même écran —
            « va dans les réglages » ne désignait plus rien. Le commit d'E25 nommait
            déjà les deux blocs « Toi / Ton plan » ; le code, lui, était resté sur
            l'ancien nom.
            ➡️ « TOI » est un `SectionLabel`, comme « TON PLAN » : deux blocs frères
            au même niveau. Avant, l'un était un `SectionTitle` (« découpe l'écran »)
            et l'autre un `SectionLabel` (« étiquette un bloc ») — le premier bloc
            n'avait donc aucune étiquette à lui, il empruntait celle du chapitre. */}
        {/* ⚠️ TROIS blocs depuis le 2026-08-10, et chacun porte un SOUS-TITRE — c'est
            lui qui fait le travail, pas le découpage. « TON PLAN » disait de quoi le
            bloc parlait, jamais ce qu'il PILOTAIT : rien n'indiquait que « Sport &
            activité » décide de la dépense, donc rien n'y envoyait qui doute de son
            chiffre. Le réglage le plus lourd de l'app vit derrière cette ligne-là —
            le NEAT, **80 kcal/j le cran** en médiane (57 à 102, mesuré sur 800
            gabarits le 2026-08-10) — et il n'est demandé NULLE PART ailleurs, pas
            même à l'inscription. Un sous-titre de cinq mots lui donne enfin une
            adresse. */}
        <SectionLabel t={t} sub="ce qui calcule ta dépense">TOI</SectionLabel>
        <View style={s.menu}>
          <MenuRow t={t} label="Informations" value={`${SEX_LABELS[profile.sex]} · ${profile.age} ans · ${profile.weight_kg} kg${profile.body_fat_pct != null ? ` · ${profile.body_fat_pct}% MG` : ''}`} onPress={() => setEditor('info')} />
          <MenuRow t={t} label="Sport & activité" value={`${profile.sports?.length ? `${profile.sports.length} sport${profile.sports.length > 1 ? 's' : ''}` : 'Aucun sport'} · ${NEAT_SHORT[profile.neat_level ?? DEFAULT_NEAT_LEVEL]}`} onPress={() => setEditor('sports')} tourId="profil-sport" last />
        </View>

        {/* « Calories & macros » a quitté le bloc des repas pour celui-ci : il ne
            remplit aucune assiette, il fixe le nombre que les assiettes doivent
            atteindre. Il se lit avec l'objectif, pas avec les préférences. */}
        <SectionLabel t={t} sub="ce qui fixe tes cibles">TON OBJECTIF</SectionLabel>
        <View style={s.menu}>
          <MenuRow t={t} label="Objectif" value={goalLabel(profile.goal)} onPress={() => setEditor('goal')} />
          <MenuRow t={t} label="Objectif daté" value={profile.goal_target ? `${profile.goal_target.target_weight_kg} kg · ${formatFR(profile.goal_target.target_date)}` : (premium.can('dated_goal') ? 'Aucun' : 'Inclus dans Kyroz+')} onPress={() => openEditor('dated_goal')} tourId="profil-objectif-date" />
          <MenuRow t={t} label="Calories & macros" value={profile.macro_mode === 'percent' ? 'Perso %' : 'Calculées'} onPress={() => setEditor('macros')} last />
        </View>

        <SectionLabel t={t} sub="ce qui remplit ton assiette">TES REPAS</SectionLabel>
        <View style={s.menu}>
          <MenuRow t={t} label="Préférences alimentaires" value={profile.dietary_restrictions.length || profile.disliked_foods.length || profile.hidden_recipes?.length ? 'Personnalisées' : 'Aucune'} onPress={() => setEditor('prefs')} />
          <MenuRow t={t} label="Paramètres des repas" value={`${profile.plan_days} j · ${(profile.meals?.length || 4)} repas · ${emphasisResume(profile)}`} onPress={() => setEditor('meals')} />
          {/* La banque PRÉVOIT un écart, l'historique le CONSTATE : la paire se lit
              toute seule, d'où le voisinage. */}
          <MenuRow t={t} label="Banque de calories" value={premium.can('calorie_bank') ? bankResume(profile) : 'Inclus dans Kyroz+'} onPress={() => openEditor('calorie_bank')} />
          {/* ⚠️ La VALEUR ne COMPTE PAS les écarts, et ce n'est pas un oubli de
              rangement : un score posé là mettrait la pression sans qu'on ouvre quoi
              que ce soit (règle anti charge mentale). Elle reste un FAIT daté — ce
              que la nouvelle règle de forme demande — sans devenir un score. */}
          <MenuRow t={t} label="Écarts passés" value={journalSummary(journal.entries)} onPress={openOffPlan} last />
        </View>

        {/* Une ACTION n'a pas de valeur à droite, donc pas sa place dans une liste de
            réglages : elle ne se règle pas, elle se déclenche. Bouton discret
            (`t.card`), pas l'accent — sinon il deviendrait l'élément le plus criard
            de l'écran, devant la pesée qui est l'entrée réellement quotidienne. */}
        <Presse ref={regenRef} onPress={regenPlan} activeOpacity={OPACITE_PRESSION} accessibilityRole="button"
          style={s.actionBtn}>
          <Text style={s.actionTxt}>Régénérer mon plan</Text>
        </Presse>

        {/* Kyroz+ — hors chapitre et en dernier. Ce n'est pas un réglage : c'est une
            offre, et une offre se range là où elle se vend, à deux lignes des deux 💎
            qu'elle débloque. Elle reste une LIGNE tant que « tout est déjà ouvert » :
            une carte promotionnelle de 100 px qui ne vend rien est du bruit. Elle
            deviendra une carte le jour où le paywall s'allumera, pas avant. */}
        <View style={s.menu}>
          <MenuRow t={t} label="Kyroz+" value={KYROZ_PLUS_VALEUR[premium.reason]} onPress={() => router.push('/kyroz-plus')} last />
        </View>

      </ScrollView>

      <CompactTitleBar t={t} title="Profil" opacity={repli.opacity} />

      {/* Réglages — déclarée AVANT les éditeurs, sans conséquence : depuis le
          2026-08-09 chaque feuille monte son conteneur à l'ouverture, donc
          l'empilement suit l'ordre des GESTES et non celui du JSX. C'était l'un
          des deux pièges de cette refonte (`ActionSheet.tsx`). */}
      {/* 🔴 « SUPPRIMER MON COMPTE » NE S'OUVRE QU'UNE FOIS CETTE FEUILLE DÉMONTÉE
          — corrigé le 2026-08-14, après l'avoir vu échouer au simulateur. Le code
          posait `setReglages(false)` et `setConfirmDelete(true)` dans le même lot
          d'état : la feuille partait en animation de sortie tout en gardant sa
          `Modal` montée, et iOS refuse d'en présenter une seconde par-dessus.
          Résultat mesuré : la feuille se fermait, la confirmation n'apparaissait
          JAMAIS, sans erreur ni trace — deux captures à six secondes d'écart ne
          différaient que par l'horloge.
          ⚠️ Le web ne montrait rien de ce défaut : il empile les modales sans se
          plaindre. C'est une obligation RGPD et un point de revue App Store, donc
          le seul chemin acceptable est celui qui ne dépend d'aucun délai deviné —
          `onClosed` part quand l'animation est TERMINÉE.
          ⚠️ `apresReglages` plutôt qu'un appel direct : au moment où la feuille se
          ferme, il faut se souvenir de POURQUOI. « Se déconnecter » ne passe pas
          par là (il ne rouvre aucune modale). */}
      <Sheet
        visible={reglages}
        onClose={() => setReglages(false)}
        onClosed={() => { if (apresReglages === 'supprimer') setConfirmDelete(true); setApresReglages(null); }}
      >
        <ReglagesSheet
          t={t}
          version={appVersion}
          onClose={() => setReglages(false)}
          onExport={doExport}
          onRevoirTutos={revoirTutos}
          onLogout={doLogout}
          onDelete={() => { setApresReglages('supprimer'); setReglages(false); }}
          weighInFrequency={profile.weigh_in_frequency ?? DEFAULT_WEIGH_IN_FREQUENCY}
          onWeighInFrequency={(f) => {
            saveProfile({ ...profile, weigh_in_frequency: f });
            // Ré-arme la notification sur la nouvelle cadence — même geste que celui
            // que faisait `WeightCheckin` avant que le réglage ne déménage.
            applyWeighInReminder(f, weightEntries[weightEntries.length - 1]?.date ?? null);
          }}
        />
      </Sheet>

      {/* Feuilles d'édition */}
      <Sheet
        visible={editor !== null}
        onClose={() => setEditor(null)}
        onClosed={() => { if (apresEditeur === 'peser') setWeighIn(true); setApresEditeur(null); }}
      >
        {/* `onWeighIn` : le poids ne se saisit plus dans cet éditeur, il s'y RENVOIE.
            🔴 ET LA PESÉE N'EST DEMANDÉE QU'UNE FOIS L'ÉDITEUR DÉMONTÉ (`onClosed`).
            La version d'avant faisait `setEditor(null); setWeighIn(true);` — deux
            setters dans le bon ordre, mais un seul lot d'état : iOS voyait la
            seconde `Modal` arriver pendant que la première jouait sa sortie, et
            n'en présentait AUCUNE. Bouton mort, sans erreur ni trace, invisible au
            navigateur. Même correctif que « Supprimer mon compte » juste au-dessus. */}
        {editor === 'info' && <InfoEditor t={t} profile={profile} onSave={save} onWeighIn={() => { setApresEditeur('peser'); setEditor(null); }} />}
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

      {/* Historique des repas hors plan (E6) — local à l'appareil */}
      <Sheet visible={offPlanOpen} onClose={() => setOffPlanOpen(false)}>
        <OffPlanHistory t={t} entries={journal.entries} onRemove={journal.removeDisplayed} />
      </Sheet>

      {/* Confirmation suppression de compte (RGPD) */}
      <ActionSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <Text style={{ color: t.text, ...Type.h2 }}>Supprimer mon compte ?</Text>
        <Text style={{ ...Type.body, color: t.textSecondary, lineHeight: 21 }}>
          Toutes tes données (profil, plans, série, favoris, frigo) seront définitivement supprimées, sur cet appareil et sur le serveur.
        </Text>
        <View style={{ height: 6 }} />
        <Presse onPress={doDelete} disabled={deleting} activeOpacity={OPACITE_PRESSION}
          style={{ backgroundColor: t.danger, borderRadius: Radius.button, paddingVertical: Spacing.lg, alignItems: 'center', opacity: deleting ? 0.6 : 1 }}>
          <Text style={{ ...Type.h3, color: t.onDanger }}>{deleting ? 'Suppression…' : 'Supprimer définitivement'}</Text>
        </Presse>
        <Presse onPress={() => setConfirmDelete(false)} style={{ alignItems: 'center', paddingVertical: Spacing.sm }}>
          <Text style={{ ...Type.bodyStrong, color: t.textSecondary }}>Annuler</Text>
        </Presse>
      </ActionSheet>
    </SafeAreaView>
  );
}

// ── Lignes / boîtes ──────────────────────────────────────────────────────────

// ⚠️ `SectionTitle` et `MenuRow` vivaient ICI. Ils sont montés dans
// `components/ui.tsx` le 2026-08-10, en sortant le Profil du fourre-tout : la
// moitié des lignes de menu est partie dans `ReglagesSheet`, et deux fichiers
// avaient besoin du même composant. Les recopier aurait été « un style recopié
// partout est un rôle qui n'a pas de nom » (CLAUDE.md §8) — sur le composant le
// plus employé de l'app, donc l'endroit où une divergence se verrait le moins.

// ⚠️ Plus de prop `c` (couleur) : les quatre macros portaient quatre teintes,
// alors qu'il n'y a rien à comparer entre quatre boîtes côte à côte. Même encre
// pour les quatre — cf. la note en tête de constants/theme.ts.
function Box({ t, v, l, u = '' }: { t: ThemePalette; v: number; l: string; u?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: t.card, borderRadius: Radius.card, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.sm, alignItems: 'center', gap: Spacing.xs }}>
      <Text style={{ ...Type.h2, letterSpacing: -0.5, color: t.text }}>{v}{u}</Text>
      <Text style={{ ...Type.caption, color: t.textSecondary, textAlign: 'center' }}>{l}</Text>
    </View>
  );
}

// ── Coquille d'éditeur (en-tête + scroll + bouton) ───────────────────────────
function EditorShell({
  t, title, children, onSave, canSave = true, dragHandlers, sheetScrollProps,
}: { t: ThemePalette; title: string; children: React.ReactNode; onSave: () => void; canSave?: boolean; dragHandlers?: any; sheetScrollProps?: any }) {
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.sm }} {...(dragHandlers ?? {})}>
        <Text style={{ color: t.text, ...Type.h2 }}>{title}</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.lg }}
        showsVerticalScrollIndicator={false}
        {...(sheetScrollProps ?? {})}
      >
        {children}
      </ScrollView>
      <View style={{ padding: Spacing.xxl, paddingTop: Spacing.sm, borderTopWidth: Trait.fin, borderTopColor: t.line }}>
        <PrimaryButton t={t} label="Enregistrer" onPress={onSave} disabled={!canSave} />
      </View>
    </View>
  );
}

type EditorProps = { t: ThemePalette; profile: UserProfile; onSave: (p: UserProfile) => void; dragHandlers?: any; sheetScrollProps?: any };

// ── Éditeurs ─────────────────────────────────────────────────────────────────
function InfoEditor({ t, profile, onSave, onWeighIn, dragHandlers, sheetScrollProps }: EditorProps & { onWeighIn: () => void }) {
  // Prénom — LOCAL à l'appareil, hors profil synchronisé (cf. lib/profileName.ts).
  // Il ne s'écrivait qu'à l'onboarding : un compte antérieur à cette étape restait
  // sur « Ton plan » sans aucun recours. Il vit ici désormais.
  const prenomInitial = useFirstName();
  const [prenom, setPrenom] = useState(prenomInitial);
  const [sex, setSex] = useState<Sex>(profile.sex);
  // Date de naissance plutôt qu'âge : l'âge en est DÉRIVÉ et ne pourrit plus (cf.
  // lib/birthday.ts). ⚠️ Elle est ABSENTE des comptes créés avant le 2026-08-02 —
  // on ne l'invente pas (un âge ne donne qu'une fourchette d'un an) : ces profils
  // gardent leur âge saisi tant qu'ils n'ont pas renseigné leur date.
  const [birthDate, setBirthDate] = useState<string | undefined>(profile.birth_date);
  // 🔴 LE POIDS N'EST PLUS SAISISSABLE ICI (2026-08-10) — il l'était, et c'était le
  // seul défaut RÉEL de cette passe de rangement, les autres n'étant que de la
  // lisibilité. Deux chemins écrivaient le même chiffre, et ils n'écrivaient PAS
  // la même chose :
  //   · « Me peser » (WeightCheckin → useWeightLog::logWeight) ajoute un point à
  //     l'historique ET recale le profil ;
  //   · ce champ-ci ne recalait que le profil — l'historique n'en savait rien.
  // Conséquence, sur le MÊME écran et dans le même défilement : la carte du haut
  // affiche le poids du PROFIL en grand, mais la courbe et le « −0,9 kg depuis la
  // précédente » sortent de l'HISTORIQUE. Corriger 83 → 80 ici affichait donc
  // « 80 kg », un écart calculé sur une série qui s'arrête à 83, et une courbe qui
  // ne descend pas jusqu'au chiffre écrit au-dessus d'elle. Le suivi de l'objectif
  // daté lit la même série : il continuait de projeter depuis un poids abandonné.
  // ➡️ Une donnée qui alimente une SÉRIE ne se corrige pas par un champ qui ignore
  // la série. Le poids devient une ligne de renvoi vers son unique porte d'entrée.
  const [height, setHeight] = useState(String(profile.height_cm));
  const [bodyFat, setBodyFat] = useState<number | undefined>(profile.body_fat_pct);
  const [bodyFatSource, setBodyFatSource] = useState<BodyFatSource | undefined>(profile.body_fat_source);
  const aN = ageOn(birthDate, todayStamp()) ?? profile.age;
  // Le poids n'est plus une saisie : il reste dans le brouillon (bornes, repère de
  // plausibilité du %MG, recalcul) mais sa valeur vient du profil, jamais d'un champ.
  const wN = profile.weight_kg, hN = parseFloat(height);
  // Bornes tirées de lib/safety.ts, PAS réécrites en dur : elles divergeaient de
  // l'onboarding (16 ans ici contre 18 là-bas — le relèvement MIN_AGE n'avait été
  // câblé que côté onboarding, donc on pouvait saisir 18 puis repasser à 16 ici ;
  // et 40–250 kg contre 30–300, ce qui verrouillait l'écran pour un profil onboardé
  // hors de cette plage : bouton « Enregistrer » désactivé en permanence).
  const draft = { ...profile, sex, age: aN, birth_date: birthDate, weight_kg: wN, height_cm: hN, body_fat_pct: bodyFat, body_fat_source: bodyFatSource };
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
  // Le prénom part avant le profil : il vit dans son propre store, `onSave` ne le
  // porte pas. Vide = on efface la salutation, ce qui est un choix légitime.
  const submit = () => { if (valid) { saveFirstName(prenom); onSave(withRecalc(draft)); } };
  return (
    <EditorShell t={t} title="Informations" onSave={submit} canSave={valid} dragHandlers={dragHandlers} sheetScrollProps={sheetScrollProps}>
      {blockMsg && (
        <Card t={t}>
          <Text style={{ ...Type.captionStrong, color: t.danger, lineHeight: 19 }}>{blockMsg}</Text>
        </Card>
      )}
      {warnMsg && (
        <Card t={t}>
          <Text style={{ ...Type.caption, color: t.warning, lineHeight: 19 }}>
            {warnMsg} Tu peux le changer dans « Objectif ».
          </Text>
        </Card>
      )}
      {/* Même correction que l'étape 1 de l'onboarding (2026-08-12) : le placeholder
          reprend le libellé au lieu de suggérer « Kévin », le prénom du fondateur. */}
      <Field t={t} label="Prénom" value={prenom} onChangeText={setPrenom} placeholder="Ton prénom" autoCapitalize="words" />
      <Segmented t={t} options={[{ label: 'Homme', value: 'male' }, { label: 'Femme', value: 'female' }]} value={sex} onChange={setSex} />
      <SectionLabel t={t}>Date de naissance</SectionLabel>
      <BirthDateField t={t} value={birthDate} onChange={setBirthDate} fallbackAge={profile.birth_date ? undefined : profile.age} />
      {/* Renvoi, pas champ : le poids a UNE porte d'entrée, et c'est celle qui
          tient l'historique. Le libellé dit où l'on va, pas seulement que ça se
          passe ailleurs. */}
      <Presse onPress={onWeighIn} activeOpacity={OPACITE_PRESSION} accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.lg, minHeight: CIBLE_TACTILE_MIN }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...Type.bodySmall, color: t.textSecondary }}>Poids</Text>
          <Text style={{ ...Type.h3, color: t.text, marginTop: Spacing.xs }}>{profile.weight_kg} kg</Text>
        </View>
        <Text style={{ ...Type.captionStrong, color: t.accent }}>Me peser</Text>
        <Ionicons name="chevron-forward" size={Icone.standard} color={t.textQuaternary} />
      </Presse>
      <Text style={{ ...Type.caption, color: t.textTertiary, lineHeight: 17, marginTop: -Spacing.sm }}>
        Ton poids se met à jour en te pesant : c'est ce qui garde ta courbe et ton suivi justes.
      </Text>
      <Field t={t} label="Taille" suffix="cm" value={height} onChangeText={setHeight} keyboardType="number-pad" />
      <SectionLabel t={t}>Masse grasse (optionnel)</SectionLabel>
      {/* `draft` : le repère de plausibilité chiffre l'impact sur le corps EN COURS
          d'édition, pas sur le profil enregistré. */}
      <BodyFatPicker
        t={t} sex={sex} value={bodyFat} source={bodyFatSource}
        onChange={(pct, src) => { setBodyFat(pct); setBodyFatSource(src); }}
        body={draft}
      />
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
    <Presse activeOpacity={OPACITE_PRESSION} onPress={onPress}>
      <Card t={t}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
          <ProtectionIcon color={t.text} size={Icone.petite} />
          <Text style={{ ...Type.bodyStrong, color: t.text, flex: 1 }}>
            {enCours ? 'Ta cible remonte, c\'est voulu' : 'Kyroz a mis ta sèche en pause'}
          </Text>
        </View>
        {enCours ? (
          <Text style={{ ...Type.caption, color: t.text, lineHeight: 19 }}>
            Tu sèches depuis plus de 3 mois. Pour protéger ton énergie sur la durée, Kyroz remonte doucement tes calories — environ {rise.weeklyKcal} kcal par semaine, encore {rise.weeksToPlateau} semaine{rise.weeksToPlateau > 1 ? 's' : ''}. Tu n'as rien à changer.
          </Text>
        ) : (
          <Text style={{ ...Type.caption, color: t.text, lineHeight: 19 }}>
            Après un long déficit, Kyroz t'a ramenée à un niveau qui protège ton énergie : tes calories ne baisseront plus tant que tu restes ici. Tu n'as rien à faire dans l'immédiat — touche ici quand tu veux choisir un autre objectif.
          </Text>
        )}
      </Card>
    </Presse>
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
  // ⚠️ Le texte est SPÉCIFIQUE À LA RÉVISION. Servir l'explication de la rev 2 à
  // quelqu'un dont la cible a bougé pour une autre raison serait un mensonge, pas
  // une approximation — et c'est le seul message que cette personne verra jamais
  // sur le sujet. Une révision qui déplace les cibles doit ajouter son cas ici.
  // ⚠️ Le texte se choisit sur le TRAJET (`fromRev` → `rev`) et sur le SIGNE, jamais
  // sur la seule révision d'arrivée. Deux pièges déjà rencontrés, tous deux vus à
  // l'écran ou mesurés :
  //  · un compte dormant depuis la rev 1 traverse plusieurs corrections d'un coup et
  //    voit sa cible BAISSER (séances comptées en double). Lui servir « Kyroz
  //    sous-estimait ta dépense » au-dessus d'un « −470 » est un mensonge.
  //  · la formulation doit rester neutre quant à l'OBJECTIF : la carte est servie
  //    aussi aux maintiens et aux prises de masse, à qui parler d'une « sèche pas
  //    servie en entier » ne veut rien dire.
  const depuis = notice.fromRev ?? 1;
  const monte = notice.to > notice.from;
  const explication = notice.cause === 'floor_lifted'
    // rev 7 (2026-08-10) — les planchers dérivés de la masse maigre se retirent à forte
    // adiposité. La cible BAISSE, et c'est une bonne nouvelle : jusqu'ici Kyroz refusait
    // le déficit demandé (0,30 kg/semaine maximum, quel que soit le corps). Le texte le
    // dit sans jargon (« énergie disponible », « masse maigre ») et surtout SANS
    // reproche : ce n'est pas la personne qui allait trop lentement, c'est le moteur.
    ? 'Kyroz te retenait : sa limite de sécurité était calculée pour des gabarits secs, et elle t\'empêchait de creuser un vrai déficit. Elle ne s\'applique plus à toi — ton budget baisse, et ta perte de poids va enfin suivre le rythme que tu as demandé.'
    : notice.cause === 'goal_merged'
    // rev 7 (2026-08-10) — `bulk` refermé sur `lean_bulk`. Ne JAMAIS présenter ça comme
    // une perte d'option : ce qui a disparu est un cran de vitesse, et la vitesse se
    // règle maintenant par la date. La hausse de protéines est dite, parce que c'est le
    // gain réel et qu'elle explique pourquoi le plan reste bon avec moins de calories.
      ? 'Kyroz n\'a plus qu\'une prise de masse, et elle vise le muscle : un surplus plus mesuré, avec plus de protéines. Pour prendre plus vite, donne-toi un poids à atteindre et une date — c\'est elle qui règle le rythme désormais.'
      : notice.rev >= 6 && depuis >= 5
    // rev 6 (2026-08-06) — Katch-McArdle exige désormais un %MG MESURÉ. La cible peut
    // monter ou baisser selon le sens de l'erreur d'estimation, donc le texte ne prend
    // PAS parti sur le signe : il explique la cause, qui est la même dans les deux cas.
    // Aucun jargon (« Katch », « métabolisme de base ») et aucun reproche — la personne
    // n'a rien fait de mal, c'est le moteur qui cesse de prétendre à une précision
    // qu'un chiffre estimé n'a pas.
    ? 'Kyroz s\'appuyait sur ton pourcentage de masse grasse comme s\'il était mesuré. Tant qu\'il est estimé, il repart d\'un calcul plus prudent — ton pourcentage reste affiché, il ne sert simplement plus de base à ta dépense.'
    : notice.rev >= 5 && depuis >= 4 && !monte
    // rev 5 (A15) — la cible BAISSE, et pour une raison précise : la date visée ne
    // tenait pas et Kyroz servait quand même le rythme « juste requis », donc il
    // freinait sans le dire. Le ton reste celui de la §10 : on annonce un moteur qui
    // porte la charge, pas un retard à rattraper.
    ? 'Ta date n\'était pas tenable au rythme que Kyroz servait : il avance maintenant au maximum de ce qui reste sûr, et la date qu\'il t\'annonce est celle qu\'il tiendra.'
    : notice.rev >= 3 && depuis >= 2 && monte
      ? 'Kyroz sous-estimait la dépense d\'une journée plutôt assise : ton budget part maintenant d\'une estimation plus juste.'
      : monte
        ? 'Kyroz a revu sa façon d\'estimer ta dépense : ton budget part maintenant d\'une base plus juste.'
        : 'Kyroz a corrigé deux choses : tes séances étaient comptées en double avec ta dépense de repos, et le niveau d\'activité de tes journées était supposé au lieu d\'être demandé.';
  // ⚠️ Ne RIEN affirmer sur l'activité de la personne : la carte ne reçoit que la
  // notice, jamais le profil. « Ce budget correspond à des journées plutôt assises »
  // était faux pour qui a déjà déclaré `light`/`active`/`physical` — et ce sont
  // justement des gens à qui la carte est servie.
  const suite = 'Si tes journées sont plus actives que ce que Kyroz a retenu, dis-le : ton budget suivra.';
  return (
    <Card t={t}>
      <Text style={{ ...Type.caption, color: t.text, lineHeight: 19 }}>
        Ton budget est passé de {notice.from} à {notice.to} kcal/jour ({delta > 0 ? '+' : ''}{delta}). {explication}
      </Text>
      <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 19, marginTop: Spacing.sm }}>
        {suite}
      </Text>
      <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg }}>
        <Presse onPress={onAdjust} activeOpacity={OPACITE_PRESSION} style={{ flex: 1, backgroundColor: t.accent, borderRadius: Radius.sm, paddingVertical: Spacing.sm, minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ ...Type.bodySmallStrong, color: t.onAccent }}>Régler mon activité</Text>
        </Presse>
        <Presse onPress={onDismiss} activeOpacity={OPACITE_PRESSION} style={{ flex: 1, borderRadius: Radius.sm, paddingVertical: Spacing.sm, minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center', alignItems: 'center', borderWidth: Trait.fin, borderColor: t.lineStrong }}>
          <Text style={{ ...Type.bodySmallStrong, color: t.text }}>C'est noté</Text>
        </Presse>
      </View>
    </Card>
  );
}

function SportsProfileEditor({ t, profile, onSave, dragHandlers, sheetScrollProps }: EditorProps) {
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
    <EditorShell t={t} title="Sport & activité" onSave={submit} dragHandlers={dragHandlers} sheetScrollProps={sheetScrollProps}>
      {/* Le NEAT vient EN PREMIER : c'est la base sur laquelle le sport s'ajoute, et
          l'ordre inverse invite à répondre « je suis actif » en pensant à ses séances
          — qui sont déjà comptées juste en dessous. */}
      <SectionLabel t={t}>TES JOURNÉES, HORS SPORT</SectionLabel>
      <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 18, marginBottom: Spacing.xs }}>
        Ce que tu dépenses sans y penser : boulot, trajets, courses. Ne compte pas tes séances ici, elles sont comptées juste en dessous.
      </Text>
      {NEAT_ORDER.map((lvl) => (
        <OptionCard key={lvl} t={t} title={NEAT_LABEL[lvl]} subtitle={NEAT_HINT[lvl]} selected={neat === lvl} onPress={() => setNeat(lvl)} />
      ))}

      <SectionLabel t={t}>TES SÉANCES</SectionLabel>
      <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 18, marginBottom: Spacing.xs }}>Tes sports servent à estimer tes calories dépensées. Plus c'est précis, plus ton plan l'est.</Text>
      <SportsEditor sports={sports} weight={profile.weight_kg} onChange={setSports} />
      <RestDaysPicker t={t} available={planWeekdays} value={restDays} onToggle={togRestDay} onNone={() => setRestDays([])} />
    </EditorShell>
  );
}

function GoalEditor({ t, profile, onSave, dragHandlers, sheetScrollProps }: EditorProps) {
  const [goal, setGoal] = useState<Goal>(profile.goal);
  // L'éligibilité était branchée sur l'onboarding et l'objectif daté seulement :
  // une personne en insuffisance pondérale se voyait refuser la sèche à l'inscription
  // mais pouvait l'activer depuis cet écran.
  const blockMsg = eligibilityMessage(checkEligibility({ ...profile, goal }, profile.goal_target));
  const submit = () => { if (!blockMsg) onSave(withRecalc({ ...profile, goal })); };
  return (
    <EditorShell t={t} title="Objectif" onSave={submit} canSave={!blockMsg} dragHandlers={dragHandlers} sheetScrollProps={sheetScrollProps}>
      {GOALS.map((g) => <OptionCard key={g} t={t} title={goalLabel(g)} selected={goal === g} onPress={() => setGoal(g)} />)}
      {/* « Sèche rapide » a été retiré parce qu'il servait le même plan que « Sèche » :
          le plancher de sécurité absorbait l'écart. Plutôt que de laisser croire à un
          choix de rythme qui n'existait pas, on renvoie vers le seul mécanisme qui
          sache dire honnêtement si un rythme est tenable — l'objectif daté. */}
      {CUT_GOALS.includes(goal) && !blockMsg && (
        <Card t={t}>
          <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 19 }}>
            Tu veux aller plus vite ? Le rythme se règle avec un objectif daté : tu poses un poids et une date, et Kyroz te dit franchement si c'est tenable — plutôt que de creuser un déficit que ton corps refusera.
          </Text>
        </Card>
      )}
      {blockMsg && (
        <Card t={t}>
          <Text style={{ ...Type.captionStrong, color: t.danger, lineHeight: 19 }}>{blockMsg}</Text>
        </Card>
      )}
    </EditorShell>
  );
}

function DatedGoalEditor({ t, profile, onSave, dragHandlers, sheetScrollProps }: EditorProps) {
  const today = todayStamp();
  const existing = profile.goal_target;
  const [targetWeight, setTargetWeight] = useState(
    String(existing?.target_weight_kg ?? Math.max(40, Math.round(profile.weight_kg) - 4)),
  );
  // Échéance TAPÉE. `null` = l'utilisateur n'a pas encore touché les champs : on garde
  // alors la date EXACTE enregistrée, pour que ré-ouvrir et enregistrer sans rien
  // changer ne décale pas l'échéance (comme RestDaysPicker).
  const [saisie, setSaisie] = useState<EcheanceSaisie | null>(null);

  const twN = parseFloat(targetWeight.replace(',', '.'));
  const validWeight = twN >= 40 && twN <= 250;
  const tdee = calculateTDEE(profile);

  // ── L'échelle dérivée du corps (A27) — ne sert plus qu'au PRÉ-REMPLISSAGE ────
  //
  // Elle a remplacé cinq durées figées (4/8/12/16/24 semaines) dont AUCUNE ne tenait
  // chez la moitié des gabarits de référence : sa 1ʳᵉ marche est l'échéance la plus
  // courte que les garde-fous laissent tenir, les suivantes sont autant de plans
  // réellement différents. Depuis le retrait de la rangée (2026-08-07), rien de tout
  // ça n'est AFFICHÉ — mais la date pré-remplie sort de sa 2ᵉ marche, donc l'échelle
  // reste ce qui garantit que la seule échéance proposée par l'app est tenable.
  //
  // ⚠️ MÉMOÏSÉ SUR LE POIDS CIBLE, et c'est indispensable : `deadlineLadder` sonde
  // le moteur ~17 fois, chaque sonde simulant jusqu'à 260 semaines de trajectoire
  // (mesuré : 3 à 45 ms sur les gabarits courants, 283 ms sur le cas extrême d'un
  // écart de 30 kg). Le recalculer à chaque rendu rendrait la saisie saccadée.
  // L'échelle ne dépend PAS de la date choisie — aucune circularité.
  const echelle = useMemo(() => {
    if (!validWeight) return [];
    return deadlineLadder((semaines) => {
      const gt: GoalTarget = {
        target_weight_kg: twN, target_date: addDaysStamp(today, Math.round(semaines * 7)),
        start_weight_kg: profile.weight_kg, start_date: existing?.start_date ?? today,
      };
      const p = { ...profile, goal_target: gt };
      const plan = computePlan(p, today);
      const s = datedGoalStatus(gt, p, today, tdee, plan?.floor_kcal ?? null, makeWeeklyProjector(p));
      return { reachable: !!s?.reachableByDate, servedKcal: plan?.profile.target_kcal ?? 0 };
    });
  }, [twN, validWeight, profile, today, tdee, existing?.start_date]);

  // ⚠️ Échelle VIDE = rien n'est tenable dans l'horizon de projection, et il ne faut
  // surtout pas le confondre avec le repli : `HORIZONS_REPLI` sert à pré-remplir un
  // champ, PAS à annoncer une date. Annoncer « au plus tôt : dans 4 semaines » parce
  // qu'on est retombé sur la première durée en dur serait le mensonge exact que A27 a
  // retiré de la rangée.
  const horizons = echelle.length ? echelle : HORIZONS_REPLI;

  // ── L'ESTIMATION : la première date que Kyroz peut TENIR (2026-08-07) ────────
  //
  // C'est le plafond, dit en date plutôt qu'en règle — la personne ajuste ensuite ce
  // qu'elle veut en le connaissant, au lieu de le découvrir en se faisant refuser.
  //
  // 🔴 **Ce n'est PAS `status.projectedDate`, et l'écart est mesuré** (2026-08-07,
  // 8 corps de référence) : 12 à 100 jours, toujours dans le même sens.
  //   `F 78 → 65` : projetée 1ᵉʳ août 2027 · première date tenable **28 mai 2027**
  //   `H 95 → 82` : projetée 27 juin 2027 · première date tenable **19 mars 2027**
  // `projectedDate` répond à « où j'arrive si je GARDE cette date trop proche ? » —
  // donc en simulant une échéance qui EXPIRE, après quoi le plan retombe sur le déficit
  // ordinaire de l'objectif. C'est vrai, et c'est inutilisable : viser trop tôt fait
  // arriver PLUS TARD. La marche 1 de l'échelle répond à la question réellement posée,
  // « quand puis-je y être ? », et elle est tenable PAR CONSTRUCTION (la sonde teste
  // `reachableByDate`) — là où adopter `projectedDate` avait été mesuré comme glissant
  // de 98 jours sur ce même gabarit (A14).
  const dateAuPlusTot = echelle.length ? addDaysStamp(today, echelle[0] * 7) : null;

  // Date PRÉ-REMPLIE d'un objectif neuf : la 2ᵉ marche de l'échelle, pas la 1ʳᵉ. La
  // première est le rythme sûr MAXIMAL — un défaut ne doit pas pousser d'office
  // quelqu'un au plafond de ce que la sécurité autorise (CLAUDE.md §10 : le suivi
  // rassure, il ne met pas la pression). Depuis le retrait de la rangée, c'est la SEULE
  // échéance que l'app propose : raison de plus pour qu'elle soit tenable.
  const defaultWeeks = horizons[Math.min(1, horizons.length - 1)];

  // La date que les champs portent. `undefined` = ce qui est tapé n'est pas encore une
  // date : on n'invente RIEN à sa place, sinon les champs se réécriraient sous les
  // doigts (cf. le garde de `components/DateInput.tsx`).
  const targetDate = saisie
    ? saisie.stamp
    : existing?.target_date ?? addDaysStamp(today, defaultWeeks * 7);

  // L'échéance est contrôlée QUELLE QUE SOIT sa provenance — tapée, pré-remplie, ou
  // déjà enregistrée. Un objectif ré-ouvert après son échéance tombe donc sur « choisis
  // une date à venir » au lieu d'être ré-enregistré inactif, en silence.
  const refus = checkEcheance(targetDate, saisie ? saisie.complete : true, today);
  /** La date retenue, ou `null` s'il y a quelque chose à corriger d'abord. */
  const dateVisee = refus ? null : targetDate ?? null;

  const provisional: GoalTarget | undefined = validWeight && dateVisee
    ? { target_weight_kg: twN, target_date: dateVisee, start_weight_kg: profile.weight_kg, start_date: existing?.start_date ?? today }
    : undefined;

  // Aperçu calculé par le PRODUCTEUR UNIQUE (computePlan) et non par un chemin
  // parallèle : ce que la carte annonce est exactement ce qui sera enregistré,
  // plancher de sécurité compris.
  const previewPlan = provisional ? computePlan({ ...profile, goal_target: provisional }, today) : null;
  // Le plancher de l'APERÇU (pas celui du profil actuel) alimente la projection :
  // c'est la cible qu'on s'apprête à enregistrer qui doit dater l'échéance (P1.6).
  // Projecteur bâti sur le profil TEL QU'IL SERA ENREGISTRÉ (objectif provisoire
  // compris) : la date annoncée dans l'éditeur doit être celle qu'on servira.
  const status = datedGoalStatus(
    provisional, profile, today, tdee, previewPlan?.floor_kcal ?? null,
    provisional ? makeWeeklyProjector({ ...profile, goal_target: provisional }) : null,
  );
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

  // ℹ️ La puce « N sem · tenable » a été RETIRÉE ici le 2026-08-03 (A27), et c'est une
  // suppression, pas un oubli : elle existait parce que les cinq durées figées
  // pouvaient être toutes intenables, et proposait alors la vraie date en un tap.
  // Maintenant que la PREMIÈRE puce de la rangée est par construction l'échéance la
  // plus courte qui tienne, la garder afficherait deux fois la même offre.

  const submit = () => {
    if (!provisional || goalBlockMsg) return;
    onSave(withRecalc({ ...profile, goal_target: provisional }));
  };
  const remove = () => onSave(withRecalc({ ...profile, goal_target: undefined }));

  // `canSave` suit `provisional`, qui exige un poids valide ET une échéance exploitable :
  // enregistrer une date passée créerait un objectif INACTIF — un objectif qui ne pilote
  // rien tout en s'affichant comme s'il pilotait.
  return (
    <EditorShell t={t} title="Objectif daté" onSave={submit} canSave={!!provisional && !goalBlockMsg} dragHandlers={dragHandlers} sheetScrollProps={sheetScrollProps}>
      <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 18 }}>
        Fixe un poids et une échéance : Kyroz ajuste tes calories jour après jour pour t'y amener au rythme le plus rapide — mais sûr.
      </Text>

      <Field t={t} label="Poids cible" suffix="kg" value={targetWeight} onChangeText={setTargetWeight} keyboardType="decimal-pad" />

      {/* ── L'ESTIMATION (2026-08-07) ────────────────────────────────────────────
          Le plafond, dit en DATE plutôt qu'en règle : « voilà le plus tôt possible,
          maintenant choisis ». Elle est attachée au POIDS et non à l'échéance, parce
          que c'est le poids qui la détermine — la date saisie n'y change rien.
          ⚠️ Elle remplace le raccourci d'A14 perdu avec la rangée, et sur une base
          plus solide : cette date est tenable PAR CONSTRUCTION (la sonde teste
          `reachableByDate`), là où adopter la date projetée glissait de 98 jours.
          Ton : on annonce une possibilité, on ne pousse pas à aller vite (§10) —
          d'où « peut tenir » et non « tu pourrais ». */}
      {validWeight && !goalBlockMsg && (
        dateAuPlusTot ? (
          <View style={{ gap: Spacing.sm }}>
            <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 18 }}>
              À {twN} kg, la première date que Kyroz peut tenir en sécurité : le {formatFR(dateAuPlusTot)}.
            </Text>
            {dateVisee !== dateAuPlusTot && (
              <Presse
                onPress={() => setSaisie({ stamp: dateAuPlusTot, complete: true })}
                activeOpacity={OPACITE_PRESSION}
                style={{ alignSelf: 'flex-start', justifyContent: 'center', minHeight: CIBLE_TACTILE_MIN }}
              >
                <Text style={{ ...Type.captionStrong, color: t.accent }}>Viser cette date</Text>
              </Presse>
            )}
          </View>
        ) : (
          <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 18 }}>
            À {twN} kg, aucune date ne tient dans les cinq ans à venir, même au rythme le
            plus rapide que la sécurité autorise. Vise un poids intermédiaire : le
            plancher baissera avec ton poids, et la suite deviendra possible.
          </Text>
        )
      )}

      <SectionLabel t={t}>Échéance</SectionLabel>
      {/* ── Une DATE, plus une durée (2026-08-07, décision fondateur) ────────────
          La rangée de puces proposait cinq durées dérivées du corps ; elle est
          retirée. On ne demande plus « dans combien de semaines », on demande la
          date — parce que c'est ce que la personne a en tête, et qu'un événement
          réel ne tombe jamais sur un multiple de semaines.
          Les champs portent la date visée : ils sont donc aussi son AFFICHAGE.
          Pas de sélecteur de date : ce serait une dépendance NATIVE (build + revue,
          CLAUDE.md §2) pour un service que trois nombres rendent partout.
          ⚠️ La date pré-remplie reste dérivée du corps (cf. `defaultWeeks`) : c'est
          désormais la seule échéance que l'app propose, elle ne peut pas mentir. */}
      <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 18 }}>
        Pose la date que tu vises — un mariage, une compétition, des vacances.
      </Text>
      <DateInput
        t={t}
        value={targetDate}
        placeholders={{ d: '14', mo: '11', y: String(parseInt(today.slice(0, 4), 10) + 1) }}
        onChange={(stamp, complete) => setSaisie({ stamp, complete })}
      />
      {/* ⚠️ C'est la ligne la plus lue de l'écran — collée sous le champ, au moment
          exact du choix, et depuis le retrait de la rangée elle est le SEUL endroit qui
          dise si la date tient. Elle ne peut donc pas AFFIRMER une date que le moteur
          ne tiendra pas. Mesuré le 2026-08-02 (H 83 kg, 18 %MG, 4 séances → 70 kg) :
          les CINQ échéances d'alors servaient toutes 0,3 kg/sem, parce que c'est le
          plancher de sécurité — et non l'échéance — qui borne le déficit. « 4 sem »
          annonçait le 30 août 2026 pour une atteinte réelle le 19 juin 2027 : 293 jours
          d'écart. La vérité était déjà à l'écran (carte « plancher » plus bas), mais
          SOUS une phrase qui disait l'inverse, et hors du premier écran.
          Ton : on annonce ce qui va se passer, on ne reproche pas l'ambition — le
          moteur porte la charge, l'utilisateur n'est pas « en retard ». */}
      {/* Une échéance à corriger prend la place de la ligne « Cible le … » : afficher
          une trajectoire vers une date qu'on refuse d'enregistrer serait la valider à
          l'œil. `incomplete` reste NEUTRE — il ne s'est rien passé de fautif, la
          personne est en train de taper. */}
      {/* ⚠️ Depuis le 2026-08-07, la date annoncée quand l'échéance ne tient pas est la
          PREMIÈRE DATE TENABLE (`dateAuPlusTot`), plus `status.projectedDate`. Les deux
          diffèrent de 12 à 100 jours selon le gabarit, et pas par erreur :
          `projectedDate` simule qu'on GARDE l'échéance trop proche, donc qu'elle EXPIRE
          et que le plan retombe au déficit ordinaire de l'objectif — d'où une arrivée
          PLUS TARDIVE que si l'on visait simplement la première date tenable. Annoncer
          les deux mettrait deux dates contradictoires à l'écran ; annoncer celle qui est
          ADOPTABLE est ce que la personne peut faire de l'information. */}
      {dateVisee == null ? (
        <Text style={{ ...Type.caption, color: refus === 'incomplete' ? t.textSecondary : t.warning, lineHeight: 18 }}>
          {messageEcheance(refus ?? 'incomplete')}
        </Text>
      ) : (
        <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 18 }}>
          {!goalBlockMsg && status && !status.reachableByDate && !status.directionMismatch
            ? (dateAuPlusTot
              ? `Cible le ${formatFR(dateVisee)} — c'est plus tôt que ce que Kyroz peut tenir : au rythme sûr, ce sera le ${formatFR(dateAuPlusTot)}.`
              : `Cible le ${formatFR(dateVisee)} — ce poids n'est pas atteignable au rythme sûr, quelle que soit la date.`)
            : `Cible le ${formatFR(dateVisee)}.`}
        </Text>
      )}

      {/* Cible refusée → on affiche le motif SEUL. Montrer une trajectoire crédible
          (« Perdre 48 kg · 1982 kcal/j ») au-dessus d'un refus revient à valider
          visuellement un objectif qu'on rejette la ligne d'après. */}
      {goalBlockMsg && (
        <Card t={t}>
          <Text style={{ ...Type.captionStrong, color: t.danger, lineHeight: 19 }}>{goalBlockMsg}</Text>
        </Card>
      )}

      {!goalBlockMsg && status && preview && (
        <Card t={t} style={{ gap: Spacing.md }}>
          <Row t={t} l="Trajectoire" v={status.direction === 'maintain' ? dirLabel : `${dirLabel} ${gapKg} kg`} strong />
          {status.direction !== 'maintain' && <Row t={t} l="Rythme sûr" v={`${Math.abs(status.safeWeeklyKg)} kg / sem`} />}
          <Row t={t} l="Calories ajustées" v={`${preview.target_kcal} kcal/j`} strong />
          {/* ⚠️ Cette ligne colorait le delta avec les tokens de MACRO — `carbs` en
              déficit, `protein` en surplus. Un jaune et un bleu détournés en code
              de statut : ils ne voulaient rien dire ici, et depuis que les macros
              sont trois gris, ils ne se distinguaient même plus. Le signe porte
              l'information, et un écart à la maintenance n'a pas à s'alarmer
              (règle produit §10). */}
          <Row t={t} l="vs maintenance" v={`${kcalDelta >= 0 ? '+' : ''}${kcalDelta} kcal/j`} />
        </Card>
      )}
      {!goalBlockMsg && status?.directionMismatch && (
        <Card t={t}>
          <Text style={{ ...Type.caption, color: t.text, lineHeight: 19 }}>
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
      {/* ⚠️ La dernière phrase se choisit sur `maxRateApplied` depuis A15, et l'inverser
          n'est pas cosmétique : quand Kyroz bascule sur le rythme sûr MAXIMAL, écrire
          « Kyroz garde le rythme sûr » dirait qu'il freine alors qu'il accélère. Et
          « garde » se lit comme un refus poli — §10 : le message doit dire que le
          moteur porte la charge, jamais que la personne en demande trop. */}
      {/* 🔴 `!reachableByDate` AJOUTÉ le 2026-08-07 : cette carte parlait d'une arrivée
          « après ta date » sans vérifier que la date était effectivement dépassée.
          Mesuré sur 1 600 échéances (8 corps × 200 semaines) : **1 cas** où elle
          s'affichait en même temps que « Rythme sûr, dans les clous de ta date » —
          H 68 → 74 kg, prise de masse, 17 semaines. Rare, mais deux phrases opposées
          dans le même écran. ⚠️ Et c'est un cas de PRISE : encore un prédicat écrit en
          pensant à la sèche (cf. §6, « en prise les calories servies BAISSENT quand la
          date s'éloigne »). */}
      {!goalBlockMsg && status?.clamped && !status.reachableByDate && !status.directionMismatch && !status.floorCapped && (
        <Card t={t}>
          <Text style={{ ...Type.caption, color: t.text, lineHeight: 19 }}>
            Objectif ambitieux : au rythme le plus sûr tu atteins {status.targetWeightKg} kg
            {dateAuPlusTot ? ` le ${formatFR(dateAuPlusTot)}` : ' plus tard que prévu'}, après ta date.{' '}
            {status.maxRateApplied
              ? 'Kyroz avance au maximum de ce qui reste sûr, et cette date-là, il la tient.'
              : 'Kyroz garde le rythme sûr.'}
          </Text>
        </Card>
      )}
      {/* Le PLANCHER qui mord n'est pas une ambition mal calibrée, c'est une contrainte
          physiologique : message distinct, et on propose la correction en un geste
          plutôt que de laisser l'utilisateur deviner quelle date serait tenable. */}
      {/* Trois cas, et ils ne disent pas la même chose : le plancher peut mordre SANS
          repousser la date (on explique le mécanisme, sans annoncer de retard), la
          repousser vers une date tenable (on la donne, elle est en un tap plus haut),
          ou la rendre inatteignable dans l'horizon (on le dit franchement). */}
      {!goalBlockMsg && status?.floorCapped && !status.directionMismatch && preview && (
        <Card t={t}>
          <Text style={{ ...Type.caption, color: t.text, lineHeight: 19 }}>
            Ton plan ne peut pas descendre sous {preview.target_kcal} kcal/jour en sécurité — c'est ton plancher, pas un réglage.{' '}
            {status.reachableByDate ? (
              <>Ta date reste dans les clous : Kyroz ne creusera simplement pas plus que ça.</>
            ) : dateAuPlusTot ? (
              <>Au rythme qu'il autorise, tu atteins {status.targetWeightKg} kg le {formatFR(dateAuPlusTot)}. Tu peux viser cette date-là, ou choisir un poids cible plus proche : Kyroz ne creusera pas davantage.</>
            ) : (
              <>À ce rythme, ce poids cible n'est pas atteignable quelle que soit la date. Choisis une cible plus proche, ou laisse le temps faire : ton poids qui baisse fera baisser le plancher avec lui.</>
            )}
          </Text>
        </Card>
      )}
      {/* `!floored` : le plancher de sécurité décale la date sans que `clamped` le
          sache (il ne juge que le RYTHME). Sans cette condition, on rassurait
          « dans les clous de ta date » juste au-dessus du message qui annonce
          l'inverse. La projection réellement corrigée est du ressort de P1.6. */}
      {!goalBlockMsg && status && status.reachableByDate && !status.directionMismatch && status.direction !== 'maintain' && (
        <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 17 }}>
          Rythme sûr, dans les clous de ta date.
        </Text>
      )}
      {/* Le plancher mord SANS rogner la trajectoire (objectif déjà atteignable) :
          on explique le mécanisme, sans annoncer de décalage — il n'y en a pas.
          `!floorCapped` évite le doublon avec la carte ci-dessus. */}
      {!goalBlockMsg && floored && preview && !status?.floorCapped && (
        <Card t={t}>
          <Text style={{ ...Type.caption, color: t.text, lineHeight: 19 }}>
            Ton plancher de sécurité est à {preview.target_kcal} kcal/jour : en dessous, ton corps n'a plus assez d'énergie pour fonctionner correctement. Plus tu t'entraînes, plus ce plancher monte — c'est normal, l'énergie de tes séances ne compte pas comme énergie disponible.
          </Text>
        </Card>
      )}
      {!goalBlockMsg && status?.direction === 'maintain' && (
        <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 17 }}>
          Tu es déjà à ton poids cible : Kyroz vise le maintien.
        </Text>
      )}

      {existing && (
        <Presse onPress={remove} style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, minHeight: CIBLE_TACTILE_MIN }}>
          <Text style={{ ...Type.bodyStrong, color: t.danger }}>Retirer l'objectif daté</Text>
        </Presse>
      )}
    </EditorShell>
  );
}

function MacroEditor({ t, profile, onSave, dragHandlers, sheetScrollProps }: EditorProps) {
  const { notify } = useDialog();
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
      if (err) { notify({ title: 'Attention', message: err }); return; }
      onSave(next);
    }
  };

  return (
    <EditorShell t={t} title="Calories & macros" onSave={submit} dragHandlers={dragHandlers} sheetScrollProps={sheetScrollProps}>
      <Segmented<'auto' | 'percent'> t={t} options={[{ label: 'Calculées', value: 'auto' }, { label: 'Perso %', value: 'percent' }]} value={mode} onChange={setMode} />
      {mode === 'auto' ? (
        <Card t={t} style={{ gap: Spacing.md }}>
          <Row t={t} l="Objectif calorique" v={`${auto.target_kcal} kcal`} strong />
          {/* Trois lignes empilées : aucune proportion à comparer, donc aucune
              couleur à porter (cf. la note en tête de constants/theme.ts). */}
          <Row t={t} l="Protéines" v={`${auto.target_protein_g} g`} />
          <Row t={t} l="Glucides" v={`${auto.target_carbs_g} g`} />
          <Row t={t} l="Lipides" v={`${auto.target_fat_g} g`} />
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

function PrefEditor({ t, profile, onSave, dragHandlers, sheetScrollProps }: EditorProps) {
  const [restrictions, setRestrictions] = useState<DietaryRestriction[]>(profile.dietary_restrictions);
  const [proteins, setProteins] = useState<string[]>(profile.preferred_proteins);
  const [dislikes, setDislikes] = useState<string[]>(profile.disliked_foods);
  // Recettes masquées (👎) : on retire l'id pour la ré-afficher (rien n'est définitif).
  const [hidden, setHidden] = useState<string[]>(profile.hidden_recipes ?? []);
  const hiddenNamed = hidden.map((id) => ({ id, name: getRecipeById(id)?.name_fr ?? 'Recette' }));
  const tog = <T,>(arr: T[], v: T, set: (x: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const submit = () => onSave({ ...profile, dietary_restrictions: restrictions, preferred_proteins: proteins, disliked_foods: dislikes, hidden_recipes: hidden });
  return (
    <EditorShell t={t} title="Préférences" onSave={submit} dragHandlers={dragHandlers} sheetScrollProps={sheetScrollProps}>
      <SectionLabel t={t}>Régime</SectionLabel>
      <View style={styles.wrap}>{RESTRICTIONS.map((r) => <Chip key={r.value} t={t} label={r.label} selected={restrictions.includes(r.value)} onPress={() => tog(restrictions, r.value, setRestrictions)} />)}</View>
      <SectionLabel t={t}>Protéines préférées</SectionLabel>
      <View style={styles.wrap}>{PROTEINS.map((p) => <Chip key={p} t={t} label={p} selected={proteins.includes(p.toLowerCase())} onPress={() => tog(proteins, p.toLowerCase(), setProteins)} />)}</View>
      <DislikedFoodsField t={t} value={dislikes} onChange={setDislikes} />
      {hiddenNamed.length > 0 && (
        <>
          <SectionLabel t={t}>Recettes masquées ({hiddenNamed.length})</SectionLabel>
          <Text style={{ ...Type.caption, color: t.textTertiary, lineHeight: 17, marginTop: -Spacing.sm }}>
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
function RestDaysPicker({ t, available, value, onToggle, onNone }: { t: ThemePalette; available: number[]; value: number[]; onToggle: (v: number) => void; onNone: () => void }) {
  const opts = available.length ? WEEKDAY_OPTS.filter((o) => available.includes(o.val)) : WEEKDAY_OPTS;
  return (
    <>
      <SectionLabel t={t}>Jours de repos</SectionLabel>
      {/* ⚠️ Ce texte promettait DEUX choses fausses (corrigé le 2026-08-06) :
          « (mêmes calories) » ne l'est plus depuis la répartition par volume, et
          « privilégie les recettes récup » ne l'était plus depuis le 2026-08-03,
          date à laquelle le tag `rest_day_ok` a été supprimé et la sélection a cessé
          de le lire. Un écran ne promet que ce que le moteur fait AUJOURD'HUI.
          Le style vient de la passe de DA, le texte du correctif moteur. */}
      <Text style={{ ...Type.caption, color: t.textTertiary, lineHeight: 17, marginTop: -Spacing.sm }}>
        Tes jours sans entraînement : Kyroz y sert un peu moins de calories et de glucides, et reporte la différence sur tes jours d'entraînement. Tes protéines ne bougent pas, et ta semaine garde son total.
      </Text>
      <View style={styles.wrap}>
        {opts.map((d) => <Chip key={d.val} t={t} label={d.label} selected={value.includes(d.val)} onPress={() => onToggle(d.val)} />)}
        {/* « Aucun » n'est PAS un état caché : c'est la même donnée (liste vide),
            rendue visible. Sans cette puce, « je m'entraîne 7 j/7 » et « je n'ai pas
            répondu » se ressemblent à l'écran alors qu'ils ne demandent pas le même
            plan — et depuis que le réglage déplace jusqu'à 330 kcal, les confondre
            coûte cher. Elle se lit comme sélectionnée dès qu'aucun jour ne l'est,
            donc l'écran ne peut jamais montrer « rien du tout ». */}
        <Chip t={t} label="Aucun" selected={value.length === 0} onPress={onNone} />
      </View>
    </>
  );
}

function MealsEditor({ t, profile, onSave, dragHandlers, sheetScrollProps }: EditorProps) {
  const [weekdays, setWeekdays] = useState<number[]>(profile.plan_weekdays ?? [1, 2, 3, 4, 5, 6, 0]);
  const [restDays, setRestDays] = useState<number[]>(effectiveRestWeekdays(profile));
  // ⚠️ `?? [...]` ne suffit PAS : un `meals` non-tableau (vu en vrai : le NOMBRE 4) est
  // « non nul », passe le `??`, et fait exploser cet écran au premier `meals.includes`
  // — Error Boundary, réglage inaccessible à vie. `normalizeMeals` (syncGuard) referme
  // la donnée en amont ; ce garde-fou-ci protège les chemins qui ne passent pas par là.
  const [meals, setMeals] = useState<MealType[]>(
    Array.isArray(profile.meals) && profile.meals.length > 0 ? profile.meals : BUILTIN_SLOTS.map((s) => s.id)
  );
  const [customSlots, setCustomSlots] = useState<MealSlot[]>(
    Array.isArray(profile.meal_slots) ? profile.meal_slots : []
  );
  const [emphasis, setEmphasis] = useState<MealEmphasis>(profile.meal_emphasis ?? 'even');
  const [variety, setVariety] = useState<VarietyPreference>(profile.variety);
  const [fixedMeals, setFixedMeals] = useState<FixedMeals>(profile.fixed_meals ?? {});
  const [definingMeal, setDefiningMeal] = useState<MealType | null>(null);
  const slots = knownSlots({ meal_slots: customSlots });
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
  const mealLabel = (mt: MealType) => slotLabel(slots, mt);
  const emphasisOpts = emphasisOptions(slots, meals);

  // Un créneau créé est RETENU d'office (même règle qu'à l'onboarding).
  const saveSlot = (s: MealSlot) => {
    setCustomSlots((arr) => arr.some((x) => x.id === s.id) ? arr.map((x) => (x.id === s.id ? s : x)) : [...arr, s]);
    setMeals((arr) => (arr.includes(s.id) ? arr : [...arr, s.id]));
  };
  // Supprimer un créneau retire aussi sa sélection, son emphase et son repas « je gère » :
  // les trois pointent vers un id qui n'existera plus, et un réglage qui désigne le vide
  // ne se corrige plus par l'écran (il n'a plus de ligne à cocher).
  const deleteSlot = (id: MealType) => {
    setCustomSlots((arr) => arr.filter((x) => x.id !== id));
    setMeals((arr) => arr.filter((x) => x !== id));
    setEmphasis((e) => (e === id ? 'even' : e));
    setFixedMeals((prev) => { if (!prev[id]) return prev; const n = { ...prev }; delete n[id]; return n; });
  };

  const submit = () => {
    const retenus = orderedMeals(meals, customSlots);
    const cleaned: FixedMeals = {};
    for (const mt of retenus) if (fixedMeals[mt]) cleaned[mt] = fixedMeals[mt];
    // On n'enregistre que les créneaux ENCORE retenus : un créneau créé puis décoché
    // n'a plus de raison d'exister, et le garder ferait réapparaître sa ligne à chaque
    // ouverture de l'écran comme si l'utilisateur ne l'avait jamais retirée.
    const gardes = customSlots.filter((s) => retenus.includes(s.id));
    onSave({
      ...profile, plan_weekdays: orderedWeekdays(weekdays), plan_days: weekdays.length,
      rest_weekdays: orderedWeekdays(restDays.filter((d) => weekdays.includes(d))),
      meals: retenus, meal_slots: gardes.length ? gardes : undefined,
      meal_emphasis: retenus.includes(emphasis as MealType) || emphasis === 'even' ? emphasis : 'even',
      variety,
      fixed_meals: Object.keys(cleaned).length ? cleaned : undefined,
    });
  };

  // Sous-vue : définir le repas géré par l'user (remplace l'éditeur le temps de la saisie).
  if (definingMeal) {
    // Pas de `sheetScrollProps` ici : cette feuille n'a pas de ScrollView.
    return (
      <FixedMealSheet
        t={t} mealType={definingMeal} initial={fixedMeals[definingMeal]}
        onSave={(fm) => setFixedMeals((prev) => ({ ...prev, [definingMeal]: fm }))}
        onClose={() => setDefiningMeal(null)} dragHandlers={dragHandlers}
      />
    );
  }

  return (
    <EditorShell t={t} title="Paramètres des repas" onSave={submit} canSave={weekdays.length >= 1 && meals.length >= 1} dragHandlers={dragHandlers} sheetScrollProps={sheetScrollProps}>
      <SectionLabel t={t}>Jours du plan</SectionLabel>
      <View style={styles.wrap}>{WEEKDAY_OPTS.map((d) => <Chip key={d.val} t={t} label={d.label} selected={weekdays.includes(d.val)} onPress={() => togDay(d.val)} />)}</View>
      <RestDaysPicker t={t} available={weekdays} value={restDays} onToggle={togRestDay} onNone={() => setRestDays([])} />
      <SectionLabel t={t}>Repas inclus</SectionLabel>
      <Text style={{ ...Type.caption, color: t.textTertiary, lineHeight: 17, marginTop: -Spacing.sm }}>
        Tu manges plus de quatre fois par jour ? Ajoute tes propres repas : Kyroz répartit
        ton budget de la journée sur tous, dans l'ordre où ils arrivent.
      </Text>
      <MealSlotsPicker
        t={t} customSlots={customSlots} selected={meals}
        onToggle={togMeal} onSaveSlot={saveSlot} onDeleteSlot={deleteSlot}
      />
      {meals.length === 0 && <Text style={{ ...Type.caption, color: t.danger }}>Sélectionne au moins 1 repas.</Text>}

      <SectionLabel t={t}>Repas que tu gères toi-même</SectionLabel>
      <Text style={{ ...Type.caption, color: t.textTertiary, lineHeight: 17, marginTop: -Spacing.sm }}>
        Définis-les une fois : Kyroz les compte dans ton total et cale tes autres repas autour, sans te les redemander chaque jour.
      </Text>
      <View style={{ gap: Spacing.sm }}>
        {orderedMeals(meals, customSlots).map((mt) => {
          const fm = fixedMeals[mt];
          return (
            <View key={mt} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.lg }}>
              <View style={{ flex: 1, paddingRight: Spacing.md }}>
                <Text style={{ ...Type.bodySmallStrong, color: t.text }}>{mealLabel(mt)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs }}>
                  {fm && <RepasLibreIcon color={t.textSecondary} size={Icone.petite} />}
                  <Text style={{ ...Type.caption, color: fm ? t.textSecondary : t.textTertiary, flex: 1 }} numberOfLines={1}>
                    {fm ? `${fm.label} · ${fm.macros.kcal} kcal` : 'Kyroz le planifie'}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.lg, alignItems: 'center' }}>
                {fm && (
                  <Presse onPress={() => removeFixed(mt)} hitSlop={8}>
                    <Text style={{ ...Type.captionStrong, color: t.textTertiary }}>Retirer</Text>
                  </Presse>
                )}
                <Presse onPress={() => setDefiningMeal(mt)} hitSlop={8}>
                  <Text style={{ ...Type.captionStrong, color: t.accent }}>{fm ? 'Modifier' : 'Je gère'}</Text>
                </Presse>
              </View>
            </View>
          );
        })}
      </View>

      <SectionLabel t={t}>Tu manges plus à quel moment ?</SectionLabel>
      <View style={styles.wrap}>{emphasisOpts.map((e) => <Chip key={e.val} t={t} label={e.label} selected={emphasis === e.val} onPress={() => setEmphasis(e.val)} />)}</View>
      <SectionLabel t={t}>Variété</SectionLabel>
      <View style={{ gap: Spacing.md }}>{VARIETY.map((v) => <OptionCard key={v.value} t={t} title={v.title} subtitle={v.sub} selected={variety === v.value} onPress={() => setVariety(v.value)} />)}</View>
      <Text style={{ ...Type.caption, color: t.textTertiary, textAlign: 'center', lineHeight: 17 }}>
        Ton plan se met à jour automatiquement après enregistrement.
      </Text>
    </EditorShell>
  );
}

function Row({ t, l, v, c, strong }: { t: ThemePalette; l: string; v: string; c?: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ ...Type.bodySmall, color: t.textSecondary }}>{l}</Text>
      <Text style={{ color: c ?? t.text, fontSize: strong ? 18 : 15, fontWeight: '700' }}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Fond.barreOnglets },
    header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: Spacing.xs },
    // La roue s'aligne sur le « ? » du tour, à droite du grand titre. Cible
    // tactile pleine : `hitSlop` élargit au doigt, jamais à l'œil.
    roue: { alignItems: 'center', justifyContent: 'center', minWidth: CIBLE_TACTILE_MIN, minHeight: CIBLE_TACTILE_MIN },
    sub: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 19 },
    h1: { color: t.text, ...Type.display, marginTop: Spacing.xs },
    // Même gabarit que l'en-tête du Plan, au pixel près : deux écrans qui montrent
    // la même chose ne peuvent pas la montrer de deux façons.
    serie: { alignItems: 'center', backgroundColor: t.card, borderWidth: Trait.fin, borderColor: t.line, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.card },
    serieN: { color: t.text },
    serieLbl: { color: t.textTertiary, marginTop: Spacing.xs },
    grid: { flexDirection: 'row', gap: Spacing.sm },
    menu: { backgroundColor: t.card, borderRadius: Radius.card, paddingHorizontal: Spacing.lg },
    tdee: { backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
    floorNote: { ...Type.caption, color: t.textSecondary, lineHeight: 18, marginTop: -Spacing.xs },
    tdeeL: { ...Type.bodySmall, flex: 1, color: t.textSecondary, lineHeight: 19 },
    tdeeV: { ...Type.h3, flexShrink: 0, color: t.text },
    // Bouton d'action pleine largeur, sur le patron de « Se déconnecter » : fond de
    // carte et non l'accent — une action de repli ne doit pas crier plus fort que la
    // pesée, qui est la vraie entrée quotidienne de l'écran.
    actionBtn: {
      alignItems: 'center', justifyContent: 'center', minHeight: CIBLE_TACTILE_MIN,
      backgroundColor: t.card, borderRadius: Radius.button,
    },
    actionTxt: { ...Type.label, color: t.text },
    reminderHint: { ...Type.caption, color: t.textTertiary, lineHeight: 18, marginTop: -Spacing.sm },
    settingLabel: { ...Type.h3, color: t.text, letterSpacing: -0.3, marginBottom: -Spacing.sm },
    swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
    swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: Trait.controle, alignItems: 'center', justifyContent: 'center' },
    disclaimer: { ...Type.micro, color: t.textTertiary, lineHeight: 16, textAlign: 'center' },
    logoutBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, marginTop: Spacing.sm, borderRadius: Radius.button, backgroundColor: t.fill },
    logoutTxt: { ...Type.bodyStrong, color: t.text },
    delBtn: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.xs },
    delTxt: { ...Type.caption, color: t.danger },
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

function CalorieBankEditor({ t, profile, onSave, dragHandlers, sheetScrollProps }: EditorProps) {
  const [bank, setBank] = useState<Record<string, number>>(profile.calorie_bank ?? {});
  const [jour, setJour] = useState<number | null>(null);

  // Seuls les jours DU PLAN peuvent porter un écart : un écart posé ailleurs ne
  // serait jamais servi (cf. offsetsForPlan).
  const joursDuPlan = WEEKDAY_OPTS.filter((o) => (profile.plan_weekdays ?? []).includes(o.val));
  const days = Math.max(1, Math.min(profile.plan_days ?? joursDuPlan.length, 7));

  // ⚠️ La base est la répartition PAR VOLUME (`baseDayTargets`), pas la cible plate.
  // Depuis le 2026-08-06 le plan n'est plus isocalorique : un jour d'entraînement vise
  // plus haut, un jour de repos plus bas. Recalculer ici sur `target_kcal` afficherait
  // une semaine plate sous un plan qui ne l'est pas — le même défaut, à la lettre, que
  // celui qui effaçait la banque de calories avant `bankedTargets`.
  const base = baseDayTargets(profile, days);
  const apercu = bankedDailyTargets({
    days,
    baseTargetKcal: base,
    offsets: offsetsForPlan(bank, profile.plan_weekdays, days),
    floorKcal: Math.min(bankFloorKcal(profile), ...base),
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
  // Marge réellement empruntable par jour. <= 0 → la cible est au plancher.
  const marge = profile.target_kcal - bankFloorKcal(profile);

  return (
    <EditorShell t={t} title="Banque de calories" onSave={() => onSave({ ...profile, calorie_bank: Object.keys(bank).length ? bank : undefined })} dragHandlers={dragHandlers} sheetScrollProps={sheetScrollProps}>
      <Text style={{ ...Type.bodySmall, color: t.textSecondary, lineHeight: 20 }}>
        Un resto, un anniversaire ? Dis-le à Kyroz : il répartit l'écart sur tes autres
        jours de la semaine. Tes protéines ne bougent pas, et aucun jour ne descend sous
        ton plancher de sécurité.
      </Text>

      {marge <= 0 && (
        // Cas limite qui ne devrait PAS arriver : la cible vaut déjà le métabolisme
        // de base, donc aucun jour ne peut descendre. Ce n'est pas un défaut de la
        // banque — c'est que le profil lui-même est au bout de ce qui est possible.
        // Le dire, plutôt que laisser la personne cliquer sur une feature inerte :
        // dans les faits, c'est presque toujours une donnée fausse (masse grasse
        // saisie de travers) ou un objectif qui ne convient pas à ce gabarit.
        <Card t={t}>
          <Text style={{ ...Type.bodyStrong, color: t.text, marginBottom: Spacing.sm }}>
            Ta cible est déjà à ton minimum
          </Text>
          <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 19 }}>
            Tes {profile.target_kcal} kcal/jour correspondent à ton métabolisme de base :
            l'énergie que ton corps dépense au repos. On ne descend pas en dessous, même
            un seul jour — la banque n'a donc rien à emprunter sur ta semaine.
            {'\n\n'}
            Si tu comptais sécher, ça vaut le coup de vérifier deux choses : ta{' '}
            <Text style={{ fontWeight: '700' }}>masse grasse</Text> et ton{' '}
            <Text style={{ fontWeight: '700' }}>poids</Text> dans « Informations » (une
            erreur de saisie suffit), et ton objectif — à ce gabarit, un maintien te fera
            souvent plus de bien qu'un déficit.
          </Text>
        </Card>
      )}

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
        <Text style={{ ...Type.caption, color: t.textTertiary }}>
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
          // L'écart se lit contre la cible DU JOUR : un jour de repos est déjà sous la
          // moyenne sans que l'utilisateur ait rien déclaré, et l'afficher comme un
          // « −144 » lui ferait lire un écart là où il n'a rien demandé.
          const ecart = kcal - (base[i] ?? profile.target_kcal);
          return (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm }}>
              <Text style={{ ...Type.bodySmall, color: t.textSecondary }}>{label}</Text>
              <Text style={{ color: ecart === 0 ? t.textSecondary : t.text, ...(ecart === 0 ? Type.bodySmall : Type.bodySmallStrong) }}>
                {kcal} kcal{ecart !== 0 ? `  (${ecart > 0 ? '+' : ''}${ecart})` : ''}
              </Text>
            </View>
          );
        })}
      </Card>

      {apercu.uncompensatedKcal > 0 && (
        // Ni alarme ni reproche : un fait, et ce que ça implique. On ne masque pas
        // l'écart non repris — l'avaler en silence serait un mensonge (§10).
        <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 19 }}>
          Sur cette semaine, {apercu.uncompensatedKcal} kcal ne peuvent pas être reprises :
          les autres jours sont déjà à ton plancher de sécurité. Ta semaine finira un peu
          au-dessus de sa cible, et c'est très bien — le plancher passe avant.
        </Text>
      )}
    </EditorShell>
  );
}
