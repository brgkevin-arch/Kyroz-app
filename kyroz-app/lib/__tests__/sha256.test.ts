import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { sha256Hex } from '../sha256';

/**
 * SHA-256 maison (2026-09-05) — pourquoi elle est testée AUSSI durement.
 *
 * Elle sert à une seule chose : hacher le nonce de Sign in with Apple avant de le
 * transmettre à Apple. Si elle est fausse, la connexion échoue avec « Nonces
 * mismatch » — un message qu'on ne voit QUE sur un appareil, après un build et une
 * soumission TestFlight. C'est précisément la boucle qu'on refuse de refaire : les
 * vecteurs officiels et la comparaison à Node ferment la question ici, en 20 ms.
 */
describe('sha256Hex — les vecteurs officiels du NIST', () => {
  // FIPS 180-4, annexes B.1 et B.2, et le vecteur de la chaîne vide.
  const vecteurs: Array<[string, string]> = [
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    [
      'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    ],
  ];

  for (const [entree, attendu] of vecteurs) {
    it(`« ${entree.slice(0, 24)}${entree.length > 24 ? '…' : ''} » (${entree.length} car.)`, () => {
      expect(sha256Hex(entree)).toBe(attendu);
    });
  }

  it('rend toujours 64 caractères hexadécimaux minuscules', () => {
    for (const entree of ['', 'a', 'kyroz', 'x'.repeat(1000)]) {
      expect(sha256Hex(entree)).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

describe('sha256Hex — d\'accord avec Node sur les cas qui cassent les implémentations', () => {
  const reference = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

  // ⚠️ Les longueurs autour de 55/56 et 63/64 franchissent les frontières de bloc
  // et de remplissage : c'est là que les implémentations maison se trompent, jamais
  // sur « abc ». Un test qui ne balaye pas ces tailles ne prouve presque rien.
  it('toutes les longueurs de 0 à 200 octets', () => {
    for (let n = 0; n <= 200; n++) {
      const s = 'a'.repeat(n);
      expect(sha256Hex(s), `longueur ${n}`).toBe(reference(s));
    }
  });

  it('les caractères non-ASCII, encodés en UTF-8 (accents, emoji, paires de substitution)', () => {
    // L'encodage UTF-8 est écrit à la main dans `sha256.ts` : s'il est faux, il
    // l'est SILENCIEUSEMENT — l'empreinte reste 64 caractères plausibles.
    for (const s of ['é', 'Débité une fois par an.', '日本語', '👨‍👩‍👧‍👦', 'aé👍z']) {
      expect(sha256Hex(s), JSON.stringify(s)).toBe(reference(s));
    }
  });

  it('un nonce de la vraie forme (UUID v4)', () => {
    const nonce = '4c3028e1-30ca-44e6-9aca-c265c8f72051';
    expect(sha256Hex(nonce)).toBe(reference(nonce));
  });
});
