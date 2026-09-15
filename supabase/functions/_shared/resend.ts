// Partagé : client Resend MINIMAL via fetch (aucune dépendance npm).
// Sécurité :
//   - RESEND_API_KEY lu uniquement côté serveur (secret Edge Function).
//   - Jamais de log du token complet / clé API / mot de passe.
//   - EMAIL_MODE=development => aucun envoi réel, URL loggée sans secret sensible.
// Logs normalisés : EMAIL_<TYPE>_SENT / EMAIL_<TYPE>_FAILED.

export type EmailKind =
  | 'confirmation'
  | 'password_reset'
  | 'invitation'
  | 'ticket'
  | 'notification';

const LOG_TAG: Record<EmailKind, { sent: string; failed: string }> = {
  confirmation: {
    sent: 'EMAIL_CONFIRMATION_SENT',
    failed: 'EMAIL_CONFIRMATION_FAILED',
  },
  password_reset: {
    sent: 'EMAIL_PASSWORD_RESET_SENT',
    failed: 'EMAIL_PASSWORD_RESET_FAILED',
  },
  invitation: { sent: 'EMAIL_INVITATION_SENT', failed: 'EMAIL_INVITATION_FAILED' },
  ticket: { sent: 'EMAIL_TICKET_SENT', failed: 'EMAIL_TICKET_FAILED' },
  notification: {
    sent: 'EMAIL_NOTIFICATION_SENT',
    failed: 'EMAIL_NOTIFICATION_FAILED',
  },
};

function fromEmail(): string {
  return Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev';
}

function fromAddress(): string {
  const name = Deno.env.get('RESEND_FROM_NAME') ?? 'Giga Vibe Event';
  return `${name} <${fromEmail()}>`;
}

/** Adresse de test Resend : ne peut envoyer qu'au propriétaire du compte. */
export function isOnboardingFrom(): boolean {
  return fromEmail().toLowerCase() === 'onboarding@resend.dev';
}

export function isDevMailMode(): boolean {
  return (Deno.env.get('EMAIL_MODE') ?? 'development') !== 'production';
}

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  kind: EmailKind;
  /** Contexte non sensible pour les logs dev (ex. user_id). */
  context?: Record<string, unknown>;
}

export async function sendEmailViaResend(
  args: SendEmailArgs,
): Promise<{ id?: string; dev?: boolean }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const tag = LOG_TAG[args.kind];
  const devMode = isDevMailMode();

  if (devMode) {
    console.log(
      `[${tag.sent}] to=${args.to} subject="${args.subject}" (dev_mode_no_send)`,
      args.context ?? {},
    );
    return { dev: true };
  }

  if (!apiKey) {
    console.error(`[${tag.failed}] to=${args.to} reason=missing_RESEND_API_KEY`);
    throw new Error('Configuration email incomplète.');
  }

  // Garde-fou prod le plus fréquent : l'adresse de test Resend ne délivre
  // qu'au propriétaire du compte. Tout autre destinataire = 403 Resend.
  if (isOnboardingFrom()) {
    console.warn(
      `[${tag.failed}] to=${args.to} reason=onboarding_from_in_production ` +
        '(RESEND_FROM_EMAIL=onboarding@resend.dev : vérifiez un domaine Resend et mettez noreply@mondomaine.com)',
      args.context ?? {},
    );
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [args.to],
        subject: args.subject,
        html: args.html,
      }),
    });
    if (!res.ok) {
      // Ne jamais retourner les détails Resend au client.
      // Le corps est loggé côté serveur uniquement (ex. limite onboarding,
      // domaine non vérifié, quota) pour diagnostiquer la prod.
      let detail = '';
      try {
        detail = (await res.text()).slice(0, 500);
      } catch {
        detail = '';
      }
      console.error(
        `[${tag.failed}] to=${args.to} status=${res.status} detail=${detail}`,
      );
      throw new Error("Échec de l'envoi de l'email.");
    }
    const data = (await res.json()) as { id?: string };
    console.log(`[${tag.sent}] to=${args.to}`, args.context ?? {});
    return { id: data.id };
  } catch (err) {
    console.error(`[${tag.failed}] to=${args.to}`);
    throw err instanceof Error ? err : new Error("Échec de l'envoi de l'email.");
  }
}
