import { describe, expect, it } from 'vitest';
import { ALL_ROLES, primaryRole, ROLE_PRIORITY } from './database';

describe('primaryRole', () => {
  it("retourne 'user' sans rôle", () => {
    expect(primaryRole([])).toBe('user');
  });
  it('applique la priorité admin > partner > controller > user', () => {
    expect(primaryRole(['user', 'partner'])).toBe('partner');
    expect(primaryRole(['controller', 'user'])).toBe('controller');
    expect(primaryRole(['controller', 'partner', 'admin', 'user'])).toBe('admin');
  });
  it('cohérence entre ALL_ROLES et ROLE_PRIORITY (garde-fou multi-rôles)', () => {
    expect([...ALL_ROLES].sort()).toEqual(['admin', 'controller', 'partner', 'user']);
    for (const r of ALL_ROLES) expect(ROLE_PRIORITY[r]).toBeGreaterThan(0);
    expect(ROLE_PRIORITY.admin).toBeGreaterThan(ROLE_PRIORITY.partner);
    expect(ROLE_PRIORITY.partner).toBeGreaterThan(ROLE_PRIORITY.controller);
    expect(ROLE_PRIORITY.controller).toBeGreaterThan(ROLE_PRIORITY.user);
  });
});
