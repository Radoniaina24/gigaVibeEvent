// Edge Function : ticket-email
// POST /emails/ticket { order_id } — Email billet Resend après paiement.
// Authentifié : propriétaire de la commande, admin, ou partenaire de l'event.
// Utilisé par le frontend après validation manuelle (Phase 3/DEV) et, en
// Phase 5, par payment-webhook après génération des billets.
// Secrets : SUPABASE_*, RESEND_*, APP_URL, EMAIL_MODE.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';
import { handleOptions, json } from '../_shared/cors.ts';
import { sendEmailViaResend } from '../_shared/resend.ts';
import { ticketPurchaseEmail } from '../_shared/templates.ts';
import {
  adminClient,
  httpStatus,
  isRateLimited,
  logEmail,
  publicMessage,
  requireEnv,
} from '../_shared/guard.ts';

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

    let orderId = '';
    try {
      const body = await req.json() as { order_id?: string };
      orderId = (body.order_id ?? '').trim();
    } catch {
      return json(req, { error: 'Corps JSON invalide.' }, 400);
    }
    if (!orderId) return json(req, { error: 'order_id requis.' }, 400);

    // Commande + relations (via service_role, autorisation vérifiée ci-dessous).
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select(
        'id,order_number,user_id,total,payment_status,event_id, event:events(id,title,starts_at,venue,city), items:order_items(quantity,unit_price, ticket_type:ticket_types(name))',
      )
      .eq('id', orderId)
      .maybeSingle();
    if (orderError || !order) return json(req, { error: 'Commande introuvable.' }, 404);

    const o = order as {
      id: string;
      order_number: string;
      user_id: string;
      total: number;
      payment_status: string;
      event: { title: string; starts_at: string; venue: string; city: string } | null;
      items: { quantity: number; unit_price: number; ticket_type: { name: string } | null }[];
    };

    // Autorisation : propriétaire, admin, ou partenaire (via profil appelant).
    let allowed = o.user_id === user.id;
    if (!allowed) {
      const { data: profile } = await caller
        .from('profiles')
        .select('role,is_active')
        .eq('id', user.id)
        .maybeSingle();
      const p = profile as { role?: string; is_active?: boolean } | null;
      allowed = !!p && p.is_active === true && (p.role === 'admin' || p.role === 'partner');
    }
    if (!allowed) return json(req, { error: 'Accès refusé.' }, 403);
    if (o.payment_status !== 'paid') {
      return json(req, { error: 'Commande non payée.' }, 400);
    }

    const { data: buyer } = await admin
      .from('profiles')
      .select('email,first_name,last_name')
      .eq('id', o.user_id)
      .maybeSingle();
    const b = (buyer ?? {}) as { email?: string; first_name?: string | null; last_name?: string | null };
    const toEmail = b.email ?? user.email ?? '';
    if (!toEmail) return json(req, { error: 'Email acheteur introuvable.' }, 404);

    if (await isRateLimited(admin, 'ticket', toEmail, 10, 15)) {
      return json(req, { error: 'Trop de demandes. Réessayez dans quelques minutes.' }, 429);
    }

    const quantity = o.items.reduce((s, i) => s + i.quantity, 0);
    const tpl = ticketPurchaseEmail({
      name: [b.first_name, b.last_name].filter(Boolean).join(' ') || 'Bonjour',
      order: {
        eventTitle: o.event?.title ?? 'Événement',
        startsAt: o.event
          ? new Date(o.event.starts_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '',
        venue: o.event?.venue ?? '',
        city: o.event?.city ?? '',
        orderNumber: o.order_number,
        quantity,
        total: o.total,
        paymentStatus: o.payment_status,
        ticketUrl: `${env.appUrl.replace(/\/+$/, '')}/dashboard/orders/${o.id}`,
        lines: o.items.map((i) => ({
          name: i.ticket_type?.name ?? 'Billet',
          quantity: i.quantity,
          price: i.unit_price,
        })),
      },
    });

    try {
      await sendEmailViaResend({
        to: toEmail,
        subject: tpl.subject,
        html: tpl.html,
        kind: 'ticket',
        context: { order_id: o.id },
      });
      await logEmail(admin, {
        type: 'ticket',
        to_email: toEmail,
        user_id: o.user_id,
        status: 'sent',
      });
    } catch {
      await logEmail(admin, {
        type: 'ticket',
        to_email: toEmail,
        user_id: o.user_id,
        status: 'failed',
        error: 'resend_send_failed',
      });
      return json(req, { error: "Impossible d'envoyer l'email." }, 500);
    }

    return json(req, { ok: true, message: 'Email billet envoyé.' });
  } catch (err) {
    console.error('[EMAIL_TICKET_FAILED]');
    return json(req, { error: publicMessage(err) }, httpStatus(err) || 500);
  }
});
