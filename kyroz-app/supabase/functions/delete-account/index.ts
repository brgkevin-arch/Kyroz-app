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
// Déploiement (au choix) :
//   • Dashboard → Edge Functions → Deploy a new function → nom "delete-account"
//     → coller ce code → Deploy.
//   • CLI : supabase functions deploy delete-account
// ════════════════════════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    // 2) Supprimer ce user avec le service_role → cascade sur toutes ses données.
    const admin = createClient(url, serviceKey);
    const { error: dErr } = await admin.auth.admin.deleteUser(user.id);
    if (dErr) return json({ error: dErr.message }, 400);

    return json({ success: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
