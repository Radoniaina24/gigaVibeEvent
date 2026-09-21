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
    if (error) {
      // 42501 = policy RLS manquante (migration 0003/0019 non appliquée sur la
      // base distante) ou profil non admin. L'action métier a déjà réussi :
      // on ne bloque rien, on donne un message actionnable au lieu de l'objet brut.
      if ((error as { code?: string }).code === '42501') {
        console.warn(
          '[audit] INSERT refusé par RLS (code 42501). Appliquez supabase/migrations/0019_audit_insert_fix.sql ' +
            'sur la base distante et vérifiez que votre profil est admin actif (role=admin, is_active=true).',
        );
        return;
      }
      throw error;
    }
  } catch (err) {
    console.warn('[audit] écriture impossible :', err);
  }
}
