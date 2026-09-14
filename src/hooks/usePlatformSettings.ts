import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';

export type PaymentValidationMode = 'gve' | 'partner' | 'auto';

export type ConfigPaymentMethodId = 'yas' | 'orange_money' | 'airtel_money';

export interface PaymentMethodConfig {
  id: ConfigPaymentMethodId;
  /** Numéro marchand affiché à l'acheteur (jamais hardcodé en React). */
  number: string;
  /** Nom du bénéficiaire affiché. */
  name: string;
  enabled: boolean;
}

export interface PlatformSettings {
  paymentValidation: PaymentValidationMode;
  commissionModel: string;
  commissionPerTicket: number;
  commissionPerEvent: number;
  serviceFeePercent: number;
  /** Config YAS / Orange / Airtel (migration 0010). */
  paymentMethods: PaymentMethodConfig[];
}

const DEFAULTS: PlatformSettings = {
  paymentValidation: 'gve',
  commissionModel: 'per_ticket',
  commissionPerTicket: 2000,
  commissionPerEvent: 0,
  serviceFeePercent: 0,
  paymentMethods: [],
};

const METHOD_IDS: ConfigPaymentMethodId[] = ['yas', 'orange_money', 'airtel_money'];

/** Décode une valeur platform_settings (JSON ou brute) en chaîne. */
function asText(v: unknown, fallback: string): string {
  if (typeof v === 'string') {
    try {
      const parsed: unknown = JSON.parse(v);
      return typeof parsed === 'string' ? parsed : v;
    } catch {
      return v;
    }
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return fallback;
}

function asBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  const t = asText(v, '');
  if (t === 'true') return true;
  if (t === 'false') return false;
  return fallback;
}

/** Réglages plateforme (lecture publique, migration 0005). */
export function usePlatformSettings() {
  return useQuery({
    queryKey: ['platform', 'settings'],
    staleTime: 60_000,
    queryFn: async (): Promise<PlatformSettings> => {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('platform_settings').select('key,value');
      if (error) throw error;
      const map = new Map((data ?? []).map((r) => [r.key as string, r.value]));
      const str = (k: string, fallback: string): string => {
        const v = map.get(k);
        if (typeof v === 'string') return v;
        if (typeof v === 'number') return String(v);
        return fallback;
      };
      // Paiement 100 % manuel : toute valeur autre que 'partner' => 'gve'.
      const mode = str('payment_validation', 'gve');
      const short: Record<ConfigPaymentMethodId, 'yas' | 'orange' | 'airtel'> = {
        yas: 'yas',
        orange_money: 'orange',
        airtel_money: 'airtel',
      };
      return {
        paymentValidation: mode === 'partner' ? mode : 'gve',
        commissionModel: str('commission_model', DEFAULTS.commissionModel),
        commissionPerTicket: Number(str('commission_per_ticket', '2000')) || 0,
        commissionPerEvent: Number(str('commission_per_event', '0')) || 0,
        serviceFeePercent: Number(str('service_fee_percent', '0')) || 0,
        paymentMethods: METHOD_IDS.map((id) => ({
          id,
          number: asText(map.get(`payment_${short[id]}_number`), ''),
          name: asText(map.get(`payment_${short[id]}_name`), 'Giga Vibe Event'),
          enabled: asBool(map.get(`payment_${short[id]}_enabled`), true),
        })),
      };
    },
  });
}
