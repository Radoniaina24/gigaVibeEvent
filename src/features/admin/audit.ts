import { getSupabase } from '../../lib/supabase';

/**
 * Traçabilité des actions admin (migration 0003 : INSERT réservé aux admins,
 * avec user_id = auteur). Best-effort : un échec d'audit ne bloque jamais
 * l'action métier, mais est signalé en console.
 */
export async function logAudit(
  action: string,
  entity_type: string,
  entity_id?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      action,
      entity_type,
      entity_id: entity_id ?? null,
      metadata: metadata ?? null,
    });
    if (error) throw error;
  } catch (err) {
    console.warn('[audit] écriture impossible :', err);
  }
}
