import { useMutation } from '@tanstack/react-query';
import {
  apiAcceptInvitation,
  apiForgotPassword,
  apiInviteUser,
  apiRegister,
  apiResendConfirmation,
  apiResetPassword,
  apiSendTicketEmail,
  apiVerifyEmail,
} from '../../lib/edgeFunctions';

/**
 * Hooks TanStack Query — Auth 100 % Resend (backend = Edge Functions).
 * Aucun appel direct à supabase.auth.signUp / resetPasswordForEmail /
 * inviteUserByEmail : tous les emails transitent par Resend côté serveur.
 */

export function useRegister() {
  return useMutation({
    mutationFn: (input: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      phone?: string;
    }) => apiRegister(input),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => apiVerifyEmail(token),
  });
}

export function useResendConfirmation() {
  return useMutation({
    mutationFn: (email: string) => apiResendConfirmation(email),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => apiForgotPassword(email),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { token: string; password: string }) =>
      apiResetPassword(input),
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (input: {
      token: string;
      password: string;
      first_name: string;
      last_name: string;
      phone?: string;
    }) => apiAcceptInvitation(input),
  });
}

/** Backoffice admin : invitation Resend (POST /admin/users/invite). */
export function useInviteUser() {
  return useMutation({
    mutationFn: (input: { email: string; role: string; partner_id?: string }) =>
      apiInviteUser(input),
  });
}

/** Email billet Resend après paiement confirmé. */
export function useSendTicketEmail() {
  return useMutation({
    mutationFn: (order_id: string) => apiSendTicketEmail(order_id),
  });
}
