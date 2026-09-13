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
  '*, category:categories(id,name,slug), partner:partners!events_partner_id_fkey(id,name,logo_url), ticket_types(id,name,description,price,quantity,sold,status,sales_start,sales_end)';

/** Requête sans le embed partenaire (DB locale sans migration 0005). */
const EVENT_WITH_RELATIONS_NO_PARTNER =
  '*, category:categories(id,name,slug), ticket_types(id,name,description,price,quantity,sold,status,sales_start,sales_end)';

/**
 * Détecte l'erreur PostgREST PGRST200 "Could not find a relationship".
 * Cas typique : migration 0005 (events.partner_id) non appliquée en local
 * alors que le front demande déjà `partner:partners(...)` → 400.
 */
function isMissingRelationshipError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string; details?: string; hint?: string };
  if (e.code === 'PGRST200') return true;
  const haystack = `${e.message ?? ''} ${e.details ?? ''} ${e.hint ?? ''}`.toLowerCase();
  return haystack.includes('could not find a relationship');
}

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
      if (!error) return ((data ?? []) as RawEventRow[]).map(mapEventRow);
      // Fallback : DB sans colonne events.partner_id (migration 0005 non appliquée).
      if (isMissingRelationshipError(error)) {
        console.warn(
          '[events] `events.partner_id` introuvable — appliquez supabase/migrations/0005_platform_v2.sql. Fallback sans partenaire.',
        );
        const retry = await supabase
          .from('events')
          .select(EVENT_WITH_RELATIONS_NO_PARTNER)
          .eq('status', 'published')
          .order('starts_at', { ascending: true })
          .limit(200);
        if (retry.error) throw retry.error;
        return ((retry.data ?? []) as RawEventRow[]).map(mapEventRow);
      }
      throw error;
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
      if (!error) {
        if (!data) return null;
        const mapped = mapEventRow(data as RawEventRow);
        mapped.ticket_types.sort((a, b) => a.price - b.price);
        return mapped;
      }
      if (isMissingRelationshipError(error)) {
        console.warn(
          '[events] `events.partner_id` introuvable — appliquez supabase/migrations/0005_platform_v2.sql. Fallback sans partenaire.',
        );
        const retry = await supabase
          .from('events')
          .select(EVENT_WITH_RELATIONS_NO_PARTNER)
          .eq('slug', slug)
          .eq('status', 'published')
          .maybeSingle();
        if (retry.error) throw retry.error;
        if (!retry.data) return null;
        const mapped = mapEventRow(retry.data as RawEventRow);
        mapped.ticket_types.sort((a, b) => a.price - b.price);
        return mapped;
      }
      throw error;
    },
  });
}
