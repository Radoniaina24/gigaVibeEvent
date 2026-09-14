// Edge Function : auth-forgot-password
// POST /auth/forgot-password { email } — 100 % Resend.
// NE JAMAIS utiliser supabase.auth.resetPasswordForEmail (email Supabase).
// Réponse toujours générique, qu'un compte existe ou non.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { expiresInMinutes, randomToken, sha256Hex } from '../_shared/tokens.ts';
import { sendEmailViaResend } from '../_shared/resend.ts';
import { passwordResetEmail } from '../_shared/templates.ts';
import {
  adminClient,
  isRateLimited,
  isValidEmail,
  logEmail,
  requireEnv,
} from '../_shared/guard.ts';

const GENERIC =
  'Si cette adresse correspond à un compte, un email de réinitialisation a été envoyé.';
const RESET_EXPIRES_MIN = 30;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return json(req, { error: 'Méthode non autorisée.' }, 405);

  try {
    const env = requireEnv();
    const admin = adminClient(env);

    let email = '';
    try {
      const body = await req.json() as { email?: string };
      email = (body.email ?? '').trim().toLowerCase();
    } catch {
      return json(req, { error: 'Corps JSON invalide.' }, 400);
    }
    if (!isValidEmail(email)) return json(req, { error: 'Email invalide.' }, 400);

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (!profile) return json(req, { ok: true, message: GENERIC });

    const userId = (profile as { id: string }).id;

    if (await isRateLimited(admin, 'password_reset', email)) {
      await logEmail(admin, {
        type: 'password_reset',
        to_email: email,
        user_id: userId,
        status: 'skipped',
        error: 'rate_limited',
      });
      return json(req, { ok: true, message: GENERIC });
    }

    // Invalide les anciens tokens (usage unique, un seul actif à la fois).
    await admin.from('password_reset_tokens').delete().eq('user_id', userId);

    const token = randomToken();
    const { error: tokenError } = await admin.from('password_reset_tokens').insert({
      user_id: userId,
      email,
      token_hash: await sha256Hex(token),
      expires_at: expiresInMinutes(RESET_EXPIRES_MIN),
    });
    if (tokenError) return json(req, { ok: true, message: GENERIC });

    const resetUrl = `${env.appUrl.replace(/\/+$/, '')}/reset-password?token=${token}`;
    try {
      const tpl = passwordResetEmail({ resetUrl, expiresMinutes: RESET_EXPIRES_MIN });
      await sendEmailViaResend({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        kind: 'password_reset',
        context: { user_id: userId },
      });
      await logEmail(admin, {
        type: 'password_reset',
        to_email: email,
        user_id: userId,
        status: 'sent',
      });
    } catch {
      await logEmail(admin, {
        type: 'password_reset',
        to_email: email,
        user_id: userId,
        status: 'failed',
        error: 'resend_send_failed',
      });
    }
    return json(req, { ok: true, message: GENERIC });
  } catch {
    return json(req, {
      ok: true,
      message:
        'Si cette adresse correspond à un compte, un email de réinitialisation a été envoyé.',
    });
  }
});
