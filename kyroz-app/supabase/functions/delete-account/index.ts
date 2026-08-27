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
 * ⚠️ **L'ENDPOINT EST À CONFIRMER SUR LA DOCUMENTATION AVANT DÉPLOIEMENT** (étape 1 de
 * la procédure). Il est écrit ici d'après l'API REST v1 de RevenueCat ; il n'a pas été
 * appelé pour de vrai depuis ce dépôt, et une session qui le déploierait sans vérifier
 * livrerait un `echec` permanent qui a l'air d'un problème de réseau.
 *
 * ⚠️ **404 N'EST PAS UN ÉCHEC** : il veut dire qu'aucun abonné ne porte cet UUID — le
 * cas de quelqu'un dont l'app n'a jamais joint RevenueCat. Le confondre avec une panne
 * ferait remonter des alertes sur le fonctionnement normal.
 */
async function supprimerAbonneRevenueCat(uid: string): Promise<EtatRevenueCat> {
  const cle = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!cle) return 'non_configure';
  try {
    // Borné dans le temps : un tiers qui ne répond pas ne doit pas retarder d'une
    // seconde un droit à l'effacement.
    const r = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${cle}` }, signal: AbortSignal.timeout(5000) },
    );
    if (r.status === 404) return 'introuvable';
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
