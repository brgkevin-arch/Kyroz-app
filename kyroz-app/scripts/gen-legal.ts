/**
 * Le texte légal, écrit UNE fois — rendu partout ailleurs.
 *
 * ── Pourquoi ce script existe (recensement du 2026-08-18) ────────────────────
 * Le même texte vivait en SIX exemplaires recopiés à la main. Deux mentaient en
 * production au moment du recensement :
 *   • `docs/politique-confidentialite-kyroz.md` — 10 sections contre 11, § Mineurs
 *     absente, et des gabarits `[Nom / Raison sociale]` / `[Adresse postale]` jamais
 *     remplis. Divergence datée du 2026-08-05, jamais rattrapée.
 *   • `https://kyroz.app/legal.html` (dépôt `kyroz-site`) — figée au 15 juin 2026 :
 *     Resend absent des sous-traitants alors qu'il traite depuis le 2026-08-09, et
 *     un § Mineurs annonçant **16 ans** quand l'app en bloque **18**
 *     (`lib/safety.ts::MIN_AGE`). Un garde-fou dur, promis dans une autre valeur que
 *     celle du produit, sur la page publique que les stores lisent.
 *
 * ⚠️ Le garde-fou d'avant DÉTECTAIT la dérive au lieu de l'empêcher : l'ancien
 * `legal.test.ts` vérifiait que chaque paragraphe de la source se retrouvait dans le
 * miroir HTML. Il a tenu — mais il ne pouvait rien dire des deux surfaces qu'il ne
 * connaissait pas, et un test qui rougit suppose encore quelqu'un pour recopier
 * juste. ➡️ Une copie qu'on RÉGÉNÈRE ne peut pas diverger ; une copie qu'on relit,
 * si.
 *
 * ── Contrat ─────────────────────────────────────────────────────────────────
 * Source unique : `constants/legal.ts` (`LEGAL`, `PRIVACY_POLICY`, `TERMS_OF_USE`).
 * Tout le reste se fabrique ici. Ne JAMAIS éditer un fichier généré à la main :
 * la prochaine génération l'écrase sans le dire.
 *
 *   npm run gen:legal            écrit les fichiers
 *   npm run gen:legal -- --check n'écrit rien, sort en CODE 1 si un fichier a dérivé
 *
 * Le `--check` tourne dans `lib/__tests__/legal.test.ts` : oublier de régénérer fait
 * échouer `npm test`, pas la revue de quelqu'un.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEGAL, PRIVACY_POLICY, TERMS_OF_USE, type LegalSection } from '../constants/legal';

const RACINE = join(__dirname, '..');

/** Les surfaces fabriquées depuis la source. Une entrée = un fichier que personne
 *  ne réécrit plus à la main. `kyroz-site` n'est pas là : dépôt séparé, non cloné
 *  ici — voir la note en fin de fichier. */
export const CIBLES = {
  html: join(RACINE, 'public/legal.html'),
  markdown: join(RACINE, '../docs/politique-confidentialite-kyroz.md'),
} as const;

const echapHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const sectionsHtml = (sections: LegalSection[]) =>
  sections
    .map(
      (sec) =>
        `    <h2>${echapHtml(sec.title)}</h2>\n` +
        sec.paragraphs.map((p) => `    <p>${echapHtml(p)}</p>`).join('\n')
    )
    .join('\n\n');

/**
 * La page publique servie en HTTP 200 — l'URL de politique de confidentialité exigée
 * par l'App Store et Google Play.
 *
 * ⚠️ SA RAISON D'ÊTRE A CHANGÉ, ET LA PHRASE D'AVANT ÉTAIT FAUSSE (mesuré le
 * 2026-08-18). Elle disait : « elle existe parce que le web est exporté en SPA :
 * `/legal` y renverrait un 404 ». Or `app.json` porte `web.output: "static"` — Expo
 * Router **pré-rend une page HTML par route**, donc `/legal` répond 200 tout seul, et
 * le `dist/legal.html` qu'il génère **écrase** ce fichier-ci. Vérifié sur la page
 * réellement servie par le Pages de l'app : zéro marqueur de ce fichier
 * (`class="wrap"`, `class="logo"`), un marqueur de bundle Expo. Elle n'a donc JAMAIS
 * été servie là-bas depuis le passage en `static`.
 *
 * ➡️ Son vrai consommateur est `kyroz.app/legal.html` (dépôt `kyroz-site`), URL
 * canonique déclarée aux stores depuis le 2026-08-18 : un Pages purement statique, où
 * rien ne l'écrase. Le contenu, lui, n'a jamais menti — les deux surfaces sortent de
 * la même source, ce qui a rendu la prémisse périmée totalement indolore… et donc
 * invisible pendant des mois. Une justification ne se relit pas quand ce qu'elle
 * justifie a l'air juste.
 */
export function renderHtml(): string {
  return `<!doctype html>
<!--
  ⚠️ FICHIER GÉNÉRÉ — NE PAS ÉDITER À LA MAIN.
  Source : constants/legal.ts · Régénérer : npm run gen:legal
  Toute correction se fait dans la source, jamais ici : la prochaine génération
  écraserait cette page sans prévenir.

  Sa raison d'être : servir l'URL PUBLIQUE de politique de confidentialité déclarée
  aux stores — https://kyroz.app/legal.html — depuis le dépôt kyroz-site, un Pages
  statique. L'app garde son écran in-app (/legal), rendu depuis la même source.

  ⚠️ Ce fichier n'est PAS ce que sert le Pages de l'app : web.output "static" fait
  pré-rendre la route /legal par Expo Router, et le HTML qu'il génère écrase celui-ci
  dans dist/. Les deux disent la même chose (même source), mais l'exemplaire servi
  sur github.io est le rendu de la route, pas cette page.
-->
<html lang="fr" translate="no">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="google" content="notranslate" />
  <title>Confidentialité &amp; CGU — ${echapHtml(LEGAL.appName)}</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; background: #000; color: rgba(255,255,255,0.85);
           font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
           line-height: 1.6; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 32px 20px 80px; }
    h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #fff; margin: 32px 0 4px; }
    h2 { font-size: 16px; font-weight: 700; color: #fff; margin: 24px 0 6px; }
    .updated { color: rgba(255,255,255,0.4); font-size: 13px; margin-bottom: 8px; }
    p { font-size: 15px; color: rgba(255,255,255,0.7); margin: 0 0 10px; }
    hr { border: none; border-top: 1px solid rgba(255,255,255,0.12); margin: 36px 0; }
    .logo { font-size: 22px; font-weight: 900; letter-spacing: 4px; color: #fff; }
    a { color: #fff; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="logo">${echapHtml(LEGAL.appName.toUpperCase())}</div>

    <h1>Politique de confidentialité</h1>
    <p class="updated">Dernière mise à jour : ${echapHtml(LEGAL.effectiveDate)}</p>

${sectionsHtml(PRIVACY_POLICY)}

    <hr />

    <h1>Conditions générales d'utilisation</h1>

${sectionsHtml(TERMS_OF_USE)}
  </div>
</body>
</html>
`;
}

/**
 * La version markdown, destinée à une lecture hors app (dépôt, pièce jointe, envoi
 * à un juriste). Elle ne porte que la POLITIQUE — son nom de fichier le dit, et les
 * CGU ont déjà deux surfaces.
 *
 * ⚠️ Ce fichier a perdu de la forme le jour où il est devenu généré : il tutoyait,
 * découpait en listes à puces et comptait 10 sections quand l'app en servait 11.
 * C'était joli et c'était FAUX — la § Mineurs manquait, alors que le blocage des
 * moins de 18 ans est un garde-fou dur du produit. Une mise en forme propre à une
 * seule copie est exactement ce qui permet à cette copie de dériver.
 */
export function renderMarkdown(): string {
  const corps = PRIVACY_POLICY.map(
    (sec) => `## ${sec.title}\n\n${sec.paragraphs.join('\n\n')}`
  ).join('\n\n---\n\n');

  return `<!-- ⚠️ FICHIER GÉNÉRÉ — NE PAS ÉDITER À LA MAIN.
     Source : kyroz-app/constants/legal.ts · Régénérer : cd kyroz-app && npm run gen:legal
     Ce document a divergé de l'app du 2026-08-05 au 2026-08-18 (10 sections contre 11,
     § Mineurs absente, gabarits jamais remplis). Il ne peut plus : il se fabrique. -->

# Politique de confidentialité — ${LEGAL.appName}

**Dernière mise à jour : ${LEGAL.effectiveDate}**

---

${corps}
`;
}

const RENDUS: Record<keyof typeof CIBLES, () => string> = {
  html: renderHtml,
  markdown: renderMarkdown,
};

function main(): void {
  const check = process.argv.includes('--check');
  const derives: string[] = [];

  // La cible « site » n'entre dans la liste que si le clone est là. Elle ne peut pas
  // rejoindre `CIBLES` : le test compare les fichiers versionnés de CE dépôt, et une
  // cible qui apparaît selon l'environnement rendrait ce test dépendant de la machine.
  const cheminSite = process.env.KYROZ_SITE;
  const cibles: [string, string, () => string][] = [
    ...Object.entries(CIBLES).map(
      ([nom, chemin]) => [nom, chemin, RENDUS[nom as keyof typeof CIBLES]] as [string, string, () => string]
    ),
    ...(cheminSite ? ([['site', join(cheminSite, 'legal.html'), renderHtml]] as [string, string, () => string][]) : []),
  ];
  if (!cheminSite) {
    console.log("  · site      ignoré — pose KYROZ_SITE sur le clone de `kyroz-site` pour l'inclure");
  }

  for (const [nom, chemin, rendre] of cibles) {
    const attendu = rendre();
    const actuel = (() => {
      try { return readFileSync(chemin, 'utf8'); } catch { return null; }
    })();

    if (actuel === attendu) {
      console.log(`  = ${nom.padEnd(9)} à jour`);
      continue;
    }
    if (check) {
      derives.push(chemin);
      console.log(`  ✗ ${nom.padEnd(9)} A DÉRIVÉ — ${chemin}`);
      continue;
    }
    writeFileSync(chemin, attendu, 'utf8');
    console.log(`  → ${nom.padEnd(9)} ${actuel === null ? 'créé' : 'régénéré'} — ${chemin}`);
  }

  if (derives.length) {
    console.error(
      `\n${derives.length} fichier(s) légaux ne correspondent plus à constants/legal.ts.\n` +
        `Corrige la SOURCE, puis : npm run gen:legal\n`
    );
    process.exit(1);
  }
}

// ── La sixième surface : `kyroz.app/legal.html` (dépôt séparé `kyroz-site`) ──────
//
// Arbitrage du 2026-08-18 : elle devient l'URL CANONIQUE déclarée aux stores — sur le
// domaine de la marque, sans le pseudo personnel de l'URL github.io — et elle CONSOMME
// le fichier généré au lieu d'en être une recopie. Elle mentait depuis deux mois
// (16 ans au lieu de 18, Resend absent) faute que personne ne la rouvre.
//
// ⚠️ CE PARAGRAPHE A DÉCRIT UN MONDE QUI N'EXISTAIT PAS — corrigé le 2026-08-18 au soir.
// Il disait « option écartée » : poser un domaine personnalisé sur le site Pages de l'app
// (`legal.kyroz.app`) redirigerait TOUT ce Pages, `confirme.html` compris — l'URL de retour
// de confirmation d'e-mail, codée en dur dans `lib/emailConfirmation.ts`, donc gravée dans
// les binaires déjà distribués, et en liste blanche Supabase. Un domaine personnalisé
// s'applique à un SITE, jamais à un fichier.
//
// 🔴 **Le raisonnement était juste ; le domaine, lui, était DÉJÀ POSÉ.** Il l'avait été
// avant cet arbitrage, et l'arbitrage a été écrit sans vérifier l'état réel. Mesuré :
// `https://brgkevin-arch.github.io/Kyroz-app/*` répond 301 vers `legal.kyroz.app/*`, et
// l'app web ne démarrait plus du tout (`baseUrl` pointant sur un sous-chemin disparu).
// ➡️ **Décision fondateur : garder le domaine, réparer le code** — `baseUrl` vidé, garde-fou
// dans `lib/__tests__/deploiementWeb.test.ts`.
// ➡️ Et la leçon qui vaut au-delà de ce fichier : une décision peut être impeccablement
// motivée et fausse quand même, parce que personne n'a mesuré ce qui était déjà en place.
//
// Ce que ça NE change PAS : l'URL canonique déclarée aux stores reste `kyroz.app/legal.html`
// (dépôt `kyroz-site`). Le Pages de l'app pré-rend sa propre `/legal` et écraserait le
// fichier ci-dessous — c'est précisément pourquoi la page publique vit dans l'autre dépôt.
//
// Le dépôt n'étant pas forcément cloné, la cible est OPTIONNELLE : pose `KYROZ_SITE`
// sur le chemin du clone et le fichier s'y écrit avec les autres.
//
//     KYROZ_SITE=~/kyroz-site npm run gen:legal
//
// Sans la variable, la génération réussit et le dit — mais le site reste sur la
// version précédente jusqu'au prochain passage.

// Auto-exécution en CLI seulement. Le garde `typeof` n'est pas décoratif : ce module
// est IMPORTÉ par `lib/__tests__/legal.test.ts`, et vitest peut le charger en ESM —
// où `require` n'existe pas et où un accès direct planterait à l'import.
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) main();
