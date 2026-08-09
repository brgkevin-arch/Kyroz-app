import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  CODE_LONGUEUR, MDP_LONGUEUR_MIN, URL_RETOUR_CONFIRMATION,
  normaliseCode, codeComplet, motDePasseValide,
  traduitErreurConfirmation, traduitErreurReinitialisation,
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
const GABARIT_MDP = join(RACINE, 'supabase', 'emails', 'reinitialisation.html');
const PAGE_RETOUR = join(RACINE, 'public', 'confirme.html');

/** Variables de gabarit que Supabase sait réellement remplacer. Une variable
 *  inexistante n'est pas remplacée : elle part TELLE QUELLE dans la boîte de
 *  réception (« {{ .Prenom }} »), et Supabase ne prévient pas. */
const VARIABLES_CONNUES = ['Token', 'ConfirmationURL', 'SiteURL', 'Email', 'TokenHash', 'RedirectTo', 'Data'];

/** Les variables réellement employées par un gabarit. */
const variablesDe = (html: string) => [...html.matchAll(/\{\{\s*\.(\w+)\s*\}\}/g)].map((m) => m[1]);

/** Le corps du gabarit, commentaires HTML écartés — ils documentent les pièges
 *  (et contiennent des ⚠️) mais ne s'affichent nulle part. */
const sansCommentaires = (html: string) => html.replace(/<!--[\s\S]*?-->/g, '');

/**
 * 🔴 Le CODE seul, commentaires TypeScript écartés.
 *
 * Même piège que pour les gabarits, et il a mordu deux fois le 2026-08-07 : ce
 * fichier commente abondamment ses propres pièges, donc il CITE les chaînes qu'on
 * cherche (« type: 'recovery' — surtout PAS 'signup' »). Un test qui lit le
 * fichier entier reste vert alors que le code réel a changé : **le commentaire se
 * porte garant de ce qu'il décrit**. Trouvé par mutation, pas à la relecture — un
 * `'recovery'` supprimé de l'appel laissait encore une occurrence, dans la ligne
 * qui explique pourquoi il ne faut pas le supprimer.
 */
const sansCommentairesTS = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

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
    // Supabase ne distingue pas « code faux » de « jeton déjà consommé ». Sans les
    // deux issues dans le message, quelqu'un dont l'adresse est déjà validée retape
    // indéfiniment un code correct en croyant s'être trompé.
    const msg = traduitErreurConfirmation('Token has expired or is invalid');
    expect(msg).toContain('connecte-toi');
    expect(msg).not.toContain('Token');
  });

  it('🔴 AUCUN message ne parle d\'un lien — il n\'y en a plus dans les e-mails', () => {
    // Ce message conseillait « si tu as déjà cliqué le lien de l'e-mail… » jusqu'au
    // 2026-08-09. Le lien retiré, la phrase décrivait un geste IMPOSSIBLE : le défaut
    // qu'on avait su éviter côté réinitialisation, réintroduit ici en changeant le
    // gabarit sans relire ce qui en parlait ailleurs.
    // ➡️ Retirer un élément d'une interface, c'est aussi relire tout ce qui le cite.
    for (const brut of ['Token has expired or is invalid', 'For security purposes, you can only request this after 47 seconds']) {
      expect(traduitErreurConfirmation(brut).toLowerCase()).not.toContain('lien');
    }
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
  // 🔴 Le CORPS, commentaires écartés — et ce n'est pas un détail de forme.
  // L'en-tête du gabarit documente les variables obligatoires, donc il les CITE.
  // Un test qui lit le fichier entier passe au vert même si le corps n'en contient
  // aucune : le commentaire se porte garant de ce qu'il décrit. Défaut trouvé le
  // 2026-08-07 en écrivant le gabarit de réinitialisation — les mutations n'avaient
  // rien vu parce qu'elles frappaient le fichier entier, commentaire compris.
  const html = sansCommentaires(readFileSync(GABARIT, 'utf8'));

  it('porte {{ .Token }} : sans lui, l\'e-mail affiche un code VIDE', () => {
    // Le maillon le plus fragile de la chaîne. Le gabarit par défaut de Supabase
    // ne contient QUE le lien : coller une version sans `.Token` livre un e-mail
    // parfaitement présentable, en face d'un écran qui réclame six chiffres.
    expect(html).toMatch(/\{\{\s*\.Token\s*\}\}/);
  });

  it('🔴 ne porte PLUS {{ .ConfirmationURL }} — retiré le 2026-08-09', () => {
    // Ce test exigeait l'INVERSE jusqu'à cette date : le lien était « le second
    // chemin ». Il envoyait les e-mails en INDÉSIRABLE, et les Insights de Resend
    // ont nommé la cause — « Ensure link URLs match sending domain » : l'e-mail part
    // de `kyroz.app`, le lien de Supabase pointe vers `<ref>.supabase.co`, et un
    // expéditeur qui diverge de sa destination est la signature du phishing.
    // Mesuré : premier e-mail en boîte, second en indésirable.
    expect(html).not.toMatch(/\{\{\s*\.ConfirmationURL\s*\}\}/);
  });

  it('ne contient aucun lien web cliquable', () => {
    // Le garde ci-dessus ne suffit pas : on pourrait recoller une URL en dur, ou un
    // « voir dans le navigateur ». Seul `mailto:` reste permis (le contact).
    const liens = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    for (const href of liens) expect(href.startsWith('mailto:')).toBe(true);
  });

  it('n\'invente aucune autre variable de gabarit', () => {
    for (const v of variablesDe(html)) expect(VARIABLES_CONNUES).toContain(v);
  });

  it('aucun émoji — un e-mail est une surface de la DA comme une autre', () => {
    expect(EMOJI.test(html)).toBe(false);
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

describe('Mot de passe oublié — le seul recours quand le mot de passe est perdu', () => {
  it('un mot de passe court est refusé, à la même longueur qu\'à l\'inscription', () => {
    // Deux exigences différentes pour le même champ seraient vécues comme un bug.
    expect(motDePasseValide('12345')).toBe(false);
    expect(motDePasseValide('123456')).toBe(true);
    expect(MDP_LONGUEUR_MIN).toBe(6);
  });

  it('le libellé affiché annonce la MÊME longueur que la règle', () => {
    // Le placeholder est écrit en toutes lettres dans login.tsx (un test de harnais
    // le verrouille) : rien n'empêcherait donc de changer la règle sans le texte,
    // et l'écran refuserait une saisie qu'il vient lui-même de déclarer suffisante.
    const login = readFileSync(join(RACINE, 'app', '(auth)', 'login.tsx'), 'utf8');
    expect(login).toContain(`${MDP_LONGUEUR_MIN} caractères minimum`);
  });

  it('les erreurs ne parlent JAMAIS d\'un lien — il n\'y en a pas', () => {
    // 🔴 Le vrai risque de ce parcours : réutiliser les messages de la confirmation.
    // Celle-là conseillait « si tu as déjà cliqué le lien de l'e-mail… », or l'e-mail
    // de réinitialisation n'en a jamais contenu. Un message qui décrit un geste
    // impossible fait douter de l'app, pas du code saisi.
    for (const brut of ['Token has expired or is invalid', 'For security purposes, you can only request this after 47 seconds']) {
      expect(traduitErreurReinitialisation(brut).toLowerCase()).not.toContain('lien');
    }
    // ⚠️ Ce test exigeait AUSSI que la confirmation, elle, parle du lien — les deux
    // n'étant pas interchangeables. Cette moitié est tombée le 2026-08-09 avec le
    // retrait du lien : plus aucun e-mail n'en porte, donc plus aucun message ne doit
    // en parler (le garde correspondant vit dans le bloc « Erreurs Supabase »).
    // Ce qui reste vrai, et qu'on vérifie ici : les deux messages restent DISTINCTS,
    // parce que les deux parcours n'offrent pas la même issue.
    const conf = traduitErreurConfirmation('Token has expired or is invalid');
    const reinit = traduitErreurReinitialisation('Token has expired or is invalid');
    expect(conf).not.toBe(reinit);
    expect(conf).toContain('connecte-toi');       // l'adresse est peut-être déjà validée
    expect(reinit).toContain('nouveau code');     // là, il n'y a rien à quoi se connecter
  });

  it('« même mot de passe qu\'avant » est nommé, pas rendu tel quel', () => {
    // Erreur de la 3e étape (pas du code) : sans traduction, l'utilisateur lit un
    // message anglais sous un champ qu'il vient de remplir correctement.
    expect(traduitErreurReinitialisation('New password should be different from the old password'))
      .toContain('déjà le tien');
  });

  it('un message inconnu passe tel quel plutôt que d\'être avalé', () => {
    expect(traduitErreurReinitialisation('Signups not allowed')).toBe('Signups not allowed');
  });
});

describe('Gabarit de réinitialisation — le code, et RIEN à cliquer', () => {
  // Le CORPS seul, pour la raison expliquée plus haut : l'en-tête de ce gabarit
  // écrit noir sur blanc « PAS de {{ .ConfirmationURL }} », donc un test qui lit
  // le fichier entier accuserait le commentaire qui l'interdit.
  const html = sansCommentaires(readFileSync(GABARIT_MDP, 'utf8'));

  it('porte {{ .Token }}', () => {
    expect(html).toMatch(/\{\{\s*\.Token\s*\}\}/);
  });

  it('🔴 ne porte PAS {{ .ConfirmationURL }}, et ce n\'est pas un oubli', () => {
    // Cliquer un lien de réinitialisation CONSOMME le jeton sans changer le mot de
    // passe : une page statique ne peut pas appeler `updateUser`, et la session
    // ouverte vit dans le navigateur, jamais dans l'app native. La personne se
    // retrouverait avec un mot de passe inchangé ET un code mort — pire qu'avant
    // sa demande. Les antivirus de messagerie, qui pré-cliquent les liens, le
    // provoqueraient tout seuls à chaque envoi.
    expect(html).not.toMatch(/\{\{\s*\.ConfirmationURL\s*\}\}/);
  });

  it('ne contient aucun lien web cliquable', () => {
    // Le garde-fou ci-dessus ne suffit pas : on pourrait recoller une URL en dur,
    // ou un « voir dans le navigateur ». Seul `mailto:` reste permis (le contact).
    const liens = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    for (const href of liens) expect(href.startsWith('mailto:')).toBe(true);
  });

  it('n\'invente aucune autre variable de gabarit', () => {
    for (const v of variablesDe(html)) expect(VARIABLES_CONNUES).toContain(v);
  });

  it('aucun émoji', () => {
    expect(EMOJI.test(html)).toBe(false);
  });

  it('dit que le mot de passe actuel reste valable tant que rien n\'est saisi', () => {
    // Un e-mail de réinitialisation non sollicité est alarmant. La phrase qui
    // rassure fait partie du produit (CLAUDE.md §10 — un suivi rassure, jamais
    // ne met la pression), et elle est vraie : sans le code, rien ne change.
    expect(html).toContain('reste valable');
  });
});

describe('Câblage app — les deux appels qui doivent porter la redirection', () => {
  // Le CODE seul : ce fichier commente ses propres pièges, donc il cite les
  // chaînes qu'on cherche. Cf. `sansCommentairesTS` — deux tests d'ici étaient
  // verts alors que le code réel était cassé.
  const useAuth = sansCommentairesTS(readFileSync(join(RACINE, 'hooks', 'useAuth.tsx'), 'utf8'));

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

  it('chaque parcours interroge son PROPRE type de jeton', () => {
    // 🔴 Le même code à 6 chiffres est refusé s'il est interrogé sous le mauvais
    // type : l'utilisateur lirait « code invalide » sur des chiffres pourtant
    // justes, et retaperait indéfiniment. Les deux types doivent coexister.
    expect(useAuth).toMatch(/type:\s*'signup'/);
    expect(useAuth).toMatch(/type:\s*'recovery'/);
  });

  it('la demande de réinitialisation ne passe AUCUNE redirection', () => {
    // Lui en donner une rouvrirait le piège du lien cliquable : jeton consommé,
    // mot de passe inchangé. Le gabarit n'a pas de lien, l'appel non plus.
    // ⚠️ Capturer jusqu'au premier `);` et non `[^)]*` : `email.trim()` porte déjà
    // une parenthèse fermante, donc la version naïve s'arrêtait AVANT les options
    // et laissait passer la mutation qu'elle est censée attraper.
    const appel = useAuth.match(/resetPasswordForEmail\([\s\S]*?\);/)?.[0] ?? '';
    expect(appel).toBeTruthy();
    expect(appel).not.toContain('redirectTo');
  });
});
