// ── SHA-256, en JavaScript pur ───────────────────────────────────────────────
//
// Écrit ici plutôt qu'importé, et ce n'est pas du « pas inventé ici » :
//
// 1. **Aucune dépendance NATIVE.** `expo-crypto` ferait le travail, mais c'est un
//    module natif de plus dans un binaire qu'Apple a déjà rejeté trois fois — et
//    surtout il changerait la surface native, donc l'empreinte, donc la ligne OTA
//    (`CLAUDE.md` §2). Ici la surface native ne bouge pas d'un octet.
// 2. **C'est TESTABLE.** Un module natif ne se vérifie que sur un appareil ; cette
//    fonction se vérifie contre les vecteurs officiels du NIST, sous vitest, à
//    chaque `npm test`. Le défaut qu'elle corrige (« Nonces mismatch ») n'a été vu
//    que sur un téléphone, après un build et une soumission TestFlight — c'est
//    exactement le genre de boucle qu'il ne faut pas avoir à refaire.
//
// ⚠️ Le seul usage aujourd'hui est le nonce de Sign in with Apple. Ce n'est PAS
// une primitive de sécurité à réemployer à la légère : hacher un mot de passe, par
// exemple, demande un algorithme à coût configurable (bcrypt, scrypt, Argon2), pas
// SHA-256.

/** Les 64 constantes de SHA-256 : les 32 premiers bits de la partie fractionnaire
 *  des racines cubiques des 64 premiers nombres premiers. */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** Encode une chaîne en UTF-8. Écrit à la main : `TextEncoder` existe dans Hermes
 *  aujourd'hui, mais cette fonction doit tourner AUSSI sous vitest et sur le web,
 *  et une primitive de hachage ne doit pas dépendre de ce que l'hôte fournit. */
function utf8(texte: string): Uint8Array {
  const octets: number[] = [];
  for (let i = 0; i < texte.length; i++) {
    let c = texte.charCodeAt(i);
    // Paire de substitution → un seul point de code.
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < texte.length) {
      const suivant = texte.charCodeAt(i + 1);
      if (suivant >= 0xdc00 && suivant <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (suivant - 0xdc00);
        i++;
      }
    }
    if (c < 0x80) octets.push(c);
    else if (c < 0x800) octets.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) octets.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else octets.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return new Uint8Array(octets);
}

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

/**
 * Rend l'empreinte SHA-256 d'une chaîne, en hexadécimal minuscule (64 caractères).
 *
 * Synchrone et sans dépendance : c'est ce qui permet de la tester contre les
 * vecteurs du NIST au lieu de la croire sur parole.
 */
export function sha256Hex(texte: string): string {
  const msg = utf8(texte);
  const longueurBits = msg.length * 8;

  // Remplissage : un bit à 1, puis des zéros, puis la longueur sur 64 bits.
  const tailleRemplie = ((msg.length + 8) >> 6 << 6) + 64;
  const bloc = new Uint8Array(tailleRemplie);
  bloc.set(msg);
  bloc[msg.length] = 0x80;
  // La longueur tient sur les 32 bits de poids faible : nos entrées sont des
  // nonces, pas des fichiers. Les 4 octets de poids fort restent à zéro.
  const vue = new DataView(bloc.buffer);
  vue.setUint32(tailleRemplie - 4, longueurBits >>> 0, false);
  vue.setUint32(tailleRemplie - 8, Math.floor(longueurBits / 0x100000000), false);

  // État initial : partie fractionnaire des racines carrées des 8 premiers premiers.
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let debut = 0; debut < tailleRemplie; debut += 64) {
    for (let i = 0; i < 16; i++) w[i] = vue.getUint32(debut + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e;
      e = (d + t1) >>> 0;
      d = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }

  let hex = '';
  for (let i = 0; i < 8; i++) hex += h[i].toString(16).padStart(8, '0');
  return hex;
}
