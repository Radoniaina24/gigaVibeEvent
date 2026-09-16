// Edge Function : verify-ticket (scan contrôleur, Phase 6)
// POST /verify-ticket { qr } — vérification serveur + check-in atomique.
// Authentifié (JWT) : admin, contrôleur, ou partenaire de l'événement
// (contrôle appliqué dans le rpc `checkin_ticket`, SECURITY DEFINER).
// Réponses : { ok: true, ...infos } ou { ok: false, reason } avec
// reason ∈ forbidden | not_found | already_used | cancelled | expired | invalid.
// Secrets : SUPABASE_*.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';
import { handleOptions, json } from '../_shared/cors.ts';
import { adminClient, requireEnv } from '../_shared/guard.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return json(req, { error: 'Méthode non autorisée.' }, 405);

  try {
    const env = requireEnv();
    const admin = adminClient(env);

    const caller = createClient(env.supabaseUrl, env.anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json(req, { error: 'Non authentifié.' }, 401);

    let qr = '';
    try {
      const body = await req.json() as { qr?: string };
      qr = (body.qr ?? '').trim();
    } catch {
      return json(req, { error: 'Corps JSON invalide.' }, 400);
    }
    if (!qr || qr.length > 128) return json(req, { error: 'QR invalide.' }, 400);

    // Exécuté avec le JWT de l'appelant : auth.uid() porte le contrôleur,
    // le rpc applique les rôles (admin / controller / partner de l'event).
    const { data, error } = await caller.rpc('checkin_ticket', { p_qr: qr });
    if (error) {
      console.error('[verify-ticket] rpc:', error.message);
      return json(req, { error: 'Vérification impossible.' }, 500);
    }

    const res = data as { ok: boolean; reason?: string } | null;
    if (!res) return json(req, { ok: false, reason: 'not_found' });

    // Journal serveur redondant (le rpc audite déjà le succès).
    if (res.ok === false && res.reason && res.reason !== 'not_found') {
      await admin.from('audit_logs').insert({
        user_id: user.id,
        action: 'ticket.verify_rejected',
        entity_type: 'tickets',
        entity_id: null,
        metadata: { reason: res.reason },
      });
    }

    return json(req, res, res.ok ? 200 : 409);
  } catch (err) {
    console.error('[verify-ticket]:', err);
    return json(req, { error: 'Vérification impossible.' }, 500);
  }
});
