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
  /** Préfixes nationaux de l'opérateur (ex. 034, 038) pour le contrôle doux. */
  prefixes: string[];
}

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  {
    id: 'yas',
    label: 'YAS',
    hint: 'YAS Money (ex-Telma)',
    prefixHint: '+261 34 / 38 …',
    brandBg: '#E11D48',
    brandInitial: 'Y',
    prefixes: ['034', '038'],
  },
  {
    id: 'orange_money',
    label: 'Orange Money',
    hint: 'Paiement via Orange Money',
    prefixHint: '+261 32 …',
    brandBg: '#F97316',
    brandInitial: 'O',
    prefixes: ['032'],
  },
  {
    id: 'airtel_money',
    label: 'Airtel Money',
    hint: 'Paiement via Airtel Money',
    prefixHint: '+261 33 …',
    brandBg: '#DC2626',
    brandInitial: 'A',
    prefixes: ['033'],
  },
];

/** Normalise un numéro vers le format national (034…, sans espaces). */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+261')) return `0${digits.slice(4)}`;
  if (digits.startsWith('261') && digits.length > 9) return `0${digits.slice(3)}`;
  return digits.replace(/^\+/, '');
}

/** Avertissement (non bloquant) si le numéro ne ressemble pas à l'opérateur. */
export function prefixMismatchWarning(methodId: PaymentMethodId, phone: string): string | null {
  const meta = PAYMENT_METHODS.find((m) => m.id === methodId);
  const normalized = normalizePhone(phone);
  if (!meta || normalized.length < 3) return null;
  if (meta.prefixes.some((p) => normalized.startsWith(p))) return null;
  return `Ce numéro ne ressemble pas à un numéro ${meta.label} (attendu : ${meta.prefixes.join(' / ')}). Vérifiez le numéro expéditeur.`;
}

export const PAYMENT_STATUSES = [
  'pending',
  'processing',
  'paid',
  'failed',
  'cancelled',
  'expired',
] as const;
