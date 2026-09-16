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
  ChevronsUpDown,
  Eye,
  Search,
} from 'lucide-react';
import type { AdminOrderRow } from '../hooks';
import { OrderStatusBadge } from '../../../components/orders/OrderStatusBadge';
import { MiniSelect } from '../../../components/ui/MiniSelect';
import { cn, formatAr, formatShortDateTime } from '../../../lib/utils';

const columnHelper = createColumnHelper<AdminOrderRow>();

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'processing', label: 'En vérification' },
  { value: 'paid', label: 'Payé' },
  { value: 'failed', label: 'Refusé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'expired', label: 'Expiré' },
] as const;

interface OrdersTableProps {
  data: AdminOrderRow[];
}

const PAGE_SIZES = [8, 15, 25, 50] as const;

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp className="size-3.5" aria-hidden />;
  if (sorted === 'desc') return <ArrowDown className="size-3.5" aria-hidden />;
  return <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />;
}

function clientLabel(row: AdminOrderRow): string {
  if (!row.user) return '—';
  const name = [row.user.first_name, row.user.last_name].filter(Boolean).join(' ');
  return `${name || '—'} · ${row.user.email}`;
}

/**
 * Tableau commandes propulsé par TanStack Table :
 * recherche, filtre statut (shadcn), tri, pagination (shadcn).
 */
export function OrdersTable({ data }: OrdersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });

  const statusFilter = (columnFilters.find((f) => f.id === 'payment_status')?.value as string) ?? '';

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [globalFilter, columnFilters]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('order_number', {
        header: 'N°',
        cell: (info) => (
          <span className="font-mono text-xs font-semibold">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor((row) => clientLabel(row), {
        id: 'client',
        header: 'Client',
        cell: (info) => {
          const row = info.row.original;
          return (
            <span className="block max-w-64 truncate text-xs" title={clientLabel(row)}>
              {row.user ? (
                <>
                  {[row.user.first_name, row.user.last_name].filter(Boolean).join(' ') || '—'}
                  <span className="block truncate text-zinc-500">{row.user.email}</span>
                </>
              ) : (
                '—'
              )}
            </span>
          );
        },
      }),
      columnHelper.accessor((row) => row.event?.title ?? '—', {
        id: 'event',
        header: 'Événement',
        cell: (info) => (
          <span className="block max-w-56 truncate text-xs" title={info.getValue()}>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('total', {
        header: 'Montant',
        cell: (info) => (
          <span className="font-semibold tabular-nums">{formatAr(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor('payment_status', {
        header: 'Statut',
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue) return true;
          return row.original.payment_status === filterValue;
        },
        cell: (info) => <OrderStatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor('created_at', {
        header: 'Date',
        cell: (info) => (
          <span className="whitespace-nowrap text-xs tabular-nums">
            {formatShortDateTime(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Détail',
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Link
              to={`/admin/orders/${row.id}`}
              title="Voir le détail"
              aria-label={`Voir la commande ${row.order_number}`}
              className="rounded-md p-2 transition hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <Eye className="size-4" aria-hidden />
            </Link>
          );
        },
      }),
    ],
    [],
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
      return `${r.order_number} ${r.user?.email ?? ''} ${r.user?.first_name ?? ''} ${r.user?.last_name ?? ''} ${r.event?.title ?? ''}`
        .toLowerCase()
        .includes(q);
    },
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  return (
    <div className="space-y-3">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-52 flex-1 sm:max-w-xs">
          <span className="sr-only">Rechercher une commande</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="N°, email client, événement…"
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
              ...prev.filter((f) => f.id !== 'payment_status'),
              ...(v ? [{ id: 'payment_status', value: v }] : []),
            ])
          }
          options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
          className="h-9 min-w-44 justify-between"
        />
        <p aria-live="polite" className="text-xs tabular-nums text-zinc-500">
          {filteredCount} résultat{filteredCount > 1 ? 's' : ''}
        </p>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-200 text-left text-sm">
          <caption className="sr-only">Liste des commandes</caption>
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
                  <p className="font-semibold text-zinc-700">Aucune commande trouvée.</p>
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

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2">
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
          Page {pageCount === 0 ? 0 : pagination.pageIndex + 1} sur {pageCount}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!canPrev}
            aria-label="Page précédente"
            className={cn(
              'inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 text-sm transition',
              canPrev ? 'hover:bg-zinc-100' : 'cursor-not-allowed opacity-40',
            )}
          >
            <ChevronLeft className="size-4" aria-hidden /> Préc.
          </button>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!canNext}
            aria-label="Page suivante"
            className={cn(
              'inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 text-sm transition',
              canNext ? 'hover:bg-zinc-100' : 'cursor-not-allowed opacity-40',
            )}
          >
            Suiv. <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
