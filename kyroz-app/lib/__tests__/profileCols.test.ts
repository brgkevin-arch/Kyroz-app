// ── VERROU : PROFILE_COLS ↔ schéma SQL réel ──────────────────────────────────
//
// POURQUOI CE FICHIER EXISTE
//
// `lib/sync.ts` écrit le profil par un `upsert` GLOBAL : une seule colonne absente
// côté serveur fait rejeter la ligne ENTIÈRE par PostgREST (400 / PGRST204), donc ce
// n'est pas le champ manquant qu'on perd — c'est TOUTE la synchro du profil, en
// silence. Ce mode de panne s'est produit TROIS fois (cf. commentaire de sync.ts).
//
// Le filet `PROFILE_COLS_LAST_MIGRATION` dans sync.ts transforme « synchro morte » en
// « tout passe sauf ces champs-là ». Il n'empêche pas la cause. Ce test l'empêche :
// toute divergence entre la liste écrite en TypeScript et le schéma SQL du dépôt
// devient une suite rouge, avant le déploiement.
//
// Le test ne touche NI le réseau NI une base : il lit les fichiers .sql du dépôt.
//
// `vi.mock` du client Supabase : importer `../sync` exécuterait `lib/supabase.ts`, qui
// appelle `createClient()` au chargement du module depuis des variables d'environnement
// absentes en test. On coupe la chaîne — on n'a besoin que d'une constante.

import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('../supabase', () => ({ supabase: {} }));

import { PROFILE_COLS } from '../sync';

const SUPABASE_DIR = path.resolve(__dirname, '../../supabase');

/**
 * Colonnes VOLONTAIREMENT hors de `PROFILE_COLS`, avec la raison de chacune.
 *
 * ⚠️ N'y mettre QUE de vraies colonnes du schéma serveur. Un champ local-only qui
 * n'existe pas côté serveur (`is_post_menopausal`, par exemple : délibérément non
 * ajouté, cf. migrations/2026-07-28_profiles_energy_availability.sql) n'a rien à faire
 * ici — il n'est pas dans le schéma, donc pas dans le partitionnement.
 */
const DELIBERATELY_EXCLUDED: Record<string, string> = {
  id: 'clé primaire (= auth.users.id), passée à part par profileToRow',
  email: 'écrit à l’inscription par hooks/useAuth.tsx, pas par le profil applicatif',
  created_at: 'métadonnée de ligne, gérée par Postgres (default now())',
  updated_at: 'métadonnée de ligne, gérée par Postgres (default now())',
  consent_health_data:
    'consentement RGPD déposé à l’inscription (useAuth.tsx) — l’inclure l’écraserait',
  consent_at:
    'horodatage du consentement RGPD, même raison que consent_health_data',
  stripe_customer_id:
    'COLONNE MORTE : zéro usage dans le code de l’app (paiement = achat in-app via RevenueCat, Stripe seul écarté par les stores)',
};

// Mots-clés SQL pouvant ouvrir une ligne dans un `create table` sans être une colonne.
const NOT_A_COLUMN = new Set([
  'constraint', 'check', 'primary', 'foreign', 'unique', 'exclude', 'like', 'partition',
]);

/**
 * Retire les commentaires SQL avant tout parsing.
 *
 * Indispensable, et découvert en écrivant ce test : les migrations se documentent avec
 * la phrase « 100 % idempotent (add column if not exists) : ré-exécutable sans risque ».
 * Sans ce nettoyage, le parseur lisait cette PROSE et en extrayait une colonne fantôme
 * nommée « if ». Un parseur ne doit jamais voir les commentaires.
 */
function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

function migrationFiles(): string[] {
  return fs
    .readdirSync(path.join(SUPABASE_DIR, 'migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort(); // noms préfixés par date → ordre chronologique
}

/** Colonnes de `public.profiles` déclarées dans schema.sql. */
function columnsFromSchema(): string[] {
  const sql = stripSqlComments(fs.readFileSync(path.join(SUPABASE_DIR, 'schema.sql'), 'utf8'));
  const start = sql.indexOf('create table if not exists public.profiles');
  expect(start, 'bloc create table public.profiles introuvable dans schema.sql').toBeGreaterThan(-1);
  const end = sql.indexOf('\n);', start);
  const block = sql.slice(start, end);

  const cols: string[] = [];
  for (const line of block.split('\n').slice(1)) {
    const m = /^ {2}([a-z_][a-z0-9_]*)\s+\S/.exec(line);
    if (m && !NOT_A_COLUMN.has(m[1])) cols.push(m[1]);
  }
  return cols;
}

/** Colonnes ajoutées à `profiles` par les migrations (ADD COLUMN). */
function columnsFromMigrations(): string[] {
  const cols: string[] = [];
  for (const f of migrationFiles()) {
    const sql = stripSqlComments(fs.readFileSync(path.join(SUPABASE_DIR, 'migrations', f), 'utf8'));
    for (const stmt of sql.split(';')) {
      if (!/alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?profiles\b/i.test(stmt)) continue;
      for (const m of stmt.matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi)) {
        cols.push(m[1]);
      }
    }
  }
  return cols;
}

/**
 * Union schema.sql + migrations. On prend l'UNION et non « schema.sql seul » parce
 * qu'une colonne peut être ajoutée dans une migration et oubliée dans schema.sql :
 * la panne qu'on veut attraper viendrait précisément de cet oubli.
 */
function serverColumns(): Set<string> {
  return new Set([...columnsFromSchema(), ...columnsFromMigrations()]);
}

describe('PROFILE_COLS ↔ schéma SQL', () => {
  // ── Fil-piège ─────────────────────────────────────────────────────────────
  // Les deux parseurs ci-dessus supposent des migrations ADDITIVES (aucune
  // suppression, aucun renommage) : c'est l'état vérifié du dépôt au 2026-07-30.
  // Si cette hypothèse tombe, les parseurs deviendraient FAUX EN SILENCE — ils
  // continueraient à compter une colonne disparue. Ce test échoue d'abord.
  it('les migrations restent additives (aucun DROP COLUMN, aucun RENAME)', () => {
    const offenders: string[] = [];
    const files = ['schema.sql', ...migrationFiles().map((f) => `migrations/${f}`)];
    for (const rel of files) {
      // Commentaires retirés : on cherche du SQL exécuté, pas de la prose.
      const sql = stripSqlComments(fs.readFileSync(path.join(SUPABASE_DIR, rel), 'utf8'));
      if (/drop\s+column/i.test(sql)) offenders.push(`${rel} (DROP COLUMN)`);
      if (/\brename\b/i.test(sql)) offenders.push(`${rel} (RENAME)`);
    }
    expect(
      offenders,
      `Une migration supprime ou renomme une colonne :\n  ${offenders.join('\n  ')}\n\n` +
        'Les parseurs de ce fichier supposent des migrations additives. Ils sont ' +
        'maintenant FAUX : ils comptent encore une colonne qui n\'existe plus. ' +
        'Reprendre columnsFromSchema/columnsFromMigrations pour appliquer les ' +
        'suppressions et les renommages dans l\'ordre chronologique.',
    ).toEqual([]);
  });

  // ── Test 1 — sûreté : ne jamais écrire une colonne absente du serveur ─────
  it('toute colonne de PROFILE_COLS existe côté serveur', () => {
    const server = serverColumns();
    const missing = PROFILE_COLS.filter((c) => !server.has(c));
    expect(
      missing,
      `PROFILE_COLS contient ${missing.length} colonne(s) absente(s) du schéma SQL : ` +
        `${missing.join(', ')}.\n\n` +
        'CONSÉQUENCE : l\'upsert du profil est GLOBAL, donc PostgREST rejette la ligne ' +
        'ENTIÈRE (400 / PGRST204). Ce n\'est pas ce champ qui est perdu, c\'est TOUTE la ' +
        'synchro du profil, EN SILENCE (aucune erreur remontée à l\'utilisateur). Ce mode ' +
        'de panne s\'est déjà produit trois fois.\n' +
        'À FAIRE : écrire la migration et la jouer en production AVANT de déployer l\'app.',
    ).toEqual([]);
  });

  // ── Test 2 — le garde-fou central : partitionnement exhaustif et explicite ─
  it('`clamp` est LOCAL-ONLY et ne doit jamais partir en base', () => {
    // `UserProfile.clamp` est DÉRIVÉ (réécrit à chaque computePlan). Le pousser
    // ferait rejeter l'upsert ENTIER — aucune migration ne crée cette colonne, et
    // il ne faut pas en créer une : le moteur la reconstruit à chaque ouverture.
    expect(PROFILE_COLS as readonly string[]).not.toContain('clamp');
    expect(serverColumns().has('clamp')).toBe(false);
  });

  it('schéma = PROFILE_COLS ∪ DELIBERATELY_EXCLUDED, exactement', () => {
    const server = [...serverColumns()].sort();
    const accounted = [...new Set([...PROFILE_COLS, ...Object.keys(DELIBERATELY_EXCLUDED)])].sort();

    const unaccounted = server.filter((c) => !accounted.includes(c));
    const ghosts = accounted.filter((c) => !server.includes(c));

    expect(
      unaccounted,
      `${unaccounted.length} colonne(s) du schéma ne sont NI synchronisées NI exclues ` +
        `explicitement : ${unaccounted.join(', ')}.\n\n` +
        'C\'est une décision qui n\'a pas été prise, pas un détail. Trancher :\n' +
        '  • la colonne doit se synchroniser → l\'ajouter à PROFILE_COLS (lib/sync.ts) ;\n' +
        '  • elle ne doit pas → l\'ajouter à DELIBERATELY_EXCLUDED ici, AVEC sa raison.\n' +
        'Ne jamais « faire passer le test » sans choisir : c\'est tout l\'objet de ce verrou.',
    ).toEqual([]);

    expect(
      ghosts,
      `${ghosts.length} entrée(s) ne correspondent à aucune colonne du schéma : ` +
        `${ghosts.join(', ')}.\n\n` +
        'Soit la colonne a disparu du SQL, soit DELIBERATELY_EXCLUDED liste un champ ' +
        'LOCAL-ONLY qui n\'existe pas côté serveur (ex. is_post_menopausal) — auquel cas ' +
        'il n\'a rien à faire dans ce partitionnement.',
    ).toEqual([]);
  });

  it('chaque exclusion porte une raison lisible', () => {
    for (const [col, reason] of Object.entries(DELIBERATELY_EXCLUDED)) {
      expect(reason.length, `exclusion de "${col}" sans raison explicite`).toBeGreaterThan(20);
    }
  });

  // ── Test 3 — verrou juridique sur le consentement RGPD ─────────────────────
  it('consent_health_data et consent_at n\'entrent JAMAIS dans PROFILE_COLS', () => {
    for (const col of ['consent_health_data', 'consent_at'] as const) {
      expect(
        PROFILE_COLS.includes(col as never),
        `"${col}" est entrée dans PROFILE_COLS.\n\n` +
          'CONSÉQUENCE : profileToRow() la lit sur l\'objet UserProfile local, où elle ' +
          'vaut undefined — l\'upsert écraserait donc le consentement RGPD déposé à ' +
          'l\'inscription par hooks/useAuth.tsx (consent_health_data → false, ' +
          'consent_at → null). Le consentement explicite à la collecte de données de ' +
          'SANTÉ est une obligation RGPD (CLAUDE.md §7) : le perdre est un problème ' +
          'juridique, pas un bug de synchro.\n' +
          'Le consentement s\'écrit à UN seul endroit : useAuth.tsx, à l\'inscription.',
      ).toBe(false);
    }
  });
});
