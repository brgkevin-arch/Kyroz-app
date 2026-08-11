import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { PRIMITIVE, doitEmettre, type RoleHaptique } from '../haptique';

// ── Le retour au toucher a un rôle, une table et un compteur ─────────────────
//
// Septième axe, et le premier qui ne se voit sur aucune capture. Ce qu'il garde :
//
//   1. Deux rôles ne partagent pas une sensation — sinon l'un des deux ne sert à
//      rien, et on ne s'en aperçoit jamais puisque ça « marche ».
//   2. Le web ne vibre pas. `expo-haptics` n'y est PAS neutre : il appelle
//      `navigator.vibrate` et, sur iOS Safari, injecte un faux interrupteur pour
//      arracher une vibration au système. Un site qui fait vibrer un téléphone
//      est une surprise, pas une affordance.
//   3. 🔴 **La RARETÉ.** C'est la promesse la plus facile à perdre : brancher un
//      retour par défaut sur `Presse` mettrait une vibration sous les 129 boutons
//      de l'app en une ligne, et personne ne le verrait passer. Un retour que
//      l'on sent partout ne signale plus rien.
//   4. Un rôle déclaré mais jamais employé est un token sans rôle : il finit par
//      servir à tout, faute d'avoir servi à quelque chose.

const RACINE = join(__dirname, '..', '..');
const ROLES: RoleHaptique[] = ['choix', 'validation', 'refus', 'declic'];

/** Écarte commentaires et documentation — cf. la note de `materiauxDA`. */
function sansCommentaires(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

function sources(): { chemin: string; code: string }[] {
  const out: { chemin: string; code: string }[] = [];
  const parcourir = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== '__tests__') parcourir(p); }
      else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) {
        out.push({ chemin: p.slice(RACINE.length + 1), code: sansCommentaires(readFileSync(p, 'utf8')) });
      }
    }
  };
  for (const d of ['app', 'components', 'lib', 'hooks', 'constants']) parcourir(join(RACINE, d));
  return out;
}

describe('Retour au toucher — quatre rôles, et surtout pas un de plus sous chaque doigt', () => {
  it('deux rôles ne partagent jamais une sensation', () => {
    const primitives = ROLES.map((r) => PRIMITIVE[r]);
    expect(new Set(primitives).size, `primitives : ${primitives.join(', ')}`).toBe(ROLES.length);
  });

  it('la table couvre exactement les rôles déclarés — ni trou, ni surplus', () => {
    expect(Object.keys(PRIMITIVE).sort()).toEqual([...ROLES].sort());
  });

  it('le web ne vibre pas ; iOS et Android, oui', () => {
    expect(doitEmettre('ios')).toBe(true);
    expect(doitEmettre('android')).toBe(true);
    expect(doitEmettre('web')).toBe(false);
    // Une plateforme inconnue ne vibre pas non plus : le défaut est le silence.
    expect(doitEmettre('windows')).toBe(false);
  });

  it('🔴 `Presse` ne vibre JAMAIS sans qu’on le lui demande', () => {
    // La faute serait d'écrire `retour = 'choix'` dans la déstructuration des
    // props, comme `activeOpacity = OPACITE_PRESSION` juste à côté. Une ligne,
    // 129 boutons qui vibrent, aucun test rouge sans celui-ci.
    const src = sansCommentaires(readFileSync(join(RACINE, 'components', 'Presse.tsx'), 'utf8'));
    expect(/\bretour\s*=\s*['"]/.test(src), 'un retour par défaut a été posé dans Presse.tsx').toBe(false);
    // Et il reste bien branché : sans cet appel, la prop serait décorative.
    expect(src).toMatch(/if\s*\(retour\)/);
  });

  it('🔴 chaque rôle est réellement EMPLOYÉ quelque part', () => {
    const code = sources().map((f) => f.code).join('\n');
    const inemployes = ROLES.filter(
      (r) => !new RegExp(`retour=["']${r}["']|retour\\(['"]${r}['"]\\)`).test(code)
    );
    expect(inemployes, `rôles déclarés mais jamais employés : ${inemployes.join(', ')}`).toEqual([]);
  });

  it('🔴 un échec de vibration ne remonte JAMAIS — le `.catch` est ce qui rend le lot publiable en OTA', () => {
    // Mesuré le 2026-08-11 sur un binaire SANS `ExpoHaptics` : l'app tient debout,
    // parce que le paquet rend `null` à l'import (`requireOptionalNativeModule`)
    // ET parce que le rejet de l'appel est avalé ici. Retirer ce `.catch` ferait
    // un `unhandledrejection` à chaque appui sur un vieux binaire — rien de rouge
    // au build, une app bruyante chez les gens.
    const src = sansCommentaires(readFileSync(join(RACINE, 'lib', 'retourHaptique.ts'), 'utf8'));
    expect(src, 'le rejet de la promesse n’est plus capturé').toMatch(/\.catch\(/);
    expect(src, 'la garde de plateforme a disparu').toMatch(/doitEmettre\(/);
  });

  it('personne n’appelle `expo-haptics` en direct — tout passe par `retourHaptique`', () => {
    // Même patron que le verre : la garde de plateforme vit dans UN fichier ;
    // la contourner la rend inutile partout ailleurs.
    const fautifs = sources()
      .filter((f) => f.chemin !== join('lib', 'retourHaptique.ts'))
      .filter((f) => f.code.includes('expo-haptics'))
      .map((f) => f.chemin);
    expect(fautifs, fautifs.join('\n')).toEqual([]);
  });

  it('la sonde sait dire OUI — sinon elle prouverait n’importe quoi', () => {
    expect(sansCommentaires('// on parle de expo-haptics ici')).not.toContain('expo-haptics');
    expect(sansCommentaires("import * as H from 'expo-haptics';")).toContain('expo-haptics');
    // Et le repérage d'un rôle employé trouve bien les deux écritures possibles.
    const code = 'retour="choix"\nretour(\'declic\')';
    expect(/retour=["']choix["']/.test(code)).toBe(true);
    expect(/retour\(['"]declic['"]\)/.test(code)).toBe(true);
    expect(/retour=["']validation["']/.test(code)).toBe(false);
  });
});
