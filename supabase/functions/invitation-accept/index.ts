// Edge Function : invitation-accept
// POST /invitation/accept { token, password, first_name, last_name, phone? }
// Vérifie l'invitation (7 j, usage unique) puis crée le compte Auth
// avec email_confirm:true (le lien prouve la possession de l'email).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { sha256Hex } from '../_shared/tokens.ts';
import { adminClient, httpStatus, isValidPassword, publicMessage, requireEnv } from '../_shared/guard.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return json(req, { error: 'Méthode non autorisée.' }, 405);

  try {
    const env = requireEnv();
    const admin = adminClient(env);

    let body: {
      token?: string;
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
    const token = (body.token ?? '').trim();
    const password = body.password ?? '';
    const firstName = (body.first_name ?? '').trim();
    const lastName = (body.last_name ?? '').trim();
    const phone = (body.phone ?? '').trim() || null;

    if (!token) return json(req, { error: 'Token manquant.' }, 400);
    if (!isValidPassword(password)) {
      return json(req, { error: 'Mot de passe : 8 caractères minimum.' }, 400);
    }
    if (!firstName || !lastName) {
      return json(req, { error: 'Prénom et nom requis.' }, 400);
    }

    const { data: inv, error } = await admin
      .from('user_invitations')
      .select('id,email,role,partner_id,expires_at,accepted_at')
      .eq('token_hash', await sha256Hex(token))
      .maybeSingle();
    if (error || !inv) {
      return json(req, { error: 'Cette invitation est invalide ou a expiré.' }, 400);
    }
    const invitation = inv as {
      id: string;
      email: string;
      role: string;
      partner_id: string | null;
      expires_at: string;
      accepted_at: string | null;
    };
    if (invitation.accepted_at || new Date(invitation.expires_at).getTime() < Date.now()) {
      return json(req, { error: 'Cette invitation est invalide ou a expiré.' }, 400);
    }

    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('email', invitation.email)
      .maybeSingle();
    if (existing) {
      return json(req, { error: 'Un compte existe déjà. Connectez-vous.' }, 409);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: invitation.email,
      password,
      // email_confirm:true => aucun email Supabase. Le lien d'invitation
      // prouve la possession de l'email : on marque vérifié directement.
      email_confirm: true,
      app_metadata: { email_verified: true },
      user_metadata: { first_name: firstName, last_name: lastName, phone },
    });
    if (createError || !created.user) {
      return json(req, { error: 'Création du compte impossible.' }, 400);
    }

    // Rôle + rattachement partenaire (service_role bypass le trigger anti-escalade).
    await admin
      .from('profiles')
      .update({
        role: invitation.role,
        partner_id: invitation.partner_id,
        first_name: firstName,
        last_name: lastName,
        phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', created.user.id);

    // Multi-rôles (0020) : source de vérité user_roles (ignore si table absente).
    try {
      await admin.from('user_roles').insert({
        user_id: created.user.id,
        role: invitation.role,
        partner_id: invitation.partner_id,
        assigned_at: new Date().toISOString(),
      });
      if (invitation.role !== 'user') {
        await admin.from('user_roles').insert({
          user_id: created.user.id,
          role: 'user',
        });
      }
    } catch {
      // migration non appliquée : profiles.role reste la source de vérité.
    }

    await admin
      .from('user_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    return json(req, {
      ok: true,
      email: invitation.email,
      message: 'Invitation acceptée. Vous pouvez maintenant vous connecter.',
    }, 201);
  } catch (err) {
    console.error('[INVITATION_ACCEPT_FAILED]');
    return json(req, { error: publicMessage(err) }, httpStatus(err) || 500);
  }
});
