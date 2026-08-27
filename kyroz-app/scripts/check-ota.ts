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

/**
 * « 26 août 2026 » → `2026-08-26`. `null` si la forme n'est pas reconnue.
 *
 * ⚠️ Rendre `null` plutôt que d'inventer : une date illisible doit faire ÉCHOUER la
 * confrontation, jamais la faire passer. C'est le défaut que ce bloc corrige.
 */
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const jourFr = (t: string): string | null => {
  const m = /^(\d{1,2})\s+([a-zéûôA-Z]+)\s+(\d{4})$/.exec(t.trim());
  if (!m) return null;
  const i = MOIS.indexOf(m[2].toLowerCase());
  if (i < 0) return null;
  return `${m[3]}-${String(i + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
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
// 🔴 LE RUNTIME NE SE COMPARE PLUS À UN LITTÉRAL DEPUIS LE PASSAGE EN `fingerprint`
// (2026-08-27, constat 03-03). Avec `appVersion`, la valeur attendue était lisible dans
// `app.json` — donc vérifiable ici. Avec `fingerprint`, c'est un hachage de la SURFACE
// NATIVE de l'arbre publié : le recalculer demanderait de restaurer ce commit-là et ses
// `node_modules`, ce qu'un contrôle de lecture n'a pas à faire.
// ➡️ On vérifie donc ce qui EST vérifiable — la FORME — et on DIT ce qui ne l'est pas,
// plutôt que de comparer à une constante qui redeviendrait fausse à chaque build.
const appJson = JSON.parse(lire('app.json'));
const politique = (appJson.expo?.runtimeVersion?.policy ?? '?') as string;
if (politique !== 'fingerprint') {
  ligne('runtime', tete.runtimeVersion, String(appJson.expo?.version ?? '?'));
} else if (/^[0-9a-f]{32,}$/.test(tete.runtimeVersion)) {
  ligne('runtime (forme fingerprint)', 'hachage', 'hachage');
  console.log(`    ℹ️  runtime publié : ${tete.runtimeVersion}`);
  console.log('    ⚠️  NON vérifié : que ce hachage soit celui du commit publié — le');
  console.log('       recalculer demanderait de restaurer ce commit ET ses node_modules.');
} else {
  // ⚠️ CE N'EST PAS UN ÉCART DE FICHE, et les confondre rendrait ce contrôle rouge en
  // permanence — donc illisible. Les fiches disent le vrai ; c'est la SURFACE NATIVE
  // qui a bougé sous elles. L'état est transitoire par construction : il dure jusqu'à
  // ce qu'un binaire de la nouvelle surface soit distribué.
  console.log(`  ⚠ runtime en tête du canal            ${tete.runtimeVersion} — une VERSION, pas une empreinte`);
  console.log('     ➡️ Cette OTA a été publiée AVANT la bascule en `fingerprint`, donc depuis');
  console.log('        un arbre dont la surface native n’est plus celle du dépôt.');
  console.log('     🔴 CONSÉQUENCE : les binaires que sert cette OTA ne recevront plus RIEN');
  console.log('        tant qu’un build de la nouvelle surface n’est pas distribué. C’est la');
  console.log('        coupure VOULUE — sans elle, un bundle SDK 57 atterrirait sur un binaire');
  console.log('        SDK 56, qui ne démarrerait plus. Cf. lib/__tests__/ligneOta.test.ts.');
}
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

// ── 4. Le texte LÉGAL servi est-il celui du dépôt ? ──────────────────────────
//
// 🔴 POURQUOI CETTE SECTION EXISTE (2026-08-27). Quatre révisions légales sont
// tombées le 26 août, toutes datées « 26 août 2026 » — et aucune n'était encore
// publiée quand le jour a changé. Une date d'entrée en vigueur est celle de la
// LIVRAISON, pas du commit : au 27, la date affichée était devenue fausse.
//
// ⚠️ ET `legal.test.ts` NE POUVAIT PAS L'ATTRAPER. Il compare l'empreinte du TEXTE :
// le texte n'avait pas bougé, seul le calendrier. Un garde-fou parfaitement vert
// pendant que la chose qu'il garde devient fausse — c'est la panne que ce dépôt
// connaît déjà (« un contrôle VERT peut répéter un avertissement que personne ne
// lit »). Il fallait le mesurer AILLEURS : ici, où l'on sait ce qui est publié.
//
// La mesure : le texte légal du commit EN TÊTE DU CANAL est-il celui d'aujourd'hui ?
// S'il diffère, la révision n'est pas servie — donc sa date est à ré-arbitrer AU
// MOMENT de publier, pas maintenant.
console.log('\nLe texte légal');
try {
  const servi = execFileSync('git', ['show', `${fiche.commit}:kyroz-app/constants/legal.ts`],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  const actuel = lire('constants/legal.ts');
  // 🔴 CE BLOC NE TOUCHAIT JAMAIS LE COMPTEUR — corrigé le 2026-08-27 (contre-audit
  // CA-7-01). Il n'imprimait que des `console.log` : sur les 35 lignes de la section,
  // zéro `ko++`. Poussé à l'absurde, `effectiveDate` réécrite en « 15 juin 2026 » —
  // 73 jours dans le PASSÉ, donc démontrablement pas une date de livraison — la sortie
  // était identique, ✅ et EXIT=0. Le script IMPRIMAIT la fausse date sans jamais la
  // confronter à quoi que ce soit, alors qu'il a `tete.createdAt` en main.
  //
  // Ce qu'on peut affirmer sans se tromper, et rien de plus :
  //  • texte SERVI → sa date ne peut pas être ANTÉRIEURE au jour où il a été publié,
  //    sinon le document opposable prétend avoir pris effet avant d'exister ;
  //  • texte PAS ENCORE SERVI → sa date ne peut pas être déjà PASSÉE, sinon publier
  //    demain servira une date fausse. Le reste (« est-ce bien le jour du jour ? »)
  //    ne se décide qu'au moment de publier — ça, on ne peut que le rappeler.
  const dateTexte = actuel.match(/effectiveDate:\s*'([^']+)'/)?.[1] ?? '(illisible)';
  const jourTexte = jourFr(dateTexte);
  const jourPublication = tete.createdAt.slice(0, 10);
  const aujourdHui = new Date().toISOString().slice(0, 10);

  if (jourTexte === null) {
    ligne('date d’entrée en vigueur lisible', `« ${dateTexte} »`, 'JJ mois AAAA');
  } else if (servi === actuel) {
    // Le texte du dépôt EST celui qui tourne : sa date est donc opposable dès
    // maintenant, et elle ne peut pas précéder sa mise en service.
    ligne('date d’entrée en vigueur ≥ publication',
      jourTexte >= jourPublication ? 'oui' : `NON (« ${dateTexte} » < ${jourPublication})`, 'oui');
    console.log('  ✓ le texte du dépôt est celui qui tourne         identique au commit publié');
  } else {
    // Pas encore servi : légitime entre un merge et sa publication. Mais une date
    // déjà passée ne PEUT pas être celle de la livraison à venir.
    ligne('date d’entrée en vigueur pas déjà passée',
      jourTexte >= aujourdHui ? 'oui' : `NON (« ${dateTexte} » < ${aujourdHui})`, 'oui');
    console.log(`  ⚠ le texte du dépôt N'EST PAS ENCORE SERVI       date affichée : « ${dateTexte} »`);
    console.log('     ➡️ Une date d’entrée en vigueur est celle de la LIVRAISON, pas du commit.');
    console.log('        Avant de publier l’OTA : vérifier que cette date est bien CELLE DU JOUR,');
    console.log('        la corriger dans constants/legal.ts ET DERNIERE_REVISION.date si besoin,');
    console.log('        reporter l’empreinte, puis `npm run gen:legal`.');
    console.log('     ⚠️ Que le texte ne soit pas encore servi n’est PAS un échec : c’est normal');
    console.log('        entre un merge et sa publication. Sa DATE, elle, est confrontée ci-dessus.');
  }
} catch {
  console.log('  ⚠ texte légal du commit publié illisible — `git fetch origin` puis relancer.');
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
