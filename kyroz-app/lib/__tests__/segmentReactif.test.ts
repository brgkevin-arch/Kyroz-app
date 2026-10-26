import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Retour fondateur du 2026-10-26 : « frais/sec et catalogue/réalisable ne sont pas
// du tout fluides, ça met du temps une fois qu'on appuie ». Mesuré au simulateur
// (vidéo à 60 images/s) sur Catalogue → Réalisable : 430 ms d'arrêt entre l'appui et
// le premier mouvement, puis un glissement à ~30 images/s et un fondu de 200 ms sur
// la liste. Après : le curseur part 33 ms après l'appui, la liste bascule dans la
// même image. Trois causes, trois verrous — lus dans le SOURCE, faute de pouvoir
// rendre un écran sous vitest.

const lire = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const ui = sansCommentaires(lire('components/ui.tsx'));
const segmented = ui.slice(ui.indexOf('export function Segmented'), ui.indexOf('export function', ui.indexOf('export function Segmented') + 10));
const recettes = sansCommentaires(lire('app/(tabs)/recettes.tsx'));
const reserve = sansCommentaires(lire('app/(tabs)/reserve.tsx'));

describe('Segmented — le curseur répond tout de suite', () => {
  it('le ressort tourne sur le fil NATIF (il avance pendant que le JS rend la liste)', () => {
    expect(segmented).toContain('useNativeDriver: true');
    expect(segmented).not.toContain('useNativeDriver: false');
  });

  it("aucune COULEUR animée — elle forcerait le fil JavaScript", () => {
    expect(segmented).not.toMatch(/color:\s*position\.interpolate/);
  });

  it("l'appui lance le ressort AVANT de prévenir l'écran, à l'image suivante", () => {
    const choisir = segmented.slice(segmented.indexOf('const choisir'), segmented.indexOf('};', segmented.indexOf('const choisir')));
    expect(choisir).toMatch(/lancer\(i\)[\s\S]*requestAnimationFrame\(\(\) => onChange\(v\)\)/);
    // Le bouton passe par `choisir`, jamais directement par `onChange`.
    expect(segmented).toContain('onPress={() => choisir(o.value, i)}');
  });
});

describe('Recettes et Réserve — la vue bascule sans attente', () => {
  it('pas de fondu de mise en page sur un changement de vue', () => {
    expect(recettes).toContain('onChange={setVueListe}');
    expect(reserve).toContain('onChange={(v) => setVue(v as Conservation)}');
  });

  it('la couverture « Réalisable » se prépare en fond, pas à l\'appui', () => {
    expect(recettes).toContain('InteractionManager.runAfterInteractions');
    expect(recettes).toMatch(/besoinCouverture = vueListe === 'reserve' \|\| couvertureEnFond/);
  });

  it('préparée en fond, elle ne replie pas les paliers du Catalogue', () => {
    expect(recettes).toContain('${surReserve ? parReserve.length : 0}');
  });
});
