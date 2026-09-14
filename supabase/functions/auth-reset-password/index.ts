// Edge Function : auth-reset-password
// POST /auth/reset-password { token, password }
// Token à usage unique, 30 min. Invalide tous les autres tokens du user.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { sha256Hex } from '../_shared/tokens.ts';
import {
  adminClient,
  httpStatus,
  isValidPassword,
  publicMessage,
  requireEnv,
} from '../_shared/guard.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return json(req, { error: 'Méthode non autorisée.' }, 405);

  try {
    const env = requireEnv();
    const admin = adminClient(env);

    let body: { token?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return json(req, { error: 'Corps JSON invalide.' }, 400);
    }
    const token = (body.token ?? '').trim();
    const password = body.password ?? '';
    if (!token) return json(req, { error: 'Token manquant.' }, 400);
    if (!isValidPassword(password)) {
      return json(req, { error: 'Mot de passe : 8 caractères minimum.' }, 400);
    }

    const { data: row, error } = await admin
      .from('password_reset_tokens')
      .select('id,user_id,expires_at,used_at')
      .eq('token_hash', await sha256Hex(token))
      .maybeSingle();
    if (error || !row) {
      return json(req, { error: 'Ce lien est invalide ou a expiré.' }, 400);
    }
    const r = row as { id: string; user_id: string; expires_at: string; used_at: string | null };
    if (r.used_at || new Date(r.expires_at).getTime() < Date.now()) {
      return json(req, { error: 'Ce lien est invalide ou a expiré.' }, 400);
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(r.user_id, {
      password,
    });
    if (updateError) {
      return json(req, { error: 'Réinitialisation impossible.' }, 500);
    }

    const now = new Date().toISOString();
    await admin.from('password_reset_tokens').update({ used_at: now }).eq('id', r.id);
    await admin
      .from('password_reset_tokens')
      .update({ used_at: now })
      .eq('user_id', r.user_id)
      .is('used_at', null);

    return json(req, {
      ok: true,
      message: 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.',
    });
  } catch (err) {
    console.error('[EMAIL_PASSWORD_RESET_FAILED] reset');
    return json(req, { error: publicMessage(err) }, httpStatus(err) || 500);
  }
});
