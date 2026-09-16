import { useEffect, useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import type { Category } from '../../../types/database';
import { MiniSelect } from '../../../components/ui/MiniSelect';
import { cn } from '../../../lib/utils';

export type AdminCategoryRow = Category & { events_count: number };

const columnHelper = createColumnHelper<AdminCategoryRow>();

interface CategoriesTableProps {
  data: AdminCategoryRow[];
  onEdit: (category: AdminCategoryRow) => void;
  onDelete: (category: AdminCategoryRow) => void;
}

const PAGE_SIZES = [5, 8, 15, 25] as const;

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp className="size-3.5" aria-hidden />;
  if (sorted === 'desc') return <ArrowDown className="size-3.5" aria-hidden />;
  return <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />;
}

/**
 * Tableau catégories propulsé par TanStack Table :
 * recherche globale, tri, pagination.
 */
export function CategoriesTable({ data, onEdit, onDelete }: CategoriesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });

  // Revient à la 1ère page à chaque recherche.
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [globalFilter]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Nom',
        cell: (info) => {
          const row = info.row.original;
          return (
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-sm font-bold text-white"
              >
                {row.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-zinc-900">{row.name}</span>
                {row.description ? (
                  <span className="block max-w-64 truncate text-xs text-zinc-500">
                    {row.description}
                  </span>
                ) : null}
              </span>
            </span>
          );
        },
      }),
      columnHelper.accessor('slug', {
        header: 'Slug',
        cell: (info) => (
          <span className="font-mono text-xs text-zinc-600">/categories/{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('events_count', {
        header: 'Événements',
        cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          return (
            <span className="flex gap-1">
              <button
                type="button"
                title="Modifier"
                aria-label={`Modifier ${row.name}`}
                onClick={() => onEdit(row)}
                className="rounded-md p-2 transition hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <Pencil className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                title="Supprimer"
                aria-label={`Supprimer ${row.name}`}
                onClick={() => onDelete(row)}
                className="rounded-md p-2 text-red-600 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                <Trash2 className="size-4" aria-hidden />
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
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).trim().toLowerCase();
      if (!q) return true;
      const r = row.original;
      return [r.name, r.slug, r.description ?? '', r.icon ?? '']
        .join(' ')
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
          <span className="sr-only">Rechercher une catégorie</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Rechercher (nom, slug…)…"
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
        <p aria-live="polite" className="text-xs tabular-nums text-zinc-500">
          {filteredCount} résultat{filteredCount > 1 ? 's' : ''}
          {globalFilter.trim() && ` pour « ${globalFilter.trim()} »`}
        </p>
      </div>

      {/* Tableau */}
      <div className="max-w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Liste des catégories</caption>
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
                          title={header.column.getNextSortingOrder() === 'desc' ? 'Trier décroissant' : 'Trier croissant'}
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
                  <p className="font-semibold text-zinc-700">Aucun résultat.</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Essaie un autre mot-clé ou{' '}
                    <button
                      type="button"
                      onClick={() => setGlobalFilter('')}
                      className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
                    >
                      réinitialise la recherche
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
            onChange={(v) =>
              setPagination((p) => ({ ...p, pageSize: Number(v), pageIndex: 0 }))
            }
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
