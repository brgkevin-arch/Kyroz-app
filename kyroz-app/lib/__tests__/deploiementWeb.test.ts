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
 * ⚠️ **CE FICHIER EST UN COUPLAGE, PAS UNE PRÉFÉRENCE.** Si le domaine personnalisé
 * est un jour RETIRÉ (le site redevient `brgkevin-arch.github.io/Kyroz-app/`), il
 * faut remettre `baseUrl: "/Kyroz-app"` **et** corriger l'attente ci-dessous, dans
 * le même commit. Les deux moitiés sont inséparables : n'en changer qu'une remet
 * exactement la même page blanche, dans l'autre sens.
 */

const RACINE = join(__dirname, '../..');

const APP = JSON.parse(readFileSync(join(RACINE, 'app.json'), 'utf8')) as {
  expo: { experiments?: { baseUrl?: string } };
};

const DEPLOY = readFileSync(join(RACINE, '../.github/workflows/deploy.yml'), 'utf8');

describe('le site est servi à la RACINE de son domaine', () => {
  it('ne déclare aucun `baseUrl`', () => {
    // Toute valeur non vide préfixerait les URL d'assets d'un sous-chemin qui
    // n'existe pas sur `legal.kyroz.app` — donc un 404 sur le bundle, donc une
    // page qui ne dépasse jamais le splash.
    const baseUrl = APP.expo.experiments?.baseUrl;
    expect(
      baseUrl ?? '',
      'le site est servi à la racine de legal.kyroz.app : un baseUrl y rend le bundle 404',
    ).toBe('');
  });
});

describe('le forçage du français ne peut plus échouer en silence', () => {
  // ⚠️ L'étape d'origine ne traitait que `dist/index.html` et cherchait
  // `<html lang="en">` avec UNE espace là où Expo en écrit DEUX. Un `sed` qui ne
  // trouve pas sa cible sort en 0 : la substitution est morte pendant des semaines
  // sans qu'aucune ligne ne rougisse, et `AGENTS.md` la documentait comme active.

  it('passe sur TOUTES les pages pré-rendues, pas seulement index.html', () => {
    // `web.output: "static"` pré-rend une page par route : viser index.html seul
    // laisse `legal.html`, `plan.html` et les autres en anglais.
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
