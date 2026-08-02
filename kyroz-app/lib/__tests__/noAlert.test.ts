import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ── Pourquoi ce test existe ─────────────────────────────────────────────────
// `Alert.alert` de react-native est une FONCTION VIDE sur react-native-web :
//
//     class Alert { static alert() {} }
//
// Aucune erreur, aucune trace : l'appel ne fait simplement RIEN. Sur le web —
// la version que les gens utilisent aujourd'hui — dix interactions étaient
// mortes, dont « Régénérer mon plan » et le REFUS d'un profil inéligible à
// l'onboarding (bouton final inerte, sans message).
//
// Le piège est invisible à la relecture : le code a l'air juste. Seul un test
// peut le tenir fermé. Remplaçant : `useDialog()` (components/Dialog.tsx), un
// seul chemin web ET natif.

const RACINE = join(__dirname, '..', '..');
const DOSSIERS = ['app', 'components', 'hooks', 'lib'];
const EXEMPTS = ['components/Dialog.tsx']; // documente le piège, ne l'utilise pas

function fichiersSource(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '__tests__') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) fichiersSource(p, acc);
    else if (/\.tsx?$/.test(e)) acc.push(p);
  }
  return acc;
}

describe('Alert de react-native — interdit (no-op sur le web)', () => {
  it('aucun fichier ne l\'importe ni ne l\'appelle', () => {
    const coupables: string[] = [];
    for (const dossier of DOSSIERS) {
      for (const f of fichiersSource(join(RACINE, dossier))) {
        const rel = f.slice(RACINE.length + 1).replace(/\\/g, '/');
        if (EXEMPTS.includes(rel)) continue;
        const src = readFileSync(f, 'utf8');
        // Import depuis react-native (liste nommée) ou appel direct.
        const importe = /import\s*\{[^}]*\bAlert\b[^}]*\}\s*from\s*['"]react-native['"]/s.test(src);
        const appelle = /(?<!\/\/.*)\bAlert\s*\.\s*alert\s*\(/.test(
          src.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n'),
        );
        if (importe || appelle) coupables.push(rel);
      }
    }
    expect(coupables, `Utiliser useDialog() (components/Dialog.tsx) — Alert ne fait RIEN sur le web`).toEqual([]);
  });

  it('le remplaçant existe et expose les trois formes', () => {
    const src = readFileSync(join(RACINE, 'components', 'Dialog.tsx'), 'utf8');
    for (const api of ['confirm:', 'notify:', 'choose:']) expect(src).toContain(api);
  });
});
