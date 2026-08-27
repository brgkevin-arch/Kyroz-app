import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { relireSyncEnAttente, syncEnAttente, _reinitialiserSyncEnAttente } from '../syncEnAttente';
import { PROFILE_PENDING_KEY } from '../syncGuard';

// ⚠️ CE FICHIER N'IMPORTE PAS `lib/sync.ts`, ET C'EST OBLIGATOIRE : il tire
// `lib/supabase.ts`, donc `react-native-url-polyfill`, qui EXPLOSE sous vitest
// (`Cannot read properties of undefined (reading 'BlobModule')`). Le piège est déjà
// consigné en CLAUDE.md §11. On sépare donc les deux moitiés : le COMPORTEMENT du store
// se teste ici en écrivant le drapeau directement, et le CÂBLAGE sur `markProfileDirty`
// se lit dans la source — comme pour l'Edge Function de suppression.

// ── Ce que ce fichier tient fermé ───────────────────────────────────────────
//
// 🔴 L'APP NE SAVAIT PAS DIRE QUE DES MODIFICATIONS ATTENDAIENT (constat 05-05).
// Aucun `NetInfo`, aucun `isConnected`, aucun texte d'interface ne contenait « hors
// ligne ». L'architecture est offline-first et le fait BIEN — rien n'est perdu, tout
// est marqué « à pousser » et repart plus tard — mais personne ne le savait.
//
// ⚠️ **ET ON N'A PAS AJOUTÉ DE BANNIÈRE « HORS LIGNE », À DESSEIN.** Elle énoncerait un
// état RÉSEAU dont l'app ne fait rien, et inquiéterait pour une situation où tout
// fonctionne — ce que la règle produit interdit nommément (« tout suivi affiché doit
// rassurer, jamais mettre la pression »). L'indicateur énonce un FAIT vérifiable, dit
// que ça partira tout seul, et disparaît de lui-même.
//
// ⚠️ **LA DIFFUSION EST BRANCHÉE SUR LES DEUX SEULES ÉCRITURES DU DRAPEAU**, pas chez
// les appelants : `markProfileDirty` / `clearProfileDirty`. C'est ce qui garantit que
// l'indicateur suive l'état réel quel que soit l'écran d'où part l'écriture — et que le
// push de FOND, qui n'a aucun écran, le fasse disparaître. Le laisser à l'appelant
// serait un garde-fou qu'on doit penser à invoquer : le défaut « un réglage lu par un
// autre écran ne se relit pas au focus, il se DIFFUSE », déjà payé quatre fois ici.

describe('l’indicateur suit le drapeau, dans les deux sens', () => {
  beforeEach(async () => {
    _reinitialiserSyncEnAttente();
    await AsyncStorage.clear();
  });

  it('le témoin : au départ, rien n’attend', async () => {
    await relireSyncEnAttente();
    expect(syncEnAttente()).toBe(false);
  });

  it('🔴 un drapeau posé le lève', async () => {
    await AsyncStorage.setItem(PROFILE_PENDING_KEY, '1');
    await relireSyncEnAttente();
    expect(syncEnAttente()).toBe(true);
  });

  it('🔴 un drapeau retiré le baisse — sans qu’aucun écran n’ait à le savoir', async () => {
    await AsyncStorage.setItem(PROFILE_PENDING_KEY, '1');
    await relireSyncEnAttente();
    await AsyncStorage.removeItem(PROFILE_PENDING_KEY);
    await relireSyncEnAttente();
    expect(syncEnAttente()).toBe(false);
  });

  it('🔴 il se relit du STOCKAGE au démarrage — sinon il repart sur son défaut', async () => {
    // Le cas exact : une écriture faite hors ligne, l'app tuée, relancée. Sans relecture
    // au démarrage, l'indicateur vaudrait « rien à synchroniser » — donc il mentirait,
    // dans le sens rassurant, précisément au lancement où il sert.
    await AsyncStorage.setItem(PROFILE_PENDING_KEY, '1');
    expect(syncEnAttente(), 'le store ne doit rien savoir avant de lire').toBe(false);
    await relireSyncEnAttente();
    expect(syncEnAttente()).toBe(true);
  });

  it('🔴 un stockage ILLISIBLE ne vaut pas « tout est synchronisé »', async () => {
    // La panne qui ment dans le sens rassurant : si la lecture échoue, retomber sur
    // `false` annoncerait que tout est parti alors qu'on n'en sait rien. On ne touche à
    // rien plutôt que de donner une bonne nouvelle qu'on n'a pas mesurée.
    await AsyncStorage.setItem(PROFILE_PENDING_KEY, '1');
    await relireSyncEnAttente();
    expect(syncEnAttente()).toBe(true);
    const vrai = AsyncStorage.getItem;
    (AsyncStorage as { getItem: unknown }).getItem = () => Promise.reject(new Error('stockage KO'));
    try {
      await relireSyncEnAttente();
      expect(syncEnAttente(), 'une lecture ratée a effacé l’attente').toBe(true);
    } finally {
      (AsyncStorage as { getItem: unknown }).getItem = vrai;
    }
  });
});

// ── LE CÂBLAGE — ce que `lib/` ne peut pas exécuter ─────────────────────────
const src = (...p: string[]) => readFileSync(join(__dirname, '..', '..', ...p), 'utf8');
const sansCommentaires = (t: string) =>
  t.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

describe('le câblage', () => {
  it('🔴 la relecture est chargée AU DÉMARRAGE, dans le layout racine', () => {
    // Patron obligatoire des valeurs d'appareil. Une valeur oubliée dans ce chargement
    // repart sur son défaut à chaque lancement, et ça ne se voit nulle part.
    const layout = sansCommentaires(src('app', '_layout.tsx'));
    expect(layout).toContain('relireSyncEnAttente()');
  });

  it('🔴 la diffusion vit sur les DEUX écritures du drapeau, pas chez l’appelant', () => {
    const sync = sansCommentaires(src('lib', 'sync.ts'));
    const bloc = sync.slice(sync.indexOf('export async function markProfileDirty'));
    const corps = bloc.slice(0, bloc.indexOf('async function isProfileDirty'));
    expect((corps.match(/relireSyncEnAttente\(\)/g) ?? []).length,
      'les deux écritures du drapeau doivent diffuser').toBe(2);
  });

  it('🔴 la ligne n’apparaît QUE s’il y a quelque chose en attente', () => {
    // Une ligne permanente qui dirait « synchronisé » deviendrait du décor, et son
    // absence cesserait d'être un signal.
    const reglages = sansCommentaires(src('components', 'ReglagesSheet.tsx'));
    expect(reglages).toMatch(/\{syncEnAttente && \(/);
    expect(reglages).toContain('À synchroniser');
  });

  it('🔴 AUCUNE bannière « hors ligne » n’a été ajoutée', () => {
    // Le constat dit que le comportement est déjà juste : c'est l'information qui
    // manquait. Une bannière d'état réseau serait la mauvaise réponse à la bonne
    // question, et ce test empêche une future session de « compléter » 05-05 ainsi.
    for (const f of [['components', 'ReglagesSheet.tsx'], ['app', '(tabs)', 'profil.tsx'], ['app', '(tabs)', 'plan.tsx']]) {
      expect(sansCommentaires(src(...f)), `${f.join('/')} annonce un état réseau`)
        .not.toMatch(/hors ligne|connexion perdue|pas de r[ée]seau/i);
    }
  });
});
