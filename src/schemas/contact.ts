import { z } from 'zod';

export const contactSubjectSchema = z.enum([
  'billetterie',
  'organisateur',
  'partenariat',
  'support',
  'autre',
]);
export type ContactSubject = z.infer<typeof contactSubjectSchema>;

export const CONTACT_SUBJECT_LABELS: Record<ContactSubject, string> = {
  billetterie: 'Question sur un billet',
  organisateur: 'Organiser un événement',
  partenariat: 'Partenariat',
  support: 'Support technique',
  autre: 'Autre demande',
};

export const contactSchema = z.object({
  name: z.string().min(2, 'Nom trop court').max(120),
  email: z.string().email('Email invalide').max(160),
  phone: z
    .string()
    .max(30)
    .regex(/^$|^\+?[0-9\s.-]{6,25}$/, 'Numéro invalide')
    .optional()
    .or(z.literal('')),
  subject: contactSubjectSchema,
  message: z.string().min(10, 'Message trop court (10 caractères min)').max(2000),
});
export type ContactInput = z.infer<typeof contactSchema>;
