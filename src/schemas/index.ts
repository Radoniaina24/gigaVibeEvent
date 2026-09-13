import { z } from 'zod';

export const eventStatusSchema = z.enum([
  'draft',
  'published',
  'sold_out',
  'cancelled',
  'completed',
]);

/** Schéma Phase 1 : création/édition événement (utilisé en Phase 4 côté admin). */
/** Coordonnée saisie en texte (input number) puis convertie à l'envoi.
 *  `z.preprocess` est évité : il casse l'inférence du resolver react-hook-form. */
const geoString = (min: number, max: number, message: string) =>
  z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) =>
        v === '' ||
        v === undefined ||
        (!Number.isNaN(Number(v)) && Number(v) >= min && Number(v) <= max),
      { message },
    );

export const eventSchema = z.object({
  title: z.string().min(3, 'Titre trop court').max(160),
  slug: z
    .string()
    .min(3)
    .max(180)
    .regex(/^[a-z0-9-]+$/, 'Slug invalide (a-z, 0-9, -)'),
  description: z.string().max(5000).optional().or(z.literal('')),
  image_url: z.string().url('URL invalide').optional().or(z.literal('')),
  category_id: z.string().uuid('Catégorie invalide').nullable().optional(),
  starts_at: z.string().min(1, 'Date de début requise'),
  ends_at: z.string().optional().or(z.literal('')).nullable(),
  venue: z.string().min(2, 'Lieu requis').max(200),
  address: z.string().max(300).optional().or(z.literal('')).nullable(),
  city: z.string().min(2, 'Ville requise').max(120),
  latitude: geoString(-90, 90, 'Latitude entre -90 et 90'),
  longitude: geoString(-180, 180, 'Longitude entre -180 et 180'),
  organizer: z.string().max(160).optional().or(z.literal('')).nullable(),
  status: eventStatusSchema,
  // Optionnel (défaut fourni par le formulaire) : `.default()` est évité
  // car incompatible avec le typage du resolver react-hook-form.
  is_featured: z.boolean().optional(),
});
export type EventInput = z.infer<typeof eventSchema>;

export const categorySchema = z.object({
  name: z.string().min(2, 'Nom trop court').max(80),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug invalide (a-z, 0-9, -)'),
  description: z.string().max(500).optional().or(z.literal('')).nullable(),
  icon: z.string().max(40).optional().or(z.literal('')).nullable(),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const adminUserUpdateSchema = z.object({
  role: z.enum(['user', 'admin']),
  is_active: z.boolean(),
});
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;

export const ticketTypeSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional().or(z.literal('')).nullable(),
  price: z.number().int().min(0, 'Prix invalide'),
  quantity: z.number().int().min(1, 'Quantité minimale : 1'),
  sales_start: z.string().optional().or(z.literal('')).nullable(),
  sales_end: z.string().optional().or(z.literal('')).nullable(),
  status: z.enum(['active', 'inactive', 'sold_out']).optional(),
});
export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;

export const orderSchema = z.object({
  event_id: z.string().uuid(),
  payment_method: z.enum([
    'mvola',
    'orange_money',
    'airtel_money',
    'card',
    'cash',
  ]),
  items: z
    .array(
      z.object({
        ticket_type_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1, 'Sélectionnez au moins un billet'),
});
export type OrderInput = z.infer<typeof orderSchema>;

export const paymentSchema = z.object({
  order_id: z.string().uuid(),
  provider: z.enum(['mvola', 'orange_money', 'airtel_money']),
  phone_number: z.string().regex(/^\+?[0-9\s-]{8,20}$/, 'Numéro invalide'),
});
export type PaymentInput = z.infer<typeof paymentSchema>;
