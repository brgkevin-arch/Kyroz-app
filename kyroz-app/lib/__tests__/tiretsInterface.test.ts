import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ── PAS DE TIRET CADRATIN DANS UNE PHRASE LUE PAR QUELQU'UN ─────────────────
//
// 🔴 DEMANDE FONDATEUR, 2026-09-08 : « enlève les — de tes phrases que tu mets
// dans l'app, ça fait beaucoup trop IA ». Elle porte sur ce que l'UTILISATEUR lit,
// pas sur les commentaires de code — ce dépôt en est fait, et ils ne sont lus que
// par nous.
//
// ⚠️ SANS CE TEST, LA CONSIGNE NE TIENT PAS UNE SEMAINE. 93 chaînes en portaient un
// au moment du nettoyage ; la suivante s'écrira au fil d'une phrase, et personne ne
// relira les 38 fichiers. Une consigne de rédaction sans compteur est une intention.
//
// ⚠️ ET LES EXCEPTIONS SONT NOMMÉES UNE PAR UNE, avec leur raison : une liste par
// motif (« tout `lib/` sauf… ») laisserait rentrer la prochaine phrase fautive du
// même fichier sans que rien ne bouge.

const RACINE = join(__dirname, '..', '..');

/**
 * Ce qui reste légitimement, et pourquoi. Le nombre compte : ajouter une chaîne
 * fautive dans un de ces fichiers fait rougir, au lieu de se glisser sous l'exception.
 */
const TOLERE: Record<string, { combien: number; pourquoi: string }> = {
  'lib/sync.ts': { combien: 7, pourquoi: 'journaux de développement (`LOG_PREFIX`), jamais affichés' },
  'lib/profileBoot.ts': { combien: 3, pourquoi: 'journaux de démarrage' },
  'hooks/useProfile.ts': { combien: 1, pourquoi: 'journal de démarrage' },
  'components/GuidedTour.tsx': { combien: 1, pourquoi: 'journal `[GuidedTour]`' },
  'lib/planEngine.ts': { combien: 3, pourquoi: 'le changelog d’`ENGINE_VERSION`, lu par nous seuls' },
  'lib/recipeFoodMap.ts': { combien: 2, pourquoi: 'commentaires en fin de ligne, pas des textes' },
  'lib/foods.ts': { combien: 1, pourquoi: 'commentaire d’attribution Ciqual' },
  'components/WeightCheckin.tsx': {
    combien: 1,
    pourquoi: 'le tiret SEUL de la colonne « écart » : il ne remplace pas une conjonction, il dit « pas de valeur »',
  },
  'constants/legal.ts': {
    combien: 4,
    pourquoi:
      'textes légaux — les toucher déplace l’empreinte de `legal.test.ts` ET impose de ré-arbitrer la date '
      + 'd’entrée en vigueur. Une virgule ne vaut pas de faire croire que les conditions ont changé ce jour-là. '
      + 'À traiter à part, le jour où le texte bouge pour une vraie raison.',
  },
};

const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const fichiers: string[] = [];
const marche = (rel: string) => {
  for (const e of readdirSync(join(RACINE, rel), { withFileTypes: true })) {
    const f = `${rel}/${e.name}`;
    if (e.isDirectory()) { if (e.name !== '__tests__') marche(f); }
    else if (/\.tsx?$/.test(e.name)) fichiers.push(f);
  }
};
for (const d of ['app', 'components', 'lib', 'constants', 'hooks']) marche(d);

const chainesAvecTiret = (rel: string): string[] => {
  const src = sansCommentaires(readFileSync(join(RACINE, rel), 'utf8'));
  return [...src.matchAll(/(['"`])((?:[^\\\n]|\\.)*?—(?:[^\\\n]|\\.)*?)\1/g)].map((m) => m[2]);
};

describe('les phrases de l’app ne portent pas de tiret cadratin', () => {
  it('la sonde voit quelque chose — sinon elle serait verte à vide', () => {
    // Témoin de contrôle : sans lui, une regex cassée rendrait « aucun tiret nulle
    // part » et le test passerait au vert en ne mesurant plus rien.
    expect(fichiers.length).toBeGreaterThan(50);
    expect(chainesAvecTiret('lib/sync.ts').length).toBeGreaterThan(0);
  });

  it('aucun fichier hors exceptions n’en porte', () => {
    const fautifs = fichiers
      .map((f) => ({ f, n: chainesAvecTiret(f).length }))
      .filter(({ f, n }) => n > 0 && !TOLERE[f])
      .map(({ f, n }) => `${f} (${n})`);
    expect(
      fautifs,
      'un tiret cadratin dans une phrase affichée : le remplacer par « , », « : » ou un point',
    ).toEqual([]);
  });

  it('et les exceptions n’enflent pas', () => {
    const enfles = Object.entries(TOLERE)
      .map(([f, { combien }]) => ({ f, attendu: combien, vu: chainesAvecTiret(f).length }))
      .filter(({ attendu, vu }) => vu !== attendu)
      .map(({ f, attendu, vu }) => `${f} : ${vu} au lieu de ${attendu}`);
    expect(
      enfles,
      'une exception a bougé — vérifier que ce n’est pas une phrase affichée qui s’y est glissée',
    ).toEqual([]);
  });
});
