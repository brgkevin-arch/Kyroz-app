import { describe, it, expect } from 'vitest';
import {
  AVIS_MAX, AVIS_MIN, AVIS_SUJETS, SUPPORT_EMAIL,
  avisValide, composerAvis, lienAvis, mentionContexte,
} from '../feedback';

// ── Le canal de retour ───────────────────────────────────────────────────────
//
// La décision vit dans une fonction PURE et l'écran ne fait que la rendre —
// même procédé que `collapsingTitle`, `accentColor` et `tours`. Ici ça sert deux
// choses qu'aucune capture ne montrerait : ce qui est JOINT au message, et ce
// qui arrive quand l'utilisateur tape un caractère réservé d'URL.

const CTX = { version: '1.0.0', plateforme: 'ios', maj: null };
/** Le même appareil, mais après avoir reçu une mise à jour OTA. */
const CTX_MAJ = { version: '1.0.0', plateforme: 'ios', maj: '7ac2496a-f739-44f9-88f1-01cfc4991249' };

describe('Avis — les bornes de saisie', () => {
  it('refuse le vide et le trop court : « ça marche pas » n’est pas un retour', () => {
    expect(avisValide('')).toBe(false);
    expect(avisValide('   ')).toBe(false);
    expect(avisValide('bug')).toBe(false);
  });

  it('les espaces ne comptent pas comme du texte', () => {
    // Sans le `trim`, dix espaces passeraient la borne basse et l'utilisateur
    // recevrait la confirmation d'un message vide.
    expect(avisValide(' '.repeat(AVIS_MIN + 5))).toBe(false);
  });

  it('accepte dès la borne, refuse au-delà du plafond', () => {
    expect(avisValide('a'.repeat(AVIS_MIN))).toBe(true);
    expect(avisValide('a'.repeat(AVIS_MAX))).toBe(true);
    // ⚠️ Le plafond n'est pas cosmétique : certains clients mail coupent un
    // `mailto:` trop long EN SILENCE. Un message accepté puis tronqué est pire
    // qu'un message refusé — l'utilisateur croit avoir été entendu.
    expect(avisValide('a'.repeat(AVIS_MAX + 1))).toBe(false);
  });
});

describe('Avis — ce qui part, et ce qu’on en dit', () => {
  it('le contexte joint est le STRICT nécessaire — aucune donnée de santé', () => {
    const { corps } = composerAvis('Le plan ne se régénère pas.', 'bug', CTX);
    expect(corps).toContain('1.0.0');
    expect(corps).toContain('ios');
    // Le corps ne porte QUE le contexte et le message. Ce test ne prouve pas
    // l'absence de tout, il ferme la porte à ce qu'on serait tenté d'ajouter
    // « pour aider au diagnostic » : le poids, l'objectif, l'e-mail du compte.
    expect(corps).toBe("Version 1.0.0 · ios · bundle d'origine\n\nLe plan ne se régénère pas.\n");
  });

  it('🔴 le contexte dit QUEL CODE tourne — dix OTA ne peuvent pas porter la même étiquette', () => {
    // Mesuré le 2026-08-11 en passant l'écran au simulateur : le message ne
    // joignait que « Version 1.0.0 · ios », alors que DIX mises à jour avaient
    // été publiées sous cette version. Dix états du code, une seule étiquette —
    // sur le canal de diagnostic principal du produit. Un signalement ne disait
    // pas si la personne tournait sur le code du 3 août ou sur celui du jour.
    expect(mentionContexte(CTX_MAJ)).toContain('7ac2496a');
    // Tronqué à 8 caractères : de quoi retrouver le groupe dans EAS, sans rendre
    // illisible l'aperçu du client mail — l'endroit même où on lit cette ligne.
    expect(mentionContexte(CTX_MAJ)).not.toContain('f739');
  });

  it('l’absence de mise à jour se DIT, elle ne se tait pas', () => {
    // « on ne sait pas » et « c'est le bundle livré dans le binaire » sont deux
    // réponses différentes. Un champ vide les confondrait, et c'est la seconde
    // qui est vraie tant que l'app n'a rien téléchargé.
    expect(mentionContexte(CTX)).toContain("bundle d'origine");
    expect(mentionContexte(CTX)).not.toContain('maj ');
  });

  it('🔴 la promesse de confidentialité TIENT — un identifiant technique n’est pas une donnée de santé', () => {
    // Ce que l'écran promet : « ni ton poids, ni ton objectif, ni tes plans ».
    // L'ajout du 2026-08-11 est un identifiant de build, opaque et sans lien
    // avec la personne — mais la promesse doit être RE-vérifiée à chaque ajout,
    // sinon elle s'érode d'un champ « utile au diagnostic » à la fois.
    const { corps } = composerAvis('un retour bien assez long', 'bug', CTX_MAJ);
    const lignes = corps.split('\n').filter(Boolean);
    // Exactement deux lignes : le contexte, puis le message. Rien entre les deux.
    expect(lignes).toEqual([mentionContexte(CTX_MAJ), 'un retour bien assez long']);
  });

  it('ce que l’écran ANNONCE est ce qui part — une seule source', () => {
    // Deux listes divergeraient, et la première à mentir serait celle qu'on
    // montre. C'est la règle « pas de mensonge », appliquée aux données de
    // quelqu'un d'autre.
    const { corps } = composerAvis('un retour bien assez long', 'idee', CTX);
    expect(corps.startsWith(mentionContexte(CTX))).toBe(true);
  });

  it('le sujet trie la boîte de réception, et chaque entrée a le sien', () => {
    const sujets = AVIS_SUJETS.map((s) => composerAvis('un retour bien assez long', s.id, CTX).sujet);
    expect(new Set(sujets).size).toBe(AVIS_SUJETS.length);
    for (const s of sujets) expect(s.startsWith('Kyroz — ')).toBe(true);
  });
});

describe('Avis — le lien mailto', () => {
  it('vise l’adresse de contact', () => {
    expect(lienAvis('un retour bien assez long', 'autre', CTX).startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
  });

  // 🔴 LE CAS QUI COUPE UN MESSAGE EN DEUX SANS RIEN DIRE. Un `&` tapé par
  // l'utilisateur — « macros & calories », qui n'a rien d'exotique dans cette
  // app — terminerait le paramètre `body` et transformerait la suite en
  // paramètre inconnu. Le message arriverait tronqué à l'endroit exact du `&`,
  // et NI l'utilisateur NI nous ne pourrions le savoir : lui a vu son texte
  // entier avant d'appuyer, nous recevons un message qui a l'air complet.
  it('encode ce que l’utilisateur tape — un « & » ne coupe pas son message', () => {
    const lien = lienAvis('Souci sur les macros & calories du dimanche', 'bug', CTX);
    expect(lien).toContain('%26');
    // Un seul `&` dans toute l'URL : celui qui sépare `subject` de `body`.
    expect(lien.split('&').length - 1).toBe(1);
  });

  it('encode aussi les sauts de ligne et les accents', () => {
    const lien = lienAvis('Première ligne\nDeuxième ligne', 'autre', CTX);
    expect(lien).not.toContain('\n');
    expect(lien).toContain('%0A');
    expect(lien).not.toMatch(/[éèà]/);
  });
});
