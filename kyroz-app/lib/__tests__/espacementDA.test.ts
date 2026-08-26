import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Spacing, Fond, CIBLE_TACTILE_MIN } from '../../constants/theme';

// ── Le blanc entre les choses passe par un token, comme la couleur ───────────
//
// Troisième de la famille, après `rayonsDA` (la forme) et `typoDA` (le texte),
// et né du même comptage. Mesuré le 2026-08-06 :
//
//   • **520 espacements écrits à la main pour 49 usages de `Spacing`** — dix
//     marges en dur pour une seule qui passait par le token ;
//   • **231 valeurs hors grille**, la plus courue étant 10 (70 fois), devant
//     14 (53), 6 (39), 2 (39) ;
//   • une carte de repas empilait cinq écarts verticaux — 7, 6, 10, 6, 14 —
//     dont AUCUN dans l'échelle. Quatre informations y flottaient à des
//     distances presque égales, donc rien ne disait à l'œil ce qui allait
//     ensemble. C'est ça, le coût réel : pas « moins joli », **plus lent à
//     comprendre**.
//
// ⚠️ Contrairement à la typographie, les valeurs hors grille ont été ABSORBÉES
// et non adoptées. Là-bas, 14 avait un rôle propre (le texte secondaire) et a
// mérité son token. Ici, 10 n'est pas « un cran entre 8 et 12 » : c'est « un peu
// plus que 8 ». Deux points d'écart passent sous le seuil de perception, donc un
// tel cran ne crée aucun niveau de lecture — il dilue ceux qui existent.
//
// LA RÈGLE : tout espacement passe par `Spacing`, sauf 0 (qui n'est pas un
// espacement mais son absence — `padding: 0` annule le padding natif d'un champ).

const RACINE = join(__dirname, '..', '..');
const DOSSIERS = ['app', 'components'];

const PROPS = [
  'padding', 'paddingHorizontal', 'paddingVertical', 'paddingTop', 'paddingBottom',
  'paddingLeft', 'paddingRight', 'margin', 'marginHorizontal', 'marginVertical',
  'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'gap', 'rowGap', 'columnGap',
];

function fichiersTsx(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...fichiersTsx(p));
    else if (e.endsWith('.tsx')) out.push(p);
  }
  return out;
}

/** Valeur en points d'une propriété, qu'elle soit écrite en token ou en chiffre. */
function pt(bloc: string, prop: string): number | null {
  const m = bloc.match(
    new RegExp(`\\b${prop}:\\s*(?:Spacing\\.([a-z]+)|(CIBLE_TACTILE_MIN)|(\\d+))`)
  );
  if (!m) return null;
  if (m[1]) return (Spacing as Record<string, number>)[m[1]] ?? null;
  if (m[2]) return CIBLE_TACTILE_MIN;
  return parseInt(m[3], 10);
}

/**
 * Fin de la balise OUVRANTE commencée en `depart` — l'index de son VRAI `>`.
 *
 * 🔴 POURQUOI CE N'EST PLUS UNE REGEX (2026-08-26). La version d'avant lisait la
 * balise avec `<Presse\b[\s\S]{0,400}?>` — un `>` paresseux. Or une balise JSX
 * est pleine de `>` qui ne la ferment pas, et le plus courant de tous est la
 * **flèche d'une fonction anonyme** :
 *
 *     <Presse onPress={() => setShowAdd(false)} style={s.cancel}>
 *              ────────────────┘ la capture s'arrêtait ICI
 *
 * Le nom `cancel` n'était donc jamais collecté, et le bouton **jamais mesuré**.
 * Ça vise exactement les boutons les plus banals de l'app : ceux dont le premier
 * attribut est un `onPress={() => …}`. Mesuré ce jour-là : le « Annuler » des
 * trois feuilles de la Réserve fait ~36 pt et passait VERT depuis toujours. Ce
 * qui l'a révélé, c'est le CONTRASTE — le même style écrit sans flèche dans un
 * autre écran a été signalé au premier lancement. Deux sites identiques dont un
 * seul est accusé n'accusent pas le code : ils accusent la sonde.
 *
 * ⚠️ Et la borne de 400 caractères tombe avec : ce dépôt commente DANS les
 * balises (parfois vingt lignes), donc un `style=` écrit après le commentaire
 * sortait du champ de vision sans que rien ne le dise.
 *
 * Le balayage suit donc la profondeur des accolades, saute les chaînes et les
 * commentaires, et s'arrête au premier `>` de niveau zéro. `-1` si la balise
 * n'est jamais fermée (fichier tronqué).
 */
function finDeBalise(src: string, depart: number): number {
  let profondeur = 0;
  let chaine: string | null = null;
  for (let k = depart + 1; k < src.length; k++) {
    const c = src[k];
    const suivant = src[k + 1];
    if (chaine) {
      if (c === '\\') { k++; continue; }
      if (c === chaine) chaine = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { chaine = c; continue; }
    // Commentaires : ce dépôt en met dans les balises, et ils contiennent des `>`.
    if (c === '/' && suivant === '/') {
      const nl = src.indexOf('\n', k);
      if (nl < 0) return -1;
      k = nl;
      continue;
    }
    if (c === '/' && suivant === '*') {
      const fin = src.indexOf('*/', k + 2);
      if (fin < 0) return -1;
      k = fin + 1;
      continue;
    }
    if (c === '{' || c === '(' || c === '[') { profondeur++; continue; }
    if (c === '}' || c === ')' || c === ']') { profondeur--; continue; }
    if (c === '>' && profondeur === 0) return k;
  }
  return -1;
}

/**
 * Le contenu de l'attribut `style` d'une balise — accolades équilibrées.
 *
 * ⚠️ Une regex ne suffit pas non plus ici : `style={[s.row, first && { ... }]}`
 * contient des accolades imbriquées, et `[^}]*` s'arrête à la première fermante.
 */
function valeurDuStyle(balise: string): string | null {
  const i = balise.indexOf('style={');
  if (i < 0) return null;
  const depart = i + 'style='.length;
  let profondeur = 0;
  for (let k = depart; k < balise.length; k++) {
    if (balise[k] === '{') profondeur++;
    else if (balise[k] === '}') {
      profondeur--;
      if (profondeur === 0) return balise.slice(depart + 1, k);
    }
  }
  return null;
}

/**
 * Les noms de styles RÉFÉRENCÉS par une balise (`s.cancel`, `s.ctrlOn`…).
 *
 * 🔴 UN NOM DE STYLE EST UNE RÉFÉRENCE, JAMAIS UNE VALEUR DE PROPRIÉTÉ — et
 * confondre les deux fait mentir la sonde dans le sens ALARMANT. La collecte
 * balayait toute la balise : elle ramassait donc `t.fill`, `t.card`, `t.line`,
 * qui sont des couleurs. Or `fill` est AUSSI le nom d'un style dans plusieurs
 * fichiers (le remplissage d'une jauge, haut de 4 pt) — et une jauge de 4 pt
 * accusée d'être un bouton trop petit, c'est un test qu'on finit par désactiver.
 *
 * ➡️ On ne lit que l'attribut `style`, et on en RETIRE les objets littéraux
 * avant de chercher les références : ce qui reste (`s.x`, un élément de tableau,
 * une branche de ternaire) ne peut être qu'un style nommé.
 */
function stylesReferences(balise: string): string[] {
  const valeur = valeurDuStyle(balise);
  if (!valeur) return [];
  // Retirer les objets littéraux — ils sont mesurés à part, et c'est là que
  // vivent les couleurs (`{ backgroundColor: t.fill }`).
  let sansObjets = valeur;
  for (let garde = 0; garde < 20; garde++) {
    const suivant = sansObjets.replace(/\{[^{}]*\}/g, ' ');
    if (suivant === sansObjets) break;
    sansObjets = suivant;
  }
  return [...sansObjets.matchAll(/\b[A-Za-z_$][\w$]*\.([A-Za-z][\w$]*)/g)].map((m) => m[1]);
}

/**
 * Le contenu d'un pressable — ce qu'il y a entre sa balise et sa fermante.
 * Vide s'il est auto-fermant. Tient compte des pressables imbriqués.
 */
function corpsDuPressable(src: string, nom: string, finBalise: number): string {
  if (src[finBalise - 1] === '/') return '';
  const ouvre = new RegExp(`<${nom}\\b`, 'g');
  const ferme = new RegExp(`</${nom}\\s*>`, 'g');
  ouvre.lastIndex = finBalise;
  ferme.lastIndex = finBalise;
  let profondeur = 1;
  let curseur = finBalise;
  while (profondeur > 0) {
    ferme.lastIndex = curseur;
    const f = ferme.exec(src);
    if (!f) return src.slice(finBalise + 1);
    ouvre.lastIndex = curseur;
    let o = ouvre.exec(src);
    while (o && o.index < f.index) { profondeur++; o = ouvre.exec(src); }
    profondeur--;
    curseur = f.index + f[0].length;
    if (profondeur === 0) return src.slice(finBalise + 1, f.index);
  }
  return '';
}

/** Les pressables d'un fichier : balise entière, position, et contenu. */
function pressables(src: string): { balise: string; index: number; corps: string }[] {
  const out: { balise: string; index: number; corps: string }[] = [];
  for (const m of src.matchAll(/<(TouchableOpacity|Pressable|TouchableHighlight|Presse)\b/g)) {
    const fin = finDeBalise(src, m.index!);
    if (fin < 0) continue;
    out.push({
      balise: src.slice(m.index!, fin + 1),
      index: m.index!,
      corps: corpsDuPressable(src, m[1], fin),
    });
  }
  return out;
}

/**
 * Le contenu de ce pressable tient-il sur UNE ligne ?
 *
 * 🔴 C'EST LA CONDITION DE VALIDITÉ DE L'ESTIMATION, et l'oublier fait accuser
 * des boutons parfaitement grands. `2 × paddingVertical + une ligne` suppose une
 * seule ligne de contenu. Le sélecteur de jour de l'écran Plan empile trois
 * enfants — jour, pastille de 40, emplacement de la lune — pour **~97 pt réels**
 * avec un `paddingVertical: 4`. Mesuré à 28 pt par l'estimation, il sortait en
 * tête de la liste des fautifs : un signalement faux sur un écran principal, et
 * c'est comme ça qu'un test finit désactivé.
 *
 * ➡️ Une rangée (`flexDirection: 'row'`) reste sur une ligne, quel que soit le
 * nombre d'enfants — c'est le patron « icône + libellé », le plus courant de
 * l'app. Une colonne qui porte DEUX éléments ou plus, non : sa hauteur vient de
 * ses enfants, pas de son padding, et ce test ne sait pas la calculer.
 * ⚠️ Ceux-là ne sont pas perdus pour autant : une hauteur EXPLICITE
 * (`height` / `minHeight`) reste mesurée, elle ne dépend d'aucune estimation.
 */
function surUneLigne(corps: string, bloc: string): boolean {
  if (/flexDirection:\s*'row'/.test(bloc)) return true;
  return (corps.match(/<[A-Z]/g) ?? []).length < 2;
}

// Un bouton sans hauteur explicite mesure 2 × paddingVertical + sa ligne de
// texte. On compte la ligne à 20 pt (corps 15-17, interligne ~1,2) : c'est
// OPTIMISTE, donc ce que ce test trouve est réellement trop petit.
// ⚠️ `hitSlop` élargit la zone au doigt mais pas à l'œil — un bouton qui a
// l'air petit reste difficile à viser, donc il ne compte pas comme un fix.
const LIGNE = 20;

/**
 * Les pressables d'UNE source dont la cible tactile tombe sous 44 pt.
 *
 * ⚠️ Elle prend une SOURCE, pas un chemin, et c'est ce qui permet de lui faire
 * dire OUI et NON sur des cas écrits exprès (dernier `it` du fichier). Une sonde
 * qu'on ne lance que sur le dépôt ne peut être jugée que par ce qu'elle trouve —
 * or ce qu'on cherche à savoir, c'est ce qu'elle NE trouve PAS.
 */
function tropPetits(src: string): string[] {
  const petits: string[] = [];
  // nom du style → contenu du pressable qui le porte (pour `surUneLigne`).
  const noms = new Map<string, string>();

  for (const { balise, index, corps } of pressables(src)) {
    for (const nom of stylesReferences(balise)) if (!noms.has(nom)) noms.set(nom, corps);
    // ⚠️ LIMITE ASSUMÉE : seul un style écrit ENTIÈREMENT en ligne
    // (`style={{ … }}`) est mesuré ici. Un fragment glissé dans un tableau
    // (`style={[s.x, { paddingVertical: … }]}`) ne l'est pas : il faudrait
    // rejouer la cascade, et les fragments conditionnels ne s'appliquent pas
    // toujours — on mesurerait un bouton qui n'existe pas. Compté le 2026-08-26 :
    // AUCUN fragment de ce genre ne touche à une hauteur dans `app/` ni
    // `components/`, donc la limite ne cache rien aujourd'hui.
    const inline = balise.match(/style=\{\{([^}]*)\}\}/);
    if (!inline) continue;
    const h = pt(inline[1], 'height') ?? pt(inline[1], 'minHeight');
    const pv = surUneLigne(corps, inline[1]) ? pt(inline[1], 'paddingVertical') : null;
    const haut = h ?? (pv != null ? 2 * pv + LIGNE : null);
    if (haut != null && haut < CIBLE_TACTILE_MIN) {
      petits.push(`:${src.slice(0, index).split('\n').length} (inline) ~${haut} pt`);
    }
  }

  for (const [nom, corps] of noms) {
    const def = src.match(new RegExp(`\\b${nom}:\\s*\\{([^{}]*)\\}`));
    if (!def) continue;
    const h = pt(def[1], 'height') ?? pt(def[1], 'minHeight');
    const pv = surUneLigne(corps, def[1]) ? pt(def[1], 'paddingVertical') : null;
    if (h == null && pv == null) continue;
    const haut = h ?? 2 * pv! + LIGNE;
    if (haut < CIBLE_TACTILE_MIN) {
      petits.push(` — ${nom} ~${haut} pt : ${def[1].trim().slice(0, 60)}`);
    }
  }
  return petits;
}

describe('Espacement — le blanc est un token, pas un chiffre', () => {
  const enDur: string[] = [];

  for (const d of DOSSIERS) {
    for (const f of fichiersTsx(join(RACINE, d))) {
      readFileSync(f, 'utf8').split('\n').forEach((ligne, i) => {
        for (const prop of PROPS) {
          const re = new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`, 'g');
          let m: RegExpExecArray | null;
          while ((m = re.exec(ligne))) {
            // 0 n'est pas un espacement, c'est son absence.
            if (parseFloat(m[1]) === 0) continue;
            enDur.push(`${f.slice(RACINE.length + 1)}:${i + 1} — ${prop}: ${m[1]}  ${ligne.trim().slice(0, 70)}`);
          }
        }
      });
    }
  }

  it('aucun espacement en dur — tout passe par Spacing ou Fond', () => {
    expect(enDur, enDur.join('\n')).toEqual([]);
  });

  it("l'échelle est une grille de 4, et chaque cran a un rôle", () => {
    const vals = Object.values(Spacing);
    expect(vals.every((v) => v % 4 === 0), `hors grille : ${vals.filter((v) => v % 4 !== 0)}`).toBe(true);
    // Croissante et sans doublon : deux crans de même valeur, c'est un cran sans rôle.
    expect([...vals].sort((a, b) => a - b)).toEqual(vals);
    expect(new Set(vals).size).toBe(vals.length);
    // Les dégagements de bas ne sont PAS des écarts de mise en page : ils
    // compensent quelque chose de physique et se nomment d'après ça.
    expect(Object.keys(Fond).sort()).toEqual(['barreOnglets', 'ecran', 'feuille']);
  });

  it('🔴 aucun élément pressable sous la cible tactile de 44 pt', () => {
    const petits: string[] = [];
    for (const d of DOSSIERS) {
      for (const f of fichiersTsx(join(RACINE, d))) {
        const court = f.slice(RACINE.length + 1);
        petits.push(...tropPetits(readFileSync(f, 'utf8')).map((l) => `${court}${l}`));
      }
    }
    expect(petits, petits.join('\n')).toEqual([]);
  });

  // ── LA SONDE SE FAIT DIRE OUI, PUIS NON ────────────────────────────────
  //
  // 🔴 Le test ci-dessus a passé au VERT pendant des mois sans rien mesurer sur
  // toute une famille de boutons (2026-08-26). Sa capture de balise s'arrêtait au
  // premier `>` — donc sur la FLÈCHE d'un `onPress={() => …}`, l'attribut le plus
  // banal de l'app. Il n'y avait aucun signal : un test qui ne trouve rien
  // ressemble exactement à un test que tout satisfait.
  //
  // ➡️ Ces deux `it` sont la contre-épreuve, et ils portent les TROIS angles morts
  // fermés ce jour-là. Chacun a été vérifié en le rejouant contre l'ancienne
  // capture, qui rend 0 sur les trois.
  it('🔴 la sonde dit OUI sur les trois écritures qui l’aveuglaient', () => {
    // ① La flèche : elle fermait la balise, donc `s.cancel` n'était jamais lu.
    const fleche = `
      <Presse onPress={() => setOuvert(false)} style={s.cancel}><Text>Annuler</Text></Presse>
      const st = StyleSheet.create({ cancel: { alignItems: 'center', paddingVertical: Spacing.sm } });
    `;
    expect(tropPetits(fleche), 'la flèche referme encore la balise').toHaveLength(1);

    // ② L'objet de styles à nom LONG : l'ancienne collecte exigeait UNE lettre
    //    (`s.`), donc `styles.clear` passait sous le radar dans tout un fichier.
    const nomLong = `
      <Presse onPress={vider} style={styles.clear}><Text>Effacer</Text></Presse>
      const styles = StyleSheet.create({ clear: { alignSelf: 'flex-start', paddingVertical: Spacing.xs } });
    `;
    expect(tropPetits(nomLong), 'un objet de styles au nom long reste invisible').toHaveLength(1);

    // ③ Le commentaire DANS la balise : ce dépôt en met vingt lignes, et
    //    l'ancienne borne de 400 caractères coupait avant le `style=`.
    const long = `
      <Presse
        onPress={vider}
        // ${'x'.repeat(430)}
        style={s.mini}
      ><Text>Ok</Text></Presse>
      const st = StyleSheet.create({ mini: { paddingVertical: Spacing.xs } });
    `;
    expect(tropPetits(long), 'un style écrit après un long commentaire échappe encore').toHaveLength(1);

    // Et le cas le plus simple, pour que l'échec d'un des trois ne puisse pas
    // être confondu avec une sonde globalement muette.
    expect(tropPetits(`
      <Presse style={{ paddingVertical: Spacing.sm }}><Text>Ok</Text></Presse>
    `)).toHaveLength(1);
  });

  it('🔴 … et NON sur ce qui est assez grand, ou qu’elle ne sait pas mesurer', () => {
    // Un bouton à la bonne taille.
    expect(tropPetits(`
      <Presse style={s.ok}><Text>Ok</Text></Presse>
      const st = StyleSheet.create({ ok: { minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center' } });
    `)).toEqual([]);

    // 🔴 UNE COLONNE QUI EMPILE : son padding ne dit RIEN de sa hauteur. C'est le
    // sélecteur de jour de l'écran Plan — ~97 pt réels, accusé à 28 pt par
    // l'estimation tant qu'elle s'appliquait à tout le monde.
    expect(tropPetits(`
      <Presse style={s.day}>
        <Text>{jour}</Text>
        <View style={s.dot}><Text>{num}</Text></View>
        <View style={s.moon} />
      </Presse>
      const st = StyleSheet.create({ day: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs } });
    `), 'une colonne empilée est accusée sur la foi de son padding').toEqual([]);

    // Une RANGÉE, elle, tient sur une ligne quel que soit le nombre d'enfants :
    // le patron « icône + libellé » doit rester mesuré.
    expect(tropPetits(`
      <Presse style={s.ctrl}>
        <Ionicons name="add" />
        <Text>Ajouter</Text>
      </Presse>
      const st = StyleSheet.create({ ctrl: { flexDirection: 'row', paddingVertical: Spacing.sm } });
    `), 'une rangée icône + libellé a cessé d’être mesurée').toHaveLength(1);

    // 🔴 Une COULEUR n'est pas un nom de style. `t.fill` vit dans un objet
    // littéral ; `fill` est par ailleurs le remplissage d'une jauge, haut de
    // 4 pt. Les confondre accusait une jauge d'être un bouton trop petit.
    expect(tropPetits(`
      <Presse style={[s.grand, { backgroundColor: t.fill }]}><Text>Ok</Text></Presse>
      const st = StyleSheet.create({
        grand: { minHeight: CIBLE_TACTILE_MIN },
        fill: { height: 4, backgroundColor: t.accent },
      });
    `), 'un token de couleur est encore pris pour un nom de style').toEqual([]);
  });
});
