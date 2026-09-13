import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useAdminEvents,
  useDeleteEvent,
  useDuplicateEvent,
  type AdminEventRow,
} from '../../features/admin/hooks';
import { DataTable } from '../../components/admin/DataTable';
import { Pagination } from '../../components/admin/Pagination';
import { EventStatusBadge } from '../../components/admin/StatusBadges';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Fields';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';
import { formatDate } from '../../lib/utils';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = ['', 'draft', 'published', 'sold_out', 'cancelled', 'completed'];

function stockOf(e: AdminEventRow): { sold: number; total: number } {
  return {
    sold: e.ticket_types.reduce((s, t) => s + t.sold, 0),
    total: e.ticket_types.reduce((s, t) => s + t.quantity, 0),
  };
}

export function AdminEventsPage() {
  const { data, isPending, isError, refetch } = useAdminEvents();
  const deleteEvent = useDeleteEvent();
  const duplicateEvent = useDuplicateEvent();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<AdminEventRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((e) => {
      if (status && e.status !== status) return false;
      if (q && !`${e.title} ${e.venue} ${e.city}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleDelete = async () => {
    if (!toDelete) return;
    setActionError(null);
    try {
      await deleteEvent.mutateAsync(toDelete);
      setToDelete(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Suppression impossible.',
      );
    }
  };

  const handleDuplicate = async (id: string) => {
    setActionError(null);
    try {
      await duplicateEvent.mutateAsync(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Duplication impossible.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Événements</h1>
        <Link to="/admin/events/new">
          <Button size="sm">
            <Plus className="size-4" aria-hidden /> Nouvel événement
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Recherche"
          type="search"
          placeholder="Titre, lieu, ville…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          label="Statut"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tous</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {isPending ? (
        <LoadingState label="Chargement des événements…" />
      ) : isError ? (
        <ErrorState description="Impossible de charger les événements." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucun événement."
          description="Créez votre premier événement pour commencer à vendre."
          action={
            <Link to="/admin/events/new">
              <Button size="sm">Créer un événement</Button>
            </Link>
          }
        />
      ) : (
        <>
          <DataTable
            caption="Liste des événements"
            keyOf={(e) => e.id}
            rows={rows}
            columns={[
              {
                key: 'title',
                header: 'Événement',
                render: (e) => (
                  <div>
                    <p className="font-semibold">{e.title}</p>
                    <p className="text-xs text-zinc-500">
                      {e.category?.name ?? '—'} · {e.venue}, {e.city}
                    </p>
                  </div>
                ),
              },
              {
                key: 'date',
                header: 'Date',
                render: (e) => <span className="whitespace-nowrap">{formatDate(e.starts_at)}</span>,
              },
              {
                key: 'stock',
                header: 'Vendues',
                render: (e) => {
                  const s = stockOf(e);
                  return (
                    <span className="tabular-nums">
                      {s.sold}/{s.total}
                    </span>
                  );
                },
              },
              {
                key: 'status',
                header: 'Statut',
                render: (e) => <EventStatusBadge status={e.status} />,
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (e) => (
                  <span className="flex gap-1">
                    <Link
                      to={`/events/${e.slug}`}
                      title="Voir la page publique"
                      className="rounded-md p-2 hover:bg-zinc-100"
                    >
                      <ExternalLink className="size-4" aria-hidden />
                    </Link>
                    <Link
                      to={`/admin/events/${e.id}/edit`}
                      title="Modifier"
                      className="rounded-md p-2 hover:bg-zinc-100"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Link>
                    <button
                      type="button"
                      title="Dupliquer"
                      onClick={() => handleDuplicate(e.id)}
                      className="rounded-md p-2 hover:bg-zinc-100"
                    >
                      <Copy className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      title="Supprimer"
                      onClick={() => setToDelete(e)}
                      className="rounded-md p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </span>
                ),
              },
            ]}
          />
          <Pagination
            page={safePage}
            totalPages={totalPages}
            onChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0 });
            }}
            label="Pagination des événements"
          />
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cet événement ?"
        description={
          toDelete
            ? `"${toDelete.title}" sera définitivement supprimé. Impossible si des commandes existent.`
            : undefined
        }
        confirmLabel="Supprimer"
        danger
        loading={deleteEvent.isPending}
        onConfirm={handleDelete}
        onClose={() => {
          setToDelete(null);
          setActionError(null);
        }}
      />
    </div>
  );
}
