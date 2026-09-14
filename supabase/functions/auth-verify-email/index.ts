// Edge Function : auth-verify-email
// POST /auth/verify-email { token } (GET ?token= accepté pour compatibilité).
// Vérifie hash -> expiration -> usage unique -> email_confirm:true.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { sha256Hex } from '../_shared/tokens.ts';
import { adminClient, httpStatus, publicMessage, requireEnv } from '../_shared/guard.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions(req);

  try {
    const env = requireEnv();
    const admin = adminClient(env);

    let token = '';
    if (req.method === 'GET') {
      token = new URL(req.url).searchParams.get('token') ?? '';
    } else if (req.method === 'POST') {
      try {
        const body = await req.json() as { token?: string };
        token = body.token ?? '';
      } catch {
        return json(req, { error: 'Corps JSON invalide.' }, 400);
      }
    } else {
      return json(req, { error: 'Méthode non autorisée.' }, 405);
    }
    token = token.trim();
    if (!token || token.length < 32 || token.length > 256) {
      return json(req, { error: 'Ce lien est invalide ou a expiré.' }, 400);
    }

    const tokenHash = await sha256Hex(token);
    const { data: row, error } = await admin
      .from('email_verification_tokens')
      .select('id,user_id,email,expires_at,used_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (error || !row) {
      return json(req, { error: 'Ce lien est invalide ou a expiré.' }, 400);
    }
    const r = row as {
      id: string;
      user_id: string;
      email: string;
      expires_at: string;
      used_at: string | null;
    };
    if (r.used_at) {
      return json(req, { error: 'Ce lien est invalide ou a expiré.' }, 400);
    }
    if (new Date(r.expires_at).getTime() < Date.now()) {
      return json(req, { error: 'Ce lien est invalide ou a expiré.' }, 400);
    }

    const { data: userRes, error: userError } = await admin.auth.admin.getUserById(r.user_id);
    if (userError || !userRes.user) {
      return json(req, { error: 'Ce lien est invalide ou a expiré.' }, 400);
    }

    // Source de vérité : app_metadata.email_verified (email_confirm est
    // toujours true à la création pour empêcher tout email Supabase).
    const meta = (userRes.user.app_metadata ?? {}) as Record<string, unknown>;
    if (meta.email_verified !== true) {
      const { error: confirmError } = await admin.auth.admin.updateUserById(r.user_id, {
        app_metadata: { ...meta, email_verified: true },
      });
      if (confirmError) {
        return json(req, { error: 'Confirmation impossible.' }, 500);
      }
    }

    const now = new Date().toISOString();
    await admin.from('email_verification_tokens').update({ used_at: now }).eq('id', r.id);
    // Invalide les autres tokens en attente du même utilisateur.
    await admin
      .from('email_verification_tokens')
      .update({ used_at: now })
      .eq('user_id', r.user_id)
      .is('used_at', null);

    return json(req, {
      ok: true,
      message: 'Email confirmé avec succès. Vous pouvez maintenant vous connecter.',
    });
  } catch (err) {
    console.error('[EMAIL_VERIFY_FAILED]');
    return json(req, { error: publicMessage(err) }, httpStatus(err) || 500);
  }
});
