import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email requis').email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    first_name: z.string().min(1, 'Prénom requis').max(80),
    last_name: z.string().min(1, 'Nom requis').max(80),
    email: z.string().min(1, 'Email requis').email('Email invalide'),
    phone: z
      .string()
      .regex(/^\+?[0-9\s-]{8,20}$/, 'Numéro de téléphone invalide')
      .optional()
      .or(z.literal('')),
    password: z.string().min(8, '8 caractères minimum').max(72),
    confirmPassword: z.string().min(1, 'Confirmation requise'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email requis').email('Email invalide'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, '8 caractères minimum').max(72),
    confirmPassword: z.string().min(1, 'Confirmation requise'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(32, 'Lien invalide').max(256, 'Lien invalide'),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resetPasswordWithTokenSchema = z
  .object({
    token: z.string().min(32, 'Lien invalide').max(256, 'Lien invalide'),
    password: z.string().min(8, '8 caractères minimum').max(72),
    confirmPassword: z.string().min(1, 'Confirmation requise'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });
export type ResetPasswordWithTokenInput = z.infer<
  typeof resetPasswordWithTokenSchema
>;

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(32, 'Lien invalide').max(256, 'Lien invalide'),
    first_name: z.string().min(1, 'Prénom requis').max(80),
    last_name: z.string().min(1, 'Nom requis').max(80),
    phone: z
      .string()
      .regex(/^\+?[0-9\s-]{8,20}$/, 'Numéro de téléphone invalide')
      .optional()
      .or(z.literal('')),
    password: z.string().min(8, '8 caractères minimum').max(72),
    confirmPassword: z.string().min(1, 'Confirmation requise'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const inviteUserSchema = z
  .object({
    email: z.string().min(1, 'Email requis').email('Email invalide'),
    role: z.enum(['user', 'partner', 'controller', 'admin']),
    partner_id: z.string().uuid('Partenaire invalide').optional().or(z.literal('')),
  })
  .refine((d) => d.role !== 'partner' || Boolean(d.partner_id), {
    message: 'Un partenaire doit être rattaché à un organisateur',
    path: ['partner_id'],
  })
  .refine((d) => !d.partner_id || d.role === 'partner', {
    message: 'Seul le rôle partenaire accepte un organisateur',
    path: ['role'],
  });
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

/** Création directe admin : compte actif immédiat + mot de passe temporaire. */
export const adminCreateUserSchema = z
  .object({
    email: z.string().min(1, 'Email requis').email('Email invalide'),
    password: z.string().min(8, '8 caractères minimum').max(72),
    first_name: z.string().max(80).optional().or(z.literal('')),
    last_name: z.string().max(80).optional().or(z.literal('')),
    phone: z
      .string()
      .regex(/^\+?[0-9\s-]{8,20}$/, 'Numéro de téléphone invalide')
      .optional()
      .or(z.literal('')),
    role: z.enum(['user', 'partner', 'controller', 'admin']),
    partner_id: z.string().uuid('Partenaire invalide').optional().or(z.literal('')),
  })
  .refine((d) => d.role !== 'partner' || Boolean(d.partner_id), {
    message: 'Un partenaire doit être rattaché à un organisateur',
    path: ['partner_id'],
  })
  .refine((d) => !d.partner_id || d.role === 'partner', {
    message: 'Seul le rôle partenaire accepte un organisateur',
    path: ['role'],
  });
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

export const profileSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis').max(80),
  last_name: z.string().min(1, 'Nom requis').max(80),
  phone: z
    .string()
    .regex(/^\+?[0-9\s-]{8,20}$/, 'Numéro invalide')
    .optional()
    .or(z.literal(''))
    .nullable(),
});
export type ProfileInput = z.infer<typeof profileSchema>;
