// Génère le MIROIR HTML du design system de Kyroz, à destination de Claude Design.
//
// ⚠️ POURQUOI CE SCRIPT EXISTE, ET POURQUOI LE MIROIR N'EST PAS ÉCRIT À LA MAIN.
// Claude Design lit du HTML, pas du TypeScript : pour qu'il connaisse la DA, il faut
// lui en fabriquer une copie. Or une copie écrite à la main est exactement ce que la
// règle de travail de Kyroz interdit — « une copie stockée que personne ne relit est
// une seconde source de vérité qui attend son bug ». Le jour où `theme.ts` change et
// où le miroir ne bouge pas, Claude Design dessine contre une DA qui n'existe plus,
// et rend des maquettes parfaitement plausibles.
// ➡️ Le miroir se REGÉNÈRE : `npm run design:build`, puis on repousse.
//
// ⚠️ L'extraction lit `theme.ts` COMME DU TEXTE, faute de pouvoir l'importer (il tire
// `react-native`, absent sous node). Même procédé que `lib/__tests__/accentColor.test.ts`,
// qui lit déjà les fonds de page dans ce fichier. Le risque est donc réel : un
// renommage silencieux produirait un miroir amputé. C'est ce que garde
// `lib/__tests__/designSystem.test.ts` — il exige que chaque bloc attendu soit trouvé
// ET non vide.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
export const RACINE = join(ICI, '..');
export const SORTIE = join(RACINE, 'design-system');

// ── Extraction ───────────────────────────────────────────────────────────────

/**
 * Contenu brut entre les accolades de `const <nom> … = { … }`, par équilibrage.
 *
 * ⚠️ On part du `=`, PAS du nom : `ACCENTS` porte une annotation de type qui
 * contient elle-même des accolades (`Record<AccentId, { label: string; … }>`).
 * Chercher la première `{` après le nom capturait donc le TYPE, et l'extraction
 * rendait un objet vide — en silence.
 */
export function blocDe(src, nom) {
  const i = src.search(new RegExp(`(?:export\\s+)?const\\s+${nom}\\b[^=]*=\\s*\\{`));
  if (i === -1) throw new Error(`bloc « ${nom} » introuvable`);
  const egal = src.indexOf('=', i);
  const debut = src.indexOf('{', egal);
  let profondeur = 0;
  for (let k = debut; k < src.length; k++) {
    if (src[k] === '{') profondeur++;
    else if (src[k] === '}' && --profondeur === 0) return src.slice(debut + 1, k);
  }
  throw new Error(`bloc « ${nom} » non refermé`);
}

/**
 * `clé: 'valeur'` ou `clé: 12` au premier niveau (les sous-objets sont ignorés).
 *
 * ⚠️ Trois pièges, chacun rencontré sur le vrai `theme.ts` :
 *  1. les sous-objets sont écrits sur UNE ligne (`hero: { fontSize: 40, … }`) — donc
 *     on ne peut pas ancrer en début de ligne, sinon une seule clé sur trois sort ;
 *  2. les graisses portent un suffixe (`fontWeight: '700' as const`) — la virgule
 *     ne suit donc pas la valeur ;
 *  3. l'interlettrage est NÉGATIF (`letterSpacing: -1.4`).
 * Les commentaires sont retirés d'abord : sans ça, une note en fin de ligne peut
 * ressembler à une paire.
 */
export function pairesPlates(bloc) {
  const out = {};
  const sansCommentaires = bloc.replace(/\/\/[^\n]*/g, '');
  // On neutralise les sous-objets pour ne pas capter leurs clés.
  const plat = sansCommentaires.replace(/\{[^{}]*\}/g, '{}');
  for (const m of plat.matchAll(/([a-zA-Z_][\w]*)\s*:\s*(?:'([^']*)'|"([^"]*)"|(-?[0-9.]+))/g)) {
    const [, cle, s1, s2, n] = m;
    out[cle] = n !== undefined ? Number(n) : (s1 ?? s2);
  }
  return out;
}

/** `clé: { … }` au premier niveau → { clé: contenu }. */
export function sousObjets(bloc) {
  const out = {};
  for (const m of bloc.matchAll(/^\s*([a-zA-Z_][\w]*)\s*:\s*\{/gm)) {
    const debut = bloc.indexOf('{', m.index + m[0].length - 1);
    let p = 0;
    for (let k = debut; k < bloc.length; k++) {
      if (bloc[k] === '{') p++;
      else if (bloc[k] === '}' && --p === 0) { out[m[1]] = bloc.slice(debut + 1, k); break; }
    }
  }
  return out;
}

export function lireDA() {
  const theme = readFileSync(join(RACINE, 'constants', 'theme.ts'), 'utf8');
  const accents = readFileSync(join(RACINE, 'lib', 'accentColor.ts'), 'utf8');

  const type = {};
  for (const [cle, corps] of Object.entries(sousObjets(blocDe(theme, 'Type')))) {
    type[cle] = pairesPlates(corps + ',');
  }
  const acc = {};
  for (const [cle, corps] of Object.entries(sousObjets(blocDe(accents, 'ACCENTS')))) {
    acc[cle] = pairesPlates(corps + ',');
  }

  return {
    sombre: pairesPlates(blocDe(theme, 'dark')),
    clair: pairesPlates(blocDe(theme, 'light')),
    espacements: pairesPlates(blocDe(theme, 'Spacing')),
    rayons: pairesPlates(blocDe(theme, 'Radius')),
    typo: type,
    accents: acc,
  };
}

// ── Rôles écrits, tirés de CLAUDE.md §8 ──────────────────────────────────────
// ⚠️ Un token sans rôle écrit est une porte ouverte : c'est ce qui avait produit
// quatre rayons différents sur des objets qui se touchent. Le miroir porte donc le
// RÔLE, pas seulement la valeur — sinon Claude Design choisit un rayon plausible.
const ROLE_RAYON = {
  sm: 'sous-bloc DANS un bloc, ligne de liste, vignette',
  button: 'bouton (plein, contour ou pointillé) ET champ de saisie',
  card: 'bloc de contenu dans la page — LE RAYON DOMINANT DE LA DA',
  xl: 'grande surface flottante : feuille modale, dialogue, célébration',
  pill: 'puce, jauge, badge — JAMAIS un bouton pleine largeur',
};

const ROLE_TYPO = {
  hero: 'chiffre héros (kcal du jour, poids) — une seule par écran',
  display: 'titre d’écran',
  h1: 'titre d’étape (onboarding, écran secondaire plein)',
  h2: 'titre de feuille modale ou de dialogue',
  h3: 'titre de bloc à l’intérieur d’un écran',
  body: 'texte courant',
  bodyStrong: 'texte courant accentué',
  caption: 'légende, note secondaire',
  overline: 'sur-titre en capitales',
};

const ROLE_COULEUR = {
  bg: 'fond de page — NE BOUGE JAMAIS, même avec un accent coloré',
  card: 'surface d’un bloc de contenu',
  cardElevated: 'surface au-dessus d’une carte',
  fill: 'remplissage subtil (champs, puces inactives)',
  line: 'séparateur',
  lineStrong: 'séparateur appuyé, contour de case à cocher',
  text: 'encre principale',
  textSecondary: 'encre secondaire',
  textTertiary: 'encre tertiaire (notes, légendes)',
  textQuaternary: 'encre la plus faible (placeholder)',
  accent: 'ce qui se COMMANDE ou s’ACTIVE — remplacé à l’exécution par la couleur choisie',
  onAccent: 'encre posée SUR l’accent — calculée, jamais choisie à la main',
  onDanger: 'encre posée sur un fond de danger',
  protein: 'barre de macros, 1ʳᵉ nuance',
  carbs: 'barre de macros, 2ᵉ nuance',
  fat: 'barre de macros, 3ᵉ nuance',
  success: 'état positif',
  warning: 'état d’attention',
  danger: 'état négatif',
};

// ── Rendu ────────────────────────────────────────────────────────────────────

const CSS = `
  *{box-sizing:border-box}
  /* ⚠️ Fond et encre EXPLICITES. Sans eux la page hérite du thème du visualiseur :
     mesuré, le titre sortait en noir sur fond sombre, illisible. Un miroir doit se
     lire quel que soit l'endroit où il s'ouvre. Les volets ci-dessous, eux, portent
     leurs vraies couleurs — c'est leur objet. */
  body{margin:0;background:#FFFFFF;color:#1C1C1E;font:500 15px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  @media (prefers-color-scheme:dark){body{background:#0B0B0C;color:#F2F2F4}}
  .page{padding:28px}
  h1{font-size:34px;font-weight:700;letter-spacing:-.9px;margin:0 0 6px}
  .chapeau{margin:0 0 26px;max-width:70ch;font-size:14px;opacity:.65}
  h2{font-size:22px;font-weight:700;letter-spacing:-.5px;margin:30px 0 12px}
  .duo{display:grid;grid-template-columns:1fr 1fr;gap:22px}
  .volet{border-radius:22px;padding:22px;border:1px solid transparent}
  .volet.sombre{background:#000;color:#fff;border-color:rgba(255,255,255,.09)}
  .volet.clair{background:#F2F2F7;color:#1C1C1E;border-color:rgba(0,0,0,.07)}
  .etiquette{font:700 11px/1 system-ui;letter-spacing:1px;text-transform:uppercase;opacity:.45;margin:0 0 14px}
  table{border-collapse:collapse;width:100%}
  td,th{padding:9px 10px;text-align:left;font-size:13px;vertical-align:middle}
  th{font:700 10px/1 system-ui;letter-spacing:.8px;text-transform:uppercase;opacity:.45}
  tr+tr td{border-top:1px solid currentColor;border-color:rgba(128,128,128,.18)}
  .pastille{width:26px;height:26px;border-radius:8px;border:1px solid rgba(128,128,128,.35);display:inline-block;vertical-align:middle}
  code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;opacity:.8}
  .role{opacity:.6}
  .regle{border-radius:22px;padding:18px 20px;margin:0 0 14px;border:1px solid rgba(128,128,128,.22)}
  .regle b{display:block;margin-bottom:5px}
  .regle p{margin:0;font-size:14px;opacity:.72}
  @media (max-width:820px){.duo{grid-template-columns:1fr}}
`;

const page = (groupe, titre, sousTitre, corps, viewport = 1200) => `<!-- @dsCard group="${groupe}" -->
<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Kyroz — ${titre}</title><style>${CSS}</style></head>
<body><div class="page">
<h1>${titre}</h1>
<p class="chapeau">${sousTitre}</p>
${corps}
</div></body></html>`;

const volet = (nom, classe, contenu) =>
  `<div class="volet ${classe}"><p class="etiquette">${nom}</p>${contenu}</div>`;

function tableCouleurs(pal) {
  const lignes = Object.entries(pal)
    .filter(([c]) => c !== 'scheme' && c !== 'shadowColor' && c !== 'shadowOpacity')
    .map(([c, v]) => `<tr>
      <td><span class="pastille" style="background:${v}"></span></td>
      <td><code>${c}</code></td>
      <td><code>${v}</code></td>
      <td class="role">${ROLE_COULEUR[c] ?? ''}</td>
    </tr>`).join('');
  return `<table><thead><tr><th></th><th>token</th><th>valeur</th><th>rôle</th></tr></thead><tbody>${lignes}</tbody></table>`;
}

export function construire(da) {
  const fichiers = {};

  // 1 — Les principes. La moitié d'une DA n'est pas une valeur, c'est une règle.
  fichiers['principes.html'] = page('Fondations', 'Les principes',
    'À lire avant toute maquette. Ces règles ne se déduisent d’aucune palette, et chacune a été payée par un défaut réel en production.',
    `
    <div class="regle"><b>Le fond ne bouge jamais</b><p>Noir pur <code>#000000</code> en sombre, <code>#F2F2F7</code> en clair. Une couleur choisie par l’utilisateur ne teinte QUE ce qui se commande ou s’active : bouton, jour actif, puce sélectionnée, onglet actif, barre de macros. Jamais un fond, jamais un texte courant.</p></div>
    <div class="regle"><b>La hiérarchie se fait par la TAILLE, pas par la graisse</b><p>Tout ce qui est titre pèse 700. Deux graisses différentes pour dire « celui-ci est plus important » est une erreur : c’est la taille qui le dit.</p></div>
    <div class="regle"><b>Chaque rayon a UN rôle, et un seul</b><p>Un rayon ne se choisit pas à l’œil. Employer un rayon de carte sur un bouton, ou une pilule sur un bloc, casse la grammaire — c’est arrivé quatre fois sur un même écran.</p></div>
    <div class="regle"><b>Les macros sont trois NUANCES d’une même couleur, jamais trois teintes</b><p>La couleur ne porte une information que dans une BARRE, où elle sépare des proportions côte à côte. Ailleurs (« 42 P · 81 G · 12 L » dans une liste), elle ne fait que du bruit et écrase le nom du plat.</p></div>
    <div class="regle"><b>Une nuance pâle se MESURE contre le fond</b><p>Un gris relevé à l’œil sur une maquette (<code>#DDDDDF</code>) est tombé à 1,21:1 contre le fond de page : le 3ᵉ segment de la barre était invisible et elle semblait s’arrêter aux deux tiers. Toute nuance doit tenir au moins 1,5:1 contre le fond sur lequel elle est posée.</p></div>
    <div class="regle"><b>Pas de flou</b><p>Le flou d’arrière-plan (<code>backdrop-filter</code>) impose une dépendance native à l’app : nouveau build, nouvelle revue de store, et la ligne de correctifs à distance se coupe pour les anciennes versions. Un fond opaque rend le même service.</p></div>
    <div class="regle"><b>Une cible tactile fait au moins 44 pt de haut</b><p>Et la hauteur fait la forme autant que le rayon : à 34 pt de haut, un rayon de 14 donne déjà une lozange.</p></div>
    <div class="regle"><b>Les deux thèmes se valent</b><p>Aucun écran n’existe en clair seulement. Toute proposition se juge dans les deux, à mode égal.</p></div>
  `);

  // 2 — Couleurs
  fichiers['couleurs.html'] = page('Fondations', 'Les couleurs',
    'Palette système iOS, monochrome par défaut. Les valeurs viennent de <code>constants/theme.ts</code> — elles ne se recopient pas, elles se lisent.',
    `<div class="duo">
      ${volet('Sombre', 'sombre', tableCouleurs(da.sombre))}
      ${volet('Clair', 'clair', tableCouleurs(da.clair))}
    </div>`);

  // 3 — Accents
  const rangAccent = (id, a) => `<tr>
      <td><span class="pastille" style="background:${a.dark}"></span></td>
      <td><code>${id}</code> — ${a.label}</td>
      <td><code>${a.dark}</code> <span class="role">sombre</span></td>
      <td><span class="pastille" style="background:${a.light}"></span> <code>${a.light}</code> <span class="role">clair</span></td>
    </tr>`;
  fichiers['accents.html'] = page('Fondations', 'Les couleurs d’accent',
    'Six choix, monochrome par défaut. Chaque accent porte DEUX valeurs — une couleur assez sombre pour se lire sur blanc devient un trou noir sur fond noir.',
    `${volet('Les six accents', 'sombre', `<table><tbody>${Object.entries(da.accents).map(([id, a]) => rangAccent(id, a)).join('')}</tbody></table>`)}
     <div class="regle" style="margin-top:22px"><b>Deux contraintes mesurées</b>
       <p>1. L’accent doit se détacher du FOND DE PAGE à 3:1 — le risque réel n’est pas le texte posé dessus, c’est le bouton noyé dans la page (un bleu sombre sur fond noir : 1,43:1).<br>
       2. L’encre posée SUR l’accent se CALCULE (le meilleur du noir ou du blanc), elle ne se choisit pas : une table écrite à la main livre tôt ou tard un libellé illisible.</p></div>`);

  // 4 — Rayons
  const rangRayon = (cle, v) => `<tr>
      <td><span style="display:inline-block;width:54px;height:34px;background:currentColor;opacity:.14;border-radius:${Math.min(v, 17)}px"></span></td>
      <td><code>Radius.${cle}</code></td><td><code>${v}</code></td>
      <td class="role">${ROLE_RAYON[cle] ?? ''}</td>
    </tr>`;
  fichiers['rayons.html'] = page('Fondations', 'Les rayons',
    'Cinq valeurs, cinq rôles. La liste triée par taille ne dit pas laquelle employer — c’est comme ça que la même carte s’est retrouvée à 16 dans un composant et 22 dans l’écran d’à côté.',
    `${volet('Rôles', 'sombre', `<table><thead><tr><th></th><th>token</th><th>valeur</th><th>à employer pour</th></tr></thead><tbody>${Object.entries(da.rayons).map(([c, v]) => rangRayon(c, v)).join('')}</tbody></table>`)}
     <div class="regle" style="margin-top:22px"><b>Les valeurs 16 et 20 n’existent pas, volontairement</b><p>Elles ont été supprimées du jeu : tant qu’elles existaient, rien n’empêchait de les employer sur une carte, et c’est exactement ce qui est arrivé huit fois.</p></div>`);

  // 5 — Typographie
  const rangTypo = (cle, t) => `<tr>
      <td style="font-size:${Math.min(t.fontSize, 40)}px;font-weight:${t.fontWeight};letter-spacing:${t.letterSpacing ?? 0}px;line-height:1.1">Aa</td>
      <td><code>Type.${cle}</code></td>
      <td><code>${t.fontSize} / ${t.fontWeight}</code></td>
      <td class="role">${ROLE_TYPO[cle] ?? ''}</td>
    </tr>`;
  fichiers['typographie.html'] = page('Fondations', 'La typographie',
    'Police système (SF Pro sur iOS). La hiérarchie se fait par la TAILLE : tout titre pèse 700.',
    `${volet('Échelle', 'sombre', `<table><thead><tr><th></th><th>token</th><th>taille / graisse</th><th>rôle</th></tr></thead><tbody>${Object.entries(da.typo).map(([c, t]) => rangTypo(c, t)).join('')}</tbody></table>`)}`);

  // 6 — Espacements
  fichiers['espacements.html'] = page('Fondations', 'Les espacements',
    'Une seule échelle. Les groupes d’éléments se posent avec un espacement, pas avec des marges individuelles.',
    volet('Échelle', 'sombre', `<table><tbody>${Object.entries(da.espacements).map(([c, v]) =>
      `<tr><td><span style="display:inline-block;height:14px;width:${v}px;background:currentColor;opacity:.3"></span></td><td><code>Spacing.${c}</code></td><td><code>${v}</code></td></tr>`).join('')}</tbody></table>`));

  return fichiers;
}

// ── Écriture ─────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const da = lireDA();
  const fichiers = construire(da);
  rmSync(SORTIE, { recursive: true, force: true });
  mkdirSync(SORTIE, { recursive: true });
  for (const [nom, html] of Object.entries(fichiers)) {
    writeFileSync(join(SORTIE, nom), html);
  }
  console.log(`${Object.keys(fichiers).length} pages écrites dans design-system/`);
  console.log(`couleurs : ${Object.keys(da.sombre).length} tokens sombre, ${Object.keys(da.clair).length} clair`);
  console.log(`rayons ${Object.keys(da.rayons).length} · typo ${Object.keys(da.typo).length} · espacements ${Object.keys(da.espacements).length} · accents ${Object.keys(da.accents).length}`);
}
