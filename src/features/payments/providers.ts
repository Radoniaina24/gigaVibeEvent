/**
 * Abstraction frontend des moyens de paiement (Phase 1 : métadonnées uniquement).
 * Aucun secret ici. Le traitement réel passe par les Edge Functions (Phase 5).
 */

export type PaymentMethodId = 'yas' | 'orange_money' | 'airtel_money';

export interface PaymentMethodMeta {
  id: PaymentMethodId;
  label: string;
  hint: string;
  prefixHint: string;
  /** Couleur de marque pour le badge opérateur (pastille + initiale). */
  brandBg: string;
  brandInitial: string;
}

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  {
    id: 'yas',
    label: 'YAS',
    hint: 'YAS Money (ex-Telma)',
    prefixHint: '+261 34 / 38 …',
    brandBg: '#E11D48',
    brandInitial: 'Y',
  },
  {
    id: 'orange_money',
    label: 'Orange Money',
    hint: 'Paiement via Orange Money',
    prefixHint: '+261 32 …',
    brandBg: '#F97316',
    brandInitial: 'O',
  },
  {
    id: 'airtel_money',
    label: 'Airtel Money',
    hint: 'Paiement via Airtel Money',
    prefixHint: '+261 33 …',
    brandBg: '#DC2626',
    brandInitial: 'A',
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
