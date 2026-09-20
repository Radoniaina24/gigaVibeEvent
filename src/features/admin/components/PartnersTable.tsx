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
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import type { AdminPartnerRow } from '../hooks';
import { PartnerStatusBadge } from '../../../components/admin/StatusBadges';
import { MiniSelect } from '../../../components/ui/MiniSelect';
import { cn } from '../../../lib/utils';

const columnHelper = createColumnHelper<AdminPartnerRow>();

const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente' },
  { value: 'active', label: 'Actif' },
  { value: 'suspended', label: 'Suspendu' },
  { value: 'disabled', label: 'Désactivé' },
] as const;

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
] as const;

interface PartnersTableProps {
  data: AdminPartnerRow[];
  onEdit: (partner: AdminPartnerRow) => void;
  onDelete: (partner: AdminPartnerRow) => void;
}

const PAGE_SIZES = [8, 15, 25, 50] as const;

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp className="size-3.5" aria-hidden />;
  if (sorted === 'desc') return <ArrowDown className="size-3.5" aria-hidden />;
  return <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />;
}

/**
 * Tableau partenaires propulsé par TanStack Table :
 * recherche globale, filtre statut, tri, pagination.
 */
export function PartnersTable({ data, onEdit, onDelete }: PartnersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });

  const statusFilter = (columnFilters.find((f) => f.id === 'status')?.value as string) ?? '';

  // Revient à la 1ère page à chaque recherche / filtre.
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [globalFilter, columnFilters]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Partenaire',
        cell: (info) => {
          const row = info.row.original;
          return (
            <span className="flex min-w-0 items-center gap-3">
              {row.logo_url ? (
                <img
                  src={row.logo_url}
                  alt=""
                  className="size-9 shrink-0 rounded-lg border border-zinc-200 object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-500"
                >
                  {row.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-semibold text-zinc-900">{row.name}</span>
                <span className="block truncate text-xs text-zinc-500">
                  {row.manager_name ?? '—'}
                  {row.phone ? ` · ${row.phone}` : ''}
                </span>
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
        cell: (info) => <PartnerStatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor('events_count', {
        header: 'Événements',
        cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => row.members.length, {
        id: 'accounts',
        header: 'Comptes',
        cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          return (
            <span className="flex gap-1.5">
              <button
                type="button"
                title="Modifier"
                aria-label={`Modifier ${row.name}`}
                onClick={() => onEdit(row)}
                className="group inline-grid size-9 place-items-center rounded-full border border-zinc-300 bg-white text-zinc-500 shadow-sm transition hover:-translate-y-px hover:border-zinc-900 hover:bg-zinc-900 hover:text-white hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <Pencil className="size-4 transition group-hover:scale-110" aria-hidden />
              </button>
              <button
                type="button"
                title="Supprimer"
                aria-label={`Supprimer ${row.name}`}
                onClick={() => onDelete(row)}
                className="group inline-grid size-9 place-items-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition hover:-translate-y-px hover:border-red-600 hover:bg-red-600 hover:text-white hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                <Trash2 className="size-4 transition group-hover:scale-110" aria-hidden />
              </button>
            </span>
          );
        },
      }),
    ],
    [onEdit, onDelete],
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
      return [r.name, r.manager_name ?? '', r.phone ?? '', r.email ?? '']
        .join(' ')
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
          <span className="sr-only">Rechercher un partenaire</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Rechercher (nom, responsable, tél…)…"
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
          options={STATUS_FILTER_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
          className="h-9 w-full justify-between sm:w-auto sm:min-w-44"
        />
        <p aria-live="polite" className="text-xs tabular-nums text-zinc-500">
          {filteredCount} résultat{filteredCount > 1 ? 's' : ''}
        </p>
      </div>

      {/* Tableau */}
      <div className="max-w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Liste des partenaires</caption>
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
                  <p className="font-semibold text-zinc-700">Aucun partenaire trouvé.</p>
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
          <nav aria-label="Pagination des partenaires" className="flex items-center gap-1">
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
