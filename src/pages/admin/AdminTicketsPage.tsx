import { useMemo, useState } from 'react';
import { BadgeCheck, ScanLine, Search, Ticket as TicketIcon, XCircle } from 'lucide-react';
import {
  useAdminTickets,
  useCancelTicket,
  type AdminTicketRow,
} from '../../features/admin/hooks';
import { DataTable } from '../../components/admin/DataTable';
import { Pagination } from '../../components/admin/Pagination';
import { StatsCard } from '../../components/admin/StatsCard';
import { TicketStatusBadge } from '../../components/admin/StatusBadges';
import { MiniSelect } from '../../components/ui/MiniSelect';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';
import { formatDateTime } from '../../lib/utils';

const PAGE_SIZE = 15;

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'valid', label: 'Valide' },
  { value: 'used', label: 'Utilisé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'expired', label: 'Expiré' },
] as const;

function holderInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][parts[1].length - 1]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function AdminTicketsPage() {
  const { data, isPending, isError, refetch } = useAdminTickets();
  const cancelTicket = useCancelTicket();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [eventId, setEventId] = useState('');
  const [page, setPage] = useState(1);
  const [toCancel, setToCancel] = useState<AdminTicketRow | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      valid: list.filter((t) => t.status === 'valid').length,
      used: list.filter((t) => t.status === 'used').length,
      cancelled: list.filter((t) => t.status === 'cancelled' || t.status === 'expired').length,
    };
  }, [data]);

  const eventOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const t of data ?? []) {
      if (t.event_id && !byId.has(t.event_id)) {
        byId.set(t.event_id, t.event?.title ?? 'Événement');
      }
    }
    return [...byId.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((t) => {
      if (status && t.status !== status) return false;
      if (eventId && t.event_id !== eventId) return false;
      if (
        q &&
        !`${t.ticket_number} ${t.holder_name} ${t.event?.title ?? ''} ${t.ticket_type?.name ?? ''} ${t.order?.order_number ?? ''}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [data, search, status, eventId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setEventId('');
    setPage(1);
  };

  const handleCancel = async () => {
    if (!toCancel) return;
    setServerError(null);
    try {
      await cancelTicket.mutateAsync(toCancel);
      setToCancel(null);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Annulation impossible.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          Billets vendus
          {data && data.length > 0 && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-600">
              {data.length}
            </span>
          )}
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Tous les billets émis : participant, événement et contrôle.
        </p>
      </div>

      {isPending ? (
        <LoadingState label="Chargement des billets…" />
      ) : isError ? (
        <ErrorState description="Impossible de charger les billets." onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatsCard label="Total émis" value={String(stats.total)} hint="tous statuts" icon={TicketIcon} tone="brand" />
            <StatsCard label="Valides" value={String(stats.valid)} hint="entrée autorisée" icon={BadgeCheck} tone="success" />
            <StatsCard label="Utilisés" value={String(stats.used)} hint="entrées validées" icon={ScanLine} tone="info" />
            <StatsCard label="Annulés" value={String(stats.cancelled)} hint="annulés + expirés" icon={XCircle} tone="neutral" />
          </div>

          {serverError && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative w-full flex-1 sm:min-w-52 sm:max-w-xs">
              <span className="sr-only">Rechercher un billet</span>
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="N° billet, participant, événement…"
                type="search"
                className="h-9 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-8 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Effacer la recherche"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                >
                  ×
                </button>
              )}
            </label>
            <MiniSelect
              ariaLabel="Filtrer par statut"
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
              className="h-9 w-full justify-between sm:w-auto sm:min-w-44"
            />
            <MiniSelect
              ariaLabel="Filtrer par événement"
              value={eventId}
              onChange={(v) => {
                setEventId(v);
                setPage(1);
              }}
              options={[
                { value: '', label: 'Tous les événements' },
                ...eventOptions.map((e) => ({ value: e.id, label: e.title })),
              ]}
              className="h-9 w-full justify-between sm:w-auto sm:min-w-72 sm:max-w-96 [&>span]:min-w-0 [&>span]:truncate"
            />
            <p aria-live="polite" className="text-xs tabular-nums text-zinc-500">
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
            </p>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="Aucun billet trouvé."
              description="Essaie un autre mot-clé ou réinitialise les filtres."
              action={
                <Button size="sm" variant="secondary" onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              }
            />
          ) : (
            <>
              <DataTable
                caption="Billets vendus"
                keyOf={(t) => t.id}
                rows={rows}
                columns={[
                  {
                    key: 'number',
                    header: 'Billet',
                    render: (t) => (
                      <span>
                        <span className="block font-mono text-xs font-semibold">{t.ticket_number}</span>
                        <span className="block font-mono text-[11px] text-zinc-400">
                          {t.order?.order_number ?? '—'}
                        </span>
                      </span>
                    ),
                  },
                  {
                    key: 'holder',
                    header: 'Participant',
                    render: (t) => (
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          aria-hidden
                          className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-[11px] font-bold text-white"
                        >
                          {holderInitials(t.holder_name || '?')}
                        </span>
                        <span className="block max-w-48 truncate text-xs font-medium" title={t.holder_name}>
                          {t.holder_name}
                        </span>
                      </span>
                    ),
                  },
                  {
                    key: 'event',
                    header: 'Événement',
                    render: (t) => (
                      <span>
                        <span className="block max-w-56 truncate text-xs font-medium" title={t.event?.title ?? '—'}>
                          {t.event?.title ?? '—'}
                        </span>
                        <span className="mt-0.5 inline-block rounded-full bg-zinc-100 px-2 py-px text-[11px] font-medium text-zinc-600">
                          {t.ticket_type?.name ?? 'Billet'}
                        </span>
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Statut',
                    render: (t) => <TicketStatusBadge status={t.status} />,
                  },
                  {
                    key: 'date',
                    header: 'Créé le',
                    render: (t) => (
                      <span className="whitespace-nowrap text-xs tabular-nums">{formatDateTime(t.created_at)}</span>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Contrôle',
                    render: (t) =>
                      t.status === 'valid' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={cancelTicket.isPending}
                          onClick={() => setToCancel(t)}
                        >
                          Annuler
                        </Button>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      ),
                  },
                ]}
              />
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onChange={setPage}
                label="Pagination des billets"
              />
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={toCancel !== null}
        title="Annuler ce billet ?"
        description={
          toCancel
            ? `Le billet ${toCancel.ticket_number} (${toCancel.holder_name}) ne sera plus valable. Action auditée.`
            : undefined
        }
        confirmLabel="Annuler le billet"
        danger
        loading={cancelTicket.isPending}
        onConfirm={handleCancel}
        onClose={() => {
          setToCancel(null);
          setServerError(null);
        }}
      />
    </div>
  );
}
