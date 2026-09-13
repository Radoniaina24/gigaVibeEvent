import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';

export type PaymentValidationMode = 'gve' | 'partner' | 'auto';

export interface PlatformSettings {
  paymentValidation: PaymentValidationMode;
  commissionModel: string;
  commissionPerTicket: number;
  commissionPerEvent: number;
  serviceFeePercent: number;
}

const DEFAULTS: PlatformSettings = {
  paymentValidation: 'gve',
  commissionModel: 'per_ticket',
  commissionPerTicket: 2000,
  commissionPerEvent: 0,
  serviceFeePercent: 0,
};

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
      const mode = str('payment_validation', 'gve');
      return {
        paymentValidation: mode === 'partner' || mode === 'auto' ? mode : 'gve',
        commissionModel: str('commission_model', DEFAULTS.commissionModel),
        commissionPerTicket: Number(str('commission_per_ticket', '2000')) || 0,
        commissionPerEvent: Number(str('commission_per_event', '0')) || 0,
        serviceFeePercent: Number(str('service_fee_percent', '0')) || 0,
      };
    },
  });
}
