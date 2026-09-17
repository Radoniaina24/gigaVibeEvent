import { useEffect, useMemo, useState } from 'react';
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
  Search,
  TicketX,
} from 'lucide-react';
import type { AdminTicketRow } from '../hooks';
import { TicketStatusBadge } from '../../../components/admin/StatusBadges';
import { MiniSelect } from '../../../components/ui/MiniSelect';
import { DateRangeFilter, EMPTY_RANGE, localTodayKey, type DateRangeValue } from '../../../components/ui/DateRangeFilter';
import { cn, formatShortDateTime } from '../../../lib/utils';

const columnHelper = createColumnHelper<AdminTicketRow>();

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'valid', label: 'Valide' },
  { value: 'used', label: 'Utilisé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'expired', label: 'Expiré' },
] as const;

const PAGE_SIZES = [8, 15, 25, 50] as const;

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp className="size-3.5" aria-hidden />;
  if (sorted === 'desc') return <ArrowDown className="size-3.5" aria-hidden />;
  return <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />;
}

function holderInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][parts[1].length - 1]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Nom + prénom de l'acheteur (comme la colonne Client du tableau paiements). */
function buyerLabel(row: AdminTicketRow): string {
  if (!row.user) return '';
  return [row.user.first_name, row.user.last_name].filter(Boolean).join(' ');
}

interface TicketsTableProps {
  data: AdminTicketRow[];
  cancelling: boolean;
  onCancel: (row: AdminTicketRow) => void;
}

/**
 * Tableau billets propulsé par TanStack Table :
 * recherche globale, filtres statut + événement, tri, pagination.
 */
export function TicketsTable({ data, cancelling, onCancel }: TicketsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });

  const statusFilter = (columnFilters.find((f) => f.id === 'status')?.value as string) ?? '';
  const eventFilter = (columnFilters.find((f) => f.id === 'event')?.value as string) ?? '';
  const dateFilter = (columnFilters.find((f) => f.id === 'created_at')?.value as DateRangeValue) ?? EMPTY_RANGE;

  /** Événements présents dans les billets (id + titre), triés par titre. */
  const eventOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of data) {
      if (row.event_id && !byId.has(row.event_id)) {
        byId.set(row.event_id, row.event?.title ?? 'Événement');
      }
    }
    return [...byId.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  }, [data]);

  const setFilterValue = (id: string, value: string | DateRangeValue) =>
    setColumnFilters((prev) => [
      ...prev.filter((f) => f.id !== id),
      ...(typeof value === 'string'
        ? value
          ? [{ id, value }]
          : []
        : value.from || value.to
          ? [{ id, value }]
          : []),
    ]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [globalFilter, columnFilters]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('ticket_number', {
        header: 'Billet',
        cell: (info) => {
          const row = info.row.original;
          return (
            <span>
              <span className="block font-mono text-xs font-semibold">{info.getValue()}</span>
              <span className="block font-mono text-[11px] text-zinc-400">
                {row.order?.order_number ?? '—'}
              </span>
            </span>
          );
        },
      }),
      columnHelper.accessor('holder_name', {
        header: 'Participant',
        cell: (info) => {
          const row = info.row.original;
          const holder = info.getValue();
          const buyer = buyerLabel(row);
          const sub = buyer && buyer !== holder ? buyer : (row.user?.email ?? '');
          return (
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-[11px] font-bold text-white"
              >
                {holderInitials(holder || '?')}
              </span>
              <span className="min-w-0">
                <span className="block max-w-48 truncate text-xs font-medium" title={holder}>
                  {holder}
                </span>
                {sub && (
                  <span
                    className="block max-w-48 truncate text-[11px] text-zinc-500"
                    title={row.user?.email ? `${buyer || holder} · ${row.user.email}` : sub}
                  >
                    {sub}
                  </span>
                )}
              </span>
            </span>
          );
        },
      }),
      columnHelper.accessor((row) => row.event?.title ?? '—', {
        id: 'event',
        header: 'Événement',
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue) return true;
          return row.original.event_id === filterValue;
        },
        cell: (info) => {
          const row = info.row.original;
          return (
            <span>
              <span className="block max-w-56 truncate text-xs font-medium" title={info.getValue()}>
                {info.getValue()}
              </span>
              <span className="mt-0.5 inline-block rounded-full bg-zinc-100 px-2 py-px text-[11px] font-medium text-zinc-600">
                {row.ticket_type?.name ?? 'Billet'}
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
        cell: (info) => <TicketStatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor('created_at', {
        header: 'Créé le',
        filterFn: (row, _columnId, filterValue: DateRangeValue) => {
          if (!filterValue?.from && !filterValue?.to) return true;
          const day = row.original.created_at.slice(0, 10);
          if (filterValue.from && day < filterValue.from) return false;
          if (filterValue.to && day > filterValue.to) return false;
          return true;
        },
        cell: (info) => (
          <span className="whitespace-nowrap text-xs tabular-nums">
            {formatShortDateTime(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Contrôle',
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          if (row.status !== 'valid') return <span className="text-xs text-zinc-400">—</span>;
          return (
            <button
              type="button"
              disabled={cancelling}
              onClick={() => onCancel(row)}
              aria-label={`Annuler le billet ${row.ticket_number}`}
              title="Annuler ce billet (contrôle)"
              className="group inline-grid size-9 place-items-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition hover:-translate-y-px hover:border-red-600 hover:bg-red-600 hover:text-white hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-red-200 disabled:hover:bg-white disabled:hover:text-red-600 disabled:hover:shadow-sm"
            >
              <TicketX className="size-4 transition group-hover:scale-110" aria-hidden />
            </button>
          );
        },
      }),
    ],
    [cancelling, onCancel],
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
      return `${r.ticket_number} ${r.holder_name} ${r.user?.first_name ?? ''} ${r.user?.last_name ?? ''} ${r.user?.email ?? ''} ${r.event?.title ?? ''} ${r.ticket_type?.name ?? ''} ${r.order?.order_number ?? ''}`
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

  return (
    <div className="space-y-3">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full flex-1 sm:min-w-52 sm:max-w-xs">
          <span className="sr-only">Rechercher un billet</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="N° billet, participant, événement…"
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
          onChange={(v) => setFilterValue('status', v)}
          options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
          className="h-9 w-full justify-between sm:w-auto sm:min-w-44"
        />
        <MiniSelect
          ariaLabel="Filtrer par événement"
          value={eventFilter}
          onChange={(v) => setFilterValue('event', v)}
          options={[
            { value: '', label: 'Tous les événements' },
            ...eventOptions.map((e) => ({ value: e.id, label: e.title })),
          ]}
          className="h-9 w-full justify-between sm:w-auto sm:min-w-72 sm:max-w-96 [&>span]:min-w-0 [&>span]:truncate"
        />
        <DateRangeFilter
          ariaLabel="Filtrer par période"
          value={dateFilter}
          max={localTodayKey()}
          onChange={(v) => setFilterValue('created_at', v)}
          className="sm:min-w-52"
        />
        <p aria-live="polite" className="text-xs tabular-nums text-zinc-500">
          {filteredCount} résultat{filteredCount > 1 ? 's' : ''}
        </p>
      </div>

      {/* Tableau */}
      <div className="max-w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <caption className="sr-only">Billets vendus</caption>
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
                  <p className="font-semibold text-zinc-700">Aucun billet trouvé.</p>
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
          <nav aria-label="Pagination des billets" className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => table.setPageIndex(0)}
              disabled={!canPrev}
              aria-label="Première page"
              title="Première page"
              className={navBtn(canPrev)}
            >
              <ChevronsLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => table.previousPage()}
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
                  onClick={() => table.setPageIndex(p - 1)}
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
              onClick={() => table.nextPage()}
              disabled={!canNext}
              aria-label="Page suivante"
              title="Page suivante"
              className={navBtn(canNext)}
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => table.setPageIndex(pageCount - 1)}
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
