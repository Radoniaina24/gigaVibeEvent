import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../lib/supabase';
import {
  isMissingRelationshipError,
  markPartnerEmbedSupported,
  shouldTryPartnerEmbed,
} from '../../lib/partnerEmbed';
import { useAuth } from '../auth/AuthContext';
import { logAudit } from '../admin/audit';
import { queryKeys } from '../../app/config/query';
import type {
  Event,
  Order,
  OrderItem,
  Payment,
  Ticket,
  TicketType,
} from '../../types/database';
import type { CheckoutLineInput } from '../../schemas/orders';

export interface OrderWithEvent extends Order {
  event: Pick<Event, 'title' | 'slug' | 'starts_at' | 'venue' | 'city'> | null;
}

export interface OrderDetail extends Order {
  event: Pick<
    Event,
    'title' | 'slug' | 'starts_at' | 'venue' | 'city' | 'image_url'
  > & { partner: { id: string; name: string; logo_url: string | null } | null } | null;
  items: (OrderItem & {
    ticket_type: Pick<TicketType, 'name' | 'price'> | null;
  })[];
  payments: Payment[];
  ticket_count: number;
}

export interface TicketWithRelations extends Ticket {
  event: Pick<
    Event,
    'title' | 'slug' | 'starts_at' | 'venue' | 'city' | 'image_url'
  > | null;
  ticket_type: Pick<TicketType, 'name' | 'price'> | null;
  order: Pick<Order, 'order_number'> | null;
}

/** Commandes de l'utilisateur avec événement (RLS : own orders). */
export function useMyOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.orders.mine,
    enabled: Boolean(user),
    staleTime: 30_000,
    queryFn: async (): Promise<OrderWithEvent[]> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('orders')
        .select('*, event:events(title,slug,starts_at,venue,city)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrderWithEvent[];
    },
  });
}

/** Détail d'une commande possédée (items + paiements + nb billets). */
export function useOrderDetail(orderId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId ?? ''),
    enabled: Boolean(user && orderId),
    staleTime: 15_000,
    queryFn: async (): Promise<OrderDetail | null> => {
      if (!orderId) return null;
      const supabase = getSupabase();
      const withPartner =
        '*, event:events(title,slug,starts_at,venue,city,image_url,partner:partners!events_partner_id_fkey(id,name,logo_url)), items:order_items(*, ticket_type:ticket_types(name,price)), payments:payments(*)';
      const withoutPartner =
        '*, event:events(title,slug,starts_at,venue,city,image_url), items:order_items(*, ticket_type:ticket_types(name,price)), payments:payments(*)';
      const withTicketCount = async (row: unknown): Promise<OrderDetail> => {
        const detail = row as OrderDetail;
        const { count } = await supabase
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .eq('order_id', orderId);
        detail.ticket_count = count ?? 0;
        return detail;
      };
      // Si on sait déjà que la DB n'a pas events.partner_id → direct sans embed.
      if (!shouldTryPartnerEmbed()) {
        const { data, error } = await supabase
          .from('orders')
          .select(withoutPartner)
          .eq('id', orderId)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return withTicketCount({
          ...(data as object),
          event: { ...((data as { event: object }).event ?? {}), partner: null },
        });
      }
      const { data, error } = await supabase
        .from('orders')
        .select(withPartner)
        .eq('id', orderId)
        .maybeSingle();
      if (!error) {
        markPartnerEmbedSupported(true);
        if (!data) return null;
        return withTicketCount(data);
      }
      // Fallback DB sans migration 0005 (pas de events.partner_id).
      if (isMissingRelationshipError(error)) {
        markPartnerEmbedSupported(false);
        console.warn(
          '[orders] `events.partner_id` introuvable — appliquez supabase/migrations/0005_platform_v2.sql. Fallback sans partenaire.',
        );
        const retry = await supabase
          .from('orders')
          .select(withoutPartner)
          .eq('id', orderId)
          .maybeSingle();
        if (retry.error) throw retry.error;
        if (!retry.data) return null;
        const detail = {
          ...(retry.data as object),
          event: { ...((retry.data as { event: object }).event ?? {}), partner: null },
        } as unknown as OrderDetail;
        const { count } = await supabase
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .eq('order_id', orderId);
        detail.ticket_count = count ?? 0;
        return detail;
      }
      throw error;
    },
  });
}

/** Billets de l'utilisateur avec relations (RLS : own tickets). */
export function useMyTickets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.tickets.mine,
    enabled: Boolean(user),
    staleTime: 30_000,
    queryFn: async (): Promise<TicketWithRelations[]> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('tickets')
        .select(
          '*, event:events(title,slug,starts_at,venue,city,image_url), ticket_type:ticket_types(name,price), order:orders(order_number)',
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TicketWithRelations[];
    },
  });
}

/** Paiements de l'utilisateur avec commande (RLS : own payments). */
export function useMyPayments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['payments', 'mine'],
    enabled: Boolean(user),
    staleTime: 30_000,
    queryFn: async (): Promise<(Payment & { order: Pick<Order, 'order_number'> | null })[]> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('payments')
        .select('*, order:orders(order_number)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as (Payment & { order: Pick<Order, 'order_number'> | null })[];
    },
  });
}

export interface CreateOrderInput {
  event_id: string;
  payment_method: 'yas' | 'orange_money' | 'airtel_money';
  phone: string;
  items: CheckoutLineInput[];
}

export interface CreateOrderResult {
  order_id: string;
  order_number: string;
  total: number;
}

/**
 * Crée la commande via RPC atomique (stock réservé, prix recalculés).
 * Ne génère AUCUN billet : uniquement après confirmation (Phase 5).
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput): Promise<CreateOrderResult> => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('create_checkout_order', {
        p_event_id: input.event_id,
        p_payment_method: input.payment_method,
        p_phone: input.phone,
        p_items: input.items,
      });
      if (error) throw new Error(error.message);
      return data as CreateOrderResult;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.mine });
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}

/**
 * DEV UNIQUEMENT (VITE_ENABLE_PAYMENT_SIMULATION) : simule la confirmation
 * du fournisseur. Remplacé par le webhook en Phase 5.
 */
export function useSimulatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      order_id,
      success = true,
    }: {
      order_id: string;
      success?: boolean;
    }): Promise<{ status: string; tickets: number }> => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc(
        'confirm_order_payment_dev',
        { p_order_id: order_id, p_success: success },
      );
      if (error) throw new Error(error.message);
      return data as { status: string; tickets: number };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (order_id: string): Promise<void> => {
      const supabase = getSupabase();
      const { error } = await supabase.rpc('cancel_pending_order', {
        p_order_id: order_id,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}

export interface DeclarePaymentInput {
  order_id: string;
  phone: string;
  amount: number;
  reference: string;
  receipt_url?: string;
}

/**
 * Déclaration manuelle du transfert par l'acheteur (§16 CDC v2) :
 * pending → processing (en attente de validation).
 */
export function useDeclarePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeclarePaymentInput): Promise<{ status: string }> => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('declare_manual_payment', {
        p_order_id: input.order_id,
        p_phone: input.phone,
        p_amount: input.amount,
        p_reference: input.reference,
        p_receipt_url: input.receipt_url || null,
      });
      if (error) throw new Error(error.message);
      await logAudit('payment.submitted', 'orders', input.order_id, {
        reference: input.reference,
        amount: input.amount,
      });
      return data as { status: string };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

export interface ValidatePaymentResult {
  status: string;
  tickets: number;
}

/**
 * Validation manuelle GVE/partenaire (§17 CDC v2).
 * L'autorisation est vérifiée côté base (réglage payment_validation).
 * Approuvé → billets générés (GVE-000001…) ; refusé → stock libéré.
 */
export function useValidatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      order_id,
      approved,
      reason,
    }: {
      order_id: string;
      approved: boolean;
      /** Motif obligatoire en cas de refus (validé par Zod + RPC). */
      reason?: string;
    }): Promise<ValidatePaymentResult> => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('validate_manual_payment', {
        p_order_id: order_id,
        p_approved: approved,
        p_reason: reason ?? null,
      });
      if (error) throw new Error(error.message);
      await logAudit(
        approved ? 'payment.approved' : 'payment.rejected',
        'orders',
        order_id,
        approved ? { tickets: (data as ValidatePaymentResult).tickets } : { reason },
      );
      return data as ValidatePaymentResult;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      await queryClient.invalidateQueries({ queryKey: ['partner'] });
    },
  });
}
