import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Aucune clé d'API d'IA ne doit être lisible par le CLIENT.
 *
 * Contexte, mesuré : `lib/generatePlan.ts` proposait un appel à l'API Claude « si
 * `EXPO_PUBLIC_ANTHROPIC_API_KEY` est définie ». La clé n'a jamais été posée en
 * production, mais le SDK partait quand même dans le bundle web PUBLIC — 35
 * occurrences, prompt système et chaîne `sk-ant-` servis à chaque visiteur. Le
 * chemin a été supprimé le 2026-07-31 (−224 Ko).
 *
 * Le piège qui reste : tout ce qui commence par `EXPO_PUBLIC_` est INLINÉ EN CLAIR
 * dans le bundle dès qu'une ligne de code y fait référence. Une clé posée là serait
 * donc publiée telle quelle — y compris par une OTA, qui atteint tout le monde en
 * quelques minutes sans revue pour l'arrêter.
 *
 * CLAUDE.md §2 énonce déjà la règle (« si la génération IA revient un jour : Edge
 * Function Supabase, clé côté SERVEUR, jamais côté client »). Ce test est là pour
 * qu'elle soit COMPTÉE et pas seulement écrite : une règle qu'aucun test ne mesure
 * ne survit pas au prochain qui ne l'a pas lue.
 *
 * ⚠️ Ce test ne regarde pas `.env.local` : il n'est pas versionné et n'existe pas en
 * CI. Une clé morte qui y traîne ne casse rien tant qu'aucun code ne la lit — c'est
 * exactement ce que ce test verrouille.
 */

const RACINE = join(__dirname, '../..');
const DOSSIERS = ['app', 'components', 'lib', 'hooks'];
// Reconstitué par morceaux : écrit d'un bloc, ce fichier se dénoncerait lui-même.
const INTERDIT = ['ANTHROPIC', '_API_KEY'];

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const nom of readdirSync(dir)) {
    const p = join(dir, nom);
    if (statSync(p).isDirectory()) {
      if (nom === 'node_modules' || nom === '__tests__') continue;
      out.push(...sources(p));
    } else if (/\.tsx?$/.test(nom)) {
      out.push(p);
    }
  }
  return out;
}

const fichiers = DOSSIERS.flatMap((d) => sources(join(RACINE, d)));

describe('aucune clé d’IA côté client', () => {
  it('a bien des fichiers à contrôler', () => {
    // Sans ça, un renommage de dossier viderait la liste et le test suivant
    // passerait au vert sans rien avoir lu.
    expect(fichiers.length).toBeGreaterThan(50);
  });

  it('aucun fichier source ne lit une clé Anthropic', () => {
    const coupables = fichiers.filter((f) => {
      const src = readFileSync(f, 'utf8');
      return INTERDIT.every((frag) => src.includes(frag));
    });
    expect(coupables.map((f) => f.replace(RACINE, ''))).toEqual([]);
  });

  it('eas.json et .env.example n’en portent pas non plus', () => {
    for (const nom of ['eas.json', '.env.example']) {
      const p = join(RACINE, nom);
      if (!existsSync(p)) continue;
      const src = readFileSync(p, 'utf8');
      expect(INTERDIT.every((frag) => src.includes(frag)), `${nom} porte une clé d’IA`).toBe(false);
    }
  });
});
