import { z } from 'zod';

export const eventSortSchema = z.enum([
  'date_asc',
  'date_desc',
  'price_asc',
  'price_desc',
  'popular',
]);
export type EventSortKey = z.infer<typeof eventSortSchema>;

/**
 * Filtres de la page /events, validés depuis l'URL (partageable).
 * Les champs vides/invalides retombent sur les défauts.
 */
export const eventFiltersSchema = z.object({
  search: z.string().max(120).default(''),
  category: z.string().max(80).default(''), // slug de catégorie, '' = toutes
  from: z.string().default(''), // YYYY-MM-DD
  to: z.string().default(''), // YYYY-MM-DD
  maxPrice: z.coerce.number().int().min(0).max(100_000_000).default(0), // 0 = pas de plafond
  sort: eventSortSchema.default('date_asc'),
  soonFullOnly: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export type EventFiltersInput = z.infer<typeof eventFiltersSchema>;

export function parseEventFilters(
  params: URLSearchParams,
): EventFiltersInput {
  const raw: Record<string, string> = {};
  for (const key of ['search', 'category', 'from', 'to', 'maxPrice', 'sort', 'page'] as const) {
    const v = params.get(key);
    if (v !== null && v !== '') raw[key] = v;
  }
  if (params.get('soonFullOnly') === '1') raw['soonFullOnly'] = 'true';
  const parsed = eventFiltersSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return eventFiltersSchema.parse({});
}

export function serializeEventFilters(
  filters: EventFiltersInput,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.maxPrice > 0) params.set('maxPrice', String(filters.maxPrice));
  if (filters.sort !== 'date_asc') params.set('sort', filters.sort);
  if (filters.soonFullOnly) params.set('soonFullOnly', '1');
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}
