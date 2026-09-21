import { describe, expect, it } from 'vitest';
import {
  checkoutLineSchema,
  holderNameSchema,
  manualPaymentSchema,
  paymentRejectSchema,
} from './orders';

describe('paymentRejectSchema (motif de refus obligatoire)', () => {
  it('accepte un motif valide', () => {
    expect(paymentRejectSchema.safeParse({ reason: 'Montant incorrect' }).success).toBe(true);
  });
  it('rejette un motif trop court ou vide (même bourré d’espaces)', () => {
    expect(paymentRejectSchema.safeParse({ reason: 'abc' }).success).toBe(false);
    expect(paymentRejectSchema.safeParse({ reason: '    ' }).success).toBe(false);
  });
});

describe('manualPaymentSchema (déclaration 100 % manuelle)', () => {
  const valid = { phone: '+261340000000', reference: 'REF1234', receipt_url: 'order/recu.jpg' };
  it('accepte une déclaration complète', () => {
    expect(manualPaymentSchema.safeParse(valid).success).toBe(true);
  });
  it('exige référence ET capture', () => {
    expect(manualPaymentSchema.safeParse({ ...valid, reference: 'ab' }).success).toBe(false);
    expect(manualPaymentSchema.safeParse({ ...valid, receipt_url: '' }).success).toBe(false);
    expect(manualPaymentSchema.safeParse({ ...valid, phone: 'notaphone' }).success).toBe(false);
  });
});

describe('holderNameSchema / checkoutLineSchema (bornes anti-abus)', () => {
  it('borne les noms de porteurs', () => {
    expect(holderNameSchema.safeParse('A').success).toBe(false);
    expect(holderNameSchema.safeParse('Jean Rakoto').success).toBe(true);
  });
  it('borne les quantités à 10 max (RPC + stock)', () => {
    const base = { ticket_type_id: '123e4567-e89b-12d3-a456-426614174000', name: 'Standard', unit_price: 5000 };
    expect(checkoutLineSchema.safeParse({ ...base, quantity: 2 }).success).toBe(true);
    expect(checkoutLineSchema.safeParse({ ...base, quantity: 0 }).success).toBe(false);
    expect(checkoutLineSchema.safeParse({ ...base, quantity: 11 }).success).toBe(false);
  });
});
