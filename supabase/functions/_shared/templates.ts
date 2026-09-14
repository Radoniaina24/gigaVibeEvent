// Partagé : templates email transactionnels (Resend).
// Identité Giga Vibe Event : logo + bandeau sombre + accent ambre.
// Contraintes : tableaux + styles inline (Gmail/Outlook/mobile), largeur
// max 600px, logo via URL absolue avec fallback texte (alt) si les images
// sont bloquées. URL du logo : RESEND_LOGO_URL (prioritaire, ex. CDN ou
// Storage public) sinon APP_URL/logo.jpeg (asset public du frontend).

function appUrl(): string {
  return (Deno.env.get('APP_URL') ?? 'https://giga-vibe-event.vercel.app')
    .replace(/\/+$/, '');
}

function logoUrl(): string {
  const custom = (Deno.env.get('RESEND_LOGO_URL') ?? '').trim().replace(/\/+$/, '');
  if (custom) return custom;
  return `${appUrl()}/logo.jpeg`;
}

function header(): string {
  return `<tr><td align="center" style="background-color:#09090b;padding:28px 32px 24px 32px;">
<img src="${logoUrl()}" alt="Giga Vibe Event" width="120" style="display:block;width:120px;max-width:60%;height:auto;border:0;border-radius:12px;background-color:#ffffff;" />
<p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:0.3px;">Giga Vibe <span style="color:#fbbf24;">Event</span></p>
<p style="margin:6px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#a1a1aa;">Vivez l'exp&#233;rience ultime</p>
</td></tr>`;
}

function footer(): string {
  const base = appUrl();
  return `<tr><td align="center" style="padding:20px 32px 24px 32px;background-color:#fafafa;border-top:1px solid #f4f4f5;">
<p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;">
<a href="${base}/events" style="color:#b45309;font-weight:bold;text-decoration:none;">Voir les &#233;v&#233;nements</a>
<span style="color:#d4d4d8;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
<a href="${base}/dashboard" style="color:#b45309;font-weight:bold;text-decoration:none;">Mon espace</a>
<span style="color:#d4d4d8;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
<a href="${base}/contact" style="color:#b45309;font-weight:bold;text-decoration:none;">Support</a>
</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#a1a1aa;">Email automatique, merci de ne pas y r&#233;pondre.<br>&#169; 2026 Giga Vibe Event — Tous droits r&#233;serv&#233;s.</p>
</td></tr>`;
}

function ctaButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 8px 0;"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#f59e0b" style="border-radius:12px;background-color:#f59e0b;">
<a href="${url}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#09090b;text-decoration:none;">${label}</a>
</td></tr></table>
</td></tr></table>
<p style="margin:12px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#71717a;word-break:break-all;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><a href="${url}" style="color:#b45309;">${url}</a></p>`;
}

function layout(opts: {
  preheader: string;
  title: string;
  intro: string;
  body: string;
  cta?: { label: string; url: string };
  footerNote?: string;
}): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${opts.title}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${opts.preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e4e4e7;">
${header()}
<tr><td style="padding:32px 32px 8px 32px;">
<p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#f59e0b;">${opts.intro}</p>
<h1 style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;color:#09090b;">${opts.title}</h1>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#3f3f46;">${opts.body}</div>
${opts.cta ? ctaButton(opts.cta.label, opts.cta.url) : ''}
${opts.footerNote ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;"><tr><td style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#92400e;">${opts.footerNote}</td></tr></table>` : ''}
<p style="margin:24px 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3f3f46;">Besoin d'aide ? <a href="${appUrl()}/contact" style="color:#b45309;font-weight:bold;">Contactez notre support</a>.</p>
</td></tr>
<tr><td style="height:24px;font-size:0;line-height:0;">&nbsp;</td></tr>
${footer()}
</table>
</td></tr>
</table>
</body></html>`;
}

export function confirmationEmail(opts: {
  name: string;
  confirmationUrl: string;
  expiresMinutes: number;
}): { subject: string; html: string } {
  return {
    subject: 'Bienvenue sur Giga Vibe Event — Confirmez votre email',
    html: layout({
      preheader: 'Confirmez votre adresse email pour activer votre compte.',
      intro: 'Bienvenue',
      title: 'Confirmez votre adresse email',
      body: `<p style="margin:0 0 12px 0;">Bonjour <strong>${escapeHtml(opts.name)}</strong>,</p>
<p style="margin:0;">Merci pour votre inscription sur <strong>Giga Vibe Event</strong> ! Plus qu'une &#233;tape : cliquez ci-dessous afin d'activer votre compte et acc&#233;der &#224; la billetterie.</p>`,
      cta: { label: "Confirmer mon adresse email", url: opts.confirmationUrl },
      footerNote: `&#9201; Ce lien expirera dans <strong>${opts.expiresMinutes} minutes</strong> et ne peut &#234;tre utilis&#233; qu'une seule fois. Si vous n'&#234;tes pas &#224; l'origine de cette inscription, ignorez cet email.`,
    }),
  };
}

export function passwordResetEmail(opts: {
  resetUrl: string;
  expiresMinutes?: number;
}): { subject: string; html: string } {
  return {
    subject: 'Réinitialisation de votre mot de passe — Giga Vibe Event',
    html: layout({
      preheader: 'Réinitialisez votre mot de passe en quelques clics.',
      intro: 'S&#233;curit&#233;',
      title: 'Réinitialisez votre mot de passe',
      body: `<p style="margin:0 0 12px 0;">Bonjour,</p>
<p style="margin:0;">Nous avons re&#231;u une demande de r&#233;initialisation du mot de passe associ&#233; &#224; votre compte <strong>Giga Vibe Event</strong>. Cliquez ci-dessous pour en choisir un nouveau.</p>`,
      cta: { label: 'R&#233;initialiser mon mot de passe', url: opts.resetUrl },
      footerNote: `&#9201; Ce lien expire dans <strong>${opts.expiresMinutes ?? 30} minutes</strong> et ne peut &#234;tre utilis&#233; qu'une seule fois. Si vous n'&#234;tes pas &#224; l'origine de cette demande, ignorez cet email — votre mot de passe reste inchang&#233;.`,
    }),
  };
}

export function invitationEmail(opts: {
  inviterName: string;
  role: string;
  invitationUrl: string;
  expiresDays: number;
}): { subject: string; html: string } {
  const roleLabel: Record<string, string> = {
    user: 'Membre',
    partner: 'Partenaire',
    controller: 'Contr&#244;leur',
    admin: 'Administrateur',
  };
  return {
    subject: 'Vous êtes invité à rejoindre Giga Vibe Event',
    html: layout({
      preheader: `Invitation de ${opts.inviterName} — rôle : ${opts.role}.`,
      intro: 'Invitation',
      title: 'Rejoignez Giga Vibe Event',
      body: `<p style="margin:0 0 12px 0;">Bonjour,</p>
<p style="margin:0 0 16px 0;"><strong>${escapeHtml(opts.inviterName)}</strong> vous invite &#224; rejoindre <strong>Giga Vibe Event</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px 0;"><tr><td style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3f3f46;">R&#244;le attribu&#233; : <strong style="color:#09090b;">${roleLabel[opts.role] ?? escapeHtml(opts.role)}</strong></td></tr></table>`,
      cta: { label: "Accepter l'invitation", url: opts.invitationUrl },
      footerNote: `&#9201; Cette invitation expire dans <strong>${opts.expiresDays} jours</strong>.`,
    }),
  };
}

export interface TicketEmailOrder {
  eventTitle: string;
  startsAt: string;
  venue: string;
  city: string;
  orderNumber: string;
  quantity: number;
  total: number;
  paymentStatus: string;
  ticketUrl: string;
  lines: { name: string; quantity: number; price: number }[];
}

export function ticketPurchaseEmail(opts: {
  name: string;
  order: TicketEmailOrder;
}): { subject: string; html: string } {
  const lines = opts.order.lines
    .map(
      (l) =>
        `<tr><td style="padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3f3f46;border-bottom:1px solid #f4f4f5;">${escapeHtml(l.name)} <span style="color:#a1a1aa;">× ${l.quantity}</span></td><td align="right" style="padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#09090b;border-bottom:1px solid #f4f4f5;white-space:nowrap;">${formatAr(l.price * l.quantity)}</td></tr>`,
    )
    .join('');
  return {
    subject: `Votre billet — ${opts.order.eventTitle} (${opts.order.orderNumber})`,
    html: layout({
      preheader: `Commande ${opts.order.orderNumber} confirmée — vos billets sont prêts.`,
      intro: 'Commande confirm&#233;e',
      title: 'Vos billets sont prêts !',
      body: `<p style="margin:0 0 12px 0;">Bonjour <strong>${escapeHtml(opts.name)}</strong>,</p>
<p style="margin:0 0 16px 0;">Votre paiement a &#233;t&#233; confirm&#233;. Pr&#233;sentez votre QR Code &#224; l'entr&#233;e, et &#224; tr&#232;s vite !</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09090b;border-radius:14px;"><tr><td style="padding:20px 22px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 4px 0;font-size:16px;font-weight:bold;color:#ffffff;">${escapeHtml(opts.order.eventTitle)}</p>
<p style="margin:0;font-size:13px;line-height:1.6;color:#d4d4d8;">${escapeHtml(opts.order.startsAt)}<br>${escapeHtml(opts.order.venue)}, ${escapeHtml(opts.order.city)}</p>
<p style="margin:12px 0 0 0;font-size:12px;color:#fbbf24;">R&#233;f&#233;rence : <strong>${escapeHtml(opts.order.orderNumber)}</strong> &nbsp;·&nbsp; ${opts.order.quantity} billet${opts.order.quantity > 1 ? 's' : ''} &nbsp;·&nbsp; Paiement : ${escapeHtml(opts.order.paymentStatus)}</p>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;background-color:#fafafa;border:1px solid #e4e4e7;border-radius:14px;"><tr><td style="padding:6px 20px 14px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${lines}</table>
<p style="margin:12px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#09090b;"><strong>Total pay&#233; : ${formatAr(opts.order.total)}</strong></p>
</td></tr></table>`,
      cta: { label: 'Voir mon billet', url: opts.order.ticketUrl },
    }),
  };
}

export function notificationEmail(opts: {
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}): { subject: string; html: string } {
  return {
    subject: `${opts.title} — Giga Vibe Event`,
    html: layout({
      preheader: opts.title,
      intro: 'Notification',
      title: escapeHtml(opts.title),
      body: `<p style="margin:0;">${escapeHtml(opts.message)}</p>`,
      cta: opts.actionUrl
        ? { label: opts.actionLabel ?? 'Voir', url: opts.actionUrl }
        : undefined,
    }),
  };
}

function formatAr(amount: number): string {
  return `${new Intl.NumberFormat('fr-MG', { maximumFractionDigits: 0 }).format(amount)} Ar`;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
