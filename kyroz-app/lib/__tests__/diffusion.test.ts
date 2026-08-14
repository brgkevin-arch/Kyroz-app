import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ── Un état lu par PLUSIEURS écrans se DIFFUSE ──────────────────────────────
//
// 🔴 LE DÉFAUT MESURÉ, le 2026-08-14, en refondant la carte du poids.
// `useWeightLog` gardait ses pesées dans l'état LOCAL du hook, et ce hook a TROIS
// instances : l'écran Profil (la carte), l'écran Plan (le rappel) et
// `WeightCheckin` (la feuille). Elles ne se parlaient pas.
// Vu à l'écran : on enregistre une pesée du 12 août dans la feuille, la courbe
// s'affiche DEDANS — et la carte du Profil, derrière, continue d'annoncer « encore
// une pesée et ta courbe apparaît ici ». Indéfiniment.
//
// ⚠️ CE QUI L'A FAIT VIVRE SI LONGTEMPS : le défaut ne se voit que sur un
// BACKFILL. Une pesée du JOUR modifie `profile.weight_kg`, donc l'effet du hook se
// redéclenchait par la bande et tout paraissait sain. Une pesée d'un jour passé ne
// touche pas le profil — à dessein — et là plus rien ne rafraîchissait rien.
// C'est le « défaut dormant que le chemin courant masque » de CLAUDE.md §11.
//
// ➡️ Le patron est écrit noir sur blanc dans CLAUDE.md §11 depuis le 2026-08-06 :
// *un réglage lu par un AUTRE écran que celui qui le pose ne se relit pas « au
// focus » — il se DIFFUSE*. Store hors React + `useSyncExternalStore`, chargé une
// fois. Le thème, l'accent, l'hydratation, le prénom et l'heure de rappel le
// suivaient déjà ; les pesées non.
//
// ⚠️ CE QUE CE TEST NE SAIT PAS FAIRE : vérifier qu'un écran se rafraîchit. Il
// ferme le chemin par lequel la panne arrive — un état PARTAGÉ rangé dans un
// `useState` de hook, donc recopié une fois par instance.

const RACINE = join(__dirname, '..', '..');
const HOOKS = join(RACINE, 'hooks');

/** Les hooks montés par PLUS D'UN écran : leur état ne peut pas être local. */
const PARTAGES = ['useWeightLog.ts'];

function sansCommentaires(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
}

describe('Les états partagés entre écrans passent par un store, pas par useState', () => {
  it('la sonde voit bien les fichiers — sinon elle passerait à vide', () => {
    const tous = readdirSync(HOOKS);
    for (const h of PARTAGES) expect(tous, `${h} a été renommé ou supprimé`).toContain(h);
  });

  it('🔴 `useWeightLog` diffuse ses pesées', () => {
    const code = sansCommentaires(readFileSync(join(HOOKS, 'useWeightLog.ts'), 'utf8'));
    expect(code, 'le patron `useSyncExternalStore` a disparu').toContain('useSyncExternalStore');
    // Et la liste n'est PLUS un état local : c'était toute la panne.
    expect(code, 'les pesées sont retournées dans un useState local')
      .not.toMatch(/useState<WeightEntry\[\]>/);
  });

  it('chaque écriture passe par la diffusion, aucune ne s’arrête à son instance', () => {
    const code = sansCommentaires(readFileSync(join(HOOKS, 'useWeightLog.ts'), 'utf8'));
    // `logWeight` et `removeWeight` écrivent tous deux la liste. Si l'un d'eux
    // revenait à un `setEntries` local, seule SA copie bougerait — et le défaut
    // reviendrait sur la moitié des chemins seulement, donc encore plus discret.
    expect(code).not.toContain('setEntries(');
    expect((code.match(/diffuser\(/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('sait dire NON : un `useState` de liste serait bien vu comme fautif', () => {
    // Un compteur qu'on n'a jamais vu rougir ne prouve rien.
    const avant = 'const [entries, setEntries] = useState<WeightEntry[]>([]);';
    expect(/useState<WeightEntry\[\]>/.test(avant)).toBe(true);
    expect(/useState<WeightEntry\[\]>/.test('useSyncExternalStore(sAbonner, () => pesees, () => pesees)')).toBe(false);
  });
});
