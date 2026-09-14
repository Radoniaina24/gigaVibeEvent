// Edge Function : auth-register
// POST /auth/register — Inscription 100 % Resend (AUCUN email Supabase).
// Flow : validation -> createUser(email_confirm:false) -> token hashé
//        -> Resend confirmation -> réponse.
// Supabase Dashboard requis : désactiver "Confirm email" ET vider les
// templates SMTP (voir docs RESEND_SETUP). Ici on ne déclenche jamais
// d'email Supabase : création via Admin API uniquement.
// Secrets : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
//           RESEND_API_KEY, RESEND_FROM_*, APP_URL, EMAIL_MODE.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { expiresInMinutes, randomToken, sha256Hex } from '../_shared/tokens.ts';
import { sendEmailViaResend } from '../_shared/resend.ts';
import { confirmationEmail } from '../_shared/templates.ts';
import {
  adminClient,
  httpStatus,
  isRateLimited,
  isValidEmail,
  isValidPassword,
  logEmail,
  publicMessage,
  requireEnv,
} from '../_shared/guard.ts';

const CONFIRM_EXPIRES_MIN = 60;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return json(req, { error: 'Méthode non autorisée.' }, 405);

  try {
    const env = requireEnv();
    const admin = adminClient(env);

    let body: {
      email?: string;
      password?: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    };
    try {
      body = await req.json();
    } catch {
      return json(req, { error: 'Corps JSON invalide.' }, 400);
    }

    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';
    const firstName = (body.first_name ?? '').trim();
    const lastName = (body.last_name ?? '').trim();
    const phone = (body.phone ?? '').trim() || null;

    if (!isValidEmail(email)) return json(req, { error: 'Email invalide.' }, 400);
    if (!isValidPassword(password)) {
      return json(req, { error: 'Mot de passe : 8 caractères minimum.' }, 400);
    }
    if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80) {
      return json(req, { error: 'Prénom et nom requis (80 caractères max).' }, 400);
    }
    if (phone && !/^\+?[0-9\s-]{8,20}$/.test(phone)) {
      return json(req, { error: 'Numéro de téléphone invalide.' }, 400);
    }

    if (await isRateLimited(admin, 'confirmation', email)) {
      return json(
        req,
        { error: 'Trop de demandes. Réessayez dans quelques minutes.' },
        429,
      );
    }

    // Compte existant ? (profiles.email miroir de auth.users via trigger)
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existing) {
      return json(req, { error: 'Un compte existe déjà avec cet email.' }, 409);
    }

    // Création Auth SANS email Supabase.
    // email_confirm:true OBLIGATOIRE : GoTrue envoie un email de confirmation
    // Supabase dès qu'un utilisateur est créé non confirmé via l'Admin API.
    // La vraie vérification est portée par app_metadata.email_verified,
    // positionné à true uniquement par auth-verify-email (lien Resend).
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { email_verified: false },
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone,
      },
    });
    if (createError || !created.user) {
      const msg = (createError?.message ?? '').toLowerCase();
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return json(req, { error: 'Un compte existe déjà avec cet email.' }, 409);
      }
      return json(req, { error: 'Inscription impossible.' }, 400);
    }
    const userId = created.user.id;

    // Invalide les anciens tokens en attente (usage unique).
    await admin.from('email_verification_tokens').delete().eq('user_id', userId);

    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const { error: tokenError } = await admin.from('email_verification_tokens').insert({
      user_id: userId,
      email,
      token_hash: tokenHash,
      expires_at: expiresInMinutes(CONFIRM_EXPIRES_MIN),
    });
    if (tokenError) {
      console.error('[EMAIL_CONFIRMATION_FAILED] token_insert');
      return json(req, { error: 'Inscription impossible.' }, 500);
    }

    const confirmationUrl = `${env.appUrl.replace(/\/+$/, '')}/verify-email?token=${token}`;
    const tpl = confirmationEmail({
      name: firstName,
      confirmationUrl,
      expiresMinutes: CONFIRM_EXPIRES_MIN,
    });

    try {
      await sendEmailViaResend({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        kind: 'confirmation',
        context: { user_id: userId },
      });
      await logEmail(admin, {
        type: 'confirmation',
        to_email: email,
        user_id: userId,
        status: 'sent',
      });
    } catch {
      await logEmail(admin, {
        type: 'confirmation',
        to_email: email,
        user_id: userId,
        status: 'failed',
        error: 'resend_send_failed',
      });
      // Compte créé mais email non parti : le client propose "Renvoyer".
      return json(req, {
        ok: true,
        email_sent: false,
        email,
        message: 'Compte créé, mais email non envoyé. Utilisez « Renvoyer l’email ».',
      }, 201);
    }

    return json(req, {
      ok: true,
      email_sent: true,
      email,
      message: 'Compte créé. Un email de confirmation a été envoyé.',
    }, 201);
  } catch (err) {
    console.error('[EMAIL_CONFIRMATION_FAILED]');
    return json(req, { error: publicMessage(err) }, httpStatus(err) || 500);
  }
});
