import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  CODE_LONGUEUR, URL_RETOUR_CONFIRMATION,
  normaliseCode, codeComplet, traduitErreurConfirmation,
} from '../emailConfirmation';

// ── Pourquoi ce test existe ─────────────────────────────────────────────────
//
// La confirmation d'adresse tient sur une CHAÎNE dont aucun maillon ne vit dans
// le même fichier que le suivant : un gabarit HTML collé dans le dashboard
// Supabase, une page statique servie par GitHub Pages, une URL en liste blanche
// côté Supabase, et l'écran de saisie du code dans l'app.
//
// 🔴 Chaque maillon échoue EN SILENCE, et c'est ça le sujet :
//   • un gabarit sans `{{ .Token }}` envoie un e-mail au code VIDE, en face d'un
//     écran qui en réclame un — aucune erreur nulle part ;
//   • une page d'atterrissage renommée transforme le lien en 404, et seul celui
//     qui clique s'en aperçoit ;
//   • un `signUp` sans `emailRedirectTo` retombe sur la « Site URL » du projet,
//     c'est-à-dire un écran de connexion muet.
//
// Aucun de ces trois cas ne se voit à la relecture d'un diff, et aucun ne casse
// un test d'intégration : ils cassent un PARCOURS, chez quelqu'un d'autre.

const RACINE = join(__dirname, '..', '..');
const GABARIT = join(RACINE, 'supabase', 'emails', 'confirmation.html');
const PAGE_RETOUR = join(RACINE, 'public', 'confirme.html');

// Plage des émoji + symboles pictographiques (CLAUDE.md §8 : aucun dans l'interface).
// Les e-mails et la page de retour en font partie : ce sont des surfaces vues.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{FE0F}]/u;

describe('Code de confirmation — ce que l\'utilisateur tape', () => {
  it('ne garde que les chiffres : on colle depuis un e-mail, pas d\'un clavier propre', () => {
    // Le collage est le cas NORMAL. Un code copié depuis l'e-mail traîne presque
    // toujours une espace ou un retour à la ligne ; refuser la saisie pour ça
    // serait un rejet incompréhensible face à un code pourtant juste.
    expect(normaliseCode(' 428 193 ')).toBe('428193');
    expect(normaliseCode('428-193')).toBe('428193');
    expect(normaliseCode('428193\n')).toBe('428193');
  });

  it('tronque au-delà de six chiffres, et encaisse le vide', () => {
    expect(normaliseCode('4281939999')).toBe('428193');
    expect(normaliseCode('')).toBe('');
    expect(normaliseCode('abcdef')).toBe('');
  });

  it('n\'est complet qu\'à six chiffres — c\'est ce qui arme le bouton', () => {
    expect(codeComplet('42819')).toBe(false);
    expect(codeComplet('428193')).toBe(true);
    expect(codeComplet(' 428193 ')).toBe(true);
    expect(CODE_LONGUEUR).toBe(6);
  });
});

describe('Erreurs Supabase — traduites, et surtout ACTIONNABLES', () => {
  it('« expired or invalid » nomme les DEUX issues, dont le compte déjà confirmé', () => {
    // Supabase ne distingue pas « code faux » de « jeton déjà consommé » (le lien
    // a été cliqué). Sans les deux issues dans le message, quelqu'un qui a cliqué
    // le lien retape indéfiniment un code correct en croyant s'être trompé.
    const msg = traduitErreurConfirmation('Token has expired or is invalid');
    expect(msg).toContain('connecte-toi');
    expect(msg).not.toContain('Token');
  });

  it('le plafond d\'envoi dit d\'attendre, pas « réessaie » (ce serait faux)', () => {
    expect(traduitErreurConfirmation('For security purposes, you can only request this after 47 seconds'))
      .toContain('minute');
  });

  it('un message inconnu passe tel quel plutôt que d\'être avalé', () => {
    expect(traduitErreurConfirmation('Signups not allowed for this instance'))
      .toBe('Signups not allowed for this instance');
  });
});

describe('Gabarit d\'e-mail — les variables sans lesquelles il ne sert à rien', () => {
  const html = readFileSync(GABARIT, 'utf8');

  it('porte {{ .Token }} : sans lui, l\'e-mail affiche un code VIDE', () => {
    // Le maillon le plus fragile de la chaîne. Le gabarit par défaut de Supabase
    // ne contient QUE le lien : coller une version sans `.Token` livre un e-mail
    // parfaitement présentable, en face d'un écran qui réclame six chiffres.
    expect(html).toMatch(/\{\{\s*\.Token\s*\}\}/);
  });

  it('porte {{ .ConfirmationURL }} : le lien reste le second chemin', () => {
    expect(html).toMatch(/\{\{\s*\.ConfirmationURL\s*\}\}/);
  });

  it('n\'invente aucune autre variable de gabarit', () => {
    // Une variable inexistante n'est pas remplacée : elle part TELLE QUELLE dans
    // la boîte de réception (« {{ .Prenom }} »). Supabase ne prévient pas.
    const CONNUES = ['Token', 'ConfirmationURL', 'SiteURL', 'Email', 'TokenHash', 'RedirectTo', 'Data'];
    const trouvees = [...html.matchAll(/\{\{\s*\.(\w+)\s*\}\}/g)].map((m) => m[1]);
    for (const v of trouvees) expect(CONNUES).toContain(v);
  });

  it('aucun émoji — un e-mail est une surface de la DA comme une autre', () => {
    expect(EMOJI.test(html.replace(/<!--[\s\S]*?-->/g, ''))).toBe(false);
  });
});

describe('Page de retour — celle qu\'atteint le clic sur le lien', () => {
  it('existe, et porte EXACTEMENT le nom que l\'app demande dans emailRedirectTo', () => {
    // Le vrai risque : renommer la page (ou la déplacer hors de `public/`) sans
    // toucher à la constante. Le build reste vert, le déploiement aussi, et le
    // lien de l'e-mail rend un 404 — visible seulement par qui clique.
    expect(existsSync(PAGE_RETOUR)).toBe(true);
    const fichierAttendu = URL_RETOUR_CONFIRMATION.split('/').pop();
    expect(fichierAttendu).toBe('confirme.html');
  });

  it('sert bien depuis le site déployé (même racine que legal.html)', () => {
    // `public/` est recopié tel quel par `expo export -p web`, et GitHub Pages
    // sert `dist/` sous /Kyroz-app/ — c'est le chemin déjà éprouvé par legal.html.
    expect(URL_RETOUR_CONFIRMATION).toMatch(/^https:\/\/brgkevin-arch\.github\.io\/Kyroz-app\//);
  });

  it('aucun émoji', () => {
    expect(EMOJI.test(readFileSync(PAGE_RETOUR, 'utf8').replace(/<!--[\s\S]*?-->/g, ''))).toBe(false);
  });
});

describe('Page de retour — son script, EXÉCUTÉ (pas relu)', () => {
  // 🔴 Pourquoi ce détour plutôt qu'un coup d'œil dans un navigateur : le panneau
  // de prévisualisation rend un `file://` en SNAPSHOT STATIQUE — le `<script>` de
  // la page n'y tourne jamais. Mesuré le 2026-08-07 : chargée avec
  // `#error=access_denied`, la page affichait « Adresse confirmée », et le hash
  // n'était même pas effacé (preuve que rien ne s'était exécuté). Conclure de
  // cette capture que la page est fautive aurait envoyé corriger du code sain :
  // c'est exactement « mesurer l'instrument » (CLAUDE.md §11), rejoué ici.
  //
  // On exécute donc le script RÉELLEMENT LIVRÉ, avec un environnement simulé.
  // Ce n'est pas une réplique de sa logique — c'est le fichier, tel qu'il partira.

  const page = readFileSync(PAGE_RETOUR, 'utf8');
  const script = page.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';

  function joue(hash: string, search: string) {
    const blocs: Record<string, { style: { display?: string } }> = {
      succes: { style: {} },
      echec: { style: {} },
    };
    const remplacements: string[] = [];
    const document = { getElementById: (id: string) => blocs[id] };
    const location = { hash, search, pathname: '/Kyroz-app/confirme.html' };
    const history = { replaceState: (_s: unknown, _t: string, url: string) => { remplacements.push(url); } };
    // eslint-disable-next-line no-new-func
    new Function('document', 'location', 'history', script)(document, location, history);
    return { blocs, remplacements };
  }

  it('le script existe et est branché dans la page', () => {
    expect(script).toContain('getElementById');
  });

  it('sans paramètre : le succès reste affiché', () => {
    const { blocs } = joue('', '');
    expect(blocs.echec.style.display).toBeUndefined();  // reste masqué par le CSS
    expect(blocs.succes.style.display).toBeUndefined();
  });

  it('erreur dans le FRAGMENT : bascule sur l\'échec', () => {
    // Le cas réel d'un lien expiré ou déjà consommé par un antivirus de messagerie.
    const { blocs } = joue('#error=access_denied&error_description=Email+link+is+invalid', '');
    expect(blocs.succes.style.display).toBe('none');
    expect(blocs.echec.style.display).toBe('block');
  });

  it('erreur dans la QUERY : bascule aussi', () => {
    // Supabase place l'erreur tantôt dans le fragment, tantôt dans la query.
    // N'en lire qu'un afficherait « confirmée » sur la moitié des liens morts.
    const { blocs } = joue('', '?error=server_error&error_code=500');
    expect(blocs.succes.style.display).toBe('none');
    expect(blocs.echec.style.display).toBe('block');
  });

  it('les jetons de session sont retirés de la barre d\'adresse', () => {
    // Le fragment porte `access_token` en clair. Cette page n'ouvre pas de session :
    // les laisser traîner les exposerait à l'historique et au partage de lien.
    const { remplacements } = joue('#access_token=eyJhbGciOi.SECRET&refresh_token=abc', '');
    expect(remplacements).toEqual(['/Kyroz-app/confirme.html']);
  });
});

describe('Câblage app — les deux appels qui doivent porter la redirection', () => {
  const useAuth = readFileSync(join(RACINE, 'hooks', 'useAuth.tsx'), 'utf8');

  it('signUp ET resend passent emailRedirectTo', () => {
    // Sans lui, Supabase retombe sur la « Site URL » du projet : le clic mène à
    // l'app, qui affiche un écran de connexion sans un mot sur la confirmation.
    // Deux appels envoient l'e-mail — en oublier UN suffit à casser la moitié des cas.
    expect(useAuth.match(/emailRedirectTo/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('le consentement RGPD n\'est plus écrit à l\'aveugle après signUp', () => {
    // 🔴 Le défaut que la confirmation e-mail RÉINTRODUIRAIT si on l'oubliait :
    // sans session ouverte, la RLS `auth.uid() = id` refuse l'upsert, le try/catch
    // avale l'erreur, et `consent_health_data` reste `false` alors que la case a
    // été cochée. Le report est donc conditionné à la présence d'une session.
    expect(useAuth).toMatch(/if\s*\(id\s*&&\s*data\.session\)/);
    expect(useAuth).toContain('CLE_CONSENTEMENT_EN_ATTENTE');
  });
});
