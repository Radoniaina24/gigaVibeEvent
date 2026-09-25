import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../lib/supabase';
import { queryKeys } from '../../app/config/query';
import { uploadPartnerAsset } from '../../services/storage';
import { useAuth } from '../auth/AuthContext';
import type {
  Category,
  Event,
  Order,
  Partner,
  Payment,
  Profile,
  TicketType,
} from '../../types/database';
import type { EventInput, TicketTypeInput } from '../../schemas';
import { logAudit } from '../admin/audit';
import { toEventRow } from '../admin/hooks';

export const partnerKeys = {
  all: ['partner'] as const,
  mine: ['partner', 'mine'] as const,
  events: ['partner', 'events'] as const,
  eventDetail: (id: string) => ['partner', 'events', id] as const,
  stats: ['partner', 'stats'] as const,
};

async function invalidatePartner(qc: ReturnType<typeof useQueryClient>) {
  await qc.invalidateQueries({ queryKey: partnerKeys.all });
  await qc.invalidateQueries({ queryKey: queryKeys.events.all });
  await qc.invalidateQueries({ queryKey: queryKeys.orders.all });
  await qc.invalidateQueries({ queryKey: queryKeys.tickets.all });
}

function requirePartnerId(profile: { partner_id: string | null } | null): string {
  if (!profile?.partner_id) {
    throw new Error('Aucun partenaire associé à ce compte.');
  }
  return profile.partner_id;
}

/** Partenaire lié au compte connecté (NULL si aucun). */
export function useMyPartner() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: partnerKeys.mine,
    enabled: Boolean(profile?.partner_id),
    staleTime: 60_000,
    queryFn: async (): Promise<Partner | null> => {
      if (!profile?.partner_id) return null;
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', profile.partner_id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Partner | null;
    },
  });
}

/** Logo du partenaire (co-branding §9-10) : upload isolé + MAJ logo_url.
 *  RLS : 0006 (storage dossier `{partnerId}/...`) + 0008 (partners self-update,
 *  trigger : seul logo_url modifiable hors admin). */
export function useUpdatePartnerLogo() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const partnerId = requirePartnerId(profile);
      const url = await uploadPartnerAsset(file, partnerId, 'logo');
      const supabase = getSupabase();
      const { error } = await supabase
        .from('partners')
        .update({ logo_url: url })
        .eq('id', partnerId);
      if (error) throw error;
      await logAudit('partner.logo_updated', 'partners', partnerId, {});
      return url;
    },
    onSuccess: () => invalidatePartner(qc),
  });
}

/** Retire le logo (retour aux initiales, identité GVE conservée). */
export function useRemovePartnerLogo() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const partnerId = requirePartnerId(profile);
      const supabase = getSupabase();
      const { error } = await supabase
        .from('partners')
        .update({ logo_url: null })
        .eq('id', partnerId);
      if (error) throw error;
      await logAudit('partner.logo_removed', 'partners', partnerId, {});
    },
    onSuccess: () => invalidatePartner(qc),
  });
}

export interface PartnerEventRow extends Event {
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  ticket_types: Pick<TicketType, 'id' | 'quantity' | 'sold'>[];
}

/** Événements du partenaire (RLS : isolation automatique §22). */
export function usePartnerEvents() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: partnerKeys.events,
    enabled: Boolean(profile?.partner_id),
    staleTime: 30_000,
    queryFn: async (): Promise<PartnerEventRow[]> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('events')
        .select('*, category:categories(id,name,slug), ticket_types(id,quantity,sold)')
        .order('starts_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as PartnerEventRow[];
    },
  });
}

export interface PartnerEventDetail extends Event {
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  ticket_types: TicketType[];
}

export function usePartnerEvent(id: string | undefined) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: partnerKeys.eventDetail(id ?? ''),
    enabled: Boolean(id && profile?.partner_id),
    queryFn: async (): Promise<PartnerEventDetail | null> => {
      if (!id) return null;
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('events')
        .select('*, category:categories(id,name,slug), ticket_types(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const detail = data as PartnerEventDetail;
      detail.ticket_types.sort((a, b) => a.price - b.price);
      return detail;
    },
  });
}

/** Création : toujours en brouillon, rattachée au partenaire (§8, §13). */
export function useCreatePartnerEvent() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: EventInput): Promise<Event> => {
      const partnerId = requirePartnerId(profile);
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('events')
        .insert({
          ...toEventRow({ ...input, status: 'draft', is_featured: false }),
          partner_id: partnerId,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      await logAudit('event.created', 'events', (data as Event).id, {
        title: input.title,
        partner_id: partnerId,
      });
      return data as Event;
    },
    onSuccess: () => invalidatePartner(qc),
  });
}

/** Modification : conserve le statut workflow (la RLS bloque le reste). */
export function useUpdatePartnerEvent() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: EventInput;
    }): Promise<Event> => {
      requirePartnerId(profile);
      const supabase = getSupabase();
      const { data: current, error: curError } = await supabase
        .from('events')
        .select('status')
        .eq('id', id)
        .single();
      if (curError) throw curError;
      const { data, error } = await supabase
        .from('events')
        .update(
          toEventRow({
            ...input,
            status: (current as { status: EventInput['status'] }).status,
            is_featured: false,
          }),
        )
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAudit('event.updated', 'events', id, { title: input.title });
      return data as Event;
    },
    onSuccess: () => invalidatePartner(qc),
  });
}

const SUBMITTABLE = ['draft', 'changes_requested', 'cancelled'] as const;

/**
 * Soumission pour validation GVE : draft/changes_requested/cancelled → pending_review.
 * Rôles §1 organisateur : soumettre, corriger un rejet puis renvoyer.
 * Tente la RPC submit_event_for_review (0022), fallback direct + historique.
 */
export function useSubmitEventForReview() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      requirePartnerId(profile);
      const supabase = getSupabase();
      const { data: current, error: curError } = await supabase
        .from('events')
        .select('status,title')
        .eq('id', id)
        .single();
      if (curError) throw curError;
      const row = current as { status: string; title: string };
      if (!(SUBMITTABLE as readonly string[]).includes(row.status)) {
        throw new Error('Seuls les brouillons, corrections et événements refusés peuvent être soumis.');
      }
      // 1) RPC sécurisée (statut + historique atomiques).
      try {
        const { data, error } = await supabase.rpc('submit_event_for_review', {
          p_event_id: id,
        });
        if (!error) {
          const res = data as { ok?: boolean; reason?: string } | null;
          if (res?.ok) {
            await logAudit('event.submitted', 'events', id, { title: row.title });
            return;
          }
          if (res?.reason === 'bad_status') {
            throw new Error('Seuls les brouillons, corrections et événements refusés peuvent être soumis.');
          }
          if (res?.reason && res.reason !== 'not_found') {
            throw new Error(`Soumission impossible (${res.reason}).`);
          }
        }
      } catch (err) {
        if (err instanceof Error && /peuvent être soumis|impossible \(/i.test(err.message)) throw err;
        console.warn('[partner-submit] RPC indisponible, fallback direct :', err);
      }
      // 2) Fallback direct (RLS + trigger 0022 autorisent draft/changes/cancelled → pending).
      const { error } = await supabase
        .from('events')
        .update({ status: 'pending_review', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        await supabase.from('event_validation_history').insert({
          event_id: id,
          from_status: row.status,
          to_status: 'pending_review',
          decision: 'submit',
          created_by: user?.id ?? null,
        });
      } catch (histErr) {
        console.warn('[partner-submit] historique non persisté :', histErr);
      }
      await logAudit('event.submitted', 'events', id, { title: row.title });
    },
    onSuccess: () => invalidatePartner(qc),
  });
}

/** Historique des validations visible par l'organisateur (motifs de rejet inclus). */
export function usePartnerEventHistory(eventId: string | null | undefined) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: [...partnerKeys.all, 'validation-history', eventId ?? ''],
    enabled: Boolean(eventId && profile?.partner_id),
    staleTime: 15_000,
    queryFn: async () => {
      if (!eventId) return [];
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('event_validation_history')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as import('../../types/database').EventValidationHistory[];
    },
  });
}

// ---------- Types de billets (même contrat que l'admin, scopés RLS) ----------

export function useCreatePartnerTicketType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      event_id,
      input,
    }: {
      event_id: string;
      input: TicketTypeInput;
    }): Promise<TicketType> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('ticket_types')
        .insert({
          event_id,
          name: input.name,
          description: input.description || null,
          price: input.price,
          quantity: input.quantity,
          sales_start: input.sales_start || null,
          sales_end: input.sales_end || null,
          status: input.status ?? 'active',
        })
        .select()
        .single();
      if (error) throw error;
      await logAudit('ticket_type.created', 'ticket_types', (data as TicketType).id, {
        event_id,
        name: input.name,
      });
      return data as TicketType;
    },
    onSuccess: () => invalidatePartner(qc),
  });
}

export function useUpdatePartnerTicketType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: TicketTypeInput;
    }): Promise<TicketType> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('ticket_types')
        .update({
          name: input.name,
          description: input.description || null,
          price: input.price,
          quantity: input.quantity,
          sales_start: input.sales_start || null,
          sales_end: input.sales_end || null,
          status: input.status ?? 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAudit('ticket_type.updated', 'ticket_types', id, { name: input.name });
      return data as TicketType;
    },
    onSuccess: () => invalidatePartner(qc),
  });
}

export function useDeletePartnerTicketType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: TicketType): Promise<void> => {
      if (row.sold > 0) {
        throw new Error(
          'Impossible : des billets ont déjà été vendus pour ce type.',
        );
      }
      const supabase = getSupabase();
      const { error } = await supabase.from('ticket_types').delete().eq('id', row.id);
      if (error) throw error;
      await logAudit('ticket_type.deleted', 'ticket_types', row.id, { name: row.name });
    },
    onSuccess: () => invalidatePartner(qc),
  });
}

// ---------- Statistiques du partenaire (§24) ----------

export interface PartnerStats {
  eventsTotal: number;
  draft: number;
  pendingReview: number;
  changesRequested: number;
  published: number;
  ticketsSold: number;
  ticketsAvailable: number;
  revenue: number;
  pendingPayments: number;
}

export function usePartnerStats() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: partnerKeys.stats,
    enabled: Boolean(profile?.partner_id),
    staleTime: 30_000,
    queryFn: async (): Promise<PartnerStats> => {
      const supabase = getSupabase();
      const { data: events, error: evError } = await supabase
        .from('events')
        .select('id,status,ticket_types(quantity,sold)');
      if (evError) throw evError;
      const evs = (events ?? []) as {
        id: string;
        status: string;
        ticket_types: { quantity: number; sold: number }[];
      }[];
      const count = (s: string) => evs.filter((e) => e.status === s).length;
      const ticketsSold = evs.reduce(
        (sum, e) => sum + e.ticket_types.reduce((s, t) => s + t.sold, 0),
        0,
      );
      const ticketsAvailable = evs.reduce(
        (sum, e) =>
          sum + e.ticket_types.reduce((s, t) => s + Math.max(0, t.quantity - t.sold), 0),
        0,
      );
      const { data: orders, error: orError } = await supabase
        .from('orders')
        .select('total,payment_status');
      if (orError) throw orError;
      const ords = (orders ?? []) as { total: number; payment_status: string }[];
      return {
        eventsTotal: evs.length,
        draft: count('draft'),
        pendingReview: count('pending_review'),
        changesRequested: count('changes_requested'),
        published: count('published'),
        ticketsSold,
        ticketsAvailable,
        revenue: ords
          .filter((o) => o.payment_status === 'paid')
          .reduce((s, o) => s + o.total, 0),
        pendingPayments: ords.filter(
          (o) => o.payment_status === 'pending' || o.payment_status === 'processing',
        ).length,
      };
    },
  });
}

// ---------- Paiements à valider (§17 option B) ----------

export interface PartnerPaymentRow extends Payment {
  order: (Pick<Order, 'id' | 'order_number'> & {
    event: Pick<Event, 'title'> | null;
  }) | null;
  user: Pick<Profile, 'email'> | null;
}

/** Paiements des commandes de SES événements (RLS §22). */
export function usePartnerPayments() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: [...partnerKeys.all, 'payments'],
    enabled: Boolean(profile?.partner_id),
    staleTime: 15_000,
    queryFn: async (): Promise<PartnerPaymentRow[]> => {
      const supabase = getSupabase();
      // Même ambiguïté que côté admin : hint FK explicite (user_id).
      const { data, error } = await supabase
        .from('payments')
        .select('*, order:orders!payments_order_id_fkey(id,order_number,event:events!orders_event_id_fkey(title)), user:profiles!payments_user_id_fkey(email)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error) return (data ?? []) as PartnerPaymentRow[];
      console.warn('[partner-payments] embed complet impossible, fallback :', error.message);
      const retry = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (retry.error) throw retry.error;
      const rows = (retry.data ?? []) as Payment[];
      if (rows.length === 0) return [];
      const orderIds = [...new Set(rows.map((r) => r.order_id))];
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const [ordersRes, usersRes] = await Promise.all([
        supabase.from('orders').select('id,order_number,event_id').in('id', orderIds),
        supabase.from('profiles').select('id,email').in('id', userIds),
      ]);
      if (ordersRes.error) throw ordersRes.error;
      if (usersRes.error) throw usersRes.error;
      const orders = (ordersRes.data ?? []) as { id: string; order_number: string; event_id: string }[];
      const users = (usersRes.data ?? []) as { id: string; email: string }[];
      const eventIds = [...new Set(orders.map((o) => o.event_id))];
      const { data: eventsData, error: evError } = await supabase
        .from('events')
        .select('id,title')
        .in('id', eventIds);
      if (evError) throw evError;
      const eventsById = new Map(
        ((eventsData ?? []) as { id: string; title: string }[]).map((e) => [e.id, e]),
      );
      const ordersById = new Map(orders.map((o) => [o.id, o]));
      const usersById = new Map(users.map((u) => [u.id, u]));
      return rows.map((p) => {
        const o = ordersById.get(p.order_id);
        const u = usersById.get(p.user_id);
        return {
          ...p,
          order: o
            ? { id: o.id, order_number: o.order_number, event: eventsById.get(o.event_id) ?? null }
            : null,
          user: u ? { email: u.email } : null,
        } as PartnerPaymentRow;
      });
    },
  });
}
