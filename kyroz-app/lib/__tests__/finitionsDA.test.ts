import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Trait, Icone, OPACITE_PRESSION } from '../../constants/theme';

// ── Les trois finitions : le trait, l'icône, le retour au toucher ────────────
//
// Quatrième de la famille (rayons · typo · espacement · celui-ci), et le même
// diagnostic à chaque fois : le token existe ou n'existe pas, mais rien n'oblige
// à s'en servir, donc chacun écrit son chiffre. Mesuré le 2026-08-06 :
//
//   • `activeOpacity` — QUATRE valeurs (0,85 ×31 · 0,7 ×23 · 0,8 ×14 · 0,6 ×1)
//     pour un seul et même geste. Aucune ne correspondait à un type d'élément :
//     c'était l'humeur de qui écrivait la ligne. Un accusé de réception qui
//     change d'intensité d'un bouton à l'autre se remarque sans se comprendre ;
//   • `borderWidth` — 1 (40 fois), 2 (5), 1,5 (4). Le 2 marquait TOUJOURS la
//     même chose, un contrôle qu'on sélectionne ; le 1,5 n'avait aucun rôle,
//     il était « un peu plus épais qu'un séparateur » ;
//   • taille d'icône — DOUZE valeurs de 14 à 30 pour une cinquantaine d'icônes.
//
// ⚠️ Une icône n'a pas de taille « à elle » : elle en a une par rapport à ce
// qu'elle accompagne. C'est pour ça que les crans se nomment `petite`,
// `standard`, `action`, `nav`, `vide` — et pas `sm/md/lg`, qui n'auraient rien
// dit de plus que le chiffre qu'ils remplacent.

const RACINE = join(__dirname, '..', '..');
const DOSSIERS = ['app', 'components'];

function fichiersTsx(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...fichiersTsx(p));
    else if (e.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function chercher(motif: RegExp): string[] {
  const trouves: string[] = [];
  for (const d of DOSSIERS) {
    for (const f of fichiersTsx(join(RACINE, d))) {
      readFileSync(f, 'utf8').split('\n').forEach((ligne, i) => {
        const m = ligne.match(motif);
        if (m) trouves.push(`${f.slice(RACINE.length + 1)}:${i + 1} — ${m[0]}   ${ligne.trim().slice(0, 64)}`);
      });
    }
  }
  return trouves;
}

describe('Finitions — trait, icône et retour au toucher passent par un token', () => {
  it('aucun retour au toucher en dur — un seul geste, une seule valeur', () => {
    const f = chercher(/activeOpacity=\{[\d.]+\}/);
    expect(f, f.join('\n')).toEqual([]);
  });

  it('aucune épaisseur de trait en dur', () => {
    const f = chercher(/borderWidth:\s*[\d.]+/);
    expect(f, f.join('\n')).toEqual([]);
  });

  it("aucune taille d'icône en dur", () => {
    const f = chercher(/\bsize=\{\d+(?:\.\d+)?\}/);
    expect(f, f.join('\n')).toEqual([]);
  });

  it('les échelles restent cohérentes', () => {
    // Deux rôles de trait, pas trois : le jour où un `1.5` revient, il revient
    // sous un nom — donc avec une raison — ou pas du tout.
    expect(Object.keys(Trait).sort()).toEqual(['controle', 'fin']);
    expect(Trait.controle).toBeGreaterThan(Trait.fin);

    // Les crans d'icône croissent dans l'ordre où on les lit ci-dessus ; deux
    // crans de même valeur seraient deux noms pour une seule décision.
    const tailles = Object.values(Icone);
    expect([...tailles].sort((a, b) => a - b)).toEqual(tailles);
    expect(new Set(tailles).size).toBe(tailles.length);

    // Un retour perceptible : au-delà de 0,9 l'appui ne se voit plus, et c'est
    // le SEUL signe qu'il a été pris en compte.
    expect(OPACITE_PRESSION).toBeGreaterThan(0);
    expect(OPACITE_PRESSION).toBeLessThanOrEqual(0.9);
  });
});
