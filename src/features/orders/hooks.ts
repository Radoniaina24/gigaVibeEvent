import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthContext';
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
      const { data, error } = await supabase
        .from('orders')
        .select(
          '*, event:events(title,slug,starts_at,venue,city,image_url,partner:partners(id,name,logo_url)), items:order_items(*, ticket_type:ticket_types(name,price)), payments:payments(*)',
        )
        .eq('id', orderId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const detail = data as OrderDetail;
      const { count } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('order_id', orderId);
      detail.ticket_count = count ?? 0;
      return detail;
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

export interface CreateOrderInput {
  event_id: string;
  payment_method: 'mvola' | 'orange_money' | 'airtel_money';
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
    }: {
      order_id: string;
      approved: boolean;
    }): Promise<ValidatePaymentResult> => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('validate_manual_payment', {
        p_order_id: order_id,
        p_approved: approved,
      });
      if (error) throw new Error(error.message);
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
