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
  ArrowLeftRight,
  ArrowUp,
  BadgeCheck,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Eye,
  Pencil,
  Search,
} from 'lucide-react';
import type { AdminOrderRow } from '../hooks';
import { useAdminSetOrderStatus } from '../../orders/hooks';
import { OrderStatusBadge } from '../../../components/orders/OrderStatusBadge';
import { MiniSelect } from '../../../components/ui/MiniSelect';
import { DateRangeFilter, EMPTY_RANGE, localTodayKey, type DateRangeValue } from '../../../components/ui/DateRangeFilter';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toaster';
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
 * Changement de statut en ligne (payée / annulée) avec confirmation.
 * Payée → billets générés + envoyés par email ; annulée → stock libéré.
 * Garde-fou serveur : RPC `admin_set_order_status` (admin + audit).
 */
function OrderStatusDialog({ order, onClose }: { order: AdminOrderRow; onClose: () => void }) {
  const [to, setTo] = useState<'paid' | 'cancelled' | null>(null);
  const setStatus = useAdminSetOrderStatus();
  const { toast } = useToast();

  const confirm = async () => {
    if (!to || setStatus.isPending) return;
    try {
      const res = await setStatus.mutateAsync({ order_id: order.id, status: to });
      if (to === 'paid') {
        const plural = res.tickets > 1 ? 's' : '';
        if (res.email === 'sent') {
          toast.success(
            'Commande payée',
            `${res.tickets} billet${plural} généré${plural} et envoyé${plural} par email au client.`,
          );
        } else {
          toast.warning(
            'Commande payée',
            `${res.tickets} billet${plural} généré${plural}, mais l’email n’a pas pu être envoyé.`,
          );
        }
      } else {
        toast.success('Commande annulée', 'Stock réservé libéré pour les autres clients.');
      }
      onClose();
    } catch (err) {
      toast.error('Action impossible', err instanceof Error ? err.message : 'Réessayez.');
    }
  };

  const optionClass = (selected: boolean, tone: 'green' | 'red') =>
    cn(
      'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-4',
      selected
        ? tone === 'green'
          ? 'border-green-500 bg-green-50 shadow-sm ring-1 ring-green-500 focus-visible:outline-green-600'
          : 'border-red-500 bg-red-50 shadow-sm ring-1 ring-red-500 focus-visible:outline-red-600'
        : 'border-zinc-200 bg-white hover:-translate-y-px hover:border-zinc-300 hover:shadow-sm focus-visible:outline-brand-600',
    );

  const optionTile = (tone: 'green' | 'red') =>
    cn(
      'grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-sm',
      tone === 'green'
        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-600/30'
        : 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-600/30',
    );

  const pending = setStatus.isPending;

  return (
    <Modal
      open
      onClose={onClose}
      title="Changer le statut"
      subtitle={`${order.order_number} · ${order.event?.title ?? 'Événement'}`}
      icon={<ArrowLeftRight className="size-5" aria-hidden />}
      size="lg"
      footer={
        <>
          <Button variant="ghost" disabled={pending} onClick={onClose}>
            Retour
          </Button>
          <Button
            variant={to === 'cancelled' ? 'danger' : 'primary'}
            loading={pending}
            disabled={!to}
            onClick={() => void confirm()}
          >
            {to === 'cancelled' ? 'Annuler la commande' : to === 'paid' ? 'Marquer comme payée' : 'Confirmer'}
          </Button>
        </>
      }
    >
      <div className="relative space-y-4" aria-busy={pending}>
        {/* Voile de traitement */}
        {pending && (
          <div
            role="status"
            aria-label="Traitement en cours"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/75 backdrop-blur-[2px]"
          >
            <span
              aria-hidden
              className="size-9 animate-spin rounded-full border-[3px] border-zinc-200 border-t-zinc-900"
            />
            <p className="text-sm font-bold text-zinc-800">Traitement en cours…</p>
            <div aria-hidden className="w-48 max-w-full space-y-2">
              <div className="skeleton h-2.5 w-full" />
              <div className="skeleton mx-auto h-2.5 w-2/3" />
            </div>
          </div>
        )}

        {/* Résumé commande */}
        <div className="flex flex-col gap-3 rounded-2xl bg-night-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              {clientLabel(order)}
            </p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums leading-none sm:text-3xl">
              {formatAr(order.total)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-zinc-400">Actuel :</span>
            <OrderStatusBadge status={order.payment_status} />
          </div>
        </div>

        <div className="space-y-2" role="radiogroup" aria-label="Nouveau statut">
          <button
            type="button"
            role="radio"
            aria-checked={to === 'paid'}
            onClick={() => setTo('paid')}
            className={optionClass(to === 'paid', 'green')}
          >
            <span aria-hidden className={optionTile('green')}>
              <BadgeCheck className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-zinc-900">Marquer comme payée</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Billets générés et envoyés par email au client. Irréversible.
              </span>
            </span>
            <span
              aria-hidden
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full border-2 transition',
                to === 'paid'
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-zinc-300 bg-white text-transparent',
              )}
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={to === 'cancelled'}
            onClick={() => setTo('cancelled')}
            className={optionClass(to === 'cancelled', 'red')}
          >
            <span aria-hidden className={optionTile('red')}>
              <Ban className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-zinc-900">Annuler la commande</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Stock réservé libéré. Le client devra recommander.
              </span>
            </span>
            <span
              aria-hidden
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full border-2 transition',
                to === 'cancelled'
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-zinc-300 bg-white text-transparent',
              )}
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          </button>
        </div>
        {!to && (
          <p className="text-center text-xs text-zinc-400">
            Sélectionnez une action pour activer la confirmation.
          </p>
        )}
      </div>
    </Modal>
  );
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
  const [statusOrder, setStatusOrder] = useState<AdminOrderRow | null>(null);

  const statusFilter = (columnFilters.find((f) => f.id === 'payment_status')?.value as string) ?? '';
  const eventFilter = (columnFilters.find((f) => f.id === 'event')?.value as string) ?? '';
  const dateFilter = (columnFilters.find((f) => f.id === 'created_at')?.value as DateRangeValue) ?? EMPTY_RANGE;

  /** Événements présents dans les commandes (id + titre), triés par titre. */
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
            <span className="block max-w-80 truncate text-xs" title={clientLabel(row)}>
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
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue) return true;
          return row.original.event_id === filterValue;
        },
        cell: (info) => (
          <span className="block max-w-72 truncate text-xs" title={info.getValue()}>
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
        cell: (info) => {
          const row = info.row.original;
          const editable =
            row.payment_status === 'pending' || row.payment_status === 'processing';
          if (!editable) return <OrderStatusBadge status={info.getValue()} />;
          return (
            <button
              type="button"
              onClick={() => setStatusOrder(row)}
              title="Changer le statut"
              aria-label={`Changer le statut de la commande ${row.order_number}`}
              className="group inline-flex items-center gap-1.5 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <OrderStatusBadge status={info.getValue()} />
              <span
                aria-hidden
                className="grid size-5 place-items-center rounded-full border border-zinc-300 bg-white text-zinc-400 shadow-sm transition group-hover:-translate-y-px group-hover:border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white group-hover:shadow group-focus-visible:border-zinc-900 group-focus-visible:bg-zinc-900 group-focus-visible:text-white"
              >
                <Pencil className="size-3" />
              </span>
            </button>
          );
        },
      }),
      columnHelper.accessor('created_at', {
        header: 'Date',
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
        header: 'Détail',
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Link
              to={`/admin/orders/${row.id}`}
              title="Voir le détail de la commande"
              aria-label={`Voir la commande ${row.order_number}`}
              className="group inline-grid size-9 place-items-center rounded-full border border-zinc-300 bg-white text-zinc-500 shadow-sm transition hover:-translate-y-px hover:border-zinc-900 hover:bg-zinc-900 hover:text-white hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <Eye className="size-4 transition group-hover:scale-110" aria-hidden />
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
        <label className="relative w-full flex-1 sm:min-w-52 sm:max-w-xs">
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
          onChange={(v) => setFilterValue('payment_status', v)}
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
        <table className="w-full min-w-[960px] text-left text-sm">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

      {statusOrder && (
        <OrderStatusDialog order={statusOrder} onClose={() => setStatusOrder(null)} />
      )}
    </div>
  );
}
