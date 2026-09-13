import type { EventFiltersInput } from '../../schemas/events';
import type { Event, TicketType } from '../../types/database';

export interface EventListTicketType
  extends Pick<
    TicketType,
    | 'id'
    | 'name'
    | 'description'
    | 'price'
    | 'quantity'
    | 'sold'
    | 'status'
    | 'sales_start'
    | 'sales_end'
  > {
  available: number;
  onSale: boolean;
}

export interface EventCategory {
  id: string;
  name: string;
  slug: string;
}

export interface EventWithStats extends Event {
  category: EventCategory | null;
  ticket_types: EventListTicketType[];
  min_price: number | null;
  total_available: number;
  total_quantity: number;
  soon_full: boolean;
}

/** Forme brute retournée par Supabase (client non générique, cf. lib/supabase.ts). */
interface RawTicketTypeRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  sold: number;
  status: string;
  sales_start: string | null;
  sales_end: string | null;
}

export interface RawEventRow {
  category: { id: string; name: string; slug: string } | null;
  ticket_types: RawTicketTypeRow[] | null;
  [key: string]: unknown;
}

export const SOON_FULL_THRESHOLD = 20;
export const SOON_FULL_RATIO = 0.85;

export function toEventTicketType(row: RawTicketTypeRow): EventListTicketType {
  const available = Math.max(0, row.quantity - row.sold);
  const now = Date.now();
  const started = !row.sales_start || new Date(row.sales_start).getTime() <= now;
  const notEnded = !row.sales_end || new Date(row.sales_end).getTime() >= now;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    quantity: row.quantity,
    sold: row.sold,
    status: row.status as TicketType['status'],
    sales_start: row.sales_start,
    sales_end: row.sales_end,
    available,
    onSale: row.status === 'active' && available > 0 && started && notEnded,
  };
}

export function mapEventRow(row: RawEventRow): EventWithStats {
  const event = row as unknown as Event;
  const ticketTypes = (row.ticket_types ?? []).map(toEventTicketType);
  const onSalePrices = ticketTypes.filter((t) => t.onSale).map((t) => t.price);
  const totalAvailable = ticketTypes.reduce((s, t) => s + t.available, 0);
  const totalQuantity = ticketTypes.reduce((s, t) => s + t.quantity, 0);
  const totalSold = ticketTypes.reduce((s, t) => s + t.sold, 0);
  return {
    ...event,
    category: row.category,
    ticket_types: ticketTypes,
    min_price: onSalePrices.length ? Math.min(...onSalePrices) : null,
    total_available: totalAvailable,
    total_quantity: totalQuantity,
    soon_full:
      totalAvailable > 0 &&
      (totalAvailable <= SOON_FULL_THRESHOLD ||
        (totalQuantity > 0 && totalSold / totalQuantity >= SOON_FULL_RATIO)),
  };
}

export function applyEventFilters(
  events: EventWithStats[],
  filters: EventFiltersInput,
): EventWithStats[] {
  const search = filters.search.trim().toLowerCase();
  const from = filters.from ? new Date(filters.from + 'T00:00:00').getTime() : null;
  const to = filters.to ? new Date(filters.to + 'T23:59:59').getTime() : null;

  const filtered = events.filter((e) => {
    if (search) {
      const haystack =
        `${e.title} ${e.venue} ${e.city} ${e.organizer ?? ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.category && e.category?.slug !== filters.category) return false;
    const starts = new Date(e.starts_at).getTime();
    if (from !== null && starts < from) return false;
    if (to !== null && starts > to) return false;
    if (filters.maxPrice > 0) {
      if (e.min_price === null || e.min_price > filters.maxPrice) return false;
    }
    if (filters.soonFullOnly && !e.soon_full) return false;
    return true;
  });

  const sorted = [...filtered];
  switch (filters.sort) {
    case 'date_desc':
      sorted.sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at));
      break;
    case 'price_asc':
      sorted.sort(
        (a, b) => (a.min_price ?? Number.MAX_SAFE_INTEGER) - (b.min_price ?? Number.MAX_SAFE_INTEGER),
      );
      break;
    case 'price_desc':
      sorted.sort(
        (a, b) => (b.min_price ?? -1) - (a.min_price ?? -1),
      );
      break;
    case 'popular':
      sorted.sort(
        (a, b) =>
          Number(b.is_featured) - Number(a.is_featured) ||
          +new Date(a.starts_at) - +new Date(b.starts_at),
      );
      break;
    case 'date_asc':
    default:
      sorted.sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
      break;
  }
  return sorted;
}

export interface Page<T> {
  items: T[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    totalPages,
    page: safePage,
    pageSize,
  };
}
