// Edge Function : admin-invite-user
// POST /admin/users/invite { email, role, partner_id? } — admin uniquement.
// NE JAMAIS utiliser supabase.auth.admin.inviteUserByEmail (email Supabase).
// Crée une invitation (token 7 jours) + envoi Resend. Le compte Auth est
// créé lors de l'acceptation (invitation-accept), ce qui prouve l'email.
// Secrets : SUPABASE_*, RESEND_*, APP_URL, EMAIL_MODE.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { expiresInDays, randomToken, sha256Hex } from '../_shared/tokens.ts';
import { sendEmailViaResend } from '../_shared/resend.ts';
import { invitationEmail } from '../_shared/templates.ts';
import {
  adminClient,
  httpStatus,
  isRateLimited,
  isValidEmail,
  logEmail,
  publicMessage,
  requireAdmin,
  requireEnv,
} from '../_shared/guard.ts';

const INVITE_EXPIRES_DAYS = 7;
const ROLES = ['user', 'partner', 'controller', 'admin'] as const;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return json(req, { error: 'Méthode non autorisée.' }, 405);

  try {
    const env = requireEnv();
    const admin = adminClient(env);
    const caller = await requireAdmin(req, env);

    let body: { email?: string; role?: string; partner_id?: string };
    try {
      body = await req.json();
    } catch {
      return json(req, { error: 'Corps JSON invalide.' }, 400);
    }
    const email = (body.email ?? '').trim().toLowerCase();
    const role = (body.role ?? 'user').trim();
    const partnerId = (body.partner_id ?? '').trim() || null;

    if (!isValidEmail(email)) return json(req, { error: 'Email invalide.' }, 400);
    if (!(ROLES as readonly string[]).includes(role)) {
      return json(req, { error: 'Rôle invalide.' }, 400);
    }
    if (partnerId) {
      const { data: partner } = await admin
        .from('partners')
        .select('id')
        .eq('id', partnerId)
        .maybeSingle();
      if (!partner) return json(req, { error: 'Partenaire introuvable.' }, 404);
    }

    if (await isRateLimited(admin, 'invitation', email)) {
      return json(
        req,
        { error: 'Trop de demandes. Réessayez dans quelques minutes.' },
        429,
      );
    }

    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existing) {
      return json(req, { error: 'Un compte existe déjà avec cet email.' }, 409);
    }

    // Une seule invitation active par email.
    await admin.from('user_invitations').delete().eq('email', email).is('accepted_at', null);

    const token = randomToken();
    const { error: invError } = await admin.from('user_invitations').insert({
      email,
      role,
      token_hash: await sha256Hex(token),
      invited_by: caller.userId,
      inviter_name: caller.email || 'Administration',
      partner_id: partnerId,
      expires_at: expiresInDays(INVITE_EXPIRES_DAYS),
    });
    if (invError) return json(req, { error: 'Invitation impossible.' }, 500);

    const invitationUrl =
      `${env.appUrl.replace(/\/+$/, '')}/invitation/accept?token=${token}`;
    try {
      const tpl = invitationEmail({
        inviterName: caller.email || 'Administration',
        role,
        invitationUrl,
        expiresDays: INVITE_EXPIRES_DAYS,
      });
      await sendEmailViaResend({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        kind: 'invitation',
        context: { invited_by: caller.userId },
      });
      await logEmail(admin, {
        type: 'invitation',
        to_email: email,
        user_id: caller.userId,
        status: 'sent',
      });
    } catch {
      await logEmail(admin, {
        type: 'invitation',
        to_email: email,
        user_id: caller.userId,
        status: 'failed',
        error: 'resend_send_failed',
      });
      return json(req, { error: "Impossible d'envoyer l'invitation." }, 500);
    }

    return json(req, { ok: true, email, role, message: 'Invitation envoyée.' }, 201);
  } catch (err) {
    console.error('[EMAIL_INVITATION_FAILED]');
    return json(req, { error: publicMessage(err) }, httpStatus(err) || 500);
  }
});
