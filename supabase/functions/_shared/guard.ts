// Partagé : garde-fous serveur (validation, rate limiting, clients Supabase).
// Toute la logique sensible est ici, jamais dans React.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

export interface ServerEnv {
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
  appUrl: string;
}

export function requireEnv(): ServerEnv {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    throw new Error('Configuration serveur incomplète.');
  }
  return {
    supabaseUrl,
    anonKey,
    serviceKey,
    appUrl:
      Deno.env.get('APP_URL') ?? 'https://giga-vibe-event.vercel.app',
  };
}

/** Client admin (service_role) — bypass RLS, usage serveur uniquement. */
export function adminClient(env: ServerEnv) {
  return createClient(env.supabaseUrl, env.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 72;
}

/**
 * Rate limiting simple basé sur email_logs :
 * max `maxAttempts` envois pour (type + email) sur la fenêtre `windowMin`.
 * Retourne true si la limite est dépassée.
 */
export async function isRateLimited(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  type: 'confirmation' | 'password_reset' | 'invitation' | 'ticket' | 'notification',
  email: string,
  maxAttempts = 5,
  windowMin = 15,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMin * 60_000).toISOString();
  const { count, error } = await admin
    .from('email_logs')
    .select('id', { count: 'exact', head: true })
    .eq('type', type)
    .eq('to_email', email.toLowerCase())
    .gte('created_at', since);
  if (error) return false; // fail-open sur erreur de lecture (l'envoi reste journalisé)
  return (count ?? 0) >= maxAttempts;
}

export async function logEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  args: {
    type: 'confirmation' | 'password_reset' | 'invitation' | 'ticket' | 'notification';
    to_email: string;
    user_id?: string | null;
    status: 'sent' | 'failed' | 'skipped';
    error?: string;
  },
): Promise<void> {
  try {
    await admin.from('email_logs').insert({
      type: args.type,
      to_email: args.to_email.toLowerCase(),
      user_id: args.user_id ?? null,
      status: args.status,
      error: args.error ?? null,
    });
  } catch {
    // Le logging ne doit jamais casser le flux métier.
  }
}

/** Vérifie le JWT appelant et exige le rôle admin (user_roles + fallback profiles.role). */
export async function requireAdmin(
  req: Request,
  env: ServerEnv,
): Promise<{ userId: string; email: string }> {
  const caller = createClient(env.supabaseUrl, env.anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) throw Object.assign(new Error('Non authentifié.'), { status: 401 });
  const { data: profile } = await caller
    .from('profiles')
    .select('role,is_active')
    .eq('id', user.id)
    .maybeSingle();
  const p = profile as { role?: string; is_active?: boolean } | null;
  if (p?.is_active === true && p?.role === 'admin') {
    return { userId: user.id, email: user.email ?? '' };
  }
  // Multi-rôles (migration 0020) : user_roles.admin actif.
  try {
    const { data: rows } = await caller
      .from('user_roles')
      .select('role,is_active,expires_at')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .eq('is_active', true)
      .limit(1);
    const list = (rows ?? []) as { expires_at?: string | null }[];
    if (list.length > 0) {
      const exp = list[0]?.expires_at;
      if (!exp || new Date(exp).getTime() > Date.now()) {
        if (p?.is_active !== false) return { userId: user.id, email: user.email ?? '' };
      }
    }
  } catch {
    // table non migrée : on retombe sur le check legacy ci-dessous.
  }
  throw Object.assign(new Error('Réservé aux administrateurs.'), { status: 403 });
}

export function httpStatus(err: unknown): number {
  return (err as { status?: number })?.status ?? 500;
}

export function publicMessage(err: unknown): string {
  const status = httpStatus(err);
  if (status === 401 || status === 403 || status === 400 || status === 404 || status === 429) {
    return err instanceof Error ? err.message : 'Requête invalide.';
  }
  return 'Erreur interne. Réessayez dans un instant.';
}
