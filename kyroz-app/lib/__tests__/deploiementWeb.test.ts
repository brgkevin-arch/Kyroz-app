import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Ce que le site web sert dépend d'un réglage qui ne vit PAS dans le dépôt — le
 * domaine personnalisé du GitHub Pages — et d'un réglage qui, lui, y vit :
 * `app.json > expo.experiments.baseUrl`. Les deux doivent dire la même chose.
 *
 * ── La panne qui a produit ce fichier (mesurée le 2026-08-18) ────────────────
 * Le Pages de l'app a reçu le domaine `legal.kyroz.app`. Un domaine personnalisé
 * s'applique à un SITE : la racine servie est passée de `/Kyroz-app/` à `/`, et
 * `brgkevin-arch.github.io/Kyroz-app/*` s'est mis à répondre 301 vers lui. Or
 * `baseUrl` valait toujours `/Kyroz-app`, donc le HTML servi appelait
 * `/Kyroz-app/_expo/static/js/web/entry-*.js` — **404**.
 * ➡️ Résultat à l'écran : le logo KYROZ et un spinner, indéfiniment. Le site public
 * n'a plus rien chargé du tout — ni consentement, ni mesure, ni plan.
 *
 * 🔴 **ET RIEN N'A ROUGI.** La CI était verte : le build était juste, c'est le sol
 * qui avait bougé sous lui. `deploy.yml` déploie un artefact, il ne visite pas la
 * page. Un déploiement vert ne dit rien de ce que voit un navigateur — ce test est
 * ce qui reste quand on ne peut pas visiter la page depuis la CI.
 *
 * ── L'état ACTUEL, et pourquoi il a changé une seconde fois (2026-08-18, soir) ──
 * Le domaine a d'abord été gardé (`baseUrl` vidé), puis **retiré** : `legal.kyroz.app`
 * reprend son rôle d'origine — servir la politique de confidentialité — et il ne peut
 * pas le faire tant qu'il est le domaine du site de l'app. Un nom d'hôte ne peut pas
 * être à la fois la maison d'une app et le raccourci vers une page.
 * ➡️ Le site est donc revenu sous `brgkevin-arch.github.io/Kyroz-app/`, et `baseUrl`
 * avec lui.
 *
 * ⚠️ **CE FICHIER EST UN COUPLAGE, PAS UNE PRÉFÉRENCE.** Les deux moitiés sont
 * inséparables, et le sens de la faute s'inverse selon l'hébergement :
 *   • servi sous `…github.io/Kyroz-app/` → `baseUrl` DOIT valoir `/Kyroz-app` ;
 *   • servi à la racine d'un domaine personnalisé → `baseUrl` DOIT être vide.
 * N'en changer qu'une remet exactement la même page blanche, dans un sens ou dans
 * l'autre. Ce test est là pour que personne ne puisse en oublier une.
 */

const RACINE = join(__dirname, '../..');

/**
 * Le préfixe sous lequel GitHub Pages sert `dist/`.
 *
 * 🔴 **À CHANGER EN MÊME TEMPS QUE LE RÉGLAGE GITHUB, JAMAIS SEUL.** Si un domaine
 * personnalisé est un jour reposé sur le Pages de l'app, la racine redevient `/` et
 * cette constante doit passer à `''` — dans le même commit que `app.json`.
 */
const PREFIXE_SERVI = '/Kyroz-app';

const APP = JSON.parse(readFileSync(join(RACINE, 'app.json'), 'utf8')) as {
  expo: { experiments?: { baseUrl?: string } };
};

const DEPLOY = readFileSync(join(RACINE, '../.github/workflows/deploy.yml'), 'utf8');

describe('le `baseUrl` décrit la racine RÉELLEMENT servie', () => {
  it(`vaut « ${PREFIXE_SERVI} »`, () => {
    // Toute autre valeur préfixe les URL d'assets d'un chemin qui n'existe pas là où
    // le site est servi — donc un 404 sur le bundle, donc une page qui ne dépasse
    // jamais le splash. C'est vrai dans les deux sens : trop de préfixe comme pas assez.
    expect(
      APP.expo.experiments?.baseUrl ?? '',
      `le site est servi sous « ${PREFIXE_SERVI}/ » : un baseUrl différent y rend le bundle 404`,
    ).toBe(PREFIXE_SERVI);
  });
});

describe('le forçage du français ne peut plus échouer en silence', () => {
  // ⚠️ L'étape d'origine ne traitait que `dist/index.html` et cherchait
  // `<html lang="en">` avec UNE espace là où Expo en écrit DEUX. Un `sed` qui ne
  // trouve pas sa cible sort en 0 : la substitution est morte pendant des semaines
  // sans qu'aucune ligne ne rougisse, et `AGENTS.md` la documentait comme active.

  it('passe sur TOUTES les pages pré-rendues, pas seulement index.html', () => {
    // `web.output: "static"` pré-rend une page par route — 22 au dernier export.
    // Viser index.html seul laisse `legal.html`, `recettes.html` et les autres en anglais.
    expect(DEPLOY).toMatch(/find dist -name '\*\.html'/);
  });

  it('tolère les espaces que Expo écrit dans la balise', () => {
    expect(DEPLOY).toMatch(/<html\[\[:space:\]\]\*lang="en">/);
  });

  it('VÉRIFIE le résultat, et fait échouer le build sinon', () => {
    // Le cœur du correctif : sans cette vérification, l'étape peut redevenir muette
    // au prochain changement de forme de la balise. Et elle contrôle une PRÉSENCE
    // (`lang="fr"` attendu) et non une absence (`lang="en"` redouté) — une absence
    // laissait passer `lang="en-US"`, c'est-à-dire la panne d'origine déguisée.
    expect(DEPLOY).toContain('<html lang="fr" translate="no">');
    expect(DEPLOY).toMatch(/exit 1/);
  });
});
