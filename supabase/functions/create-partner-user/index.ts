// Edge Function : create-partner-user (CDC v2 §7 — Étape 3)
// Rôle : créer le compte de connexion d'un partenaire + le rattacher,
// SANS exposer la clé service_role au frontend.
// Flow :
//   1. Vérifie le JWT Supabase (utilisateur authentifié + rôle admin).
//   2. Valide email + password + partner_id.
//   3. Crée l'utilisateur Auth (email confirmé d'office).
//   4. Passe son profil en rôle `partner` + `partner_id`.
// Secrets requis : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
// Déploiement :
//   supabase functions deploy create-partner-user
//   supabase secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'Configuration serveur incomplète.' }, 500);
  }

  // 1. Appelant = admin ?
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const {
    data: { user },
  } = await caller.auth.getUser();
  if (!user) return json({ error: 'Non authentifié.' }, 401);
  const { data: profile } = await caller
    .from('profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .maybeSingle();
  const p = profile as { role?: string; is_active?: boolean } | null;
  if (!p || p.role !== 'admin' || p.is_active !== true) {
    return json({ error: 'Réservé aux administrateurs.' }, 403);
  }

  // 2. Payload
  let body: { email?: string; password?: string; partner_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corps JSON invalide.' }, 400);
  }
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const partnerId = body.partner_id ?? '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Email invalide.' }, 400);
  }
  if (password.length < 8) {
    return json({ error: 'Mot de passe : 8 caractères minimum.' }, 400);
  }
  if (!partnerId) return json({ error: 'partner_id requis.' }, 400);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Le partenaire doit exister
  const { data: partner, error: partnerError } = await admin
    .from('partners')
    .select('id')
    .eq('id', partnerId)
    .maybeSingle();
  if (partnerError || !partner) {
    return json({ error: 'Partenaire introuvable.' }, 404);
  }

  // 3. Création du compte (email confirmé d'office)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { created_by: 'gve-backoffice' },
  });
  if (createError || !created.user) {
    return json({ error: createError?.message ?? 'Création impossible.' }, 400);
  }

  // 4. Rattachement (le trigger a déjà créé le profil)
  const { error: linkError } = await admin
    .from('profiles')
    .update({
      role: 'partner',
      partner_id: partnerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', created.user.id);
  if (linkError) {
    return json({ error: 'Compte créé mais rattachement impossible.' }, 500);
  }

  return json({ ok: true, user_id: created.user.id, email });
});
