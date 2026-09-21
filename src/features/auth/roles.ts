import type { UserRole, UserRoleRow } from '../../types/database';

export type RoleRow = Pick<
  UserRoleRow,
  'role' | 'partner_id' | 'is_active' | 'expires_at'
>;

/**
 * Rôles effectifs d'un utilisateur (pur, testable).
 * Source de vérité = lignes `user_roles` actives et non expirées.
 * Fallback = rôle principal legacy si aucune ligne (migration non appliquée).
 */
export function resolveRoles(
  rows: RoleRow[] | null | undefined,
  fallback?: UserRole | null,
): { roles: UserRole[]; partnerIds: string[] } {
  const now = Date.now();
  const active = (rows ?? []).filter(
    (r) =>
      r.is_active &&
      (!r.expires_at || new Date(r.expires_at).getTime() > now),
  );
  const roles = [...new Set(active.map((r) => r.role))] as UserRole[];
  const partnerIds = [
    ...new Set(
      active
        .map((r) => r.partner_id)
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  if (roles.length === 0 && fallback) return { roles: [fallback], partnerIds: [] };
  if (roles.length === 0) return { roles: [], partnerIds };
  return { roles, partnerIds };
}
