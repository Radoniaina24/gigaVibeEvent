import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

/** Clés de cache centralisées (invalidation cohérente). */
export const queryKeys = {
  events: {
    all: ['events'] as const,
    list: (filters?: unknown) =>
      ['events', 'list', filters ?? {}] as const,
    detail: (slug: string) => ['events', 'detail', slug] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  ticketTypes: {
    byEvent: (eventId: string) => ['ticket-types', eventId] as const,
  },
  orders: {
    all: ['orders'] as const,
    mine: ['orders', 'mine'] as const,
    detail: (id: string) => ['orders', id] as const,
  },
  tickets: {
    all: ['tickets'] as const,
    mine: ['tickets', 'mine'] as const,
  },
  admin: {
    stats: (range: string) => ['admin', 'stats', range] as const,
  },
} as const;
