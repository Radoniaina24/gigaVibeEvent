import { useMemo, useState } from 'react';
import {
  useAdminTickets,
  useCancelTicket,
  type AdminTicketRow,
} from '../../features/admin/hooks';
import { DataTable } from '../../components/admin/DataTable';
import { Pagination } from '../../components/admin/Pagination';
import { TicketStatusBadge } from '../../components/admin/StatusBadges';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Fields';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';
import { formatDateTime } from '../../lib/utils';

const PAGE_SIZE = 15;
const STATUSES = ['', 'valid', 'used', 'cancelled', 'expired'];

export function AdminTicketsPage() {
  const { data, isPending, isError, refetch } = useAdminTickets();
  const cancelTicket = useCancelTicket();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [toCancel, setToCancel] = useState<AdminTicketRow | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((t) => {
      if (status && t.status !== status) return false;
      if (
        q &&
        !`${t.ticket_number} ${t.holder_name} ${t.event?.title ?? ''} ${t.order?.order_number ?? ''}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [data, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Billets vendus</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Recherche"
          type="search"
          placeholder="N° billet, participant, événement…"
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
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      {isPending ? (
        <LoadingState label="Chargement des billets…" />
      ) : isError ? (
        <ErrorState description="Impossible de charger les billets." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Aucun billet trouvé." />
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
                  <span className="font-mono text-xs font-semibold">{t.ticket_number}</span>
                ),
              },
              {
                key: 'holder',
                header: 'Participant',
                render: (t) => <span className="text-xs">{t.holder_name}</span>,
              },
              {
                key: 'event',
                header: 'Événement',
                render: (t) => (
                  <span className="text-xs">
                    {t.event?.title ?? '—'} · {t.ticket_type?.name ?? ''}
                  </span>
                ),
              },
              {
                key: 'order',
                header: 'Commande',
                render: (t) => (
                  <span className="font-mono text-xs">{t.order?.order_number ?? '—'}</span>
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
                  <span className="whitespace-nowrap text-xs">{formatDateTime(t.created_at)}</span>
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
          <p className="text-center text-xs text-zinc-500">
            La vérification par scan arrivera en Phase 6 (/admin/tickets/verify).
          </p>
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
