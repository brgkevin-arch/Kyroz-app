import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRIVACY_POLICY } from '../../constants/legal';

// ── Ce que ce fichier tient fermé ───────────────────────────────────────────
//
// 🔴 « TOUTES TES DONNÉES SERONT SUPPRIMÉES » N'ÉTAIT PAS VRAI (constat 01-03).
//
// `hooks/usePremium.ts` appelle `identifyUser(uid)` **sans condition d'abonnement** dès
// que le hook est monté, et la clé RevenueCat est posée dans l'environnement `production`
// d'EAS.
// ⚠️ **« Dès qu'un compte existe » était la formulation d'origine, et elle est trop
// large — mesuré le 2026-08-27.** `usePremium` n'est monté que par TROIS surfaces (Profil,
// Kyroz+, la feuille de pesée) : l'abonné naît en visitant l'une d'elles, pas à
// l'inscription. Ça ne retire rien au constat — le Profil est justement l'écran d'où l'on
// supprime son compte, donc l'abonné existe forcément au moment qui compte — mais ça
// change ce qu'un TEST doit faire pour l'exercer, et une procédure écrite sur la
// formulation large enverrait finir l'onboarding pour rien.
// ⚠️ Et sur le WEB, `purchases.web.ts::identifyUser` rend `false` sans rien appeler :
// aucun abonné n'y est jamais créé. Un test de suppression fait depuis le site ne peut
// donc RIEN prouver — il obtiendrait un 404, c'est-à-dire l'un des états muets. Tout
// build de prod crée donc un abonné RevenueCat portant l'UUID Supabase — **y compris
// pour quelqu'un qui n'a jamais rien acheté**, et avant même la mise en vente. La
// suppression de compte appelait `logOut()`, qui réinitialise l'identité LOCALE et ne
// supprime rien à distance.
//
// ⚠️ **LE POINT LE PLUS FIN, ET C'EST LUI QUE CE FICHIER GARDE** : la politique §7 borne
// l'exception de conservation à « **si vous avez souscrit un abonnement** ». Cette
// rédaction est JUSTE — mais seulement si l'identifiant d'un NON-abonné, lui, disparaît.
// Sinon le texte décrit un monde plus propre que le code. Les deux moitiés ne se lisent
// jamais ensemble : l'une est dans `constants/legal.ts`, l'autre dans une fonction Deno
// que la suite n'exécute pas. C'est exactement le genre d'écart qui vit des mois.
//
// ⚠️ **CE QUE CE FICHIER NE PEUT PAS FAIRE** : appeler l'Edge Function. Elle tourne sous
// Deno chez Supabase, et **un push ne la déploie pas**. Il lit donc sa SOURCE — comme
// `identificationDifferee.test.ts` et `feuillesEmpilees.test.ts` le font pour des
// propriétés qu'aucun runtime de test n'atteint. Il garantit que le code dit la bonne
// chose, jamais qu'il tourne : le déploiement et le secret sont une étape humaine
// (`docs/PROCEDURE-2026-08-27-suppression-revenuecat.md`).
//
// ℹ️ **La moitié PostHog du constat est CLOSE PAR LES FAITS, pas par ce correctif.**
// `distinctId()` n'est appelé que depuis `capture()`, qui sort avant tout sur
// `STATISTIQUES_USAGE_ACTIVES` (false depuis le 2026-08-26) : plus aucun pseudonyme ne
// peut naître, et les données ont été supprimées à la source. Le constat décrivait un
// état qui avait déjà changé la veille.

const src = (p: string) => readFileSync(join(__dirname, '..', '..', ...p.split('/')), 'utf8');
const edge = src('supabase/functions/delete-account/index.ts');
const sync = src('lib/sync.ts');
const profil = src('app/(tabs)/profil.tsx');
/** La source, commentaires RETIRÉS — un `//` qui cite une chaîne n'est pas du code. */
const sansCommentaires = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

describe('suppression de compte — elle va jusque chez le sous-traitant', () => {
  it('les sondes lisent bien les trois sources', () => {
    expect(edge).toContain('Deno.serve');
    expect(sync).toContain('export async function deleteAccount');
    expect(profil).toContain('const doDelete');
  });

  it('🔴 l’Edge Function supprime l’abonné RevenueCat', () => {
    const code = sansCommentaires(edge);
    expect(code, 'la suppression chez RevenueCat a disparu de la fonction')
      .toContain('api.revenuecat.com/v1/subscribers/');
    expect(code, 'la requête doit être un DELETE').toMatch(/method:\s*'DELETE'/);
  });

  it('🔴 elle le fait AVANT la cascade — après, l’UUID n’a plus de porteur', () => {
    // L'ordre n'est pas une préférence de lecture : `deleteUser` fait disparaître le
    // compte, donc l'UUID. Appelé après, on ne saurait plus quoi supprimer, et il n'y
    // aurait aucune deuxième chance — personne ne peut retrouver un identifiant dont
    // le porteur n'existe plus.
    const code = sansCommentaires(edge);
    const rc = code.indexOf('supprimerAbonneRevenueCat(user.id)');
    const cascade = code.indexOf('deleteUser(user.id)');
    expect(rc, 'appel RevenueCat introuvable').toBeGreaterThan(-1);
    expect(cascade, 'suppression Supabase introuvable').toBeGreaterThan(-1);
    expect(rc, 'RevenueCat doit être appelé AVANT `deleteUser`').toBeLessThan(cascade);
  });

  it('🔴 elle n’est JAMAIS bloquante — bornée dans le temps, et sans secret elle le DIT', () => {
    const code = sansCommentaires(edge);
    // Un droit à l'effacement ne peut pas dépendre de la disponibilité d'un tiers.
    expect(code, 'l’appel doit être borné : un tiers muet ne retarde pas un effacement')
      .toContain('AbortSignal.timeout(');
    // ⚠️ `non_configure` plutôt qu'un repli muet : sans secret, rien n'est tenté, et le
    // faire croire fait serait le défaut qu'on corrige, déplacé d'un cran.
    //
    // 🔴 LA PREMIÈRE VERSION DE CETTE LIGNE A SURVÉCU À SA MUTATION. Elle disait
    // `expect(code).toContain("'non_configure'")` — or la chaîne vit AUSSI dans le
    // type `EtatRevenueCat`, donc remplacer le repli par `return 'supprime'` (faire
    // SEMBLANT d'avoir supprimé, le défaut exact qu'on corrige, déplacé d'un cran)
    // la laissait verte. Elle comptait une DÉCLARATION DE TYPE, pas un comportement.
    // C'est le même piège que `check:abonnements`, qui comptait `storeProductId: string;`.
    // ➡️ On lit la garde elle-même, AVANT le `fetch` : le chemin « pas de secret ».
    const corps = code.slice(code.indexOf('async function supprimerAbonneRevenueCat'));
    const garde = corps.slice(0, corps.indexOf('fetch('));
    // ⚠️ **CETTE ASSERTION A DÛ ÊTRE RÉÉCRITE le 2026-08-27, et le motif vaut d'être
    // gardé.** Elle mesurait une DISTANCE (`{0,40}` caractères entre `!cle` et son
    // `return`) pour dire « le repli est immédiat ». Ajouter le `console.error` qui
    // manquait — un correctif qui RENFORCE exactement ce qu'elle protège — l'a fait
    // rougir. Une borne de proximité n'exprimait pas la propriété voulue : elle
    // interdisait d'écrire du code dans le bloc, quel qu'il soit.
    // ➡️ La propriété est « dans le chemin sans secret, RIEN n'est tenté et l'état rendu
    // est `non_configure` ». On lit donc le bloc, et on vérifie ces deux choses.
    const blocSansCle = /if \(!cle\) \{[\s\S]*?\n  \}/.exec(garde)?.[0] ?? '';
    expect(blocSansCle, 'le chemin « pas de secret » est introuvable').not.toBe('');
    expect(
      blocSansCle,
      'sans secret, la fonction doit dire qu’elle n’a rien tenté — jamais faire croire '
      + 'la suppression faite',
    ).toContain("return 'non_configure';");
    expect(blocSansCle, 'ce chemin ne doit RIEN appeler à distance').not.toMatch(/fetch\(/);
    // 404 = aucun abonné ne porte cet UUID. Le confondre avec une panne ferait alerter
    // sur le fonctionnement normal.
    expect(code, '404 doit être distingué d’un échec').toContain('404');
  });

  it('🔴 le client LIT le verdict au lieu de l’avaler', () => {
    // Le seul instant où l'on peut savoir qu'un identifiant survit : après, l'UUID a
    // disparu avec le compte et rien ne permet de le retrouver.
    const code = sansCommentaires(sync);
    expect(code, 'la réponse de la fonction n’est plus lue').toContain('revenuecat');
    expect(code, 'un échec doit être journalisé').toMatch(/console\.warn/);
  });
});

describe('le JOURNAL est lisible — le silence ne veut dire qu’une chose', () => {
  // 🔴 CE BLOC EXISTE PARCE QUE LA VÉRIFICATION ÉTAIT IMPOSSIBLE (2026-08-27).
  // La fonction ne journalisait que ses ÉCHECS. Or elle a trois façons de ne rien
  // supprimer, et deux se taisaient : `non_configure` (le secret manque ou porte un autre
  // nom — arrivé le jour même) et `introuvable` (404, l'abonné n'a jamais existé — ce que
  // rend tout test fait depuis le web). Un journal muet avait donc TROIS sens, dont
  // « tout va bien » : c'est-à-dire qu'il ne mesurait rien.
  // ➡️ Depuis, chaque état qui ne supprime pas écrit. Le silence vaut `supprime`, et
  // seulement ça. Ce test compte ce contrat — sans lui, la ligne se retire au premier
  // nettoyage et la procédure redevient invérifiable, sans que rien ne rougisse.
  // ⚠️ Sur le CODE seul : les commentaires de cette fonction expliquent pourquoi elle
  // journalise, et un test qui les lirait se satisferait de l'explication.
  const corps = /async function supprimerAbonneRevenueCat[\s\S]*?\n}/
    .exec(sansCommentaires(edge))?.[0] ?? '';

  it('la sonde a bien trouvé la fonction', () => {
    expect(corps).not.toBe('');
    expect(corps).toContain('REVENUECAT_SECRET_KEY');
  });

  it('🔴 « pas de secret » se DIT — c’est la panne la plus probable de ce câblage', () => {
    const bloc = /if \(!cle\) \{[\s\S]*?return 'non_configure';/.exec(corps)?.[0] ?? '';
    expect(bloc, 'le repli `non_configure` est introuvable').not.toBe('');
    expect(bloc).toMatch(/console\.(error|warn)\(/);
  });

  it('🔴 « aucun abonné » se DIT aussi — sinon un test qui n’exerce rien passe pour vert', () => {
    const bloc = /if \(r\.status === 404\) \{[\s\S]*?return 'introuvable';/.exec(corps)?.[0] ?? '';
    expect(bloc, 'le cas 404 est introuvable, ou il ne passe plus par un bloc').not.toBe('');
    expect(bloc).toMatch(/console\.(error|warn)\(/);
  });

  it('🔴 les TROIS états qui ne suppriment pas parlent — et `supprime` se tait', () => {
    // Le comptage plutôt que trois assertions séparées : c'est lui qui rougit le jour où
    // quelqu'un ajoute un quatrième état muet.
    const muets = ['non_configure', 'introuvable', 'echec'].filter((etat) => {
      const i = corps.indexOf(`return '${etat}'`);
      if (i < 0) return true;               // l'état a disparu → à relire
      // On remonte jusqu'au `{` du bloc et on regarde s'il journalise.
      return !/console\.(error|warn)\(/.test(corps.slice(Math.max(0, i - 700), i));
    });
    expect(muets, 'ces états ne suppriment rien ET ne le disent pas').toEqual([]);
    // Et le succès, lui, reste SILENCIEUX : c'est ce qui rend « muet = réussi » vrai.
    // ⚠️ Par LIGNES et non par fenêtre de caractères : une fenêtre attrape le
    // `console.error` de la branche `!r.ok` qui la précède, et accuse un code sain.
    const lignes = corps.split('\n');
    const iOk = lignes.findIndex((l) => l.includes("return 'supprime'"));
    expect(iOk, "le retour `supprime` est introuvable").toBeGreaterThan(-1);
    expect(
      lignes.slice(Math.max(0, iOk - 2), iOk + 1).join('\n'),
      'le chemin de RÉUSSITE doit rester muet — sinon « muet = réussi » cesse d’être vrai',
    ).not.toMatch(/console\./);
  });
});

describe('ce qui est PROMIS à l’écran est ce qui sera fait', () => {
  it('🔴 le dialogue ne promet plus « toutes » les données côté serveur', () => {
    // ⚠️ La phrase avait DEUX défauts opposés, ce qui explique qu'aucune relecture ne
    // l'attrape : elle sur-promettait côté serveur (« toutes ») et SOUS-disait côté
    // appareil (ni les pesées ni les photos, les deux que l'on craint le plus de
    // laisser derrière soi — et que le code efface pourtant).
    const i = profil.indexOf('const doDelete');
    expect(i).toBeGreaterThan(-1);
    const dialogue = sansCommentaires(profil.slice(profil.indexOf('Supprimer mon compte ?')));
    expect(dialogue.slice(0, 600), 'la promesse absolue est revenue')
      .not.toMatch(/Toutes tes données/);
  });

  it('🔴 il nomme les pesées et les photos — le code les efface, le texte doit le dire', () => {
    const dialogue = sansCommentaires(profil.slice(profil.indexOf('Supprimer mon compte ?'))).slice(0, 600);
    for (const mot of ['pesées', 'photos']) {
      expect(dialogue, `« ${mot} » a disparu de la promesse`).toContain(mot);
    }
    // Et le code doit bien les effacer, sinon la phrase devient l'inverse du défaut.
    const code = sansCommentaires(profil);
    expect(code, 'les photos ne sont plus purgées').toContain('purgeAllProgressPhotos()');
    expect(code, 'le stockage local n’est plus vidé').toContain('AsyncStorage.clear()');
  });
});

describe('§7 de la politique — sa restriction n’est légitime QUE si le code la tient', () => {
  const par7 = PRIVACY_POLICY.find((s) => s.title.startsWith('7.'));

  it('la sonde trouve bien le paragraphe', () => {
    expect(par7, '§7 « Durée de conservation » introuvable').toBeTruthy();
  });

  it('🔴 l’exception reste bornée aux ABONNÉS, et la fonction la rend vraie', () => {
    // Le couplage que ce test existe pour tenir : §7 dit que seule une souscription
    // laisse une trace. Ça n'est vrai que parce que l'identifiant d'un NON-abonné est
    // supprimé. Retirer la suppression rend le texte faux — sans toucher au texte.
    const texte = (par7!.paragraphs ?? []).join(' ');
    expect(texte, 'l’exception n’est plus conditionnée à un abonnement')
      .toContain('si vous avez souscrit un abonnement');
    expect(
      sansCommentaires(edge),
      '§7 borne la conservation aux abonnés : si la fonction cesse de supprimer '
      + 'l’abonné RevenueCat d’un NON-abonné, ce paragraphe devient faux.',
    ).toContain('api.revenuecat.com');
  });

  it('la première phrase promet toujours la suppression serveur + appareil', () => {
    const texte = (par7!.paragraphs ?? []).join(' ');
    expect(texte).toMatch(/supprimées \(serveur \+ appareil\)/);
  });
});
