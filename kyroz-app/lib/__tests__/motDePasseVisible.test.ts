import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ── UN MOT DE PASSE SE RELIT — ET LE BOUTON VIT DANS `Field` ─────────────────
//
// 🔴 LE DÉFAUT QUE CE FICHIER FERME, relevé le 2026-09-04 en confrontant la liste
// du fondateur au dépôt. Les trois champs masqués de l'app — inscription, connexion,
// réinitialisation — portaient `secureTextEntry` NU : aucun moyen de relire ce qu'on
// venait de taper. Le seul recours d'une faute de frappe était de tout reprendre à
// l'aveugle, sur l'écran où l'on perd le plus de monde.
//
// ⚠️ Aucun moteur de rendu React Native n'est disponible dans cette suite
// (`vitest.config.ts` : `react-native` est un MOCK minimal). Comme
// `sexeOnboarding.test.ts` et `presseAccessibilityRole.test.ts`, ce fichier éprouve
// la FORME du code source, pas un rendu.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const ui = sansCommentaires(lire('components/ui.tsx'));

describe('le bouton de révélation vit dans `Field`', () => {
  it('`Field` INTERCEPTE `secureTextEntry` au lieu de le laisser filer dans `props`', () => {
    // Le piège de ce composant : `Field` étale `{...props}` sur son `TextInput`. Laisser
    // `secureTextEntry` dedans le figerait à la valeur de l'appelant, et le bouton
    // deviendrait DÉCORATIF — un contrôle qui ne pilote rien (CLAUDE.md §11, A23).
    expect(ui).toMatch(/export function Field\(\{[\s\S]{0,120}secureTextEntry,[\s\S]{0,40}\.\.\.props/);
  });

  it('le champ est masqué SEULEMENT si l’appelant le demande ET que rien n’est révélé', () => {
    expect(ui).toMatch(/secureTextEntry=\{masquable && !revele\}/);
  });

  it('l’état part MASQUÉ à chaque montage', () => {
    // Un mot de passe révélé qui survivrait à la fermeture de l'écran serait un réglage
    // que personne n'a demandé, sur la donnée la plus sensible du parcours.
    expect(ui).toMatch(/useState\(false\)/);
  });

  it('le bouton n’apparaît QUE sur un champ masquable', () => {
    // Un œil sur un champ « Poids » n'aurait rien à masquer.
    expect(ui).toMatch(/masquable \? \(/);
    expect(ui).toMatch(/const masquable = secureTextEntry === true/);
  });

  it('il annonce ce que l’appui VA faire, et son état, à VoiceOver', () => {
    expect(ui).toMatch(/accessibilityLabel=\{revele \? '[^']+' : '[^']+'\}/);
    expect(ui).toMatch(/accessibilityState=\{\{ selected: revele \}\}/);
  });

  it('la cible tactile fait `CIBLE_TACTILE_MIN`, pas un `hitSlop`', () => {
    // `hitSlop` élargit la zone au DOIGT, jamais à l'œil (CLAUDE.md §8) : il ne compte
    // pas comme un correctif de cible tactile.
    expect(ui).toMatch(/width: CIBLE_TACTILE_MIN, height: CIBLE_TACTILE_MIN/);
  });
});

// ── LE PÉRIMÈTRE : AUCUN CHAMP MASQUÉ HORS DE `Field` ────────────────────────
//
// 🔴 C'est CE test qui garde la règle, pas les précédents. Les six ci-dessus décrivent
// le composant ; celui-ci empêche qu'un futur champ de mot de passe soit écrit à la
// main à côté — exactement ce qu'était `profil.tsx` jusqu'au 2026-09-04, seul des trois
// à recopier le style de `Field` (son propre commentaire disait déjà que c'était
// l'erreur). Un inventaire se compte sur ce qui est AFFICHÉ, pas sur les fichiers qui
// ressemblent à de l'interface (CLAUDE.md §8, le compteur d'émojis).

const DOSSIERS = ['app', 'components'];

function fichiers(dir: string): string[] {
  const abs = join(RACINE, dir);
  return readdirSync(abs).flatMap((nom) => {
    const rel = `${dir}/${nom}`;
    if (statSync(join(RACINE, rel)).isDirectory()) return fichiers(rel);
    return /\.tsx$/.test(nom) ? [rel] : [];
  });
}

/**
 * Renvoie le texte de chaque balise `<nom …>` du source.
 *
 * ⚠️ BALAYAGE À PROFONDEUR D'ACCOLADES, JAMAIS UNE REGEX. Une expression qui
 * s'arrête au premier `>` tombe sur la flèche d'un `onChangeText={(v) => …}` et
 * coupe la balise en plein milieu — c'est le défaut exact qui a rendu
 * `espacementDA` vert et aveugle pendant des mois (CLAUDE.md §8).
 */
function balises(src: string, nom: string): string[] {
  const out: string[] = [];
  const ouvre = `<${nom}`;
  let i = src.indexOf(ouvre);
  while (i !== -1) {
    // La balise doit finir sur un caractère non identifiant : `<Field` ne doit pas
    // capturer `<FieldGroup`.
    if (!/[A-Za-z0-9_]/.test(src[i + ouvre.length] ?? '')) {
      let profondeur = 0;
      let j = i + ouvre.length;
      for (; j < src.length; j++) {
        const c = src[j];
        if (c === '{') profondeur++;
        else if (c === '}') profondeur--;
        else if (c === '>' && profondeur === 0) break;
      }
      out.push(src.slice(i, j));
    }
    i = src.indexOf(ouvre, i + 1);
  }
  return out;
}

describe('le périmètre — aucun champ masqué écrit à la main', () => {
  it('aucun `TextInput` BRUT ne porte `secureTextEntry`', () => {
    // C'est CE test qui garde la règle. Les précédents décrivent le composant ;
    // celui-ci empêche qu'un futur champ de mot de passe soit écrit à côté de `Field`
    // — exactement ce qu'était `profil.tsx` jusqu'au 2026-09-04, seul des trois à
    // recopier son style à la main (son propre commentaire disait que c'était l'erreur).
    const fautifs = DOSSIERS.flatMap(fichiers)
      .filter((rel) => rel !== 'components/ui.tsx')
      .filter((rel) => balises(sansCommentaires(lire(rel)), 'TextInput')
        .some((b) => /secureTextEntry/.test(b)));

    expect(
      fautifs,
      `Ces écrans posent un \`TextInput\` masqué à la main, donc SANS bouton ` +
      `« afficher » : ${fautifs.join(', ')}. Passer par <Field secureTextEntry …>, ` +
      `qui porte le bouton, sa cible tactile et son libellé VoiceOver.`,
    ).toEqual([]);
  });

  it('la sonde sait dire OUI — sinon elle ne prouve rien', () => {
    // Un test qui ne trouve jamais rien ressemble exactement à un test que tout
    // satisfait (CLAUDE.md §8). Trois cas écrits exprès :
    const brut = '<TextInput value={v} onChangeText={(x) => setV(x)} secureTextEntry />';
    expect(balises(brut, 'TextInput').some((b) => /secureTextEntry/.test(b))).toBe(true);

    // …la flèche d'une fonction anonyme ne doit PAS couper la balise avant l'attribut,
    // ce qui est le piège qui a rendu `espacementDA` aveugle.
    const apresFleche = '<TextInput onChangeText={(x) => x} secureTextEntry />';
    expect(balises(apresFleche, 'TextInput')[0]).toContain('secureTextEntry');

    // …et un `Field` masqué n'est PAS un `TextInput` brut : c'est l'usage correct.
    const viaField = '<Field t={t} label="Mot de passe" secureTextEntry />';
    expect(balises(viaField, 'TextInput')).toEqual([]);
  });

  it('les trois champs de mot de passe existent toujours, et passent par `Field`', () => {
    // Sans lui, supprimer les trois champs rendrait la suite verte.
    for (const rel of ['app/(auth)/login.tsx', 'components/MotDePasseOublie.tsx', 'app/(tabs)/profil.tsx']) {
      const masques = balises(sansCommentaires(lire(rel)), 'Field')
        .filter((b) => /secureTextEntry/.test(b));
      expect(masques.length, `${rel} : aucun <Field secureTextEntry>`).toBeGreaterThan(0);
    }
  });
});
