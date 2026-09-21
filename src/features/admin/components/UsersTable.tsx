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
        header: 'Rôles',
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue) return true;
          const roles = row.original.roles ?? [row.original.role];
          return roles.includes(filterValue as UserRole);
        },
        cell: (info) => {
          const row = info.row.original;
          const roles = row.roles ?? [row.role];
          return (
            <span className="flex flex-wrap items-center gap-1.5">
              <MiniSelect
                ariaLabel={`Rôle principal de ${row.email}`}
                value={row.role}
                onChange={(v) => {
                  if (v !== row.role) onRoleChange(row, v as UserRole);
                }}
                options={ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
                disabled={updating}
                className="min-w-36 justify-between"
              />
              {roles.length > 1 && (
                <span
                  title={roles.join(', ')}
                  className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700"
                >
                  +{roles.length - 1}
                </span>
              )}
            </span>
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
          const toggleClass = row.is_active
            ? 'border-red-200 text-red-600 hover:border-red-600 hover:bg-red-600 hover:text-white focus-visible:outline-red-600'
            : 'border-emerald-200 text-emerald-600 hover:border-emerald-600 hover:bg-emerald-600 hover:text-white focus-visible:outline-emerald-600';
          return (
            <span className="flex items-center gap-1.5">
              <Link
                to={`/admin/users/${row.id}`}
                title="Voir"
                aria-label={`Voir ${row.email}`}
                className="group inline-grid size-9 place-items-center rounded-full border border-zinc-300 bg-white text-zinc-500 shadow-sm transition hover:-translate-y-px hover:border-zinc-900 hover:bg-zinc-900 hover:text-white hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <Eye className="size-4 transition group-hover:scale-110" aria-hidden />
              </Link>
              <button
                type="button"
                title={row.is_active ? 'Désactiver' : 'Réactiver'}
                aria-label={`${row.is_active ? 'Désactiver' : 'Réactiver'} ${row.email}`}
                disabled={updating}
                onClick={() => onToggleActive(row)}
                className={`group inline-grid size-9 place-items-center rounded-full border bg-white shadow-sm transition hover:-translate-y-px hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${toggleClass}`}
              >
                <ActiveIcon className="size-4 transition group-hover:scale-110" aria-hidden />
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
          className="h-9 w-full justify-between sm:w-auto sm:min-w-44"
        />
        <p aria-live="polite" className="text-xs tabular-nums text-zinc-500">
          {filteredCount} résultat{filteredCount > 1 ? 's' : ''}
        </p>
      </div>

      {/* Tableau */}
      <div className="max-w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
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
          <nav aria-label="Pagination des utilisateurs" className="flex items-center gap-1">
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
