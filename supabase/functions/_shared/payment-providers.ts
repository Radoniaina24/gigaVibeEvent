/**
 * Abstraction des fournisseurs Mobile Money (Phase 5).
 * Le frontend n'appelle JAMAIS ces APIs directement :
 * uniquement via Edge Functions (secrets côté serveur).
 */

export type PaymentProviderName = 'yas' | 'orange_money' | 'airtel_money';

export interface PaymentIntent {
  orderId: string;
  amount: number;
  currency: 'MGA';
  phoneNumber: string;
  provider: PaymentProviderName;
}

export interface ProviderResult {
  ok: boolean;
  providerRef?: string;
  raw?: unknown;
  message?: string;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  initiate(intent: PaymentIntent): Promise<ProviderResult>;
  verify(providerRef: string): Promise<ProviderResult>;
}

// Implémentations réelles en Phase 5 (une classe par opérateur).
// Exemple : YasProvider, OrangeMoneyProvider, AirtelMoneyProvider.

export function getProvider(name: PaymentProviderName): PaymentProvider {
  throw new Error(
    `Provider ${name} non configuré (Phase 5). Secrets requis côté serveur.`,
  );
}
