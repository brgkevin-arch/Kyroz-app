import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  RESSORT, DUREE, ECHELLE_APPUI, ressortRN, vitesseDepuisPan,
  projection, caoutchouc, decisionFeuille, dureeReduite, ressortReduit,
} from '../motion';

// ── Pourquoi ce test existe ─────────────────────────────────────────────────
//
// Quatre axes de la DA ont reçu un rôle, un token ET un compteur : la forme
// (`rayonsDA`), le texte (`typoDA`), le blanc (`espacementDA`), les finitions
// (`finitionsDA`). Le cinquième — le mouvement — n'avait rien, et il avait donc
// dérivé exactement comme les quatre autres avant leur passe.
//
// La leçon qui a rendu ce fichier obligatoire est celle de la passe émoji : elle
// s'est déclarée terminée TROIS fois avant de l'être, parce que « plus un seul
// émoji » était écrit dans un commit et deux fichiers, sans qu'aucun compteur ne
// l'exige. Une règle qu'aucun test ne mesure se déclare tenue toute seule.
//
// ⚠️ CE QU'IL NE SAIT PAS FAIRE, et il faut le dire : juger qu'un mouvement est
// BEAU, ou même qu'il tourne. Le panneau navigateur ne fait pas tourner
// `requestAnimationFrame` et un geste ne se vérifie pas en web (CLAUDE.md §5) —
// ça, c'est le simulateur. Ce test ferme les chemins MÉCANIQUES par lesquels la
// dérive est réellement arrivée : une durée écrite à la main, une courbe
// oubliée, un habillage de ressort qu'on recopie sans savoir ce qu'il vaut.

const RACINE = join(__dirname, '..', '..');
const DOSSIERS = ['app', 'components'];

function fichiersTsx(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '__tests__') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) fichiersTsx(p, acc);
    else if (/\.tsx?$/.test(e)) acc.push(p);
  }
  return acc;
}

/** Le code SANS ses commentaires — sinon le test crie au loup sur sa propre doc. */
function sansCommentaires(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const FICHIERS = DOSSIERS
  .flatMap((d) => fichiersTsx(join(RACINE, d)))
  .map((f) => ({ chemin: f.slice(RACINE.length + 1), code: sansCommentaires(readFileSync(f, 'utf8')) }));

/** Toutes les positions d'un motif littéral. */
function positionsDe(src: string, motif: string): number[] {
  const out: number[] = [];
  let i = src.indexOf(motif);
  while (i !== -1) { out.push(i); i = src.indexOf(motif, i + 1); }
  return out;
}

/**
 * 🔴 L'INSTRUMENT A MENTI AVANT DE DIRE VRAI, et c'est la vraie leçon de ce
 * fichier. La première version lisait l'appel avec une expression régulière
 * non-gourmande qui s'arrêtait au premier `)` — donc sur
 * `duration: dureeReduite(DUREE.court, reduire),` elle coupait AVANT le
 * `easing:` posé deux lignes plus bas. Résultat : **10 sites accusés de ne pas
 * avoir de courbe alors qu'ils en ont une**, et un diagnostic qui envoyait
 * corriger du code parfaitement sain.
 * ➡️ On équilibre les parenthèses, seule façon de lire un appel qui en contient
 * d'autres. Même famille que « mesurer l'instrument » (§11) : la mesure était
 * juste dans son intention, fausse dans son exécution, et elle mentait dans le
 * sens ALARMANT — c'est-à-dire celui qu'on remarque. L'inverse aurait dormi.
 */
function appelComplet(src: string, ouvrante: number): string {
  let profondeur = 0;
  for (let i = ouvrante; i < src.length; i++) {
    if (src[i] === '(') profondeur++;
    else if (src[i] === ')') {
      profondeur--;
      if (profondeur === 0) return src.slice(ouvrante, i + 1);
    }
  }
  return src.slice(ouvrante);
}

describe('Mouvement — aucune durée écrite à la main', () => {
  it('toute durée passe par DUREE', () => {
    // Mesuré avant la passe : 7 valeurs distinctes (200 · 220 · 240 · 260 · 300 ·
    // 500 · 550), à un ou deux crans les unes des autres. Ça ne fait pas sept
    // niveaux de lecture, ça fait du flou — exactement le diagnostic de la
    // typographie (18 tailles pour 8 tokens) et de l'espacement (231 valeurs
    // hors grille).
    const fautifs: string[] = [];
    for (const f of FICHIERS) {
      for (const m of f.code.matchAll(/duration:\s*(\d+)/g)) {
        const ligne = f.code.slice(0, m.index).split('\n').length;
        fautifs.push(`${f.chemin}:${ligne} → duration: ${m[1]}`);
      }
    }
    expect(fautifs, 'ces durées sont en dur ; passer par DUREE (lib/motion.ts)').toEqual([]);
  });

  it('la sonde sait dire NON', () => {
    // Un compteur qu'on n'a jamais vu rougir ne prouve rien.
    const faux = sansCommentaires('Animated.timing(x, { toValue: 1, duration: 300 })');
    expect([...faux.matchAll(/duration:\s*(\d+)/g)].length).toBe(1);
  });
});

describe('Mouvement — aucune animation sans courbe', () => {
  it('chaque Animated.timing déclare son easing', () => {
    // 🔴 Le défaut le plus répandu, et le plus invisible : sans `easing`, React
    // Native applique `easeInOut` par défaut. Donc TOUTE entrée et TOUTE sortie
    // démarraient LENTEMENT — la moitié d'une courbe qu'on n'emploie jamais sur
    // de l'interface, parce qu'elle fait traîner ce qui doit répondre.
    // Mesuré avant la passe : 12 des 16 `Animated.timing` étaient dans ce cas.
    const sansCourbe: string[] = [];
    for (const f of FICHIERS) {
      for (const debut of positionsDe(f.code, 'Animated.timing(')) {
        const bloc = appelComplet(f.code, debut + 'Animated.timing'.length);
        if (!/easing:/.test(bloc)) {
          sansCourbe.push(`${f.chemin}:${f.code.slice(0, debut).split('\n').length}`);
        }
      }
    }
    expect(sansCourbe, 'ces timing n’ont pas de courbe → RN applique easeInOut, donc un départ lent').toEqual([]);
  });

  it('la sonde sait dire NON — et elle sait aussi dire OUI', () => {
    // Les deux sens, parce que cette sonde-ci s'est trompée dans le sens
    // alarmant avant d'être corrigée (voir `appelComplet`).
    const fautif = 'Animated.timing(x, { toValue: 1, duration: DUREE.court })';
    expect(/easing:/.test(appelComplet(fautif, fautif.indexOf('(')))).toBe(false);

    // Le cas qui la faisait mentir : une parenthèse imbriquée AVANT l'easing.
    const sain = 'Animated.timing(x, {\n  duration: dureeReduite(DUREE.court, r),\n  easing: Easing.out(Easing.quad),\n})';
    expect(/easing:/.test(appelComplet(sain, sain.indexOf('(')))).toBe(true);
  });
});

describe('Mouvement — les ressorts passent par le modèle d’Apple', () => {
  it('aucun bounciness / speed / tension / friction', () => {
    // Ces quatre-là sont l'habillage hérité de RN. Ils n'ont aucune
    // correspondance directe avec l'amortissement et la réponse, et c'est ce qui
    // a produit les cinq `bounciness: 2` recopiés d'un fichier à l'autre sans
    // que personne ne puisse dire quel dépassement ils valaient réellement.
    const fautifs: string[] = [];
    for (const f of FICHIERS) {
      for (const m of f.code.matchAll(/\b(bounciness|speed|tension|friction):\s*[\d.]+/g)) {
        const ligne = f.code.slice(0, m.index).split('\n').length;
        fautifs.push(`${f.chemin}:${ligne} → ${m[1]}`);
      }
    }
    expect(fautifs, 'passer par RESSORT + ressortRN (amortissement + réponse)').toEqual([]);
  });

  it('les ressorts déclarés sont physiquement sensés', () => {
    for (const [nom, r] of Object.entries(RESSORT)) {
      expect(r.amortissement, `${nom} : un amortissement ≤ 0 n’oscille jamais`).toBeGreaterThan(0);
      expect(r.amortissement, `${nom} : au-delà de 1 le ressort rampe`).toBeLessThanOrEqual(1);
      expect(r.reponse, `${nom} : une réponse nulle est un saut`).toBeGreaterThan(0);
      expect(r.reponse, `${nom} : au-delà d’une seconde ce n’est plus un retour`).toBeLessThanOrEqual(1);
    }
  });

  it('la conversion vers React Native est exacte', () => {
    // À masse 1 : k = ω0², c = 2ζω0, avec ω0 = 2π/T.
    const r = ressortRN({ amortissement: 1, reponse: 0.4 });
    const w0 = (2 * Math.PI) / 0.4;
    expect(r.mass).toBe(1);
    expect(r.stiffness).toBeCloseTo(w0 * w0, 1);
    expect(r.damping).toBeCloseTo(2 * w0, 1);
    // Critique : à ζ = 1, l'amortissement vaut exactement 2√k — le point où le
    // ressort cesse de dépasser. C'est ce qui rend `pose` non rebondissant.
    expect(r.damping).toBeCloseTo(2 * Math.sqrt(r.stiffness), 1);
  });
});

describe('Mouvement — les décisions du geste', () => {
  it('🔴 la vitesse d’un PanResponder est convertie en secondes', () => {
    // Un facteur mille. `vy` est en px/milliseconde, un ressort intègre en
    // secondes : sans cette conversion, la vitesse héritée est mille fois trop
    // faible — donc un correctif qui a l'air de n'avoir rien fait.
    expect(vitesseDepuisPan(0.4)).toBe(400);
    expect(vitesseDepuisPan(-1.2)).toBeCloseTo(-1200);
  });

  it('un geste vif porte plus loin qu’un geste mou', () => {
    // La propriété qui manquait entièrement : la vitesse était lue puis JETÉE.
    expect(projection(1000)).toBeGreaterThan(projection(100));
    expect(projection(0)).toBe(0);
    // Le signe se conserve : un geste vers le haut projette vers le haut.
    expect(projection(-800)).toBeLessThan(0);
  });

  it('la feuille se décide sur la PROJECTION, pas sur la position', () => {
    const H = 600;
    // Effleurée près du haut, sans élan : elle revient.
    expect(decisionFeuille(40, 0, H)).toBe('revenir');
    // MÊME position, mais balancée : elle part. C'est tout l'objet du chantier —
    // avant, ces deux gestes étaient indiscernables une fois le seuil franchi.
    expect(decisionFeuille(40, 1500, H)).toBe('fermer');
    // Tirée loin puis relâchée en remontant : elle revient, malgré la position.
    expect(decisionFeuille(400, -2000, H)).toBe('revenir');
  });

  it('le bord résiste de plus en plus, sans jamais rendre la main', () => {
    const D = 800;
    const petit = caoutchouc(50, D);
    const grand = caoutchouc(400, D);
    // Il suit toujours un peu…
    expect(petit).toBeGreaterThan(0);
    // …mais toujours MOINS que le doigt : c'est ce qui se sent comme une limite.
    expect(petit).toBeLessThan(50);
    expect(grand).toBeLessThan(400);
    // Et la résistance s'accentue : le rapport suivi/geste diminue.
    expect(grand / 400).toBeLessThan(petit / 50);
    // Un dépassement nul ne bouge rien (pas de division par zéro déguisée).
    expect(caoutchouc(0, D)).toBe(0);
  });
});

describe('Mouvement — « Réduire les animations » réduit sans supprimer', () => {
  it('les durées sont raccourcies, jamais annulées', () => {
    // Réduire n'est pas supprimer : retirer tout retour laisserait la personne
    // sans le moindre signe que son geste a été pris, ce qui est un second
    // défaut et pas un correctif.
    expect(dureeReduite(DUREE.fete, true)).toBeLessThan(DUREE.fete);
    expect(dureeReduite(DUREE.fete, true)).toBeGreaterThan(0);
    expect(dureeReduite(DUREE.moyen, false)).toBe(DUREE.moyen);
    // Une durée déjà courte ne s'allonge pas en passant par la réduction.
    expect(dureeReduite(100, true)).toBe(100);
  });

  it('le DÉPASSEMENT disparaît, le mouvement reste', () => {
    const r = ressortReduit(RESSORT.fete, true);
    expect(r.amortissement).toBe(1);            // plus aucun rebond
    expect(r.reponse).toBeGreaterThan(0);       // mais ce n'est pas un saut
    expect(ressortReduit(RESSORT.fete, false)).toEqual(RESSORT.fete);
  });

  it('l’échelle d’appui reste perceptible sans être spectaculaire', () => {
    expect(ECHELLE_APPUI).toBeLessThan(1);
    expect(ECHELLE_APPUI).toBeGreaterThanOrEqual(0.95);
  });
});
