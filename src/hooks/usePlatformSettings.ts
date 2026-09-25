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

export type FeesPayer = 'buyer' | 'organizer' | 'split';

export interface PlatformSettings {
  paymentValidation: PaymentValidationMode;
  commissionModel: string;
  commissionPerTicket: number;
  commissionPerEvent: number;
  serviceFeePercent: number;
  /** Frais fixes par billet en Ar (migration 0023, défaut 0). */
  serviceFeeFixed: number;
  /** Qui paie les frais : buyer | organizer | split (migration 0023). */
  feesPayer: FeesPayer;
  /** Config YAS / Orange / Airtel (migration 0010). */
  paymentMethods: PaymentMethodConfig[];
  /** Devise d'affichage, code ISO (migration 0018, défaut MGA). */
  currency: string;
  /** Durée de réservation d'une commande en minutes (migration 0018). */
  orderExpiryMinutes: number;
  /** Message libre affiché dans le tunnel d'achat (vide = masqué). */
  checkoutInstructions: string;
  /** Page de maintenance publique (les admins passent toujours). */
  maintenanceMode: boolean;
  maintenanceMessage: string;
  /** Limites billetterie (migration 0023). */
  maxTicketsPerType: number;
  maxLinesPerOrder: number;
  maxTicketsPerOrder: number;
  /** Site & contact (migration 0023). */
  siteName: string;
  siteLogoUrl: string;
  contactEmail: string;
  contactPhone: string;
  /** Préfixes de numérotation (migration 0023). */
  ticketNumberPrefix: string;
  orderNumberPrefix: string;
  /** Uploads & auth (migration 0023). */
  uploadMaxSizeMb: number;
  authConfirmExpiryMinutes: number;
  authResetExpiryMinutes: number;
  invitationExpiryDays: number;
  /** Opérateurs : préfixes + instructions par opérateur (migration 0024). */
  paymentPrefixes: Record<ConfigPaymentMethodId, string>;
  paymentInstructions: Record<ConfigPaymentMethodId, string>;
  /** Tarifs P1 (migration 0024). */
  minOrderAmount: number;
  serviceFeeCap: number;
  /** Contenu (migration 0024). */
  refundPolicyText: string;
  termsUrl: string;
  /** SEO (migration 0024). */
  seoSiteTitle: string;
  seoSiteDescription: string;
  seoOgImageUrl: string;
  seoKeywords: string;
  /** Social (migration 0024, vide = masqué). */
  socialFacebookUrl: string;
  socialInstagramUrl: string;
  socialTiktokUrl: string;
  socialWhatsapp: string;
  socialYoutubeUrl: string;
  /** Emails & notifications (migration 0024, textes non sensibles). */
  emailBrandName: string;
  emailFooterText: string;
  emailSupportUrl: string;
  notifyPaymentValidated: boolean;
  notifyPaymentRejected: boolean;
  notifyEventPublished: boolean;
}

const DEFAULTS: PlatformSettings = {
  paymentValidation: 'gve',
  commissionModel: 'per_ticket',
  commissionPerTicket: 2000,
  commissionPerEvent: 0,
  serviceFeePercent: 0,
  serviceFeeFixed: 0,
  feesPayer: 'buyer',
  paymentMethods: [],
  currency: 'MGA',
  orderExpiryMinutes: 30,
  checkoutInstructions: '',
  maintenanceMode: false,
  maintenanceMessage: 'Site en maintenance. Revenez dans quelques instants.',
  maxTicketsPerType: 10,
  maxLinesPerOrder: 10,
  maxTicketsPerOrder: 20,
  siteName: 'Giga Vibe Event',
  siteLogoUrl: '/logo.jpeg',
  contactEmail: 'contact@ticket.mg',
  contactPhone: '+261 34 12 345 67',
  ticketNumberPrefix: 'GVE-',
  orderNumberPrefix: 'ORDER-',
  uploadMaxSizeMb: 5,
  authConfirmExpiryMinutes: 60,
  authResetExpiryMinutes: 30,
  invitationExpiryDays: 7,
  paymentPrefixes: { yas: '034,038', orange_money: '032,037', airtel_money: '033' },
  paymentInstructions: { yas: '', orange_money: '', airtel_money: '' },
  minOrderAmount: 1000,
  serviceFeeCap: 10000,
  refundPolicyText: 'En cas d’annulation, remboursement automatique.',
  termsUrl: '/cgu',
  seoSiteTitle: 'Giga Vibe Event — Billetterie événementielle',
  seoSiteDescription:
    'Billetterie événementielle à Madagascar — concerts, festivals, sport, conférences. Paiement Mobile Money (YAS, Orange Money, Airtel Money).',
  seoOgImageUrl: '/logo.jpeg',
  seoKeywords: 'billetterie madagascar, concert antananarivo, yas money, orange money, airtel money',
  socialFacebookUrl: '',
  socialInstagramUrl: '',
  socialTiktokUrl: '',
  socialWhatsapp: '',
  socialYoutubeUrl: '',
  emailBrandName: 'Giga Vibe Event',
  emailFooterText: 'Email automatique, merci de ne pas y répondre.',
  emailSupportUrl: '/contact',
  notifyPaymentValidated: true,
  notifyPaymentRejected: true,
  notifyEventPublished: true,
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
      const feesPayerRaw = str('fees_payer', 'buyer');
      const num = (k: string, fallback: number, min: number, max: number): number => {
        const n = Number(str(k, String(fallback)));
        if (!Number.isFinite(n)) return fallback;
        return Math.min(max, Math.max(min, Math.round(n)));
      };
      return {
        paymentValidation: mode === 'partner' ? mode : 'gve',
        commissionModel: str('commission_model', DEFAULTS.commissionModel),
        commissionPerTicket: Number(str('commission_per_ticket', '2000')) || 0,
        commissionPerEvent: Number(str('commission_per_event', '0')) || 0,
        serviceFeePercent: Number(str('service_fee_percent', '0')) || 0,
        serviceFeeFixed: num('service_fee_fixed', 0, 0, 100000),
        feesPayer: feesPayerRaw === 'organizer' || feesPayerRaw === 'split' ? feesPayerRaw : 'buyer',
        paymentMethods: METHOD_IDS.map((id) => ({
          id,
          number: asText(map.get(`payment_${short[id]}_number`), ''),
          name: asText(map.get(`payment_${short[id]}_name`), 'Giga Vibe Event'),
          enabled: asBool(map.get(`payment_${short[id]}_enabled`), true),
        })),
        currency: (asText(map.get('currency'), 'MGA') || 'MGA').toUpperCase().slice(0, 3),
        orderExpiryMinutes: Math.min(1440, Math.max(5, Number(str('order_expiry_minutes', '30')) || 30)),
        checkoutInstructions: asText(map.get('checkout_instructions'), ''),
        maintenanceMode: asBool(map.get('maintenance_mode'), false),
        maintenanceMessage: asText(map.get('maintenance_message'), DEFAULTS.maintenanceMessage),
        maxTicketsPerType: num('max_tickets_per_type', 10, 1, 50),
        maxLinesPerOrder: num('max_lines_per_order', 10, 1, 50),
        maxTicketsPerOrder: num('max_tickets_per_order', 20, 1, 200),
        siteName: asText(map.get('site_name'), DEFAULTS.siteName) || DEFAULTS.siteName,
        siteLogoUrl: asText(map.get('site_logo_url'), DEFAULTS.siteLogoUrl) || DEFAULTS.siteLogoUrl,
        contactEmail: asText(map.get('contact_email'), DEFAULTS.contactEmail) || DEFAULTS.contactEmail,
        contactPhone: asText(map.get('contact_phone'), DEFAULTS.contactPhone) || DEFAULTS.contactPhone,
        ticketNumberPrefix: asText(map.get('ticket_number_prefix'), DEFAULTS.ticketNumberPrefix) || DEFAULTS.ticketNumberPrefix,
        orderNumberPrefix: asText(map.get('order_number_prefix'), DEFAULTS.orderNumberPrefix) || DEFAULTS.orderNumberPrefix,
        uploadMaxSizeMb: num('upload_max_size_mb', 5, 1, 50),
        authConfirmExpiryMinutes: num('auth_confirm_expiry_minutes', 60, 5, 1440),
        authResetExpiryMinutes: num('auth_reset_expiry_minutes', 30, 5, 1440),
        invitationExpiryDays: num('invitation_expiry_days', 7, 1, 30),
        paymentPrefixes: {
          yas: asText(map.get('payment_yas_prefixes'), '034,038') || '034,038',
          orange_money: asText(map.get('payment_orange_prefixes'), '032,037') || '032,037',
          airtel_money: asText(map.get('payment_airtel_prefixes'), '033') || '033',
        },
        paymentInstructions: {
          yas: asText(map.get('payment_instructions_yas'), ''),
          orange_money: asText(map.get('payment_instructions_orange'), ''),
          airtel_money: asText(map.get('payment_instructions_airtel'), ''),
        },
        minOrderAmount: num('min_order_amount', 1000, 0, 1000000),
        serviceFeeCap: num('service_fee_cap', 10000, 0, 1000000),
        refundPolicyText: asText(map.get('refund_policy_text'), DEFAULTS.refundPolicyText) || DEFAULTS.refundPolicyText,
        termsUrl: asText(map.get('terms_url'), DEFAULTS.termsUrl) || DEFAULTS.termsUrl,
        seoSiteTitle: asText(map.get('seo_site_title'), DEFAULTS.seoSiteTitle) || DEFAULTS.seoSiteTitle,
        seoSiteDescription: asText(map.get('seo_site_description'), DEFAULTS.seoSiteDescription) || DEFAULTS.seoSiteDescription,
        seoOgImageUrl: asText(map.get('seo_og_image_url'), DEFAULTS.seoOgImageUrl) || DEFAULTS.seoOgImageUrl,
        seoKeywords: asText(map.get('seo_keywords'), DEFAULTS.seoKeywords) || DEFAULTS.seoKeywords,
        socialFacebookUrl: asText(map.get('social_facebook_url'), ''),
        socialInstagramUrl: asText(map.get('social_instagram_url'), ''),
        socialTiktokUrl: asText(map.get('social_tiktok_url'), ''),
        socialWhatsapp: asText(map.get('social_whatsapp'), ''),
        socialYoutubeUrl: asText(map.get('social_youtube_url'), ''),
        emailBrandName: asText(map.get('email_brand_name'), DEFAULTS.emailBrandName) || DEFAULTS.emailBrandName,
        emailFooterText: asText(map.get('email_footer_text'), DEFAULTS.emailFooterText) || DEFAULTS.emailFooterText,
        emailSupportUrl: asText(map.get('email_support_url'), DEFAULTS.emailSupportUrl) || DEFAULTS.emailSupportUrl,
        notifyPaymentValidated: asBool(map.get('notify_payment_validated'), true),
        notifyPaymentRejected: asBool(map.get('notify_payment_rejected'), true),
        notifyEventPublished: asBool(map.get('notify_event_published'), true),
      };
    },
  });
}
