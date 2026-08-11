import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { VERRE, doitServirDuVerre, styleBarre } from '../materiau';

// ── Le matériau a un rôle, un token et un test ───────────────────────────────
//
// Sixième de la famille, après forme, texte, blanc, finitions et mouvement, et
// né du même constat : rien n'obligeait une surface à dire de quoi elle est
// faite. Kyroz ne connaissait qu'un matériau — la peinture opaque.
//
// Ce fichier garde TROIS promesses, et deux d'entre elles ne se voient sur
// aucune capture d'écran :
//
//   1. On ne sert du verre que quand les trois conditions sont réunies — dont
//      une qui, sautée, FAIT CRASHER l'app sur un vieux binaire.
//   2. Le repli est l'apparence d'AVANT, au pixel près. C'est ce qui autorise
//      l'OTA : un iPhone sur iOS 18 ou un Android ne doit rien voir changer.
//   3. Une barre en verre FLOTTE, donc chaque écran d'onglet doit dégager son
//      bas — sans quoi sa dernière ligne finit cachée dessous, tout en bas d'un
//      défilement, là où personne ne regarde jamais.

const RACINE = join(__dirname, '..', '..');

/**
 * 🔴 LES COMMENTAIRES SONT ÉCARTÉS AVANT TOUTE RECHERCHE DE CHAÎNE, et ce
 * fichier en est l'illustration la plus nette : les notes de `Materiau.tsx` et
 * de `CollapsingTitle.tsx` CITENT `GlassView`, `expo-glass-effect` et
 * `Fond.barreOnglets` — précisément les chaînes cherchées ici. Sans ce nettoyage,
 * un test qui interdit un import passerait au vert sur la ligne qui explique
 * pourquoi on l'interdit, et un test qui exige un dégagement passerait au vert
 * sur le commentaire qui en parle. On croirait mesurer le code ; on mesurerait
 * sa description.
 */
function sansCommentaires(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

describe('Matériau — le verre a trois conditions, et le repli est l’app d’avant', () => {
  it('les trois conditions sont chacune bloquantes, aucune n’est décorative', () => {
    const tout = { apiVerre: true, liquidGlass: true, transparenceReduite: false };
    expect(doitServirDuVerre(tout)).toBe(true);

    // Chaque condition retirée à son tour doit suffire à couper le verre. Sans
    // cette boucle, une condition pourrait être écrite et jamais consultée —
    // un garde-fou en paramètre optionnel que l'appelant oublie.
    expect(doitServirDuVerre({ ...tout, apiVerre: false })).toBe(false);
    expect(doitServirDuVerre({ ...tout, liquidGlass: false })).toBe(false);
    expect(doitServirDuVerre({ ...tout, transparenceReduite: true })).toBe(false);
  });

  it('« Réduire la transparence » gagne toujours, même quand tout le reste est prêt', () => {
    // Apple teste ce réglage en revue. Il ne se négocie pas contre la
    // disponibilité du matériau : c'est une demande de l'utilisateur.
    expect(doitServirDuVerre({ apiVerre: true, liquidGlass: true, transparenceReduite: true }))
      .toBe(false);
  });

  it('le repli rend EXACTEMENT la barre d’avant — fond, couleur de trait, épaisseur', () => {
    const peint = styleBarre(false, '#111111', '#333333', 1);
    expect(peint).toEqual({ backgroundColor: '#111111', borderTopColor: '#333333', borderTopWidth: 1 });
    // Et surtout : il ne sort PAS du flux. Une barre peinte occupe sa place.
    expect('position' in peint).toBe(false);
  });

  it('la barre en verre sort du flux et n’a plus ni peinture ni filet', () => {
    const v = styleBarre(true, '#111111', '#333333', 1) as Record<string, unknown>;
    expect(v.position).toBe('absolute');
    expect(v.backgroundColor).toBe('transparent');
    expect(v.borderTopWidth).toBe(0);
  });

  it('un seul style de verre, et il porte un nom', () => {
    // Règle héritée de l'échelle d'espacement : deux crans de même valeur, c'est
    // un cran sans rôle. `clear` est écarté tant qu'aucune surface de Kyroz ne
    // se pose sur une photo — le jour où l'une le fera, elle apportera son nom.
    const vals = Object.values(VERRE);
    expect(new Set(vals).size).toBe(vals.length);
    expect(vals).toEqual(['regular']);
  });

  it('🔴 les 5 écrans d’onglets dégagent leur bas — sinon leur dernière ligne passe sous la barre', () => {
    const dossier = join(RACINE, 'app', '(tabs)');
    const ecrans = readdirSync(dossier).filter((f) => f.endsWith('.tsx') && f !== '_layout.tsx');

    // ⚠️ Le compte est vérifié AVANT le contenu. Un test qui parcourt un dossier
    // vide passe au vert sans rien mesurer — c'est exactement ainsi que le garde
    // des 44 pt est devenu aveugle le 2026-08-10 en restant vert.
    expect(ecrans.length, `écrans trouvés : ${ecrans.join(', ')}`).toBe(5);

    const sansDegagement = ecrans.filter(
      (f) => !sansCommentaires(readFileSync(join(dossier, f), 'utf8')).includes('Fond.barreOnglets')
    );
    expect(sansDegagement, `sans dégagement de bas : ${sansDegagement.join(', ')}`).toEqual([]);
  });

  it('🔴 personne ne touche `expo-glass-effect` en direct — tout passe par `Materiau`', () => {
    // L'appel nu à `GlassView` CRASHE sur un binaire où le module n'est pas
    // compilé (expo/expo#40911), et une OTA peut atterrir sur un tel binaire.
    // La vérification anti-crash vit dans un SEUL fichier ; l'y contourner la
    // rend inutile partout ailleurs.
    const fautifs: string[] = [];
    const parcourir = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        // Les tests ne sont pas des surfaces de l'app : celui-ci CITE la chaîne
        // qu'il interdit, et il s'est accusé lui-même au premier lancement.
        // C'est le bon signe — la sonde regarde vraiment le code.
        if (e.isDirectory()) { if (e.name !== '__tests__') parcourir(p); }
        else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) {
          const rel = p.slice(RACINE.length + 1);
          if (rel === join('components', 'Materiau.tsx')) continue;
          if (sansCommentaires(readFileSync(p, 'utf8')).includes('expo-glass-effect')) fautifs.push(rel);
        }
      }
    };
    for (const d of ['app', 'components', 'lib', 'hooks', 'constants']) parcourir(join(RACINE, d));
    expect(fautifs, fautifs.join('\n')).toEqual([]);
  });

  it('la sonde sait dire OUI — sinon elle prouverait n’importe quoi', () => {
    // ⚠️ Un test de chaîne qui ne trouve jamais rien ressemble trait pour trait à
    // un test que tout satisfait. On vérifie donc que `sansCommentaires` laisse
    // passer le code réel et mange bien la description.
    const code = 'import { GlassView } from "expo-glass-effect";';
    expect(sansCommentaires(`// import from expo-glass-effect\n${code}`)).toContain('expo-glass-effect');
    expect(sansCommentaires('// on parle de expo-glass-effect ici')).not.toContain('expo-glass-effect');
    expect(sansCommentaires('/* bloc citant Fond.barreOnglets */')).not.toContain('Fond.barreOnglets');
    expect(sansCommentaires('{/* JSX citant expo-glass-effect */}')).not.toContain('expo-glass-effect');
  });
});
