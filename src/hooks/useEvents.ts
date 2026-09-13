import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import {
  isMissingRelationshipError,
  markPartnerEmbedSupported,
  shouldTryPartnerEmbed,
} from '../lib/partnerEmbed';
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
 * Phase 2 : tous les événements publiés avec relations.
 * RLS : SELECT limité aux `published` côté serveur ; le filtrage
 * (recherche, catégorie, prix, tri, pagination) est appliqué côté client
 * via `applyEventFilters` (volume seed < 100, cache TanStack 60s).
 */
async function fetchPublishedEvents(): Promise<EventWithStats[]> {
  const supabase = getSupabase();
  // Si on sait déjà que la DB n'a pas events.partner_id → requête directe
  // sans embed (évite un 400 à chaque refresh).
  if (!shouldTryPartnerEmbed()) {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_WITH_RELATIONS_NO_PARTNER)
      .eq('status', 'published')
      .order('starts_at', { ascending: true })
      .limit(200);
    if (error) throw error;
    return ((data ?? []) as RawEventRow[]).map(mapEventRow);
  }
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_WITH_RELATIONS)
    .eq('status', 'published')
    .order('starts_at', { ascending: true })
    .limit(200);
  if (!error) {
    markPartnerEmbedSupported(true);
    return ((data ?? []) as RawEventRow[]).map(mapEventRow);
  }
  // Fallback : DB sans colonne events.partner_id (migration 0005 non appliquée).
  if (isMissingRelationshipError(error)) {
    markPartnerEmbedSupported(false);
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
}

async function fetchEventDetail(slug: string): Promise<EventWithStats | null> {
  const supabase = getSupabase();
  const mapDetail = (row: RawEventRow): EventWithStats => {
    const mapped = mapEventRow(row);
    mapped.ticket_types.sort((a, b) => a.price - b.price);
    return mapped;
  };
  if (!shouldTryPartnerEmbed()) {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_WITH_RELATIONS_NO_PARTNER)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapDetail(data as RawEventRow);
  }
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_WITH_RELATIONS)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (!error) {
    markPartnerEmbedSupported(true);
    if (!data) return null;
    return mapDetail(data as RawEventRow);
  }
  if (isMissingRelationshipError(error)) {
    markPartnerEmbedSupported(false);
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
    return mapDetail(retry.data as RawEventRow);
  }
  throw error;
}

export function usePublishedEvents() {
  return useQuery({
    queryKey: queryKeys.events.list({ scope: 'published' }),
    staleTime: 60_000,
    queryFn: fetchPublishedEvents,
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
      return fetchEventDetail(slug);
    },
  });
}
