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
  UserCheck,
  UserX,
} from 'lucide-react';
import type { AdminUserRow } from '../hooks';
import type { UserRole } from '../../../types/database';
import { Badge } from '../../../components/ui/Card';
import { MiniSelect } from '../../../components/ui/MiniSelect';
import { formatDate } from '../../../lib/utils';
import { cn } from '../../../lib/utils';

const columnHelper = createColumnHelper<AdminUserRow>();

const ROLE_OPTIONS = [
  { value: 'user', label: 'Client' },
  { value: 'partner', label: 'Partenaire' },
  { value: 'controller', label: 'Contrôleur' },
  { value: 'admin', label: 'Admin' },
] as const;

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Tous les rôles' },
  ...ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.label })),
] as const;

interface UsersTableProps {
  data: AdminUserRow[];
  updating: boolean;
  onRoleChange: (user: AdminUserRow, role: UserRole) => void;
  onToggleActive: (user: AdminUserRow) => void;
}

const PAGE_SIZES = [8, 15, 25, 50] as const;

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp className="size-3.5" aria-hidden />;
  if (sorted === 'desc') return <ArrowDown className="size-3.5" aria-hidden />;
  return <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />;
}

/**
 * Tableau utilisateurs propulsé par TanStack Table :
 * recherche, filtre rôle (shadcn), tri, pagination (shadcn).
 * Le changement de rôle / statut passe par une confirmation (page parente).
 */
export function UsersTable({ data, updating, onRoleChange, onToggleActive }: UsersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });

  const roleFilter = (columnFilters.find((f) => f.id === 'role')?.value as string) ?? '';

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [globalFilter, columnFilters]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('email', {
        header: 'Utilisateur',
        cell: (info) => {
          const row = info.row.original;
          const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ') || '—';
          return (
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-xs font-bold text-white"
              >
                {(fullName !== '—' ? fullName : row.email).charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-zinc-900">{fullName}</span>
                <span className="block truncate text-xs text-zinc-500">{row.email}</span>
              </span>
            </span>
          );
        },
      }),
      columnHelper.accessor('role', {
        header: 'Rôle',
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue) return true;
          return row.original.role === filterValue;
        },
        cell: (info) => {
          const row = info.row.original;
          return (
            <MiniSelect
              ariaLabel={`Rôle de ${row.email}`}
              value={row.role}
              onChange={(v) => {
                if (v !== row.role) onRoleChange(row, v as UserRole);
              }}
              options={ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
              disabled={updating}
              className="min-w-36 justify-between"
            />
          );
        },
      }),
      columnHelper.accessor('is_active', {
        header: 'Statut',
        cell: (info) => (
          <Badge tone={info.getValue() ? 'success' : 'danger'}>
            {info.getValue() ? 'Actif' : 'Désactivé'}
          </Badge>
        ),
      }),
      columnHelper.accessor('orders_count', {
        header: 'Commandes',
        cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
      }),
      columnHelper.accessor('created_at', {
        header: 'Inscrit le',
        cell: (info) => (
          <span className="whitespace-nowrap text-xs">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          const ActiveIcon = row.is_active ? UserX : UserCheck;
          return (
            <span className="flex items-center gap-1">
              <Link
                to={`/admin/users/${row.id}`}
                title="Voir"
                aria-label={`Voir ${row.email}`}
                className="rounded-md p-2 transition hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <Eye className="size-4" aria-hidden />
              </Link>
              <button
                type="button"
                title={row.is_active ? 'Désactiver' : 'Réactiver'}
                aria-label={`${row.is_active ? 'Désactiver' : 'Réactiver'} ${row.email}`}
                disabled={updating}
                onClick={() => onToggleActive(row)}
                className="rounded-md p-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:bg-zinc-100"
              >
                <ActiveIcon className="size-4" aria-hidden />
              </button>
            </span>
          );
        },
      }),
    ],
    [onRoleChange, onToggleActive, updating],
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
      return `${r.email} ${r.first_name ?? ''} ${r.last_name ?? ''}`
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
          <span className="sr-only">Rechercher un utilisateur</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Email, nom…"
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
          ariaLabel="Filtrer par rôle"
          value={roleFilter}
          onChange={(v) =>
            setColumnFilters((prev) => [
              ...prev.filter((f) => f.id !== 'role'),
              ...(v ? [{ id: 'role', value: v }] : []),
            ])
          }
          options={ROLE_FILTER_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
          className="h-9 min-w-44 justify-between"
        />
        <p aria-live="polite" className="text-xs tabular-nums text-zinc-500">
          {filteredCount} résultat{filteredCount > 1 ? 's' : ''}
        </p>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-200 text-left text-sm">
          <caption className="sr-only">Liste des utilisateurs</caption>
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
                  <p className="font-semibold text-zinc-700">Aucun utilisateur trouvé.</p>
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
