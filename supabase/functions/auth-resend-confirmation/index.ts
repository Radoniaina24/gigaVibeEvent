// Edge Function : auth-resend-confirmation
// POST /auth/resend-confirmation { email }
// Réponse TOUJOURS générique (anti-énumération), même si le compte
// n'existe pas, est déjà confirmé ou est rate-limité.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { expiresInMinutes, randomToken, sha256Hex } from '../_shared/tokens.ts';
import { sendEmailViaResend } from '../_shared/resend.ts';
import { confirmationEmail } from '../_shared/templates.ts';
import {
  adminClient,
  isRateLimited,
  isValidEmail,
  logEmail,
  requireEnv,
} from '../_shared/guard.ts';

const GENERIC =
  'Si cette adresse correspond à un compte non confirmé, un nouvel email a été envoyé.';
const CONFIRM_EXPIRES_MIN = 60;

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

    // Lookup silencieux : toute sortie reste générique.
    const { data: profile } = await admin
      .from('profiles')
      .select('id,first_name,email')
      .eq('email', email)
      .maybeSingle();
    if (!profile) return json(req, { ok: true, message: GENERIC });

    const p = profile as { id: string; first_name: string | null; email: string };
    const { data: userRes } = await admin.auth.admin.getUserById(p.id);
    if (!userRes?.user) return json(req, { ok: true, message: GENERIC });
    // Vérifié = flag Resend, avec fallback email_confirmed_at pour les
    // comptes créés avant cette intégration (ancien flux Supabase).
    const meta = (userRes.user.app_metadata ?? {}) as Record<string, unknown>;
    const verified = typeof meta.email_verified === 'boolean'
      ? meta.email_verified === true
      : Boolean(userRes.user.email_confirmed_at);
    if (verified) {
      await logEmail(admin, {
        type: 'confirmation',
        to_email: email,
        user_id: p.id,
        status: 'skipped',
        error: 'already_confirmed',
      });
      return json(req, { ok: true, message: GENERIC });
    }

    if (await isRateLimited(admin, 'confirmation', email)) {
      await logEmail(admin, {
        type: 'confirmation',
        to_email: email,
        user_id: p.id,
        status: 'skipped',
        error: 'rate_limited',
      });
      return json(req, { ok: true, message: GENERIC });
    }

    await admin.from('email_verification_tokens').delete().eq('user_id', p.id);

    const token = randomToken();
    const { error: tokenError } = await admin.from('email_verification_tokens').insert({
      user_id: p.id,
      email,
      token_hash: await sha256Hex(token),
      expires_at: expiresInMinutes(CONFIRM_EXPIRES_MIN),
    });
    if (tokenError) return json(req, { ok: true, message: GENERIC });

    const confirmationUrl = `${env.appUrl.replace(/\/+$/, '')}/verify-email?token=${token}`;
    try {
      const tpl = confirmationEmail({
        name: p.first_name ?? 'Bienvenue',
        confirmationUrl,
        expiresMinutes: CONFIRM_EXPIRES_MIN,
      });
      const sendResult = await sendEmailViaResend({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        kind: 'confirmation',
        context: { user_id: p.id },
      });
      if (sendResult.dev) {
        await logEmail(admin, {
          type: 'confirmation',
          to_email: email,
          user_id: p.id,
          status: 'skipped',
          error: 'dev_mode_no_send',
        });
      } else {
        await logEmail(admin, {
          type: 'confirmation',
          to_email: email,
          user_id: p.id,
          status: 'sent',
        });
      }
    } catch {
      await logEmail(admin, {
        type: 'confirmation',
        to_email: email,
        user_id: p.id,
        status: 'failed',
        error: 'resend_send_failed',
      });
    }
    return json(req, { ok: true, message: GENERIC });
  } catch {
    // Même en erreur interne : réponse générique (anti-énumération).
    return json(req, { ok: true, message: GENERIC });
  }
});
