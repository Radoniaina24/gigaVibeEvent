import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  useMyPartner,
  usePartnerEvents,
  useSubmitEventForReview,
} from '../../features/partner/hooks';
import { EventsTable } from '../../features/admin/components/EventsTable';
import { EventsTableSkeleton } from '../../components/admin/AdminSkeletons';
import { PartnerStatusBanner } from '../../components/layout/PartnerLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toaster';
import { EmptyState, ErrorState } from '../../components/ui/States';

export function PartnerEventsPage() {
  const partner = useMyPartner();
  const { toast } = useToast();
  const { data, isPending, isError, refetch } = usePartnerEvents();
  const submit = useSubmitEventForReview();
  const [actionError, setActionError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const handleSubmit = async (id: string) => {
    setActionError(null);
    setSubmittingId(id);
    try {
      await submit.mutateAsync(id);
      toast.success('Soumis pour validation', 'Giga Vibe Event va examiner votre événement.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Soumission impossible.';
      setActionError(message);
      toast.error('Soumission impossible', message);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            Mes événements
            {data && data.length > 0 && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-600">
                {data.length}
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Brouillons, validations en cours, motifs de rejet, événements publiés et ventes.
            La publication reste effectuée par Giga Vibe Event après validation.
          </p>
        </div>
        <Link to="/partner/events/new">
          <Button size="sm">
            <Plus className="size-4" aria-hidden /> Nouvel événement
          </Button>
        </Link>
      </div>

      {partner.data && <PartnerStatusBanner status={partner.data.status} />}

      {actionError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {isPending ? (
        <EventsTableSkeleton />
      ) : isError ? (
        <ErrorState description="Impossible de charger vos événements." onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState
          title="Aucun événement."
          description="Créez votre premier événement, ajoutez vos catégories et soumettez-le pour validation."
          action={
            <Link to="/partner/events/new">
              <Button size="sm">Nouvel événement</Button>
            </Link>
          }
        />
      ) : (
        <EventsTable
          data={data}
          editBasePath="/partner/events"
          actionPending={submit.isPending}
          onSubmit={handleSubmit}
          submittingId={submittingId}
        />
      )}
    </div>
  );
}
