// L'état RÉEL des abonnements Kyroz+ chez Apple — mesuré, pas recopié.
//
// Pourquoi ce script existe, et c'est la même raison que `check:auth` : les fiches
// produits vivent dans App Store Connect, HORS du dépôt, et elles bougent sans
// laisser de trace ici. Deux faits de ce projet le prouvent —
//
//   · **quatre identifiants faux** ont été écrits dans le code au fil du chantier
//     paywall (`kyroz_plus_annual` pour `_yearly`, `kyroz_plus` pour `premium`…).
//     Chacun échoue en SILENCE : le produit n'est pas trouvé, l'achat répond
//     « indisponible », le prix affiché reste le tarif de repli. Rien ne rougit ;
//   · un état Apple recopié au lieu d'être relu a fait annoncer un blocage
//     INEXISTANT pendant douze jours (la conformité DSA, validée depuis).
//
// ➡️ Ces chaînes se RECOPIENT depuis Apple, elles ne se choisissent pas ici. Ce
// script est l'instrument qui tranche, et le seul qui n'exige pas un build.
//
//   npm run check:abonnements            → les produits, leurs états, leurs prix FR
//   npm run check:abonnements -- --brut  → plus le JSON brut des attributs
//
// 🔒 **LECTURE SEULE, et c'est une décision.** La clé porte le rôle App Manager :
// elle pourrait créer des produits et soumettre l'app. Ce fichier n'émet que des
// GET — un identifiant produit ne se supprime JAMAIS chez Apple, donc une erreur
// d'écriture se garderait à vie. La création se fait à la main, dans l'interface
// qui montre les paliers de prix imposés et les marchés indisponibles.
//
// ⚠️ La clé privée n'est jamais affichée, ni recopiée, ni transmise ailleurs qu'à
// api.appstoreconnect.apple.com. Le Key ID et l'Issuer ID, eux, ne sont pas des
// secrets : ils vivent déjà en clair dans `eas.json`, versionné.

import { readFileSync, existsSync } from 'node:fs';
import { createSign, createPrivateKey } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BRUT = process.argv.includes('--brut');
const API = 'https://api.appstoreconnect.apple.com';

// ── Où trouver la clé ────────────────────────────────────────────────────────
// `eas.json` porte le chemin, mais il est relatif à l'arbre de travail : depuis un
// worktree il ne résout pas. D'où l'ordre : variable d'env, puis le chemin d'eas.json,
// puis l'emplacement canonique. Le script DIT lequel il a pris.
const eas = JSON.parse(readFileSync(join(ROOT, 'eas.json'), 'utf8'));
const ios = eas?.submit?.production?.ios ?? {};
const CANDIDATS = [
  process.env.ASC_KEY_PATH,
  ios.ascApiKeyPath ? resolve(ROOT, ios.ascApiKeyPath) : null,
  join(homedir(), '.eas-credentials', 'asc-api-key.p8'),
].filter(Boolean);

const cheminCle = CANDIDATS.find((c) => existsSync(c));
const KEY_ID = process.env.ASC_KEY_ID ?? ios.ascApiKeyId;
const ISSUER = process.env.ASC_ISSUER_ID ?? ios.ascApiKeyIssuerId;
const APP_ID = process.env.ASC_APP_ID ?? ios.ascAppId;

if (!cheminCle || !KEY_ID || !ISSUER || !APP_ID) {
  console.error('✖ Il manque de quoi interroger Apple.');
  console.error(`  clé      : ${cheminCle ?? 'INTROUVABLE — essayés : ' + CANDIDATS.join(', ')}`);
  console.error(`  key id   : ${KEY_ID ?? 'absent'}`);
  console.error(`  issuer   : ${ISSUER ?? 'absent'}`);
  console.error(`  app id   : ${APP_ID ?? 'absent'}`);
  console.error('\n  Les trois derniers vivent dans eas.json (submit.production.ios).');
  console.error('  La clé .p8 ne se re-télécharge PAS chez Apple : si elle est perdue,');
  console.error("  il faut en générer une nouvelle (Users and Access → Integrations).");
  process.exit(1);
}

// ── JWT ES256 ────────────────────────────────────────────────────────────────
// ⚠️ `dsaEncoding: 'ieee-p1363'` n'est PAS un détail : sans lui, Node signe en DER
// et Apple rejette le jeton avec un 401 laconique. JOSE veut r||s sur 64 octets.
function jeton() {
  const cle = createPrivateKey(readFileSync(cheminCle));
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const maintenant = Math.floor(Date.now() / 1000);
  // 20 minutes est le MAXIMUM accepté par Apple ; on reste largement en dessous.
  const tete = b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' });
  const corps = b64({ iss: ISSUER, iat: maintenant, exp: maintenant + 300, aud: 'appstoreconnect-v1' });
  const sig = createSign('SHA256').update(`${tete}.${corps}`)
    .sign({ key: cle, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${tete}.${corps}.${sig}`;
}

const JWT = jeton();

async function get(chemin) {
  const url = chemin.startsWith('http') ? chemin : `${API}${chemin}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${JWT}` } });
  const txt = await r.text();
  if (!r.ok) {
    let detail = txt;
    try { detail = JSON.parse(txt).errors?.map((e) => `${e.title} — ${e.detail}`).join('\n    ') ?? txt; } catch {}
    throw new Error(`${r.status} sur ${url}\n    ${detail}`);
  }
  return JSON.parse(txt);
}

// ── Ce que le CODE attend, pour la confrontation ─────────────────────────────
// Lu dans la source plutôt qu'importé : ce script est en .mjs et `lib/premium.ts`
// est du TypeScript. On extrait les `storeProductId`, la seule chose qui doive
// correspondre au caractère près. Commentaires retirés d'abord — sinon un
// identifiant cité dans une explication compterait comme une demande du code.
function attendusDuCode() {
  const src = readFileSync(join(ROOT, 'lib', 'premium.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map((l) => l.replace(/(?<!:)\/\/.*$/, '')).join('\n');
  return [...src.matchAll(/storeProductId:\s*'([^']+)'/g)].map((m) => m[1]);
}

const ETATS = {
  MISSING_METADATA: '⚠️  Métadonnées manquantes',
  READY_TO_SUBMIT: '✅ Prêt à soumettre',
  WAITING_FOR_REVIEW: '⏳ En attente d’examen',
  IN_REVIEW: '⏳ En cours d’examen',
  APPROVED: '✅ Approuvé',
  DEVELOPER_ACTION_NEEDED: '🔴 Action requise',
  REJECTED: '🔴 Rejeté',
};

const main = async () => {
  console.log(`\n  App ${APP_ID} · clé ${KEY_ID}`);
  console.log(`  clé lue dans ${cheminCle.replace(homedir(), '~')}\n`);

  const groupes = await get(`/v1/apps/${APP_ID}/subscriptionGroups?limit=200`);
  if (!groupes.data.length) {
    console.log('  Aucun groupe d’abonnement. Rien n’a encore été créé côté Apple.\n');
    return;
  }

  const trouves = [];
  for (const g of groupes.data) {
    console.log(`  ┌ Groupe « ${g.attributes.referenceName} »   ${g.id}`);
    const subs = await get(`/v1/subscriptionGroups/${g.id}/subscriptions?limit=200`);
    if (!subs.data.length) console.log('  │  (vide)');

    for (const s of subs.data) {
      const a = s.attributes;
      trouves.push(a.productId);
      console.log('  │');
      console.log(`  ├─ ${a.productId}`);
      console.log(`  │    nom       ${a.name}`);
      console.log(`  │    durée     ${a.subscriptionPeriod ?? '—'}`);
      console.log(`  │    état      ${ETATS[a.state] ?? a.state}`);
      console.log(`  │    famille   ${a.familySharable ? 'partage familial ACTIF' : 'partage familial inactif'}`);
      // ⚠️ `groupLevel` décide du sens des changements de formule, et il est CONTRE-INTUITIF :
      // chez Apple le niveau 1 est le PLUS HAUT. Passer vers un niveau plus haut est une
      // montée en gamme (immédiate, au prorata) ; vers un niveau plus bas, une descente
      // (appliquée à la fin de la période en cours). Si le mensuel est au niveau 1 et
      // l'annuel au niveau 2, alors « je passe à l'annuel » fait ATTENDRE la fin du mois.
      console.log(`  │    niveau    ${a.groupLevel}  (1 = le plus haut)`);
      console.log(`  │    note rev. ${a.reviewNote ?? '—'}`);

      // Prix FRANÇAIS uniquement : c'est le marché de référence, et tirer les 175
      // territoires rendrait la sortie illisible pour zéro information de plus.
      try {
        const prix = await get(`/v1/subscriptions/${s.id}/prices?filter[territory]=FRA&include=subscriptionPricePoint&limit=200`);
        const points = new Map((prix.included ?? [])
          .filter((i) => i.type === 'subscriptionPricePoints')
          .map((i) => [i.id, i.attributes]));
        if (!prix.data.length) console.log('  │    prix FR   — aucun');
        for (const p of prix.data) {
          const pt = points.get(p.relationships?.subscriptionPricePoint?.data?.id);
          const debut = p.attributes?.startDate ? `  (à partir du ${p.attributes.startDate})` : '';
          // `planType` est LA information que l'interface noie : UPFRONT = payé d'avance,
          // MONTHLY = le même abonnement payé au mois avec engagement sur la période.
          // Un produit annuel peut porter les deux, et ils apparaissent alors comme deux
          // prix sans que rien ne dise lequel est lequel.
          const type = p.attributes?.planType === 'MONTHLY' ? 'payé au mois, engagé sur la période' : 'payé d’avance';
          console.log(`  │    prix FR   ${pt?.customerPrice ?? '?'} €  —  ${type}${debut}`);
          // Ce qui reste RÉELLEMENT dans la poche, renvoyé par Apple : `proceeds` au taux
          // courant, `proceedsYear2` au taux réduit (15 %) qui s'applique après un an
          // d'abonnement continu — et qui s'appliquerait DÈS LA PREMIÈRE ANNÉE avec le
          // Small Business Program. L'écart entre les deux chiffre ce que ce programme vaut.
          if (pt?.proceeds) {
            console.log(`  │              net ${pt.proceeds} €  ·  au taux réduit ${pt.proceedsYear2 ?? '?'} €`);
          }
        }
      } catch (e) { console.log(`  │    prix FR   ✖ ${e.message.split('\n')[0]}`); }

      try {
        const loc = await get(`/v1/subscriptions/${s.id}/subscriptionLocalizations?limit=200`);
        if (!loc.data.length) console.log('  │    libellés  — AUCUN (c’est ce qui retient « Métadonnées manquantes »)');
        for (const l of loc.data) {
          console.log(`  │    libellé   [${l.attributes.locale}] « ${l.attributes.name} »`);
          console.log(`  │              ${l.attributes.description ?? '(pas de description)'}`);
        }
      } catch (e) { console.log(`  │    libellés  ✖ ${e.message.split('\n')[0]}`); }

      // La capture de review : c'est elle, et pas les libellés, qui retient le plus
      // souvent l'état « Métadonnées manquantes ». Elle montre le PAYWALL, donc elle
      // demande un binaire — d'où sa place tardive dans la procédure de mise en vente.
      try {
        const cap = await get(`/v1/subscriptions/${s.id}/appStoreReviewScreenshot`);
        console.log(`  │    capture   ${cap.data ? '✅ présente' : '🔴 ABSENTE — c’est ce qui retient « Métadonnées manquantes »'}`);
      } catch (e) { console.log(`  │    capture   ✖ ${e.message.split('\n')[0]}`); }

      if (BRUT) console.log('  │    brut      ' + JSON.stringify(a));
    }
    console.log('  └────────────────────────────────────────────\n');
  }

  // ── La confrontation, qui est la raison d'être du script ───────────────────
  const attendus = attendusDuCode();
  console.log('  Ce que le CODE demande (lib/premium.ts) vs ce qu’Apple porte :\n');
  let faux = 0;
  for (const id of attendus) {
    const ok = trouves.includes(id);
    if (!ok) faux++;
    console.log(`    ${ok ? '✅' : '🔴'} ${id}${ok ? '' : '   ← ABSENT chez Apple : l’achat rendrait « indisponible », en silence'}`);
  }
  for (const id of trouves.filter((i) => !attendus.includes(i))) {
    console.log(`    ℹ️  ${id}   ← existe chez Apple, le code ne le demande pas`);
  }

  console.log('');
  if (faux) {
    console.log(`  🔴 ${faux} identifiant(s) demandé(s) par le code et absent(s) chez Apple.`);
    console.log('     Se corrige en RECOPIANT depuis la sortie ci-dessus, jamais en retapant.\n');
    process.exitCode = 1;
  } else {
    console.log('  ✅ Chaque identifiant demandé par le code existe chez Apple.\n');
  }
};

main().catch((e) => {
  console.error(`\n✖ ${e.message}\n`);
  console.error('  Un 401 vient presque toujours du jeton (clé, Key ID ou Issuer ID discordants).');
  console.error('  Un 403 vient du RÔLE de la clé : il faut au moins App Manager.\n');
  process.exit(1);
});
