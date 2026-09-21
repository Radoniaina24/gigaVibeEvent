import { describe, expect, it } from 'vitest';
import { resolveRoles, type RoleRow } from './roles';

const row = (over: Partial<RoleRow> & { role: RoleRow['role'] }): RoleRow => ({
  partner_id: null,
  is_active: true,
  expires_at: null,
  ...over,
});

describe('resolveRoles (source de vérité user_roles)', () => {
  it('déduplique les rôles et collecte les scopes partenaires', () => {
    const res = resolveRoles([
      row({ role: 'user' }),
      row({ role: 'partner', partner_id: 'p1' }),
      row({ role: 'partner', partner_id: 'p2' }),
    ]);
    expect(res.roles).toEqual(['user', 'partner']);
    expect(res.partnerIds).toEqual(['p1', 'p2']);
  });
  it('ignore les rôles inactifs ou expirés', () => {
    const res = resolveRoles([
      row({ role: 'admin', is_active: false }),
      row({ role: 'controller', expires_at: '2000-01-01T00:00:00.000Z' }),
      row({ role: 'user' }),
    ]);
    expect(res.roles).toEqual(['user']);
  });
  it('fallback legacy quand user_roles est vide (migration non appliquée)', () => {
    expect(resolveRoles([], 'partner')).toEqual({ roles: ['partner'], partnerIds: [] });
    expect(resolveRoles(null, null)).toEqual({ roles: [], partnerIds: [] });
  });
});
