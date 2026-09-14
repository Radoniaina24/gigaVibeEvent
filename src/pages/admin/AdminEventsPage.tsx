import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  useAdminEvents,
  useDeleteEvent,
  useDuplicateEvent,
  type AdminEventRow,
} from '../../features/admin/hooks';
import { EventsTable } from '../../features/admin/components/EventsTable';
import { EventsTableSkeleton } from '../../components/admin/AdminSkeletons';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toaster';
import {
  EmptyState,
  ErrorState,
} from '../../components/ui/States';

export function AdminEventsPage() {
  const { data, isPending, isError, refetch } = useAdminEvents();
  const { toast } = useToast();
  const deleteEvent = useDeleteEvent();
  const duplicateEvent = useDuplicateEvent();

  const [toDelete, setToDelete] = useState<AdminEventRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!toDelete) return;
    setActionError(null);
    try {
      await deleteEvent.mutateAsync(toDelete);
      toast.deleted('Événement', `« ${toDelete.title} » a été supprimé.`);
      setToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Suppression impossible.';
      setActionError(message);
      toast.error('Suppression impossible', message);
    }
  };

  const handleDuplicate = async (id: string) => {
    setActionError(null);
    try {
      await duplicateEvent.mutateAsync(id);
      toast.created('Brouillon', 'Événement dupliqué en brouillon.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Duplication impossible.';
      setActionError(message);
      toast.error('Duplication impossible', message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            Événements
            {data && data.length > 0 && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-600">
                {data.length}
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Catalogue, stocks, statuts et actions rapides.
          </p>
        </div>
        <Link to="/admin/events/new">
          <Button size="sm">
            <Plus className="size-4" aria-hidden /> Nouvel événement
          </Button>
        </Link>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {isPending ? (
        <EventsTableSkeleton />
      ) : isError ? (
        <ErrorState description="Impossible de charger les événements." onRetry={() => refetch()} />
      ) : !data?.length ? (
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
        <EventsTable
          data={data}
          actionPending={deleteEvent.isPending || duplicateEvent.isPending}
          onDuplicate={handleDuplicate}
          onDelete={setToDelete}
        />
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
