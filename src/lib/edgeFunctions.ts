import { env } from '../app/config/env';
import { getSupabase } from './supabase';

/**
 * Client des Edge Functions (backend sécurisé).
 * - La clé Resend reste côté serveur : le navigateur n'envoie que
 *   des payloads publics (email, token, mot de passe) vers nos fonctions.
 * - Seules VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY sont exposées.
 * - Les fonctions authentifiées reçoivent le JWT de session (Authorization).
 */

export type EdgeFunctionName =
  | 'auth-register'
  | 'auth-verify-email'
  | 'auth-resend-confirmation'
  | 'auth-forgot-password'
  | 'auth-reset-password'
  | 'admin-invite-user'
  | 'invitation-accept'
  | 'ticket-email';

interface InvokeOptions {
  /** Joint le JWT de session (défaut : true si une session existe). */
  auth?: boolean;
}

function normalizeSupabaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '').replace(/(\/rest\/v1)+$/, '');
}

function functionsBase(): string {
  if (!env.supabaseUrl) throw new Error('Configuration Supabase manquante.');
  return `${normalizeSupabaseUrl(env.supabaseUrl)}/functions/v1`;
}

async function accessToken(useAuth: boolean): Promise<string | null> {
  if (!useAuth) return null;
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function invokeEdgeFunction<T>(
  name: EdgeFunctionName,
  body?: unknown,
  opts: InvokeOptions = {},
): Promise<T> {
  const useAuth = opts.auth ?? true;
  const token = await accessToken(useAuth);
  const res = await fetch(`${functionsBase()}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.supabaseAnonKey ?? '',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok) {
    const message =
      (payload as { error?: string; message?: string } | null)?.error ??
      (payload as { message?: string } | null)?.message ??
      `Requête impossible (HTTP ${res.status}).`;
    throw new Error(message);
  }
  return payload as T;
}

// ---------- Types de réponses ----------

export interface RegisterResponse {
  ok: boolean;
  email_sent: boolean;
  email: string;
  message: string;
}

export interface GenericOkResponse {
  ok: boolean;
  message: string;
}

export interface AcceptInvitationResponse {
  ok: boolean;
  email: string;
  message: string;
}

// ---------- Appels typés (utilisés par les hooks TanStack Query) ----------

export function apiRegister(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}): Promise<RegisterResponse> {
  return invokeEdgeFunction<RegisterResponse>('auth-register', input, { auth: false });
}

export function apiVerifyEmail(token: string): Promise<GenericOkResponse> {
  return invokeEdgeFunction<GenericOkResponse>(
    'auth-verify-email',
    { token },
    { auth: false },
  );
}

export function apiResendConfirmation(email: string): Promise<GenericOkResponse> {
  return invokeEdgeFunction<GenericOkResponse>(
    'auth-resend-confirmation',
    { email },
    { auth: false },
  );
}

export function apiForgotPassword(email: string): Promise<GenericOkResponse> {
  return invokeEdgeFunction<GenericOkResponse>(
    'auth-forgot-password',
    { email },
    { auth: false },
  );
}

export function apiResetPassword(input: {
  token: string;
  password: string;
}): Promise<GenericOkResponse> {
  return invokeEdgeFunction<GenericOkResponse>('auth-reset-password', input, {
    auth: false,
  });
}

export function apiInviteUser(input: {
  email: string;
  role: string;
  partner_id?: string;
}): Promise<GenericOkResponse> {
  return invokeEdgeFunction<GenericOkResponse>('admin-invite-user', input);
}

export function apiAcceptInvitation(input: {
  token: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}): Promise<AcceptInvitationResponse> {
  return invokeEdgeFunction<AcceptInvitationResponse>('invitation-accept', input, {
    auth: false,
  });
}

export function apiSendTicketEmail(order_id: string): Promise<GenericOkResponse> {
  return invokeEdgeFunction<GenericOkResponse>('ticket-email', { order_id });
}
