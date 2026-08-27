import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { peutProuverParMotDePasse, preuveExigee, messageEchecReauth } from '../suppressionCompte';

// ── Ce que ce fichier tient fermé ───────────────────────────────────────────
//
// 🔴 UN TÉLÉPHONE DÉVERROUILLÉ SUFFISAIT À SUPPRIMER LE COMPTE (constat 01-06).
// `doDelete` demandait une confirmation — donc une INTENTION — jamais une IDENTITÉ.
// La session était le seul facteur, et la suppression est irréversible : la cascade
// Supabase ne se rejoue pas, et `AsyncStorage.clear()` non plus.
//
// ⚠️ **LA RÈGLE N'EST PAS « TOUJOURS DEMANDER LE MOT DE PASSE »**, et c'est tout
// l'intérêt de la sortir dans `lib/`. L'accès de revue et les sessions invité passent
// par `signInAnonymously()` : aucun e-mail, aucun mot de passe. Leur en demander un
// leur fermerait le **droit à l'effacement** — l'inverse exact du but poursuivi.
//
// ⚠️ **ET LA PREUVE NE PEUT PORTER QUE SUR SOI.** `reauthenticate(password)` ne prend
// AUCUNE adresse : elle lit celle de la session. Laisser passer un e-mail ferait de cet
// écran un formulaire de connexion déguisé, où l'on testerait le mot de passe de
// n'importe qui — un défaut bien pire que celui qu'on corrige.

const src = (...p: string[]) => readFileSync(join(__dirname, '..', '..', ...p), 'utf8');
const sansCommentaires = (t: string) =>
  t.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

describe('qui doit prouver son identité, et qui ne le peut pas', () => {
  it('🔴 un compte à e-mail doit re-saisir son mot de passe', () => {
    expect(peutProuverParMotDePasse('kevin@example.com')).toBe(true);
    expect(preuveExigee('kevin@example.com')).toBe('mot_de_passe');
  });

  it('🔴 une session INVITÉ (accès de revue) ne le peut pas — et garde son droit', () => {
    // `signInAnonymously()` ne pose ni e-mail ni mot de passe. Exiger une preuve
    // impossible reviendrait à supprimer le droit à l'effacement de ces comptes.
    for (const sansEmail of [undefined, null, '', '   ']) {
      expect(peutProuverParMotDePasse(sansEmail), JSON.stringify(sansEmail)).toBe(false);
      expect(preuveExigee(sansEmail)).toBe('confirmation_seule');
    }
  });

  it('le message d’échec ne dit JAMAIS si l’adresse existe', () => {
    // Sinon cet écran devient un oracle d'existence de compte. Le message est le même
    // quelle que soit la cause côté identifiants.
    const m = messageEchecReauth('Invalid login credentials', true);
    expect(m).toBe('Mot de passe incorrect.');
    expect(m).not.toMatch(/compte|adresse|e-?mail|existe/i);
  });

  it('🔴 un échec RÉSEAU est distingué — ne pas accuser l’utilisateur d’une panne', () => {
    expect(messageEchecReauth(undefined, false)).toMatch(/connexion/i);
    expect(messageEchecReauth('Network request failed', true)).toMatch(/connexion/i);
    expect(messageEchecReauth('Network request failed', true)).not.toMatch(/incorrect/i);
  });
});

// ── LE CÂBLAGE — ce qu'aucun test de `lib/` ne peut exécuter ────────────────
//
// L'écran vit dans `app/`, que la suite ne couvre pas (ni testing-library, ni runtime
// React). On lit donc la SOURCE, comme le dépôt le fait déjà pour les propriétés qu'un
// runtime de test n'atteint pas. Ça garantit que le câblage DIT la bonne chose, jamais
// qu'il tourne — le geste réel se vérifie au simulateur.
describe('le câblage de l’écran', () => {
  const profil = src('app', '(tabs)', 'profil.tsx');
  const auth = src('hooks', 'useAuth.tsx');
  const code = sansCommentaires(profil);

  it('les sondes lisent bien les deux sources', () => {
    expect(profil).toContain('const doDelete');
    expect(auth).toContain('AuthValue');
  });

  // ── 01-05 · la suppression n'annule pas l'abonnement, et la feuille le DIT ──
  //
  // 🔴 Le constat était classé « sans effet tant que `PAYWALL_LAUNCH` est `null` ». La
  // date a été posée le 2026-08-27 : la condition est tombée, le défaut est devenu réel.
  // Quelqu'un supprime son compte en croyant arrêter le prélèvement, et continue d'être
  // débité par un service auquel il n'a plus accès.
  //
  // ⚠️ CE TEST NE JUGE PAS QUE LA PHRASE EST BONNE — aucun test ne le peut. Il tient les
  // deux propriétés qui se perdraient en la « nettoyant » : elle EXISTE, et son store
  // n'est pas écrit en dur.
  it('🔴 la feuille dit qu’un abonnement N’EST PAS annulé par la suppression', () => {
    expect(
      code,
      'la phrase du constat 01-05 a disparu de la feuille de suppression : sans elle, '
      + 'quelqu’un supprime son compte en croyant arrêter le prélèvement.',
    ).toContain('n’est pas annulé par cette suppression');
  });

  it('🔴 le nom du store se LIT sur la plateforme, il n’est pas écrit en dur', () => {
    // Un texte iOS servi sur Android enverrait chercher un réglage qui n'existe pas.
    // On exige les deux noms ET le branchement : citer « App Store » seul passerait
    // le test précédent en étant faux pour la moitié du parc.
    const bloc = code.slice(code.indexOf('n’est pas annulé par cette suppression') - 400,
      code.indexOf('n’est pas annulé par cette suppression') + 200);
    expect(bloc, 'le store doit venir de Platform.OS').toContain("Platform.OS === 'android'");
    expect(bloc).toContain('Google Play');
    expect(bloc).toContain('App Store');
  });

  it('🔴 `reauthenticate` ne prend aucune adresse — la preuve porte sur SOI', () => {
    // La signature EST la garantie : sans paramètre d'e-mail, aucun appelant ne peut
    // faire tester le mot de passe d'un tiers, même par erreur.
    expect(sansCommentaires(auth)).toMatch(/reauthenticate:\s*\(password: string\)\s*=>/);
    expect(sansCommentaires(auth), 'l’adresse doit venir de la SESSION')
      .toMatch(/const email = session\?\.user\?\.email;/);
  });

  it('🔴 l’échec de la preuve ARRÊTE tout — rien n’est supprimé', () => {
    // Le point qui compte : un `return` avant le premier effacement. Si la
    // ré-authentification échouait sans interrompre, on aurait ajouté un champ de
    // saisie décoratif — pire que rien, parce qu'il rassure.
    const i = code.indexOf('const doDelete');
    const corps = code.slice(i, code.indexOf('};', i));
    const reauth = corps.indexOf('reauthenticate(motDePasse)');
    const suppression = corps.indexOf('deleteAccount()');
    expect(reauth, 'la ré-authentification a disparu de `doDelete`').toBeGreaterThan(-1);
    expect(reauth, 'elle doit précéder la suppression').toBeLessThan(suppression);
    // Et entre les deux, un `return` — sinon l'échec traverse.
    expect(corps.slice(reauth, suppression), 'un échec doit interrompre `doDelete`')
      .toMatch(/if \(r\.error\)[\s\S]*return;/);
  });

  it('🔴 le message d’erreur reste EN LIGNE — un dialogue serait MORT sur iOS', () => {
    // Deuxième `Modal` demandée pendant qu'une feuille est présentée : iOS n'en
    // présente AUCUNE, sans erreur ni trace (CLAUDE.md §11). Un `notify` ici ferait
    // un bouton qui ne répond pas — le défaut qui a déjà tué sept gestes.
    expect(code).toContain('MessageEnLigne');
    const i = code.indexOf('Supprimer mon compte ?');
    const feuille = code.slice(i, i + 2500);
    expect(feuille, 'un dialogue a été rebranché dans la feuille de suppression')
      .not.toMatch(/\bnotify\(|\bconfirm\(/);
  });

  it('le bouton reste inerte tant que le champ est vide — et seulement alors', () => {
    expect(code).toMatch(/disabled=\{deleting \|\| \(preuve === 'mot_de_passe' && !motDePasse\)\}/);
  });
});
