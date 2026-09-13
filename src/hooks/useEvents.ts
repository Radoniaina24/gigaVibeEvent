import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { queryKeys } from '../app/config/query';
import type { Category } from '../types/database';
import {
  mapEventRow,
  type EventWithStats,
  type RawEventRow,
} from '../features/events/eventUtils';

const EVENT_WITH_RELATIONS =
  '*, category:categories(id,name,slug), ticket_types(id,name,description,price,quantity,sold,status,sales_start,sales_end)';

/**
 * Phase 2 : tous les événements publiés avec relations.
 * RLS : SELECT limité aux `published` côté serveur ; le filtrage
 * (recherche, catégorie, prix, tri, pagination) est appliqué côté client
 * via `applyEventFilters` (volume seed < 100, cache TanStack 60s).
 */
export function usePublishedEvents() {
  return useQuery({
    queryKey: queryKeys.events.list({ scope: 'published' }),
    staleTime: 60_000,
    queryFn: async (): Promise<EventWithStats[]> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('events')
        .select(EVENT_WITH_RELATIONS)
        .eq('status', 'published')
        .order('starts_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return ((data ?? []) as RawEventRow[]).map(mapEventRow);
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Category[]> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}

/** Détail public d'un événement (slug). Null si introuvable / non publié. */
export function useEventDetail(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.detail(slug ?? ''),
    enabled: Boolean(slug),
    staleTime: 30_000,
    queryFn: async (): Promise<EventWithStats | null> => {
      if (!slug) return null;
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('events')
        .select(EVENT_WITH_RELATIONS)
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const mapped = mapEventRow(data as RawEventRow);
      mapped.ticket_types.sort((a, b) => a.price - b.price);
      return mapped;
    },
  });
}
