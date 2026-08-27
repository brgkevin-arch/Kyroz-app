// ════════════════════════════════════════════════════════════════════════════
// Edge Function : suppression DÉFINITIVE du compte (ligne auth.users incluse)
// ────────────────────────────────────────────────────────────────────────────
// Pourquoi une Edge Function ? Supprimer un utilisateur dans auth.users exige la
// clé `service_role` (admin), qui ne doit JAMAIS vivre dans l'app cliente.
// La fonction tourne côté serveur Supabase, avec la clé secrète auto-injectée.
//
// Les données (profiles, streaks, favorites, pantry, weight_logs, recipe_overrides) sont effacées
// AUTOMATIQUEMENT par cascade (FK `on delete cascade` du schéma).
//
// 🔴 LA CASCADE NE VA PAS CHEZ LES SOUS-TRAITANTS (constat 01-03, 2026-08-27).
// `hooks/usePremium.ts` appelle `identifyUser(uid)` **sans condition** dès qu'un compte
// existe, et la clé RevenueCat est posée dans l'environnement `production` d'EAS : tout
// build de prod crée donc un abonné RevenueCat portant l'UUID Supabase — **y compris
// pour quelqu'un qui n'a jamais rien acheté**, et avant même la mise en vente.
// Côté app, la suppression du compte appelle `logOut()`, qui réinitialise l'identité
// LOCALE et ne supprime rien à distance.
//
// ⚠️ Ce n'est pas seulement un reliquat : la politique de confidentialité §7 borne
// l'exception de conservation à « si vous avez souscrit un abonnement ». Un identifiant
// gardé pour un non-abonné met donc le texte en défaut. La suppression ci-dessous est ce
// qui rend cette phrase VRAIE, plutôt que de l'élargir à tout le monde.
//
// ⚠️ **JAMAIS BLOQUANTE.** Le droit à l'effacement ne peut pas dépendre de la
// disponibilité d'un tiers : l'appel est borné dans le temps, ses échecs sont
// journalisés et RAPPORTÉS, et la suppression Supabase se fait dans tous les cas.
// L'ordre est voulu — RevenueCat d'abord, tant que l'UUID a encore un sens ; après la
// cascade, plus personne ne saurait quoi supprimer.
//
// Déploiement (au choix) :
//   • Dashboard → Edge Functions → Deploy a new function → nom "delete-account"
//     → coller ce code → Deploy.
//   • CLI : supabase functions deploy delete-account
//
// ⚠️ **Ce fichier n'est PAS déployé par un push.** Une modification ici ne prend effet
// qu'après un redéploiement, et le secret `REVENUECAT_SECRET_KEY` doit être posé côté
// Supabase. Procédure, une étape à la fois :
//   `docs/PROCEDURE-2026-08-27-suppression-revenuecat.md`
// ════════════════════════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Ce que l'appel à RevenueCat a donné — rapporté au client, jamais avalé. */
type EtatRevenueCat = 'supprime' | 'introuvable' | 'non_configure' | 'echec';

/**
 * Supprime l'abonné RevenueCat portant cet UUID. **Ne lève jamais.**
 *
 * ⚠️ SANS SECRET, ON NE FAIT RIEN ET ON LE DIT (`non_configure`). Un repli silencieux
 * ferait croire la suppression faite sur toute installation où le secret manque — ce
 * qui est exactement le défaut qu'on corrige, déplacé d'un cran.
 *
 * ✅ **ENDPOINT CONFIRMÉ SUR LA DOCUMENTATION (2026-08-27)** : `DELETE
 * /v1/subscribers/{app_user_id}`, `Authorization: Bearer <clé sk_…>`, succès **200**
 * avec `{ app_user_id, deleted: true }`. Il n'a toujours pas été appelé pour de vrai
 * depuis ce dépôt — c'est l'étape 4 de la procédure qui le fera.
 *
 * ⚠️ **LA CLÉ EST CELLE QUI COMMENCE PAR `sk_`**, pas celle en `appl_` déjà posée dans
 * EAS : cette dernière est la clé PUBLIQUE de la plateforme Apple, embarquée dans l'app.
 * La poser dans le secret donnerait un `401` permanent qui ressemble à une panne réseau.
 *
 * ⚠️ **404 EST TRAITÉ COMME « AUCUN ABONNÉ », ET CE N'EST PAS UN COMPORTEMENT PROMIS.**
 * La référence v1 ne documente que le 200 ; le 404 n'y figure pas. On choisit de ne PAS
 * l'appeler échec — quelqu'un dont l'app n'a jamais joint RevenueCat n'a rien à
 * supprimer, et alerter là-dessus ferait crier au loup sur le fonctionnement normal.
 * Si les journaux rendent un code inattendu, c'est cette hypothèse-ci qu'il faut revoir.
 *
 * ⚠️ **LA SUPPRESSION EST ASYNCHRONE côté RevenueCat** : un `200` ne veut pas dire que
 * le client a déjà disparu du tableau de bord. C'est le code de retour qui fait foi,
 * jamais une recherche faite dans la seconde.
 */
// ⚠️ **CONTRAT DE JOURNALISATION : LE SILENCE VEUT DIRE RÉUSSI, ET RIEN D'AUTRE.**
// Chacun des trois états qui ne suppriment pas écrit quelque chose. C'est ce qui rend la
// procédure de vérification lisible : l'invocation elle-même laisse toujours une trace
// (`booted`), donc une invocation SANS message de cette fonction ne peut plus vouloir dire
// que `supprime`. Quiconque retire une de ces lignes rend le journal muet à nouveau — et
// muet, il avait trois sens (`suppressionSousTraitants.test.ts` le compte).
async function supprimerAbonneRevenueCat(uid: string): Promise<EtatRevenueCat> {
  const cle = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!cle) {
    // ⚠️ CE JOURNAL EST LA MOITIÉ QUI MANQUAIT, et son absence a failli valider un test
    // qui ne prouvait rien (2026-08-27). Sans lui, « pas de secret » se tait exactement
    // comme « suppression réussie » — or c'est la panne la plus probable de tout ce
    // câblage : elle s'obtient en renommant une variable, ce qui est arrivé le jour même.
    console.error('[delete-account] RevenueCat NON CONFIGURÉ — aucune tentative de '
      + 'suppression. Le secret REVENUECAT_SECRET_KEY est absent (ou porte un autre nom : '
      + 'Deno.env.get est sensible à la casse).');
    return 'non_configure';
  }
  try {
    // Borné dans le temps : un tiers qui ne répond pas ne doit pas retarder d'une
    // seconde un droit à l'effacement.
    const r = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${cle}` }, signal: AbortSignal.timeout(5000) },
    );
    if (r.status === 404) {
      // Pas une erreur : un compte qui n'a jamais joint RevenueCat n'y a pas d'abonné.
      // Mais ça doit se VOIR — c'est le signal qu'`identifyUser` n'a jamais tourné, et
      // sur un test c'est la différence entre « ça marche » et « on n'a rien exercé ».
      // Volontairement en `warn` et pas en `error` : rien n'est cassé, il n'y a rien à
      // corriger, et un faux rouge use l'attention qu'un vrai rouge réclame.
      console.warn('[delete-account] RevenueCat : aucun abonné pour cet identifiant (404). '
        + 'Rien à supprimer — normal si l\'app n\'a jamais appelé identifyUser pour ce compte.');
      return 'introuvable';
    }
    if (!r.ok) {
      console.error(`[delete-account] RevenueCat a refusé la suppression : ${r.status}`);
      return 'echec';
    }
    return 'supprime';
  } catch (e) {
    console.error(`[delete-account] RevenueCat injoignable : ${String(e)}`);
    return 'echec';
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Non authentifié' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1) Identifier l'appelant à partir de SON jeton (JWT).
    const asUser = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await asUser.auth.getUser();
    if (uErr || !user) return json({ error: 'Session invalide' }, 401);

    // 2) Supprimer l'abonné chez RevenueCat — AVANT la cascade, parce qu'après elle
    //    l'UUID n'a plus de porteur et plus personne ne saurait quoi supprimer.
    //    Best-effort strict : quoi qu'il arrive ici, l'étape 3 s'exécute.
    const revenuecat = await supprimerAbonneRevenueCat(user.id);

    // 3) Supprimer ce user avec le service_role → cascade sur toutes ses données.
    const admin = createClient(url, serviceKey);
    const { error: dErr } = await admin.auth.admin.deleteUser(user.id);
    if (dErr) return json({ error: dErr.message }, 400);

    // `revenuecat` est RAPPORTÉ, pas avalé : un `'echec'` veut dire qu'un identifiant
    // survit chez un sous-traitant américain alors que le compte, lui, n'existe plus.
    // Personne ne peut plus le retrouver ensuite — c'est la seule trace qu'il en reste.
    return json({ success: true, revenuecat });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
