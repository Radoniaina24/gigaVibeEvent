import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type ExpandedState,
  type SortingState,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  ExternalLink,
  Pencil,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import type { ModerationDecision, PendingEventRow } from '../hooks';
import { EventStatusBadge } from '../../../components/admin/StatusBadges';
import { MiniSelect } from '../../../components/ui/MiniSelect';
import { Button } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/Fields';
import { cn, formatDate } from '../../../lib/utils';

const columnHelper = createColumnHelper<PendingEventRow>();

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending_review', label: 'En attente' },
  { value: 'changes_requested', label: 'Modifs demandées' },
  { value: 'suspended', label: 'Suspendus' },
  { value: 'published', label: 'Publiés' },
] as const;

const PAGE_SIZES = [8, 15, 25, 50] as const;

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp className="size-3.5" aria-hidden />;
  if (sorted === 'desc') return <ArrowDown className="size-3.5" aria-hidden />;
  return <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />;
}

interface ValidationsTableProps {
  data: PendingEventRow[];
  actingId: string | null;
  noteFor: string | null;
  note: string;
  onNoteChange: (value: string) => void;
  onNoteOpen: (id: string) => void;
  onNoteClose: () => void;
  onDecide: (id: string, decision: ModerationDecision, note?: string) => void;
  /** Remonte les lignes visibles après filtres (pour synchroniser les KPI). */
  onFilteredChange?: (rows: PendingEventRow[]) => void;
}

/**
 * File de modération propulsée par TanStack Table :
 * recherche, filtre statut, tri, pagination pro. Les actions de modération
 * (approuver / modifs / refuser / republier / suspendre) restent
 * contextuelles au statut, avec éditeur de note intégré (ligne dépliée).
 */
export function ValidationsTable({
  data,
  actingId,
  noteFor,
  note,
  onNoteChange,
  onNoteOpen,
  onNoteClose,
  onDecide,
  onFilteredChange,
}: ValidationsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'starts_at', desc: false }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });

  const statusFilter = (columnFilters.find((f) => f.id === 'status')?.value as string) ?? '';

  // La note ouverte déplie sa ligne ; la refermer replie.
  const expanded: ExpandedState = useMemo(
    () => (noteFor ? { [noteFor]: true } : {}),
    [noteFor],
  );

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [globalFilter, columnFilters]);

  const picto =
    'group inline-grid size-9 place-items-center rounded-full border border-zinc-300 bg-white text-zinc-500 shadow-sm transition hover:-translate-y-px hover:border-zinc-900 hover:bg-zinc-900 hover:text-white hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600';

  const columns = useMemo(
    () => [
      columnHelper.accessor('title', {
        header: 'Événement',
        cell: (info) => {
          const row = info.row.original;
          return (
            <span className="min-w-0">
              <span className="block truncate font-semibold" title={row.title}>
                {info.getValue()}
              </span>
              <span
                className="block max-w-72 truncate text-xs text-zinc-500"
                title={`${row.partner?.name ?? 'Giga Vibe Event'} · ${row.venue}, ${row.city}`}
              >
                {row.partner?.name ?? 'Giga Vibe Event'} · {row.venue}, {row.city}
              </span>
            </span>
          );
        },
      }),
      columnHelper.accessor('starts_at', {
        header: 'Date',
        cell: (info) => (
          <span className="whitespace-nowrap text-xs tabular-nums">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor('tickets_sold', {
        header: 'Vendus',
        cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
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
        header: 'Modération',
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          const busy = actingId === row.id;
          return (
            <span className="flex flex-wrap items-center gap-1.5">
              <Link
                to={`/events/${row.slug}`}
                title="Voir la page publique"
                aria-label={`Voir la page publique de ${row.title}`}
                className={picto}
              >
                <ExternalLink className="size-4 transition group-hover:scale-110" aria-hidden />
              </Link>
              <Link
                to={`/admin/events/${row.id}/edit`}
                title="Modifier"
                aria-label={`Modifier ${row.title}`}
                className={picto}
              >
                <Pencil className="size-4 transition group-hover:scale-110" aria-hidden />
              </Link>
              {row.status === 'pending_review' && (
                <>
                  <Button size="sm" loading={busy} onClick={() => onDecide(row.id, 'approve')}>
                    <Check className="size-4" aria-hidden /> Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => (noteFor === row.id ? onNoteClose() : onNoteOpen(row.id))}
                  >
                    <Pencil className="size-4" aria-hidden /> Modifs
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busy}
                    onClick={() => onDecide(row.id, 'refuse')}
                  >
                    <X className="size-4" aria-hidden /> Refuser
                  </Button>
                </>
              )}
              {row.status === 'suspended' && (
                <Button size="sm" variant="secondary" loading={busy} onClick={() => onDecide(row.id, 'reactivate')}>
                  <RotateCcw className="size-4" aria-hidden /> Republier
                </Button>
              )}
              {row.status === 'published' && (
                <Button size="sm" variant="secondary" loading={busy} onClick={() => onDecide(row.id, 'suspend')}>
                  <Ban className="size-4" aria-hidden /> Suspendre
                </Button>
              )}
            </span>
          );
        },
      }),
    ],
    [actingId, noteFor, onDecide, onNoteClose, onNoteOpen, picto],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination, expanded },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.id,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).trim().toLowerCase();
      if (!q) return true;
      const r = row.original;
      return `${r.title} ${r.venue} ${r.city} ${r.partner?.name ?? ''}`
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
          <span className="sr-only">Rechercher un événement</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Titre, lieu, partenaire…"
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
          className="h-9 w-full justify-between sm:w-auto sm:min-w-44"
        />
        <p aria-live="polite" className="text-xs tabular-nums text-zinc-500">
          {filteredCount} résultat{filteredCount > 1 ? 's' : ''}
        </p>
      </div>

      {/* Tableau */}
      <div className="max-w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[880px] text-left text-sm">
          <caption className="sr-only">File de modération des événements</caption>
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
              <Fragment key={row.id}>
                <tr className="transition hover:bg-zinc-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr key={`${row.id}-note`}>
                    <td colSpan={columns.length} className="bg-zinc-50/70 px-4 py-3">
                      <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
                        <Textarea
                          label="Message au partenaire"
                          rows={2}
                          placeholder="Ex. : ajoutez l’heure de fin et une affiche en meilleure résolution…"
                          value={note}
                          onChange={(ev) => onNoteChange(ev.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={actingId === row.original.id}
                            disabled={!note.trim()}
                            onClick={() => onDecide(row.original.id, 'request_changes', note.trim())}
                          >
                            Envoyer la demande
                          </Button>
                          <Button size="sm" variant="ghost" onClick={onNoteClose}>
                            Annuler
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
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
          <nav aria-label="Pagination des validations" className="flex items-center gap-1">
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
