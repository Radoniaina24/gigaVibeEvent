import { z } from 'zod';

export const paymentMethodSchema = z.enum([
  'yas',
  'orange_money',
  'airtel_money',
]);
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;

/** Étape 3 du checkout : moyen + numéro Mobile Money. */
export const checkoutPaymentSchema = z.object({
  payment_method: paymentMethodSchema,
  phone: z
    .string()
    .min(1, 'Numéro requis')
    .regex(/^\+?[0-9\s-]{8,20}$/, 'Numéro Mobile Money invalide'),
});
export type CheckoutPaymentInput = z.infer<typeof checkoutPaymentSchema>;

export const holderNameSchema = z
  .string()
  .min(2, 'Nom trop court')
  .max(80, 'Nom trop long');

/** Ligne envoyée au RPC create_checkout_order (prix recalculés en base). */
export interface CheckoutLineInput {
  ticket_type_id: string;
  quantity: number;
  holder_names: string[];
}

export const checkoutLineSchema = z.object({
  ticket_type_id: z.string().uuid(),
  name: z.string(),
  unit_price: z.number().int().min(0),
  quantity: z.number().int().min(1).max(10),
});
export type CheckoutLine = z.infer<typeof checkoutLineSchema>;

/** État du panier transmis à /checkout (navigation state + brouillon session). */
export const checkoutStateSchema = z.object({
  eventId: z.string().uuid(),
  eventSlug: z.string(),
  eventTitle: z.string(),
  items: z.array(checkoutLineSchema).min(1).max(10),
});
export type CheckoutState = z.infer<typeof checkoutStateSchema>;

/** Refus d'un paiement : motif obligatoire (traçabilité + info utilisateur). */
export const paymentRejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(4, 'Motif requis (min. 4 caractères)')
    .max(300, 'Motif trop long (max. 300 caractères)'),
});
export type PaymentRejectInput = z.infer<typeof paymentRejectSchema>;

/**
 * Déclaration manuelle du transfert Mobile Money (§16 CDC v2).
 * 100 % manuel : référence ET capture obligatoires (aucune API opérateur).
 * `receipt_url` est un chemin Storage privé (`{orderId}/recu-…`), pas une URL.
 */
export const manualPaymentSchema = z.object({
  phone: z
    .string()
    .min(1, 'Numéro requis')
    .regex(/^\+?[0-9\s-]{8,20}$/, 'Numéro invalide'),
  reference: z
    .string()
    .trim()
    .min(4, 'Référence requise (min. 4 caractères)')
    .max(60),
  receipt_url: z.string().min(1, 'Capture du reçu requise (JPG, PNG ou WebP)'),
});
export type ManualPaymentInput = z.infer<typeof manualPaymentSchema>;
