import { useMemo, useState } from 'react';
import { BadgeCheck, ScanLine, Ticket as TicketIcon, XCircle } from 'lucide-react';
import {
  useAdminTickets,
  useCancelTicket,
  type AdminTicketRow,
} from '../../features/admin/hooks';
import { TicketsTable } from '../../features/admin/components/TicketsTable';
import { StatsCard } from '../../components/admin/StatsCard';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';

export function AdminTicketsPage() {
  const { data, isPending, isError, refetch } = useAdminTickets();
  const cancelTicket = useCancelTicket();

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
      ) : !data || data.length === 0 ? (
        <EmptyState title="Aucun billet trouvé." />
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

          <TicketsTable
            data={data}
            cancelling={cancelTicket.isPending}
            onCancel={(row) => setToCancel(row)}
          />
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
