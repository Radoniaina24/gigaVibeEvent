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
