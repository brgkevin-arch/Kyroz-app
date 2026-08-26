// Ce que les fiches annoncent est-il ce qui TOURNE réellement chez les testeurs ?
//
// Pourquoi ce script existe : `fichesOta.test.ts` vérifie que `AGENTS.md` et
// `STORE-RELEASE.md` racontent la même OTA — mais deux copies peuvent s'accorder
// et être fausses TOUTES LES DEUX, il suffit qu'une session publie sans
// documenter. Le dépôt ne sait rien du canal EAS, exactement comme il ne sait
// rien du schéma en prod (cf. `check:migrations`). Seule une requête le dit.
//
//   npm run check:ota
//
// Lecture seule : `channel:view` n'écrit rien, ne publie rien, ne déprécie rien.
//
// ⚠️ Il se lance depuis `kyroz-app/` — depuis la racine du monorepo, eas-cli rend
// « Run this command inside a project directory ».

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lireAgents, lireStore, desaccords, ligneOtaAgents, blocOtaStore, chaineOta, chaineDivergente, type FicheOta } from '../lib/otaFiches';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

let ko = 0;
const ligne = (quoi: string, vu: string, attendu: string) => {
  const ok = vu === attendu;
  if (!ok) ko++;
  console.log(`  ${ok ? '✓' : '✖'} ${quoi.padEnd(34)} ${vu}${ok ? '' : `   ≠ ${attendu}`}`);
};

// ── 1. Les deux fiches sont-elles d'accord entre elles ? ─────────────────────
console.log('\nLes deux fiches');
const agents = lireAgents(lire('AGENTS.md'));
const store = lireStore(lire('STORE-RELEASE.md'));
const ecarts = desaccords(agents, store);
if (ecarts.length) {
  ecarts.forEach((e) => console.log(`  ✖ ${e}`));
  ko += ecarts.length;
} else {
  console.log(`  ✓ AGENTS.md et STORE-RELEASE.md racontent la même OTA (la ${agents!.numero}ᵉ)`);
}

// L'HISTORIQUE aussi : les deux fiches ne s'accordent pas que sur la dernière.
// `STORE-RELEASE.md` remonte moins loin, donc l'invariant est le PRÉFIXE.
const ligneAgents = ligneOtaAgents(lire('AGENTS.md'));
const puce = blocOtaStore(lire('STORE-RELEASE.md'));
if (ligneAgents && puce) {
  const longue = chaineOta(ligneAgents);
  const courte = chaineOta(puce);
  const divergences = chaineDivergente(longue, courte);
  if (divergences.length) {
    divergences.forEach((d) => console.log(`  ✖ ${d}`));
    ko += divergences.length;
  } else {
    console.log(`  ✓ l’historique commun ne diverge pas (${courte.groupes.length} OTA de recouvrement sur ${longue.groupes.length})`);
  }
}

// Une fiche illisible ne peut PAS être confrontée à EAS : on s'arrête ici plutôt
// que de comparer `undefined` à un vrai groupe et d'annoncer un faux écart.
if (!agents) {
  console.error('\n✖ La ligne « OTA publiées » d’AGENTS.md est illisible — rien à confronter.');
  console.error('  Réparer la fiche (ou le motif de lib/otaFiches.ts) avant de mesurer.\n');
  process.exit(2);
}
const fiche: FicheOta = agents;

// ── 2. Ce que dit EAS ────────────────────────────────────────────────────────
type UpdateEas = {
  group: string;
  platform: string;
  runtimeVersion: string;
  gitCommitHash?: string;
  isGitWorkingTreeDirty?: boolean;
  createdAt: string;
};

let groupe: UpdateEas[];
try {
  const brut = execFileSync(
    'npx',
    ['eas-cli', 'channel:view', 'production', '--json', '--non-interactive'],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024 },
  );
  // eas-cli glisse parfois une bannière avant le JSON : on repart de la première
  // accolade. Si ça ne parse pas, on ÉCHOUE bruyamment — un catch silencieux
  // rendrait « aucun écart » sur une mesure qui n'a pas eu lieu.
  const json = JSON.parse(brut.slice(brut.indexOf('{')));
  groupe = json.currentPage.updateBranches[0].updateGroups[0];
  if (!Array.isArray(groupe) || !groupe.length) throw new Error('groupe vide');
} catch (e) {
  console.error(`\n✖ Impossible de lire le canal EAS : ${(e as Error).message}`);
  console.error('  Vérifier la connexion et `npx eas-cli whoami`. Aucune conclusion tirée.\n');
  process.exit(2);
}

const tete = groupe[0];
const plateformes = [...new Set(groupe.map((u) => u.platform))].sort();

console.log(`\nLe canal « production » (mesuré, ${tete.createdAt.slice(0, 10)})`);
ligne('groupe en tête du canal', tete.group.slice(0, 8), fiche.groupe);
ligne('commit publié', (tete.gitCommitHash ?? '').slice(0, fiche.commit.length), fiche.commit);
ligne('plateformes', plateformes.join(' + '), 'android + ios');
ligne('runtime', tete.runtimeVersion, '1.0.0');
// Publier depuis un arbre SALE veut dire que le bundle envoyé ne correspond à
// aucun commit — la fiche citerait alors un commit qui n'a jamais été ce qui part.
ligne('arbre propre à la publication', String(tete.isGitWorkingTreeDirty === false), 'true');

// ── 3. Le commit cité est-il vraiment sur main ? ─────────────────────────────
// Une OTA publiée depuis une branche non fusionnée RETIRE du travail au parc
// sans que rien ne le signale (le cas évité de justesse le 2026-08-08).
console.log('\nLe commit publié');
const git = (args: string[]) => {
  try {
    execFileSync('git', args, { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
const connu = git(['cat-file', '-e', `${fiche.commit}^{commit}`]);
if (!connu) {
  console.log(`  ⚠ ${fiche.commit} est inconnu de ce clone — lancer \`git fetch origin\` puis relancer.`);
} else {
  ligne('ancêtre d’origin/main', String(git(['merge-base', '--is-ancestor', fiche.commit, 'origin/main'])), 'true');
}

// ── Verdict ──────────────────────────────────────────────────────────────────
if (ko) {
  console.error(`\n✖ ${ko} écart(s) : les fiches ne décrivent PAS ce qui tourne.`);
  console.error('  Publier l’OTA manquante, ou remettre les fiches à jour — les DEUX :');
  console.error('  la ligne « OTA publiées » d’AGENTS.md ET la puce « **OTA** : » de STORE-RELEASE.md.\n');
  process.exit(1);
}

console.log(`\n✅ Les fiches décrivent bien la ${fiche.numero}ᵉ OTA, qui est celle en tête du canal.`);
console.log('   ⚠️ Ce résultat périme à la prochaine publication : il se re-mesure,');
console.log('      il ne se recopie pas.\n');
