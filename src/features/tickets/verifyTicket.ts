import { getSupabase } from '../../lib/supabase';

export type VerifyReason =
  | 'forbidden'
  | 'not_found'
  | 'already_used'
  | 'cancelled'
  | 'expired'
  | 'invalid';

export interface VerifySuccess {
  ok: true;
  ticket_number: string;
  holder_name: string;
  event_title: string | null;
  ticket_type: string | null;
}

export interface VerifyFailure {
  ok: false;
  reason: VerifyReason;
  ticket_number?: string;
  holder_name?: string;
  event_title?: string | null;
  ticket_type?: string | null;
  used_at?: string | null;
}

export type VerifyResult = VerifySuccess | VerifyFailure;

export interface LookupSuccess {
  ok: true;
  ticket_number: string;
  holder_name: string;
  buyer_first_name: string | null;
  event_title: string | null;
  starts_at: string | null;
  venue: string | null;
  city: string | null;
  ticket_type: string | null;
  status: string;
}

export interface LookupFailure {
  ok: false;
  reason: 'not_found';
}

export type LookupResult = LookupSuccess | LookupFailure;

/**
 * Lecture publique limitée d'un billet (page /tickets/verify, sans login).
 * N'expose que l'affichage : événement, date/lieu, participant, statut.
 */
export async function lookupTicket(qr: string): Promise<LookupResult> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('lookup_ticket', { p_qr: qr.trim() });
  if (error) throw new Error('Vérification impossible.');
  return data as LookupResult;
}

/**
 * Scan contrôleur (Phase 6) : vérification serveur + check-in atomique.
 * Jamais de validation côté client — seul `verify-ticket` fait foi.
 * `already_used` = photocopie / double présentation : refuser l'entrée.
 */
export async function verifyTicket(qr: string): Promise<VerifyResult> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('verify-ticket', {
    body: { qr: qr.trim() },
  });
  if (error) throw new Error('Vérification impossible.');
  return data as VerifyResult;
}
