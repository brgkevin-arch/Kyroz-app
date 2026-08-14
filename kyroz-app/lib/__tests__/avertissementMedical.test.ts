// ── VERROU : le renvoi médical reste SUR LE PARCOURS ────────────────────────
//
// POURQUOI CE FICHIER EXISTE
//
// Jusqu'au 2026-08-12, deux phrases obligatoires vivaient sur un écran à elles —
// « Avant de commencer », un titre, un encadré, un bouton « J'ai compris ». Cet
// écran a été supprimé (décision fondateur) : depuis le 2026-08-11 il ne posait plus
// aucune question et ne bloquait plus personne, donc il coûtait un tap pour du texte.
//
// 🔴 SUPPRIMER LE PORTEUR N'EST PAS SUPPRIMER LA CHARGE. Ce qu'il portait est exigé :
//   · AVERTISSEMENT_MEDICAL — le renvoi vers un professionnel de santé (Apple 1.4.1,
//     Google) ;
//   · DISCLAIMER — CLAUDE.md §6, « onboarding, paramètres, chaque plan ».
// Les deux sont désormais servies sous le bouton de la PREMIÈRE étape de
// l'onboarding. Rien d'autre dans le dépôt ne dit qu'elles doivent y rester : sans ce
// fichier, un nettoyage d'écran les emporterait sans qu'aucun test ne rougisse, et
// personne ne s'en apercevrait avant une revue de store.
//
// ⚠️ CE QU'IL NE SAIT PAS FAIRE : juger que la phrase est LISIBLE. Elle pourrait être
// rendue en transparent ou repoussée hors de l'écran, et ce test resterait vert. Il
// ferme le chemin par lequel la disparition arrive vraiment — un bloc retiré en même
// temps que le reste d'un écran.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AVERTISSEMENT_MEDICAL, DISCLAIMER } from '../../constants/legal';

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');

// Retire blocs `/* */` et lignes `//` : sans ça, une NOTE qui cite un identifiant se
// porte garante de son emploi réel. Même remède qu'`harnaisEcrans.test.ts`.
const sansCommentairesJS = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ONBOARDING = 'app/(auth)/onboarding.tsx';

describe('avertissement médical — il vit sur le parcours, pas dans une page légale', () => {
  it('les deux textes ont une source UNIQUE dans constants/legal.ts', () => {
    // Une copie collée dans un écran est une seconde vérité qui dérive (CLAUDE.md §10).
    expect(AVERTISSEMENT_MEDICAL).toMatch(/médecin/i);
    expect(DISCLAIMER).toMatch(/adultes en bonne santé/i);
  });

  it("l'onboarding rend les deux, depuis la constante", () => {
    const src = sansCommentairesJS(lire(ONBOARDING));
    expect(src).toContain('{AVERTISSEMENT_MEDICAL}');
    expect(src).toContain('{DISCLAIMER}');
  });

  it('ils sont servis à la PREMIÈRE étape, celle que tout le monde traverse', () => {
    // Une étape plus loin, c'est un texte que celui qui abandonne n'a jamais vu ; et
    // sur les sept, c'est du décor. Le rendu est donc gardé par `step === 1`.
    const src = sansCommentairesJS(lire(ONBOARDING));
    const bloc = src.slice(src.indexOf('{AVERTISSEMENT_MEDICAL}') - 400, src.indexOf('{DISCLAIMER}'));
    expect(bloc).toContain('step === 1');
  });

  it("l'écran-portail supprimé n'est pas revenu", () => {
    // 🔴 Ne pas « rétablir le garde-fou » en remettant un écran ou des cases : ce qui
    // protège, ce sont les blocages qui MESURENT (âge, IMC, volume, planchers), pas
    // une déclaration cochée. Cf. CLAUDE.md §6 et AGENTS.md E39.
    let existe = true;
    try { lire('components/HealthScreening.tsx'); } catch { existe = false; }
    expect(existe).toBe(false);
  });
});
