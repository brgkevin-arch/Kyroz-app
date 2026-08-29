import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Events } from '../analytics';

// ── Le périmètre de mesure — LE COMPTEUR ─────────────────────────────────────
//
// L'arbitrage du 2026-08-10 (`../../docs/archive/2026-08-10-synthese-analytics-arbitrage.md`)
// pose un §6 « interdits absolus » : aucune donnée de santé, aucun texte libre,
// aucune photo, ni e-mail ni prénom ni id de compte dans une propriété d'event.
// Ce fichier est ce qui lui manquait pour être autre chose qu'un paragraphe.
//
// ⚠️ CE N'EST PAS UNE PRÉCAUTION THÉORIQUE. Avant ce chantier, `onboarding_completed`
// envoyait `goal` et `restrictions` — l'objectif et le régime alimentaire, deux
// données de santé au sens de l'art. 9. Elles partaient depuis la toute première
// version du fichier, et personne ne l'a vu : la clé PostHog étant absente, rien ne
// sortait, donc le défaut était DORMANT. Le jour où la clé est posée, il s'allume.
//
// ➡️ La leçon est celle du dépôt entier : une règle écrite dans un .md se déclare
// tenue toute seule. Seul un compteur la tient. Même motif que `emojiInterface`,
// `typoDA`, `rayonsDA`, `espacementDA`.

const RACINE = join(__dirname, '..', '..');
const DOSSIERS = ['app', 'components', 'lib', 'hooks'];

/**
 * Les mots interdits dans un NOM de propriété d'event. Tirés un par un du §6 —
 * corps, objectif, régime, sport, identité — plus leurs équivalents anglais, parce
 * que le code de Kyroz mélange les deux langues (`weight_kg`, `plan_days`).
 *
 * ⚠️ On interdit sur le NOM, pas sur la valeur : une valeur se calcule et échappe à
 * toute lecture statique, un nom est écrit en clair à l'appel. C'est ce qui rend le
 * contrôle possible — et ce qui le rend faillible : `capture('x', { a: profile.goal })`
 * passerait. Le filet complémentaire est plus bas (aucun accès à `profile.` dans un
 * bloc de propriétés).
 */
const MOTS_INTERDITS = [
  // corps
  'weight', 'poids', 'height', 'taille', 'bodyfat', 'body_fat', 'mg', 'bmi', 'imc',
  'age', 'birth', 'naissance', 'sex', 'sexe', 'gender',
  // objectif, régime, sport
  'goal', 'objectif', 'target', 'cible', 'kcal', 'macro', 'calorie',
  'diet', 'regime', 'restriction', 'allerg', 'dislike', 'deteste',
  'sport', 'training', 'entrainement', 'seance',
  // identité
  'email', 'mail', 'prenom', 'firstname', 'first_name', 'nom', 'user_id', 'userid',
  'account', 'compte', 'supabase', 'photo', 'avatar',
  // texte libre
  'message', 'texte', 'text', 'label', 'libelle', 'note', 'commentaire', 'raison', 'motif',
];

function sansCommentaires(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/(?<!:)\/\/.*$/, ''))
    .join('\n');
}

function fichiersSource(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    if (e === '__tests__' || e === 'node_modules') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...fichiersSource(p));
    else if (/\.tsx?$/.test(e) && !/\.test\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}

/**
 * Extrait le bloc de propriétés de chaque `capture(…, { … })`.
 *
 * Volontairement littéral : on ne lit QUE les objets écrits sur place. Un objet
 * construit ailleurs et passé par variable échapperait — c'est assumé, et c'est la
 * raison pour laquelle le second test interdit `profile.` dans ces blocs plutôt que
 * de faire semblant d'analyser le programme.
 */
function blocsDeProprietes(src: string): { bloc: string; ligne: number }[] {
  const out: { bloc: string; ligne: number }[] = [];
  const re = /capture\w*\(\s*[^,()]*,\s*\{([\s\S]*?)\}\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out.push({ bloc: m[1], ligne: src.slice(0, m.index).split('\n').length });
  }
  return out;
}

/** Les noms de clés d'un bloc d'objet littéral (`a: 1, b, ...c` → a, b). */
function clesDe(bloc: string): string[] {
  return [...bloc.matchAll(/(?:^|[,{])\s*([A-Za-z_$][\w$]*)\s*(?::|,|$)/g)].map((m) => m[1]);
}

const SOURCES = DOSSIERS.flatMap((d) => fichiersSource(join(RACINE, d)))
  .map((f) => ({ chemin: f.slice(RACINE.length + 1), src: sansCommentaires(readFileSync(f, 'utf8')) }));

describe('Périmètre de mesure — les interdits du §6 sont COMPTÉS', () => {
  it('aucune propriété d’event ne porte un nom de donnée de santé ou d’identité', () => {
    const fautes: string[] = [];
    for (const { chemin, src } of SOURCES) {
      for (const { bloc, ligne } of blocsDeProprietes(src)) {
        for (const cle of clesDe(bloc)) {
          const bas = cle.toLowerCase();
          const mot = MOTS_INTERDITS.find((w) => bas === w || bas.startsWith(`${w}_`) || bas.endsWith(`_${w}`));
          if (mot) fautes.push(`${chemin}:${ligne} — propriété « ${cle} » (mot interdit : ${mot})`);
        }
      }
    }
    expect(
      fautes,
      `Propriété(s) interdite(s) dans un event :\n${fautes.join('\n')}\n\n` +
        `§6 de ../../docs/archive/2026-08-10-synthese-analytics-arbitrage.md : aucune donnée de santé ` +
        `(poids, taille, %MG, sexe, âge, objectif, régime, restrictions, sport, IMC, et ` +
        `aucun motif de blocage lié à l'un d'eux), aucun texte libre, aucune photo, ni ` +
        `e-mail ni prénom ni id de compte. En cas de doute : ne pas envoyer la propriété.`,
    ).toEqual([]);
  });

  it('aucune valeur d’event n’est lue directement sur le profil', () => {
    // Le filet du premier test : il contrôle les NOMS, donc `{ x: profile.goal }`
    // lui échapperait. Le profil EST la donnée de santé (CLAUDE.md §7) — rien de ce
    // qu'il contient n'a le droit de sortir, quel que soit le nom qu'on lui donne.
    const fautes: string[] = [];
    for (const { chemin, src } of SOURCES) {
      for (const { bloc, ligne } of blocsDeProprietes(src)) {
        if (/\bprofile[.?]/.test(bloc)) fautes.push(`${chemin}:${ligne} — lit « profile. » dans un event`);
      }
    }
    expect(fautes, fautes.join('\n')).toEqual([]);
  });

  it('les 15 events sont ceux qui ont été arbitrés — ni plus, ni moins', () => {
    // Le nombre n'est pas un caprice : chaque event doit porter un seuil de décision
    // écrit AVANT d'être posé (§2 et §10 de la synthèse). En ajouter un sans y penser
    // est exactement ce que ce compte rend impossible — il faut venir ici, donc
    // relire la règle. En retirer un est tout aussi délibéré.
    expect(Object.values(Events).sort()).toEqual([
      'app_error',
      'first_plan_viewed',
      'meal_cooked',
      'meal_swapped',
      'off_plan_logged',
      'onboarding_blocked',
      'onboarding_completed',
      'onboarding_started',
      'onboarding_step_viewed',
      'plan_generation_failed',
      'plan_opened',
      'plan_regenerated',
      'recipe_disliked',
      'streak_frozen',
      'streak_milestone',
    ]);
  });

  it('tout event envoyé existe dans la table Events', () => {
    // Un `capture('plan_ouvert')` écrit à la main ne casserait rien et ne serait
    // jamais lu — il finirait dans PostHog à côté du bon, avec 3 occurrences.
    const connus = new Set<string>(Object.values(Events));
    const fautes: string[] = [];
    for (const { chemin, src } of SOURCES) {
      if (chemin === 'lib/analytics.ts') continue; // c'est lui qui définit la table
      for (const m of src.matchAll(/capture\(\s*(['"`])([^'"`]+)\1/g)) {
        if (!connus.has(m[2])) fautes.push(`${chemin} — event « ${m[2]} » absent de Events`);
      }
    }
    expect(fautes, fautes.join('\n')).toEqual([]);
  });

  // ── Vérification de l'INSTRUMENT ────────────────────────────────────────────
  // Un test qu'on n'a jamais vu rougir ne prouve rien. Celui-ci doit savoir dire OUI
  // avant qu'on le croie quand il dit NON — et il a eu une version fausse en cours
  // d'écriture : sans le `(?:^|[,{])`, `clesDe` prenait aussi les valeurs, donc
  // `{ recale: false }` déclenchait le mot interdit « label » via… rien du tout.
  it('l’instrument sait dire OUI', () => {
    const faux = `capture(Events.x, { goal, plan_days: 3 });`;
    expect(clesDe(blocsDeProprietes(faux)[0].bloc)).toContain('goal');

    const sain = `capture(Events.x, { plan_days: 3, meals: 4 });`;
    const cles = clesDe(blocsDeProprietes(sain)[0].bloc);
    expect(cles).toEqual(['plan_days', 'meals']);
    expect(cles.some((c) => MOTS_INTERDITS.includes(c.toLowerCase()))).toBe(false);

    // Il voit la lecture indirecte, celle que les NOMS ne peuvent pas attraper.
    const indirect = `capture(Events.x, { n: profile.weight_kg });`;
    expect(/\bprofile[.?]/.test(blocsDeProprietes(indirect)[0].bloc)).toBe(true);

    // Et il ne s'aveugle pas tout seul : les blocs réels du dépôt sont bien vus.
    expect(SOURCES.some(({ src }) => blocsDeProprietes(src).length > 0)).toBe(true);
  });
});
