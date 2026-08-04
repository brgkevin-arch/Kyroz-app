#!/usr/bin/env node
/**
 * `npm run deploy` — ne déploie rien, et le DIT (chantier E9).
 *
 * Avant le 2026-08-03, cette entrée valait `gh-pages -d dist` : elle poussait sur la
 * branche `origin/gh-pages`, affichait « Published », et n'avait **aucun effet sur le
 * site**. GitHub Pages est configuré en `build_type: workflow` depuis le passage aux
 * Actions — il sert l'artefact du workflow, pas cette branche.
 *
 * Ce n'est pas une subtilité théorique : le 2026-08-02, ce script a produit un
 * diagnostic entièrement faux (« le site a un mois de retard », cf. AGENTS.md A12),
 * d'autant plus dur à démonter que le site SE METTAIT bien à jour — par le `git push`
 * vers `main` lancé au même moment.
 *
 * Supprimer l'entrée aurait donné « Missing script: deploy » : honnête, mais ça
 * n'apprend rien à qui croyait déployer. Elle explique donc le vrai chemin, montre le
 * dernier déploiement réel, et **sort en erreur** — pour qu'aucun script, et aucun
 * humain pressé, ne puisse la prendre pour un succès.
 */
import { execSync } from 'node:child_process';

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const gras = (s) => `\x1b[1m${s}\x1b[0m`;

console.log(`
${gras('❌ Cette commande ne déploie rien.')} Elle existe pour le dire.

Le site part ${gras('automatiquement à chaque push sur `main`')} : GitHub Actions
(.github/workflows/deploy.yml) lance tsc, les tests, \`expo export -p web\`, puis
publie \`kyroz-app/dist\`. Il n'y a pas d'étape manuelle.

  ${gras('Pour déployer  →')} git push origin main
  ${gras('Pour vérifier  →')} gh run list --workflow=deploy.yml

${dim('⚠️  `origin/gh-pages` est une branche MORTE. Pages est en build_type: workflow,')}
${dim('    donc y pousser ne change rien au site — c\'est ce que faisait cette commande.')}
${dim('    Pour exporter le bundle web en local : npm run build:web')}
`);

try {
  const out = execSync(
    'gh run list --workflow=deploy.yml --limit 3 --json status,conclusion,headBranch,createdAt,displayTitle',
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  const runs = JSON.parse(out);
  if (runs.length) {
    console.log(gras('Derniers déploiements RÉELS :'));
    for (const r of runs) {
      const etat = r.status === 'completed' ? (r.conclusion === 'success' ? '✅' : '❌') : '⏳';
      const quand = r.createdAt.slice(0, 16).replace('T', ' ');
      console.log(`  ${etat} ${quand}  ${r.headBranch.padEnd(6)}  ${r.displayTitle.slice(0, 58)}`);
    }
    console.log('');
  }
} catch {
  console.log(dim('(gh CLI indisponible — `gh run list --workflow=deploy.yml` pour l\'état réel)\n'));
}

// Sortie NON NULLE à dessein : le piège d'origine était un script qui « réussissait »
// sans rien faire. Un code de retour en erreur rend cette confusion impossible.
process.exit(1);
