// Edge Function : admin-users
// Administration des comptes (admin uniquement) — action via { action, ... }.
//   - create : crée auth.users + profil + user_roles (+ email de bienvenue).
//   - list-invitations : invitations en attente (table fermée au frontend).
//   - resend-invitation : nouveau token + renvoi Resend.
//   - revoke-invitation : supprime une invitation en attente.
//   - delete : suppression définitive si aucune commande, sinon anonymisation
//     RGPD (jamais de suppression qui casserait l'historique des commandes).
// Secrets : SUPABASE_*, RESEND_*, APP_URL, EMAIL_MODE.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { expiresInDays, randomToken, sha256Hex } from '../_shared/tokens.ts';
import { sendEmailViaResend } from '../_shared/resend.ts';
import { invitationEmail, notificationEmail } from '../_shared/templates.ts';
import {
  adminClient,
  httpStatus,
  isRateLimited,
  isValidEmail,
  isValidPassword,
  logEmail,
  publicMessage,
  requireAdmin,
  requireEnv,
} from '../_shared/guard.ts';

const ROLES = ['user', 'partner', 'controller', 'admin'] as const;
const INVITE_EXPIRES_DAYS = 7;

function checkRoleScope(role: string, partnerId: string | null): string | null {
  if (role === 'partner' && !partnerId) {
    return 'Un partenaire doit être rattaché à un organisateur (partner_id requis).';
  }
  if (partnerId && role !== 'partner') {
    return 'Seul le rôle partenaire accepte un rattachement organisateur.';
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return json(req, { error: 'Méthode non autorisée.' }, 405);

  try {
    const env = requireEnv();
    const admin = adminClient(env);
    const caller = await requireAdmin(req, env);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json(req, { error: 'Corps JSON invalide.' }, 400);
    }
    const action = String((body.action ?? '') as string);

    // ----------------------------------------------------------
    // CREATE — compte direct avec mot de passe temporaire
    // ----------------------------------------------------------
    if (action === 'create') {
      const email = String((body.email ?? '') as string).trim().toLowerCase();
      const password = String((body.password ?? '') as string);
      const firstName = String((body.first_name ?? '') as string).trim().slice(0, 80);
      const lastName = String((body.last_name ?? '') as string).trim().slice(0, 80);
      const phone = String((body.phone ?? '') as string).trim().slice(0, 20) || null;
      const role = String((body.role ?? 'user') as string).trim();
      const partnerId = String((body.partner_id ?? '') as string).trim() || null;

      if (!isValidEmail(email)) return json(req, { error: 'Email invalide.' }, 400);
      if (!isValidPassword(password)) {
        return json(req, { error: 'Mot de passe invalide (8 à 72 caractères).' }, 400);
      }
      if (!(ROLES as readonly string[]).includes(role)) {
        return json(req, { error: 'Rôle invalide.' }, 400);
      }
      const scopeError = checkRoleScope(role, partnerId);
      if (scopeError) return json(req, { error: scopeError }, 400);
      if (phone && !/^\+?[0-9\s-]{8,20}$/.test(phone)) {
        return json(req, { error: 'Numéro de téléphone invalide.' }, 400);
      }
      if (partnerId) {
        const { data: partner } = await admin
          .from('partners')
          .select('id')
          .eq('id', partnerId)
          .maybeSingle();
        if (!partner) return json(req, { error: 'Partenaire introuvable.' }, 404);
      }

      const { data: existing } = await admin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (existing) {
        return json(req, { error: 'Un compte existe déjà avec cet email.' }, 409);
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName || null, last_name: lastName || null, phone },
      });
      if (createError || !created?.user) {
        return json(req, { error: 'Création du compte impossible.' }, 500);
      }
      const userId = created.user.id as string;

      await admin.from('profiles').update({
        first_name: firstName || null,
        last_name: lastName || null,
        phone,
        role,
        partner_id: partnerId,
        is_active: true,
      }).eq('id', userId);

      await admin.from('user_roles').insert({
        user_id: userId,
        role,
        partner_id: partnerId,
        is_active: true,
      });

      // Invitations en attente devenues inutiles.
      await admin.from('user_invitations').delete().eq('email', email).is('accepted_at', null);

      await admin.from('audit_logs').insert({
        user_id: caller.userId,
        action: 'user.created',
        entity_type: 'profiles',
        entity_id: userId,
        metadata: { email, role, partner_id: partnerId },
      });

      // Email de bienvenue (best effort : ne bloque jamais la création).
      try {
        const tpl = notificationEmail({
          title: 'Votre compte est prêt',
          message: `Un administrateur a créé votre compte Giga Vibe Event (${email}). Connectez-vous avec le mot de passe temporaire communiqué par votre administrateur, puis changez-le depuis votre profil.`,
          actionUrl: `${env.appUrl.replace(/\/+$/, '')}/login`,
          actionLabel: 'Se connecter',
        });
        const sendResult = await sendEmailViaResend({
          to: email,
          subject: tpl.subject,
          html: tpl.html,
          kind: 'notification',
          context: { created_by: caller.userId },
        });
        await logEmail(admin, {
          type: 'notification',
          to_email: email,
          user_id: userId,
          status: sendResult.dev ? 'skipped' : 'sent',
          error: sendResult.dev ? 'dev_mode_no_send' : undefined,
        });
      } catch {
        await logEmail(admin, {
          type: 'notification',
          to_email: email,
          user_id: userId,
          status: 'failed',
          error: 'resend_send_failed',
        });
      }

      return json(req, { ok: true, id: userId, email, message: 'Compte créé.' }, 201);
    }

    // ----------------------------------------------------------
    // LIST-INVITATIONS
    // ----------------------------------------------------------
    if (action === 'list-invitations') {
      const { data, error } = await admin
        .from('user_invitations')
        .select('id,email,role,partner_id,expires_at,created_at,invited_by,inviter_name,accepted_at')
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return json(req, { error: 'Lecture impossible.' }, 500);
      const rows = (data ?? []) as Record<string, unknown>[];
      const partnerIds = [...new Set(rows.map((r) => r.partner_id as string).filter(Boolean))];
      let partnerNames = new Map<string, string>();
      if (partnerIds.length > 0) {
        const { data: partners } = await admin
          .from('partners')
          .select('id,name')
          .in('id', partnerIds);
        partnerNames = new Map(((partners ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
      }
      return json(req, {
        ok: true,
        invitations: rows.map((r) => ({
          ...r,
          partner_name: r.partner_id ? (partnerNames.get(r.partner_id as string) ?? null) : null,
          expired: new Date(r.expires_at as string).getTime() <= Date.now(),
        })),
      });
    }

    // ----------------------------------------------------------
    // RESEND-INVITATION
    // ----------------------------------------------------------
    if (action === 'resend-invitation') {
      const invitationId = String((body.invitation_id ?? '') as string);
      const { data: invite } = await admin
        .from('user_invitations')
        .select('id,email,role,partner_id,accepted_at')
        .eq('id', invitationId)
        .maybeSingle();
      const inv = invite as {
        id: string; email: string; role: string; partner_id: string | null; accepted_at: string | null;
      } | null;
      if (!inv || inv.accepted_at) {
        return json(req, { error: 'Invitation introuvable.' }, 404);
      }
      if (await isRateLimited(admin, 'invitation', inv.email)) {
        return json(req, { error: 'Trop de demandes. Réessayez dans quelques minutes.' }, 429);
      }
      const token = randomToken();
      await admin.from('user_invitations').update({
        token_hash: await sha256Hex(token),
        expires_at: expiresInDays(INVITE_EXPIRES_DAYS),
      }).eq('id', invitationId);

      try {
        const tpl = invitationEmail({
          inviterName: caller.email || 'Administration',
          role: inv.role,
          invitationUrl: `${env.appUrl.replace(/\/+$/, '')}/invitation/accept?token=${token}`,
          expiresDays: INVITE_EXPIRES_DAYS,
        });
        const sendResult = await sendEmailViaResend({
          to: inv.email,
          subject: tpl.subject,
          html: tpl.html,
          kind: 'invitation',
          context: { invited_by: caller.userId, resent: true },
        });
        await logEmail(admin, {
          type: 'invitation',
          to_email: inv.email,
          user_id: caller.userId,
          status: sendResult.dev ? 'skipped' : 'sent',
          error: sendResult.dev ? 'dev_mode_no_send' : undefined,
        });
      } catch {
        await logEmail(admin, {
          type: 'invitation',
          to_email: inv.email,
          user_id: caller.userId,
          status: 'failed',
          error: 'resend_send_failed',
        });
        return json(req, { error: "Impossible d'envoyer l'invitation." }, 500);
      }
      return json(req, { ok: true, message: 'Invitation renvoyée.' });
    }

    // ----------------------------------------------------------
    // REVOKE-INVITATION
    // ----------------------------------------------------------
    if (action === 'revoke-invitation') {
      const invitationId = String((body.invitation_id ?? '') as string);
      const { error } = await admin
        .from('user_invitations')
        .delete()
        .eq('id', invitationId)
        .is('accepted_at', null);
      if (error) return json(req, { error: 'Révocation impossible.' }, 500);
      return json(req, { ok: true, message: 'Invitation révoquée.' });
    }

    // ----------------------------------------------------------
    // DELETE — suppression définitive ou anonymisation RGPD
    // ----------------------------------------------------------
    if (action === 'delete') {
      const userId = String((body.user_id ?? '') as string);
      if (!userId) return json(req, { error: 'Utilisateur requis.' }, 400);
      if (userId === caller.userId) {
        return json(req, { error: 'Vous ne pouvez pas supprimer votre propre compte.' }, 400);
      }
      const { data: profile } = await admin
        .from('profiles')
        .select('id,email,role,is_active')
        .eq('id', userId)
        .maybeSingle();
      const prof = profile as { id: string; email: string; role: string; is_active: boolean } | null;
      if (!prof) return json(req, { error: 'Utilisateur introuvable.' }, 404);

      // Garde : jamais le dernier admin actif.
      const { data: adminRoles } = await admin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .eq('is_active', true);
      const activeAdminIds = new Set(((adminRoles ?? []) as { user_id: string }[]).map((r) => r.user_id));
      if (prof.role === 'admin' && activeAdminIds.size === 0) {
        const { data: legacyAdmins } = await admin
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .eq('is_active', true);
        for (const a of ((legacyAdmins ?? []) as { id: string }[])) activeAdminIds.add(a.id);
      }
      const targetIsAdmin = activeAdminIds.has(userId) || prof.role === 'admin';
      const otherAdmins = [...activeAdminIds].filter((id) => id !== userId);
      if (targetIsAdmin && otherAdmins.length === 0) {
        // Vérifie aussi le rôle legacy avant de bloquer.
        const { count } = await admin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin')
          .eq('is_active', true)
          .neq('id', userId);
        if (!count) {
          return json(req, { error: 'Impossible : dernier administrateur actif.' }, 400);
        }
      }

      const { count: orderCount } = await admin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (!orderCount) {
        // Aucune commande : suppression définitive (cascade auth -> profil).
        await admin.from('user_invitations').delete().eq('email', prof.email);
        const { error: delError } = await admin.auth.admin.deleteUser(userId);
        if (delError) return json(req, { error: 'Suppression impossible.' }, 500);
        await admin.from('audit_logs').insert({
          user_id: caller.userId,
          action: 'user.deleted',
          entity_type: 'profiles',
          entity_id: userId,
          metadata: { email: prof.email },
        });
        return json(req, { ok: true, mode: 'deleted', message: 'Compte supprimé.' });
      }

      // Commandes existantes : anonymisation (historique préservé).
      const anonEmail = `deleted-${userId.slice(0, 8)}@deleted.local`;
      await admin.from('profiles').update({
        email: anonEmail,
        first_name: 'Compte',
        last_name: 'supprimé',
        phone: null,
        partner_id: null,
        is_active: false,
      }).eq('id', userId);
      await admin.from('user_roles').update({ is_active: false }).eq('user_id', userId);
      await admin.from('user_invitations').delete().eq('email', prof.email);
      await admin.from('audit_logs').insert({
        user_id: caller.userId,
        action: 'user.anonymized',
        entity_type: 'profiles',
        entity_id: userId,
        metadata: { orders: orderCount },
      });
      return json(req, { ok: true, mode: 'anonymized', message: 'Compte anonymisé (commandes conservées).' });
    }

    return json(req, { error: 'Action inconnue.' }, 400);
  } catch (err) {
    console.error('[ADMIN_USERS_FAILED]');
    return json(req, { error: publicMessage(err) }, httpStatus(err) || 500);
  }
});
