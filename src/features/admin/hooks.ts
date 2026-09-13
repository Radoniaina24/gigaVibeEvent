import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../lib/supabase';
import { queryKeys } from '../../app/config/query';
import type {
  Category,
  Event,
  Order,
  Payment,
  Profile,
  Ticket,
  TicketType,
} from '../../types/database';
import type {
  AdminUserUpdateInput,
  CategoryInput,
  EventInput,
  TicketTypeInput,
} from '../../schemas';
import { logAudit } from './audit';

export const adminKeys = {
  kpis: ['admin', 'kpis'] as const,
  stats: (days: number) => ['admin', 'stats', days] as const,
  users: ['admin', 'users'] as const,
  userDetail: (id: string) => ['admin', 'users', id] as const,
  orders: ['admin', 'orders'] as const,
  payments: ['admin', 'payments'] as const,
  tickets: ['admin', 'tickets'] as const,
};

async function invalidateAdmin(qc: ReturnType<typeof useQueryClient>) {
  await qc.invalidateQueries({ queryKey: queryKeys.events.all });
  await qc.invalidateQueries({ queryKey: queryKeys.categories.all });
  await qc.invalidateQueries({ queryKey: queryKeys.orders.all });
  await qc.invalidateQueries({ queryKey: queryKeys.tickets.all });
  await qc.invalidateQueries({ queryKey: ['admin'] });
}

// ---------- Événements ----------

export interface AdminEventRow extends Event {
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  ticket_types: Pick<TicketType, 'id' | 'quantity' | 'sold'>[];
}

export function useAdminEvents() {
  return useQuery({
    queryKey: [...queryKeys.events.all, 'admin'],
    staleTime: 30_000,
    queryFn: async (): Promise<AdminEventRow[]> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('events')
        .select('*, category:categories(id,name,slug), ticket_types(id,quantity,sold)')
        .order('starts_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AdminEventRow[];
    },
  });
}

export interface AdminEventDetail extends Event {
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  ticket_types: TicketType[];
}

export function useAdminEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'events', id ?? ''],
    enabled: Boolean(id),
    queryFn: async (): Promise<AdminEventDetail | null> => {
      if (!id) return null;
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('events')
        .select('*, category:categories(id,name,slug), ticket_types(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const detail = data as AdminEventDetail;
      detail.ticket_types.sort((a, b) => a.price - b.price);
      return detail;
    },
  });
}

function toEventRow(input: EventInput) {
  return {
    title: input.title,
    slug: input.slug,
    description: input.description || null,
    image_url: input.image_url || null,
    category_id: input.category_id || null,
    starts_at: new Date(input.starts_at).toISOString(),
    ends_at: input.ends_at ? new Date(input.ends_at).toISOString() : null,
    venue: input.venue,
    address: input.address || null,
    city: input.city,
    latitude: input.latitude ? Number(input.latitude) : null,
    longitude: input.longitude ? Number(input.longitude) : null,
    organizer: input.organizer || null,
    status: input.status,
    is_featured: input.is_featured ?? false,
    updated_at: new Date().toISOString(),
  };
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EventInput): Promise<Event> => {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('events')
        .insert({ ...toEventRow(input), created_by: user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      await logAudit('event.created', 'events', (data as Event).id, {
        title: input.title,
      });
      return data as Event;
    },
    onSuccess: () => invalidateAdmin(qc),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: EventInput;
    }): Promise<Event> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('events')
        .update(toEventRow(input))
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAudit('event.updated', 'events', id, { title: input.title });
      return data as Event;
    },
    onSuccess: () => invalidateAdmin(qc),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event: AdminEventRow): Promise<void> => {
      const supabase = getSupabase();
      const { error } = await supabase.from('events').delete().eq('id', event.id);
      if (error) throw error;
      await logAudit('event.deleted', 'events', event.id, { title: event.title });
    },
    onSuccess: () => invalidateAdmin(qc),
  });
}

/** Duplique un événement (brouillon, stock remis à zéro). */
export function useDuplicateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<Event> => {
      const supabase = getSupabase();
      const { data: src, error: srcError } = await supabase
        .from('events')
        .select('*, ticket_types(*)')
        .eq('id', id)
        .single();
      if (srcError) throw srcError;
      const source = src as Event & { ticket_types: TicketType[] };
      const { data: copy, error: copyError } = await supabase
        .from('events')
        .insert({
          title: `${source.title} (copie)`,
          slug: `${source.slug}-copie-${Date.now().toString(36)}`,
          description: source.description,
          image_url: source.image_url,
          category_id: source.category_id,
          starts_at: source.starts_at,
          ends_at: source.ends_at,
          venue: source.venue,
          address: source.address,
          city: source.city,
          organizer: source.organizer,
          status: 'draft',
          is_featured: false,
        })
        .select()
        .single();
      if (copyError) throw copyError;
      const newEvent = copy as Event;
      if (source.ticket_types.length > 0) {
        const { error: typesError } = await supabase.from('ticket_types').insert(
          source.ticket_types.map((t) => ({
            event_id: newEvent.id,
            name: t.name,
            description: t.description,
            price: t.price,
            quantity: t.quantity,
            sold: 0,
            sales_start: t.sales_start,
            sales_end: t.sales_end,
            status: 'active' as const,
          })),
        );
        if (typesError) throw typesError;
      }
      await logAudit('event.duplicated', 'events', newEvent.id, {
        from: id,
        title: newEvent.title,
      });
      return newEvent;
    },
    onSuccess: () => invalidateAdmin(qc),
  });
}

// ---------- Types de billets ----------

export function useCreateTicketType() {
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
    onSuccess: () => invalidateAdmin(qc),
  });
}

export function useUpdateTicketType() {
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
    onSuccess: () => invalidateAdmin(qc),
  });
}

export function useDeleteTicketType() {
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
    onSuccess: () => invalidateAdmin(qc),
  });
}

// ---------- Catégories ----------

export function useAdminCategories() {
  return useQuery({
    queryKey: [...queryKeys.categories.all, 'admin'],
    staleTime: 60_000,
    queryFn: async (): Promise<(Category & { events_count: number })[]> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('categories')
        .select('*, events(id)')
        .order('name');
      if (error) throw error;
      return ((data ?? []) as (Category & { events: { id: string }[] })[]).map(
        (c) => ({ ...c, events_count: c.events.length }),
      );
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CategoryInput): Promise<Category> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: input.name,
          slug: input.slug,
          description: input.description || null,
          icon: input.icon || null,
        })
        .select()
        .single();
      if (error) throw error;
      await logAudit('category.created', 'categories', (data as Category).id, {
        name: input.name,
      });
      return data as Category;
    },
    onSuccess: () => invalidateAdmin(qc),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: CategoryInput;
    }): Promise<Category> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('categories')
        .update({
          name: input.name,
          slug: input.slug,
          description: input.description || null,
          icon: input.icon || null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAudit('category.updated', 'categories', id, { name: input.name });
      return data as Category;
    },
    onSuccess: () => invalidateAdmin(qc),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Category): Promise<void> => {
      const supabase = getSupabase();
      const { error } = await supabase.from('categories').delete().eq('id', row.id);
      if (error) throw error;
      await logAudit('category.deleted', 'categories', row.id, { name: row.name });
    },
    onSuccess: () => invalidateAdmin(qc),
  });
}

// ---------- Utilisateurs ----------

export interface AdminUserRow extends Profile {
  orders_count: number;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users,
    staleTime: 30_000,
    queryFn: async (): Promise<AdminUserRow[]> => {
      const supabase = getSupabase();
      const [{ data: profiles, error: pErr }, { data: orders, error: oErr }] =
        await Promise.all([
          supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200),
          supabase.from('orders').select('user_id'),
        ]);
      if (pErr) throw pErr;
      if (oErr) throw oErr;
      const counts = new Map<string, number>();
      for (const o of (orders ?? []) as { user_id: string }[]) {
        counts.set(o.user_id, (counts.get(o.user_id) ?? 0) + 1);
      }
      return ((profiles ?? []) as Profile[]).map((p) => ({
        ...p,
        orders_count: counts.get(p.id) ?? 0,
      }));
    },
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: AdminUserUpdateInput;
    }): Promise<Profile> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .update({
          role: input.role,
          is_active: input.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAudit('user.updated', 'profiles', id, { ...input });
      return data as Profile;
    },
    onSuccess: () => invalidateAdmin(qc),
  });
}

// ---------- Commandes / Paiements / Billets ----------

export interface AdminOrderRow extends Order {
  event: Pick<Event, 'title'> | null;
  user: Pick<Profile, 'email' | 'first_name' | 'last_name'> | null;
}

export function useAdminOrders() {
  return useQuery({
    queryKey: adminKeys.orders,
    staleTime: 15_000,
    queryFn: async (): Promise<AdminOrderRow[]> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('orders')
        .select('*, event:events(title), user:profiles(email,first_name,last_name)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AdminOrderRow[];
    },
  });
}

export interface AdminPaymentRow extends Payment {
  order: Pick<Order, 'order_number'> | null;
  user: Pick<Profile, 'email'> | null;
}

export function useAdminPayments() {
  return useQuery({
    queryKey: adminKeys.payments,
    staleTime: 15_000,
    queryFn: async (): Promise<AdminPaymentRow[]> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('payments')
        .select('*, order:orders(order_number), user:profiles(email)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AdminPaymentRow[];
    },
  });
}

export interface AdminTicketRow extends Ticket {
  event: Pick<Event, 'title'> | null;
  ticket_type: Pick<TicketType, 'name'> | null;
  order: Pick<Order, 'order_number'> | null;
}

export function useAdminTickets() {
  return useQuery({
    queryKey: adminKeys.tickets,
    staleTime: 15_000,
    queryFn: async (): Promise<AdminTicketRow[]> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('tickets')
        .select(
          '*, event:events(title), ticket_type:ticket_types(name), order:orders(order_number)',
        )
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AdminTicketRow[];
    },
  });
}

/** Annule un billet (contrôle). Le compteur `sold` est conservé (vérité financière). */
export function useCancelTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: AdminTicketRow): Promise<void> => {
      if (row.status !== 'valid') {
        throw new Error('Seul un billet valide peut être annulé.');
      }
      const supabase = getSupabase();
      const { error } = await supabase
        .from('tickets')
        .update({ status: 'cancelled' })
        .eq('id', row.id);
      if (error) throw error;
      await logAudit('ticket.cancelled', 'tickets', row.id, {
        ticket_number: row.ticket_number,
      });
    },
    onSuccess: () => invalidateAdmin(qc),
  });
}

// ---------- KPIs / Statistiques ----------

export interface AdminKpis {
  revenue: number;
  ordersTotal: number;
  ordersPaid: number;
  ticketsSold: number;
  ticketsAvailable: number;
  users: number;
  eventsActive: number;
}

export function useAdminKpis() {
  return useQuery({
    queryKey: adminKeys.kpis,
    staleTime: 30_000,
    queryFn: async (): Promise<AdminKpis> => {
      const supabase = getSupabase();
      const [ordersRes, ticketsRes, usersRes, eventsRes] = await Promise.all([
        supabase.from('orders').select('total,payment_status'),
        supabase.from('tickets').select('id,status'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('events')
          .select('status, ticket_types(quantity,sold)'),
      ]);
      if (ordersRes.error) throw ordersRes.error;
      if (ticketsRes.error) throw ticketsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (eventsRes.error) throw eventsRes.error;

      const orders = (ordersRes.data ?? []) as Pick<Order, 'total' | 'payment_status'>[];
      const tickets = (ticketsRes.data ?? []) as Pick<Ticket, 'status'>[];
      const events = (eventsRes.data ?? []) as {
        status: string;
        ticket_types: { quantity: number; sold: number }[];
      }[];

      let available = 0;
      for (const e of events) {
        for (const t of e.ticket_types) available += Math.max(0, t.quantity - t.sold);
      }
      return {
        revenue: orders
          .filter((o) => o.payment_status === 'paid')
          .reduce((s, o) => s + o.total, 0),
        ordersTotal: orders.length,
        ordersPaid: orders.filter((o) => o.payment_status === 'paid').length,
        ticketsSold: tickets.filter((t) => t.status === 'valid' || t.status === 'used').length,
        ticketsAvailable: available,
        users: usersRes.count ?? 0,
        eventsActive: events.filter((e) => e.status === 'published').length,
      };
    },
  });
}

export interface AdminStats {
  dailyRevenue: { label: string; fullLabel: string; value: number }[];
  ticketsByEvent: { label: string; value: number; display: string }[];
  paymentsByMethod: { label: string; value: number; display: string }[];
}

const METHOD_LABEL: Record<string, string> = {
  mvola: 'MVola',
  orange_money: 'Orange Money',
  airtel_money: 'Airtel Money',
  card: 'Carte',
  cash: 'Espèces',
};

export function useAdminStats(days: number) {
  return useQuery({
    queryKey: adminKeys.stats(days),
    staleTime: 30_000,
    queryFn: async (): Promise<AdminStats> => {
      const supabase = getSupabase();
      const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
      const [{ data: orders, error: oErr }, { data: events, error: eErr }] =
        await Promise.all([
          supabase
            .from('orders')
            .select('total,created_at,payment_status,payment_method,event_id')
            .gte('created_at', since)
            .eq('payment_status', 'paid')
            .order('created_at')
            .limit(2000),
          supabase.from('events').select('id,title, ticket_types(quantity,sold)'),
        ]);
      if (oErr) throw oErr;
      if (eErr) throw eErr;

      const paid = (orders ?? []) as Pick<
        Order,
        'total' | 'created_at' | 'payment_method' | 'event_id'
      >[];

      // Revenus par jour
      const buckets = new Map<string, number>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 3600 * 1000);
        buckets.set(d.toISOString().slice(0, 10), 0);
      }
      for (const o of paid) {
        const key = o.created_at.slice(0, 10);
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + o.total);
      }
      const dailyRevenue = [...buckets.entries()].map(([day, value]) => {
        const d = new Date(day + 'T00:00:00');
        return {
          label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          fullLabel: d.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
          }),
          value,
        };
      });

      const titles = new Map(
        ((events ?? []) as { id: string; title: string }[]).map((e) => [e.id, e.title]),
      );
      const byEvent = new Map<string, { revenue: number; count: number }>();
      for (const o of paid) {
        const cur = byEvent.get(o.event_id) ?? { revenue: 0, count: 0 };
        cur.revenue += o.total;
        cur.count += 1;
        byEvent.set(o.event_id, cur);
      }
      const ticketsByEvent = [...byEvent.entries()]
        .map(([eventId, v]) => ({
          label: titles.get(eventId) ?? 'Événement',
          value: v.revenue,
          display: `${v.count} cmd · ${new Intl.NumberFormat('fr-MG', { maximumFractionDigits: 0 }).format(v.revenue)} Ar`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      const byMethod = new Map<string, number>();
      for (const o of paid) {
        if (o.payment_method) {
          byMethod.set(o.payment_method, (byMethod.get(o.payment_method) ?? 0) + 1);
        }
      }
      const paymentsByMethod = [...byMethod.entries()].map(([m, count]) => ({
        label: METHOD_LABEL[m] ?? m,
        value: count,
        display: `${count} paiement${count > 1 ? 's' : ''}`,
      }));

      return { dailyRevenue, ticketsByEvent, paymentsByMethod };
    },
  });
}
