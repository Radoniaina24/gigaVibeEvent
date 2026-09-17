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
  FileSearch,
  ReceiptText,
  Search,
} from 'lucide-react';
import type { AdminPaymentRow } from '../hooks';
import { OrderStatusBadge } from '../../../components/orders/OrderStatusBadge';
import { PaymentMethodBadge } from '../../../components/orders/PaymentMethodBadge';
import { MiniSelect } from '../../../components/ui/MiniSelect';
import { DateRangeFilter, EMPTY_RANGE, localTodayKey, type DateRangeValue } from '../../../components/ui/DateRangeFilter';
import { cn, formatAr, formatShortDateTime } from '../../../lib/utils';

const columnHelper = createColumnHelper<AdminPaymentRow>();

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'processing', label: 'En vérification' },
  { value: 'paid', label: 'Payé' },
  { value: 'failed', label: 'Refusé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'expired', label: 'Expiré' },
] as const;

const METHOD_OPTIONS = [
  { value: '', label: 'Toutes les méthodes' },
  { value: 'yas', label: 'YAS' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'card', label: 'Carte' },
  { value: 'cash', label: 'Espèces' },
] as const;

const PAGE_SIZES = [8, 15, 25, 50] as const;

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp className="size-3.5" aria-hidden />;
  if (sorted === 'desc') return <ArrowDown className="size-3.5" aria-hidden />;
  return <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />;
}

function clientLabel(row: AdminPaymentRow): string {
  if (!row.user) return '—';
  const name = [row.user.first_name, row.user.last_name].filter(Boolean).join(' ');
  return `${name || row.user.email} · ${row.user.email}`;
}

interface PaymentsTableProps {
  data: AdminPaymentRow[];
  signingId: string | null;
  onOpenReceipt: (paymentId: string, path: string) => void;
  onReview: (row: AdminPaymentRow) => void;
  /** Remonte les lignes visibles après filtres (pour synchroniser les KPI). */
  onFilteredChange?: (rows: AdminPaymentRow[]) => void;
}

/**
 * Tableau paiements propulsé par TanStack Table :
 * recherche globale, filtres statut + méthode + événement, tri, pagination.
 */
export function PaymentsTable({ data, signingId, onOpenReceipt, onReview, onFilteredChange }: PaymentsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });

  const statusFilter = (columnFilters.find((f) => f.id === 'status')?.value as string) ?? '';
  const methodFilter = (columnFilters.find((f) => f.id === 'provider')?.value as string) ?? '';
  const eventFilter = (columnFilters.find((f) => f.id === 'event')?.value as string) ?? '';
  const dateFilter = (columnFilters.find((f) => f.id === 'created_at')?.value as DateRangeValue) ?? EMPTY_RANGE;

  /** Événements présents dans les paiements (titres uniques), triés. */
  const eventOptions = useMemo(() => {
    const titles = new Set<string>();
    for (const row of data) {
      const t = row.order?.event?.title;
      if (t) titles.add(t);
    }
    return [...titles].sort((a, b) => a.localeCompare(b, 'fr'));
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
      columnHelper.accessor('provider_ref', {
        header: 'Référence',
        cell: (info) => {
          const row = info.row.original;
          return (
            <span className="inline-flex items-center gap-1">
              <span className="font-mono text-xs">{info.getValue() ?? '—'}</span>
              {row.receipt_url && (
                <button
                  type="button"
                  title="Voir le reçu"
                  aria-label={`Voir le reçu ${info.getValue() ?? ''}`}
                  disabled={signingId === row.id}
                  onClick={() => onOpenReceipt(row.id, row.receipt_url as string)}
                  className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  <ReceiptText className="size-4" aria-hidden />
                </button>
              )}
            </span>
          );
        },
      }),
      columnHelper.accessor((row) => row.order?.order_number ?? '—', {
        id: 'order_number',
        header: 'Commande',
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor((row) => row.order?.event?.title ?? '—', {
        id: 'event',
        header: 'Événement',
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue) return true;
          return (row.original.order?.event?.title ?? '') === filterValue;
        },
        cell: (info) => (
          <span className="block max-w-56 truncate text-xs" title={info.getValue()}>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor((row) => clientLabel(row), {
        id: 'client',
        header: 'Client',
        cell: (info) => {
          const row = info.row.original;
          if (!row.user) return <span className="text-xs">—</span>;
          const name = [row.user.first_name, row.user.last_name].filter(Boolean).join(' ');
          return (
            <span className="block max-w-64 truncate text-xs" title={clientLabel(row)}>
              {name || row.user.email}
              {name && <span className="block truncate text-zinc-500">{row.user.email}</span>}
            </span>
          );
        },
      }),
      columnHelper.accessor('provider', {
        header: 'Méthode',
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue) return true;
          return row.original.provider === filterValue;
        },
        cell: (info) => <PaymentMethodBadge method={info.getValue()} />,
      }),
      columnHelper.accessor('amount', {
        header: 'Montant',
        cell: (info) => (
          <span className="font-semibold tabular-nums">{formatAr(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Statut',
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue) return true;
          return row.original.status === filterValue;
        },
        cell: (info) => <OrderStatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor('created_at', {
        header: 'Date',
        filterFn: (row, _columnId, filterValue: DateRangeValue) => {
          if (!filterValue?.from && !filterValue?.to) return true;
          // Jour calendaire UTC de la déclaration (comparaison lexicographique AAAA-MM-JJ).
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
        header: 'Validation',
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          const actionable = row.status === 'pending' || row.status === 'processing';
          if (!actionable) return <span className="text-xs text-zinc-400">—</span>;
          return (
            <button
              type="button"
              onClick={() => onReview(row)}
              aria-label={`Examiner le paiement ${row.provider_ref ?? row.order?.order_number ?? ''}`}
              title="Examiner : vérifier la preuve puis valider ou refuser"
              className="group inline-grid size-9 place-items-center rounded-full border border-zinc-300 bg-white text-zinc-500 shadow-sm transition hover:-translate-y-px hover:border-zinc-900 hover:bg-zinc-900 hover:text-white hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <FileSearch className="size-4 transition group-hover:scale-110" aria-hidden />
            </button>
          );
        },
      }),
    ],
    [onOpenReceipt, onReview, signingId],
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
      return `${r.provider_ref ?? ''} ${r.order?.order_number ?? ''} ${r.user?.email ?? ''} ${r.user?.first_name ?? ''} ${r.user?.last_name ?? ''} ${r.order?.event?.title ?? ''}`
        .toLowerCase()
        .includes(q);
    },
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();
  const currentPage = pagination.pageIndex + 1;

  // Remonte les lignes filtrées au parent (KPI synchronisés avec les filtres).
  // Clé stable : ne notifie que si la sélection change vraiment.
  const filteredKey = table.getFilteredRowModel().rows.map((r) => r.original.id).join(',');
  useEffect(() => {
    onFilteredChange?.(table.getFilteredRowModel().rows.map((r) => r.original));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredKey]);

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
          <span className="sr-only">Rechercher un paiement</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Référence, N° commande, email, événement…"
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
          ariaLabel="Filtrer par méthode de paiement"
          value={methodFilter}
          onChange={(v) => setFilterValue('provider', v)}
          options={METHOD_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
          className="h-9 w-full justify-between sm:w-auto sm:min-w-56"
        />
        <MiniSelect
          ariaLabel="Filtrer par événement"
          value={eventFilter}
          onChange={(v) => setFilterValue('event', v)}
          options={[
            { value: '', label: 'Tous les événements' },
            ...eventOptions.map((t) => ({ value: t, label: t })),
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
        <table className="w-full min-w-[960px] text-left text-sm">
          <caption className="sr-only">Liste des paiements</caption>
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
                  <p className="font-semibold text-zinc-700">Aucun paiement trouvé.</p>
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
          <nav aria-label="Pagination des paiements" className="flex items-center gap-1">
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

      <p className="text-center text-xs text-zinc-500">
        Les changements de statut sont tracés automatiquement (triggers + table audit_logs).
      </p>
    </div>
  );
}
