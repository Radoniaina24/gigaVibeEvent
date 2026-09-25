import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Copy,
  ExternalLink,
  Pencil,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import type { AdminEventRow } from '../hooks';
import type { PartnerEventRow } from '../../partner/hooks';
import { EventStatusBadge } from '../../../components/admin/StatusBadges';
import { MiniSelect } from '../../../components/ui/MiniSelect';
import { formatDate } from '../../../lib/utils';
import { cn } from '../../../lib/utils';

const columnHelper = createColumnHelper<AdminEventRow | PartnerEventRow>();

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'pending_review', label: 'En validation' },
  { value: 'changes_requested', label: 'Modifs' },
  { value: 'published', label: 'Publié' },
  { value: 'sold_out', label: 'Complet' },
  { value: 'suspended', label: 'Suspendu' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'completed', label: 'Terminé' },
] as const;

interface EventsTableProps {
  data: (AdminEventRow | PartnerEventRow)[];
  /** Base des liens d'édition (défaut : backoffice admin). */
  editBasePath?: string;
  actionPending?: boolean;
  onDuplicate?: (id: string) => void;
  onDelete?: (event: AdminEventRow | PartnerEventRow) => void;
  /** Si fourni : bouton « Soumettre » pour brouillons / corrections / refusés. */
  onSubmit?: (id: string) => void;
  submittingId?: string | null;
}

const PAGE_SIZES = [8, 10, 15, 25] as const;

const SUBMITTABLE = ['draft', 'changes_requested', 'cancelled'];

function stockOf(e: AdminEventRow | PartnerEventRow): { sold: number; total: number } {
  return {
    sold: e.ticket_types.reduce((s, t) => s + t.sold, 0),
    total: e.ticket_types.reduce((s, t) => s + t.quantity, 0),
  };
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp className="size-3.5" aria-hidden />;
  if (sorted === 'desc') return <ArrowDown className="size-3.5" aria-hidden />;
  return <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />;
}

/**
 * Tableau événements propulsé par TanStack Table :
 * recherche, filtre statut (shadcn), tri, pagination (shadcn).
 */
export function EventsTable({
  data,
  editBasePath = '/admin/events',
  actionPending = false,
  onDuplicate,
  onDelete,
  onSubmit,
  submittingId = null,
}: EventsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'starts_at', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const statusFilter = (columnFilters.find((f) => f.id === 'status')?.value as string) ?? '';

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [globalFilter, columnFilters]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('title', {
        header: 'Événement',
        cell: (info) => {
          const row = info.row.original;
          const reviewNote =
            'review_note' in row && typeof row.review_note === 'string' ? row.review_note : null;
          const showNote =
            Boolean(reviewNote?.trim()) &&
            ['changes_requested', 'cancelled', 'suspended'].includes(row.status);
          return (
            <span className="flex min-w-0 items-start gap-2.5">
              {row.image_url ? (
                <img
                  src={row.image_url}
                  alt=""
                  aria-hidden
                  className="size-9 shrink-0 rounded-lg object-cover"
                  loading="lazy"
                />
              ) : (
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-sm font-bold text-white"
                >
                  {row.title.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-semibold text-zinc-900">{row.title}</span>
                <span className="block max-w-64 truncate text-xs text-zinc-500">
                  {row.category?.name ?? '—'} · {row.venue}, {row.city}
                </span>
                {showNote && (
                  <span
                    className="mt-1 block max-w-64 truncate rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] leading-relaxed text-amber-900"
                    title={reviewNote ?? ''}
                  >
                    Motif GVE : {reviewNote}
                  </span>
                )}
              </span>
            </span>
          );
        },
      }),
      columnHelper.accessor('starts_at', {
        header: 'Date',
        cell: (info) => (
          <span className="whitespace-nowrap text-xs">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor((row) => stockOf(row).sold, {
        id: 'stock',
        header: 'Vendues',
        cell: (info) => {
          const s = stockOf(info.row.original);
          const ratio = s.total > 0 ? Math.min(1, s.sold / s.total) : 0;
          return (
            <span className="block min-w-24">
              <span className="tabular-nums">
                {s.sold}/{s.total}
              </span>
              <span
                aria-hidden
                className="mt-1 block h-1 overflow-hidden rounded-full bg-zinc-100"
              >
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-500"
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </span>
            </span>
          );
        },
      }),
      columnHelper.accessor('status', {
        header: 'Statut',
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue) return true;
          return row.original.status === filterValue;
        },
        cell: (info) => <EventStatusBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          const picto =
            'group inline-grid size-9 place-items-center rounded-full border border-zinc-300 bg-white text-zinc-500 shadow-sm transition hover:-translate-y-px hover:border-zinc-900 hover:bg-zinc-900 hover:text-white hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-zinc-300 disabled:hover:bg-white disabled:hover:text-zinc-500 disabled:hover:shadow-sm';
          const pictoDanger =
            'group inline-grid size-9 place-items-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition hover:-translate-y-px hover:border-red-600 hover:bg-red-600 hover:text-white hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600';
          const pictoIcon = 'size-4 transition group-hover:scale-110';
          const submittable = onSubmit && SUBMITTABLE.includes(row.status);
          return (
            <span className="flex items-center gap-1.5">
              <Link
                to={`/events/${row.slug}`}
                title="Voir la page publique"
                aria-label={`Voir la page publique de ${row.title}`}
                className={picto}
              >
                <ExternalLink className={pictoIcon} aria-hidden />
              </Link>
              <Link
                to={`${editBasePath}/${row.id}/edit`}
                title="Modifier"
                aria-label={`Modifier ${row.title}`}
                className={picto}
              >
                <Pencil className={pictoIcon} aria-hidden />
              </Link>
              {submittable && (
                <button
                  type="button"
                  title="Envoyer à Giga Vibe Event pour validation"
                  disabled={actionPending || submittingId === row.id}
                  onClick={() => onSubmit(row.id)}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-sm transition hover:-translate-y-px hover:border-zinc-900 hover:bg-zinc-900 hover:text-white hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className={pictoIcon} aria-hidden />
                  {submittingId === row.id ? 'Envoi…' : 'Soumettre'}
                </button>
              )}
              {onDuplicate && (
                <button
                  type="button"
                  title="Dupliquer"
                  aria-label={`Dupliquer ${row.title}`}
                  disabled={actionPending}
                  onClick={() => onDuplicate(row.id)}
                  className={picto}
                >
                  <Copy className={pictoIcon} aria-hidden />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  title="Supprimer"
                  aria-label={`Supprimer ${row.title}`}
                  onClick={() => onDelete(row)}
                  className={pictoDanger}
                >
                  <Trash2 className={pictoIcon} aria-hidden />
                </button>
              )}
            </span>
          );
        },
      }),
    ],
    [editBasePath, onDuplicate, onDelete, onSubmit, submittingId, actionPending],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).trim().toLowerCase();
      if (!q) return true;
      const r = row.original;
      return `${r.title} ${r.venue} ${r.city} ${r.category?.name ?? ''}`
        .toLowerCase()
        .includes(q);
    },
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();
  const currentPage = pagination.pageIndex + 1;

  /** Numéros affichés : 1 … (p-1) p (p+1) … N */
  const pageItems: (number | '…')[] = (() => {
    const items: (number | '…')[] = [];
    for (let p = 1; p <= pageCount; p++) {
      if (p === 1 || p === pageCount || Math.abs(p - currentPage) <= 1) {
        items.push(p);
      } else if (items[items.length - 1] !== '…') {
        items.push('…');
      }
    }
    return items;
  })();

  const rangeStart = filteredCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const rangeEnd = Math.min(filteredCount, (pagination.pageIndex + 1) * pagination.pageSize);

  const navBtn = (enabled: boolean) =>
    cn(
      'grid size-8 place-items-center rounded-lg border border-zinc-300 bg-white text-zinc-600 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
      enabled ? 'hover:bg-zinc-100 hover:text-zinc-900' : 'cursor-not-allowed opacity-40',
    );

  const goTo = (dir: 1 | -1) => {
    if (dir === 1) table.nextPage();
    else table.previousPage();
    window.scrollTo({ top: 0 });
  };

  const goToPage = (p: number) => {
    table.setPageIndex(p - 1);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="space-y-3">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full flex-1 sm:min-w-52 sm:max-w-xs">
          <span className="sr-only">Rechercher un événement</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Titre, lieu, ville…"
            type="search"
            className="h-9 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-8 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
          />
          {globalFilter && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => setGlobalFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              ×
            </button>
          )}
        </label>
        <MiniSelect
          ariaLabel="Filtrer par statut"
          value={statusFilter}
          onChange={(v) =>
            setColumnFilters((prev) => [
              ...prev.filter((f) => f.id !== 'status'),
              ...(v ? [{ id: 'status', value: v }] : []),
            ])
          }
          options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
          className="h-9 w-full justify-between sm:w-auto sm:min-w-64"
        />
        <p aria-live="polite" className="text-xs tabular-nums text-zinc-500">
          {filteredCount} résultat{filteredCount > 1 ? 's' : ''}
        </p>
      </div>

      {/* Tableau */}
      <div className="max-w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Liste des événements</caption>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-zinc-200 bg-zinc-50">
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const sortable = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : undefined
                      }
                      className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500"
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 uppercase tracking-wide transition hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon sorted={sorted} />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-zinc-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center">
                  <p className="font-semibold text-zinc-700">Aucun événement trouvé.</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Essaie un autre mot-clé ou{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setGlobalFilter('');
                        setColumnFilters([]);
                      }}
                      className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
                    >
                      réinitialise les filtres
                    </button>
                    .
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination pro */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-2 text-xs text-zinc-500">
            Lignes par page
            <MiniSelect
              ariaLabel="Lignes par page"
              value={String(pagination.pageSize)}
              onChange={(v) => setPagination((p) => ({ ...p, pageSize: Number(v), pageIndex: 0 }))}
              options={PAGE_SIZES.map((s) => ({ value: String(s), label: String(s) }))}
            />
          </span>
          <p className="text-xs tabular-nums text-zinc-500" aria-live="polite">
            {rangeStart}–{rangeEnd} sur {filteredCount} résultat{filteredCount > 1 ? 's' : ''}
          </p>
        </div>
        {pageCount > 1 && (
          <nav aria-label="Pagination des événements" className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(1)}
              disabled={!canPrev}
              aria-label="Première page"
              title="Première page"
              className={navBtn(canPrev)}
            >
              <ChevronsLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goTo(-1)}
              disabled={!canPrev}
              aria-label="Page précédente"
              title="Page précédente"
              className={navBtn(canPrev)}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            {pageItems.map((p, i) =>
              p === '…' ? (
                <span key={`gap-${i}`} className="px-1 text-sm text-zinc-400" aria-hidden>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => goToPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === currentPage ? 'page' : undefined}
                  className={cn(
                    'grid size-8 place-items-center rounded-lg text-sm font-medium tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                    p === currentPage
                      ? 'bg-zinc-900 font-bold text-white shadow-sm'
                      : 'border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                  )}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => goTo(1)}
              disabled={!canNext}
              aria-label="Page suivante"
              title="Page suivante"
              className={navBtn(canNext)}
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goToPage(pageCount)}
              disabled={!canNext}
              aria-label="Dernière page"
              title="Dernière page"
              className={navBtn(canNext)}
            >
              <ChevronsRight className="size-4" aria-hidden />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
