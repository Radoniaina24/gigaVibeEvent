import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCategories, usePublishedEvents } from '../../hooks/useEvents';
import { usePageMeta } from '../../hooks/usePageMeta';
import {
  applyEventFilters,
  paginate,
} from '../../features/events/eventUtils';
import {
  eventFiltersSchema,
  parseEventFilters,
  serializeEventFilters,
  type EventFiltersInput,
} from '../../schemas/events';
import { EventFilters } from '../../components/events/EventFilters';
import { EventGrid } from '../../components/events/EventGrid';
import { Button } from '../../components/ui/Button';

const PAGE_SIZE = 9;

export function EventsPage() {
  usePageMeta(
    'Événements',
    'Liste des événements à Madagascar : recherche, filtres par catégorie, date et prix.',
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const eventsQuery = usePublishedEvents();
  const categoriesQuery = useCategories();

  const filters = useMemo(
    () => parseEventFilters(searchParams),
    [searchParams],
  );

  const handleChange = (next: EventFiltersInput) => {
    setSearchParams(serializeEventFilters(next), { replace: false });
  };
  const handleReset = () => {
    setSearchParams(new URLSearchParams(), { replace: false });
  };

  const filtered = useMemo(
    () => applyEventFilters(eventsQuery.data ?? [], filters),
    [eventsQuery.data, filters],
  );
  const page = useMemo(
    () => paginate(filtered, filters.page, PAGE_SIZE),
    [filtered, filters.page],
  );

  const goToPage = (p: number) => {
    handleChange(eventFiltersSchema.parse({ ...filters, page: p }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters =
    filters.search !== '' ||
    filters.category !== '' ||
    filters.from !== '' ||
    filters.to !== '' ||
    filters.maxPrice > 0 ||
    filters.soonFullOnly;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Événements</h1>
        <p className="mt-1 text-sm text-zinc-500" role="status" aria-live="polite">
          {eventsQuery.isPending
            ? 'Chargement…'
            : `${filtered.length} événement${filtered.length > 1 ? 's' : ''} trouvé${filtered.length > 1 ? 's' : ''}`}
        </p>
      </div>

      <EventFilters
        filters={filters}
        categories={categoriesQuery.data ?? []}
        onChange={handleChange}
        onReset={handleReset}
      />

      <EventGrid
        events={page.items}
        isPending={eventsQuery.isPending}
        isError={eventsQuery.isError}
        onRetry={() => eventsQuery.refetch()}
        emptyTitle="Aucun événement ne correspond à vos critères."
        emptyDescription="Essayez d'élargir vos filtres ou votre recherche."
        emptyAction={
          hasActiveFilters ? (
            <Button variant="secondary" size="sm" onClick={handleReset}>
              Réinitialiser les filtres
            </Button>
          ) : undefined
        }
        skeletonCount={PAGE_SIZE}
      />

      {page.totalPages > 1 && (
        <nav
          aria-label="Pagination des événements"
          className="flex items-center justify-center gap-2"
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={page.page <= 1}
            onClick={() => goToPage(page.page - 1)}
            aria-label="Page précédente"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          {Array.from({ length: page.totalPages }).map((_, i) => {
            const p = i + 1;
            const show =
              p === 1 || p === page.totalPages || Math.abs(p - page.page) <= 1;
            if (!show) {
              if (p === 2 || p === page.totalPages - 1) {
                return (
                  <span key={p} className="px-1 text-sm text-zinc-400" aria-hidden>
                    …
                  </span>
                );
              }
              return null;
            }
            return (
              <button
                key={p}
                type="button"
                onClick={() => goToPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page.page ? 'page' : undefined}
                className={`flex size-8 items-center justify-center rounded-lg text-sm font-medium tabular-nums transition ${
                  p === page.page
                    ? 'bg-zinc-900 text-white'
                    : 'border border-zinc-300 bg-white hover:bg-zinc-100'
                }`}
              >
                {p}
              </button>
            );
          })}
          <Button
            variant="secondary"
            size="sm"
            disabled={page.page >= page.totalPages}
            onClick={() => goToPage(page.page + 1)}
            aria-label="Page suivante"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </nav>
      )}
    </div>
  );
}
