import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowUpDown,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useCategories, usePublishedEvents } from '../../hooks/useEvents';
import { usePageMeta } from '../../hooks/usePageMeta';
import { applyEventFilters, paginate } from '../../features/events/eventUtils';
import {
  eventFiltersSchema,
  parseEventFilters,
  serializeEventFilters,
  type EventFiltersInput,
  type EventSortKey,
} from '../../schemas/events';
import { EventActiveChips, EventFilters } from '../../components/events/EventFilters';
import { EventGrid } from '../../components/events/EventGrid';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

const PAGE_SIZE = 9;

const SORT_OPTIONS: { value: EventSortKey; label: string }[] = [
  { value: 'date_asc', label: 'Date : plus proche' },
  { value: 'date_desc', label: 'Date : plus lointaine' },
  { value: 'price_asc', label: 'Prix : croissant' },
  { value: 'price_desc', label: 'Prix : décroissant' },
  { value: 'popular', label: 'Les plus populaires' },
];

/* ---------- Select Tri façon shadcn (même style que Catégorie) ---------- */
function SortSelect({
  value,
  onSelect,
}: {
  value: EventSortKey;
  onSelect: (v: EventSortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selected = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];

  const measure = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const up = spaceBelow < 280 && r.top > spaceBelow;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8));
    setPos(up
      ? { bottom: window.innerHeight - r.top + 8, left, width: r.width }
      : { top: r.bottom + 8, left, width: r.width });
  };

  const closeMenu = (focusTrigger: boolean) => {
    setOpen(false);
    setPos(null);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const openMenu = () => {
    measure();
    const i = SORT_OPTIONS.findIndex((o) => o.value === value);
    setHighlight(i >= 0 ? i : 0);
    setOpen(true);
    window.setTimeout(() => itemRefs.current[i >= 0 ? i : 0]?.focus(), 30);
  };

  const choose = (v: EventSortKey) => {
    onSelect(v);
    setOpen(false);
    setPos(null);
    triggerRef.current?.focus();
  };

  /* Fermetures : extérieur, Escape, scroll, resize */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || contentRef.current?.contains(t)) return;
      closeMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu(true);
    };
    const onScroll = (e: Event) => {
      if (contentRef.current?.contains(e.target as Node)) return;
      closeMenu(false);
    };
    const onResize = () => closeMenu(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  const moveHighlight = (dir: 1 | -1) => {
    setHighlight((h) => {
      const n = (h + dir + SORT_OPTIONS.length) % SORT_OPTIONS.length;
      itemRefs.current[n]?.focus();
      return n;
    });
  };

  return (
    <div className="flex-1 sm:w-56 sm:flex-none">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-label="Trier par"
        onClick={() => (open ? closeMenu(true) : openMenu())}
        onKeyDown={(e) => {
          if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
            e.preventDefault();
            if (!open) openMenu();
          }
        }}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 text-left shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
          open ? 'border-brand-600 ring-4 ring-brand-600/10' : 'border-zinc-200 hover:border-zinc-300',
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <ArrowUpDown aria-hidden className="size-4 shrink-0 text-zinc-400" />
          <span className="truncate text-sm font-medium text-zinc-900">{selected.label}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn('size-4 shrink-0 opacity-50 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && pos && createPortal(
        <div
          ref={contentRef}
          role="listbox"
          aria-label="Options de tri"
          style={{
            position: 'fixed',
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            width: Math.max(220, pos.width),
            zIndex: 70,
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); moveHighlight(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); moveHighlight(-1); }
            else if (e.key === 'Home') { e.preventDefault(); setHighlight(0); itemRefs.current[0]?.focus(); }
            else if (e.key === 'End') {
              e.preventDefault();
              setHighlight(SORT_OPTIONS.length - 1);
              itemRefs.current[SORT_OPTIONS.length - 1]?.focus();
            }
          }}
          className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_24px_64px_-16px_rgb(0_0_0/0.35)]"
        >
          <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">
            Trier par
          </p>
          <ul className="max-h-72 overflow-y-auto p-1.5 pt-0">
            {SORT_OPTIONS.map((o, i) => {
              const active = o.value === value;
              const isHl = highlight === i;
              return (
                <li key={o.value} role="option" aria-selected={active}>
                  <button
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    type="button"
                    onClick={() => choose(o.value)}
                    onMouseMove={() => setHighlight(i)}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg py-2 pl-8 pr-2 text-left text-sm outline-none transition',
                      active
                        ? 'bg-zinc-900 font-semibold text-white'
                        : isHl
                          ? 'bg-zinc-100 text-zinc-900'
                          : 'text-zinc-700',
                    )}
                  >
                    <span aria-hidden className="absolute left-2 flex size-4 items-center justify-center">
                      {active && <Check className="size-4" aria-hidden />}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function EventsPage() {
  usePageMeta(
    'Événements',
    'Liste des événements à Madagascar : recherche, filtres par catégorie, date et prix.',
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const eventsQuery = usePublishedEvents();
  const categoriesQuery = useCategories();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filters = useMemo(() => parseEventFilters(searchParams), [searchParams]);

  const handleChange = (next: EventFiltersInput) => {
    setSearchParams(serializeEventFilters(next), { replace: false });
  };
  const handleReset = () => {
    setSearchParams(new URLSearchParams(), { replace: false });
  };
  const set = (patch: Partial<EventFiltersInput>) =>
    handleChange(eventFiltersSchema.parse({ ...filters, ...patch, page: patch.page ?? 1 }));

  /* Recherche avec debounce (toolbar droite) */
  const [searchLocal, setSearchLocal] = useState(filters.search);
  useEffect(() => setSearchLocal(filters.search), [filters.search]);
  useEffect(() => {
    if (searchLocal === filters.search) return;
    const t = window.setTimeout(() => {
      handleChange(eventFiltersSchema.parse({ ...filters, search: searchLocal, page: 1 }));
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLocal]);

  /* Verrouille le scroll quand le drawer mobile est ouvert */
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const allEvents = eventsQuery.data ?? [];

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of allEvents) {
      if (e.category) map[e.category.slug] = (map[e.category.slug] ?? 0) + 1;
    }
    return map;
  }, [allEvents]);

  const filtered = useMemo(() => applyEventFilters(allEvents, filters), [allEvents, filters]);
  const page = useMemo(() => paginate(filtered, filters.page, PAGE_SIZE), [filtered, filters.page]);

  const goToPage = (p: number) => {
    handleChange(eventFiltersSchema.parse({ ...filters, page: p }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sidebarActiveCount =
    (filters.category ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0) +
    (filters.maxPrice > 0 ? 1 : 0) +
    (filters.soonFullOnly ? 1 : 0);
  const hasActiveFilters = sidebarActiveCount > 0 || filters.search !== '';

  return (
    <div className="bleed">
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 md:px-2">
      {/* ===== En-tête ===== */}
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700 shadow-sm">
          <MapPin className="size-3.5" aria-hidden />
          Agenda · Madagascar
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Événements
        </h1>
        <p
          className="mt-1.5 flex items-center gap-1.5 text-sm text-zinc-500"
          role="status"
          aria-live="polite"
        >
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          {eventsQuery.isPending ? (
            'Chargement des événements…'
          ) : (
            <>
              <strong className="font-semibold tabular-nums text-zinc-900">{filtered.length}</strong>
              &nbsp;événement{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
              {hasActiveFilters && <span className="text-zinc-400">· filtres actifs</span>}
            </>
          )}
        </p>
      </div>

      {/* ===== Layout 2 colonnes : filtres gauche / résultats droite ===== */}
      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* ----- Sidebar gauche (desktop) ----- */}
        <aside aria-label="Filtres" className="hidden lg:block">
          <div className="sticky top-[104px] max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl pb-1">
            <EventFilters
              filters={filters}
              categories={categoriesQuery.data ?? []}
              counts={counts}
              resultCount={filtered.length}
              idPrefix="f-side"
              onChange={handleChange}
              onReset={handleReset}
            />
          </div>
        </aside>

        {/* ----- Colonne droite : toolbar + résultats ----- */}
        <div className="min-w-0 space-y-4">
          {/* Toolbar : recherche + tri + bouton filtres mobile */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                />
                <label htmlFor="ev-search" className="sr-only">Rechercher un événement</label>
                <input
                  id="ev-search"
                  type="search"
                  value={searchLocal}
                  onChange={(e) => setSearchLocal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setSearchLocal('');
                  }}
                  placeholder="Rechercher : concert, lieu, organisateur…"
                  autoComplete="off"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-10 text-sm outline-none transition placeholder:text-zinc-400 hover:border-zinc-300 hover:bg-white focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-brand-600/10 [&::-webkit-search-cancel-button]:hidden"
                />
                {searchLocal && (
                  <button
                    type="button"
                    onClick={() => setSearchLocal('')}
                    aria-label="Effacer la recherche"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Bouton filtres : mobile / tablette uniquement */}
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-haspopup="dialog"
                  className={cn(
                    'inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 lg:hidden',
                    sidebarActiveCount > 0
                      ? 'bg-zinc-900 text-white shadow-sm hover:bg-zinc-800'
                      : 'border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50',
                  )}
                >
                  <SlidersHorizontal className="size-4" aria-hidden />
                  Filtres
                  {sidebarActiveCount > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold tabular-nums text-white">
                      {sidebarActiveCount}
                    </span>
                  )}
                </button>

                <SortSelect value={filters.sort} onSelect={(sort) => set({ sort })} />
              </div>
            </div>
          </div>

          {/* Chips actifs */}
          <EventActiveChips
            filters={filters}
            categories={categoriesQuery.data ?? []}
            onChange={handleChange}
            onReset={handleReset}
          />

          {/* Grille */}
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

          {/* Pagination */}
          {page.totalPages > 1 && (
            <nav aria-label="Pagination des événements" className="flex items-center justify-center gap-2 pt-2">
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
                const show = p === 1 || p === page.totalPages || Math.abs(p - page.page) <= 1;
                if (!show) {
                  if (p === 2 || p === page.totalPages - 1) {
                    return (
                      <span key={p} className="px-1 text-sm text-zinc-400" aria-hidden>…</span>
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
                    className={cn(
                      'flex size-8 items-center justify-center rounded-lg text-sm font-medium tabular-nums transition',
                      p === page.page
                        ? 'bg-zinc-900 text-white'
                        : 'border border-zinc-300 bg-white hover:bg-zinc-100',
                    )}
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
      </div>

      {/* ----- Drawer mobile (filtres) ----- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtres des événements">
          <div
            className="absolute inset-0 bg-night-950/60"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="drawer-in absolute inset-y-0 right-0 flex w-[340px] max-w-[90vw] flex-col bg-zinc-50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-bold">
                <SlidersHorizontal className="size-4" aria-hidden />
                Filtres
                {sidebarActiveCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold tabular-nums text-white">
                    {sidebarActiveCount}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fermer les filtres"
                className="rounded-lg p-2 transition hover:bg-zinc-100"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <EventFilters
                filters={filters}
                categories={categoriesQuery.data ?? []}
                counts={counts}
                resultCount={filtered.length}
                idPrefix="f-drawer"
                onChange={handleChange}
                onReset={handleReset}
                onApply={() => setDrawerOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
