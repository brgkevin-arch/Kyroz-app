import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dayExpenditures, restDaysForProfile } from '../planEngine';
import { exerciseKcalPerWeek } from '../sport';
import { UserProfile } from '../types';

// ── VERROU : un jour de repos est un fait sur la SEMAINE, pas sur le plan ────
//
// POURQUOI CE FICHIER EXISTE
//
// Signalé par le fondateur le 2026-08-26, deux captures à l'appui : « pourquoi il y
// a deux fois les jours de repos et surtout dans sport et activité tu as que 5 jours
// possible ? »
//
// Les deux moitiés du défaut se tenaient :
//   · le sélecteur vivait dans DEUX éditeurs (Paramètres des repas ET Sport &
//     activité) pour UNE seule donnée (`rest_weekdays`) — et les deux ne le
//     nourrissaient pas pareil : l'un avec son BROUILLON de jours du plan, l'autre
//     avec le profil ENREGISTRÉ. Sept puces d'un côté, cinq de l'autre, au même
//     instant, sans que rien ne soit « cassé » ;
//   · la liste était filtrée par les jours du plan (« on ne se repose que sur un
//     jour planifié »), donc avec un plan du lundi au vendredi **personne ne pouvait
//     déclarer qu'il ne s'entraîne pas le week-end**.
//
// 🔴 ET CE N'ÉTAIT PAS UN DÉFAUT D'AFFICHAGE. Le moteur compte les jours
// d'entraînement comme `7 − (jours de repos)` — sur la semaine entière
// (`planEngine::trainingDaysPerWeek`). Un utilisateur qui déclare 4 séances et ne
// peut cocher qu'un seul jour de repos se voit donc attribuer **6 jours
// d'entraînement**, et sa dépense sportive hebdomadaire est étalée sur 6 au lieu de
// 4. Mesuré ci-dessous : le cyclage tombe de 378 à 252 kcal d'écart, soit un tiers.
//
// ⚠️ CE QUE CE FICHIER GARDE, et c'est en deux parties parce que le défaut l'était :
// la MÉCANIQUE (le moteur donne le bon diviseur dès qu'on peut tout déclarer) et le
// CÂBLAGE (aucun écran ne re-filtre, une seule maison pour le réglage). Le second se
// lit dans les sources — c'est le seul moyen de tenir « il n'y a qu'un endroit », et
// les sondes qui lisent du code ont déjà menti ici (cf. `espacementDA`), donc
// chacune se fait dire OUI **et** NON en fin de fichier.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');

const PROFIL = 'app/(tabs)/profil.tsx';
const ONBOARDING = 'app/(auth)/onboarding.tsx';

/**
 * Le code SEUL — commentaires retirés.
 *
 * 🔴 Sans ça, ce fichier se validerait lui-même : le dépôt commente ses décisions
 * DANS le code, et la fiche qui explique pourquoi `rest_weekdays` a quitté les
 * Paramètres des repas contient forcément la chaîne `rest_weekdays`. Le contrôle
 * « cet écran ne l'écrit plus » rougissait donc sur l'explication de son propre
 * correctif. C'est la « mesure contaminée » déjà payée sur `emailConfirmation` :
 * on croit mesurer le code, on mesure sa description.
 */
function sansCommentaires(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')   // commentaires JSX
    .replace(/\/\*[\s\S]*?\*\//g, ' ')        // blocs
    .replace(/^\s*\/\/.*$/gm, ' ');            // lignes
}

/** Le corps d'une fonction de premier niveau, de sa déclaration à la suivante. */
function corpsDeFonction(src: string, nom: string): string {
  const i = src.indexOf(`function ${nom}(`);
  if (i < 0) return '';
  const j = src.indexOf('\nfunction ', i + 1);
  return src.slice(i, j < 0 ? src.length : j);
}

/** Les écritures de `rest_weekdays` d'une source, avec leur expression. */
function ecrituresRestWeekdays(src: string): string[] {
  return [...src.matchAll(/rest_weekdays:\s*([^\n]*)/g)].map((m) => m[1].trim());
}

// ── La mécanique — ce que le moteur en fait ────────────────────────────────

/** Plan du lundi au vendredi, muscu 4×60 min, 90 kg. Le cas de la capture. */
const profil = (rest: number[]): UserProfile => ({
  id: 'verrou', sex: 'male', age: 30, weight_kg: 90, height_cm: 180,
  activity_level: 'moderate', training_days_per_week: 4, goal: 'cut', macro_mode: 'auto',
  tdee_kcal: 2914, target_kcal: 2614, target_protein_g: 198, target_carbs_g: 291, target_fat_g: 73,
  plan_days: 5, plan_weekdays: [1, 2, 3, 4, 5],
  meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'balanced',
  dietary_restrictions: [], disliked_foods: [], preferred_proteins: [], max_prep_time_min: 30,
  neat_level: 'seated',
  sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
  rest_weekdays: rest,
} as unknown as UserProfile);

describe('Les jours de repos portent sur la semaine, pas sur le plan', () => {
  it('🔴 déclarer le week-end rend au moteur le bon nombre d’entraînements', () => {
    const semaine = exerciseKcalPerWeek(profil([]).sports, 90);
    // Ce que l'écran permettait AVANT : un seul jour de repos possible dans un plan
    // lun→ven. Le moteur en déduit 6 jours d'entraînement pour 4 séances déclarées.
    const bride = dayExpenditures(profil([3]), 5);
    // Ce que l'utilisateur peut dire DEPUIS : mercredi, samedi, dimanche.
    const vrai = dayExpenditures(profil([3, 6, 0]), 5);

    const parSeance = (dep: number[]) => Math.round(Math.max(...dep) - Math.min(...dep));
    expect(parSeance(bride)).toBe(Math.round(semaine / 6));
    expect(parSeance(vrai)).toBe(Math.round(semaine / 4));
    // L'écart de cyclage que le bridage coûtait — le chiffre du signalement.
    expect(parSeance(vrai) - parSeance(bride)).toBeGreaterThan(100);
  });

  it('un jour de repos HORS plan ne casse rien — il ne matche simplement pas', () => {
    // Samedi et dimanche ne sont pas dans un plan lun→ven : `restDaysForProfile` les
    // ignore pour le cyclage des jours servis, et c'est exactement ce qu'on veut.
    // Sans cette tolérance, autoriser les 7 jours à la saisie aurait cassé le plan.
    const repos = restDaysForProfile(profil([3, 6, 0]), 5);
    expect([...repos]).toEqual([3]);          // le 3ᵉ jour du plan = mercredi
    expect(dayExpenditures(profil([3, 6, 0]), 5)).toHaveLength(5);
  });

  it('« Aucun » reste distinct de « pas répondu » — 7 jours d’entraînement', () => {
    const dep = dayExpenditures(profil([]), 5).map(Math.round);
    expect(new Set(dep).size, 'aucun repos → tous les jours identiques').toBe(1);
  });
});

// ── Le câblage — une seule maison, aucun filtre ────────────────────────────

describe('Le réglage n’a qu’UNE maison, et elle propose les sept jours', () => {
  const profilSrc = sansCommentaires(lire(PROFIL));
  const onboardingSrc = sansCommentaires(lire(ONBOARDING));

  it('🔴 le sélecteur n’est monté QU’UNE fois, et c’est dans Sport & activité', () => {
    expect((profilSrc.match(/<RestDaysPicker/g) ?? []).length, 'deux portes pour un réglage').toBe(1);
    expect(corpsDeFonction(profilSrc, 'SportsProfileEditor')).toContain('<RestDaysPicker');
  });

  it('🔴 « Paramètres des repas » ne montre NI n’écrit les jours de repos', () => {
    const meals = corpsDeFonction(profilSrc, 'MealsEditor');
    expect(meals).not.toContain('RestDaysPicker');
    // Écrire `rest_weekdays` depuis l'écran qui ne les montre plus était la moitié
    // silencieuse du doublon : il les rognait sur les jours du plan à chaque save.
    expect(meals).not.toContain('rest_weekdays');
  });

  it('🔴 les SEPT jours sont proposés — aucune liste filtrée par les jours du plan', () => {
    expect(corpsDeFonction(profilSrc, 'RestDaysPicker')).not.toContain('.filter(');
    // Côté inscription, les puces se posent sur `WEEKDAY_OPTS` entier.
    expect(onboardingSrc).toMatch(/Jours de repos<\/SectionLabel>[\s\S]{0,2000}?WEEKDAY_OPTS\.map\(/);
    expect(onboardingSrc).not.toContain('WEEKDAY_OPTS.filter((o) => planWeekdays.includes(o.val))');
  });

  it('🔴 aucune écriture ne re-filtre les jours de repos', () => {
    const ecritures = [...ecrituresRestWeekdays(profilSrc), ...ecrituresRestWeekdays(onboardingSrc)];
    expect(ecritures.length, 'plus aucune écriture — le réglage ne se range plus nulle part').toBeGreaterThan(0);
    for (const e of ecritures) {
      expect(e, `filtre retrouvé : ${e}`).not.toContain('.filter(');
    }
  });

  it('la déduction pré-cochée porte sur les sept jours, pas sur le plan', () => {
    // Sinon un compte NEUF naît avec le cyclage écrasé, sans que personne n'y touche.
    for (const src of [profilSrc, onboardingSrc]) {
      const appels = [...src.matchAll(/deducedRestWeekdays\(([^,]+),/g)].map((m) => m[1].trim());
      expect(appels.length).toBeGreaterThan(0);
      for (const a of appels) expect(a, `déduction sur ${a}`).toBe('TOUS_LES_JOURS');
    }
  });
});

// ── Les sondes savent dire OUI, puis NON ───────────────────────────────────
//
// 🔴 Une sonde qui lit du code a déjà menti dans ce dépôt, et dans le sens
// rassurant (`espacementDA`, E64 : sa capture s'arrêtait sur une flèche et six
// boutons trop petits passaient au vert). Les contrôles ci-dessus se font donc
// rejouer sur l'ANCIEN code, celui d'avant le 2026-08-26 : chacun doit le refuser.

describe('les sondes de câblage attrapent bien l’ancien code', () => {
  const ANCIEN_MEALS = `
function MealsEditor({ t, profile }: EditorProps) {
  const [restDays, setRestDays] = useState<number[]>(effectiveRestWeekdays(profile));
  const submit = () => onSave({ ...profile, rest_weekdays: orderedWeekdays(restDays.filter((d) => weekdays.includes(d))) });
  return (<EditorShell><RestDaysPicker t={t} available={weekdays} value={restDays} /></EditorShell>);
}
function Suivant() { return null; }
`;
  const ANCIEN_PICKER = `
function RestDaysPicker({ t, available, value }: Props) {
  const opts = available.length ? WEEKDAY_OPTS.filter((o) => available.includes(o.val)) : WEEKDAY_OPTS;
  return <View>{opts.map((d) => <Chip key={d.val} />)}</View>;
}
function Suivant() { return null; }
`;

  it('le doublon d’écran est vu', () => {
    expect((`${ANCIEN_MEALS}<RestDaysPicker />`.match(/<RestDaysPicker/g) ?? []).length).toBeGreaterThan(1);
    expect(corpsDeFonction(ANCIEN_MEALS, 'MealsEditor')).toContain('RestDaysPicker');
    expect(corpsDeFonction(ANCIEN_MEALS, 'MealsEditor')).toContain('rest_weekdays');
  });

  it('le filtre à l’écriture est vu', () => {
    const ecritures = ecrituresRestWeekdays(ANCIEN_MEALS);
    expect(ecritures).toHaveLength(1);
    expect(ecritures[0]).toContain('.filter(');
  });

  it('la liste filtrée par les jours du plan est vue', () => {
    expect(corpsDeFonction(ANCIEN_PICKER, 'RestDaysPicker')).toContain('.filter(');
  });

  it('🔴 les commentaires sont écartés — sinon la fiche valide le code qu’elle explique', () => {
    expect(sansCommentaires('// on parle de rest_weekdays ici')).not.toContain('rest_weekdays');
    expect(sansCommentaires('{/* rest_weekdays a déménagé */}')).not.toContain('rest_weekdays');
    expect(sansCommentaires('/* bloc rest_weekdays */')).not.toContain('rest_weekdays');
    // …et elle ne mange pas le code qu'elle doit voir.
    expect(sansCommentaires('rest_weekdays: orderedWeekdays(restDays),')).toContain('rest_weekdays');
  });

  it('… et la sonde ne crie pas sur le code d’aujourd’hui', () => {
    const AUJOURDHUI = `
function RestDaysPicker({ t, value }: Props) {
  const opts = WEEKDAY_OPTS;
  return <View>{opts.map((d) => <Chip key={d.val} />)}</View>;
}
function Suivant() { return null; }
`;
    expect(corpsDeFonction(AUJOURDHUI, 'RestDaysPicker')).not.toContain('.filter(');
    expect(ecrituresRestWeekdays('rest_weekdays: orderedWeekdays(restDays),')[0]).not.toContain('.filter(');
  });
});
