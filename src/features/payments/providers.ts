/**
 * Abstraction frontend des moyens de paiement (Phase 1 : métadonnées uniquement).
 * Aucun secret ici. Le traitement réel passe par les Edge Functions (Phase 5).
 */

export type PaymentMethodId = 'mvola' | 'orange_money' | 'airtel_money';

export interface PaymentMethodMeta {
  id: PaymentMethodId;
  label: string;
  hint: string;
  prefixHint: string;
}

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  {
    id: 'mvola',
    label: 'MVola',
    hint: 'Paiement via MVola (Telma)',
    prefixHint: '+261 34 / 38 …',
  },
  {
    id: 'orange_money',
    label: 'Orange Money',
    hint: 'Paiement via Orange Money',
    prefixHint: '+261 32 …',
  },
  {
    id: 'airtel_money',
    label: 'Airtel Money',
    hint: 'Paiement via Airtel Money',
    prefixHint: '+261 33 …',
  },
];

export const PAYMENT_STATUSES = [
  'pending',
  'processing',
  'paid',
  'failed',
  'cancelled',
  'expired',
] as const;
