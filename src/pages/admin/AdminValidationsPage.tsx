import { useMemo, useState } from 'react';
import { BadgeCheck, Ban, Clock3, Pencil } from 'lucide-react';
import {
  useModerateEvent,
  useModerationQueue,
  type ModerationDecision,
  type PendingEventRow,
} from '../../features/admin/hooks';
import { ValidationsTable } from '../../features/admin/components/ValidationsTable';
import { KpiCard } from '../../components/admin/StatsCard';
import { ValidationsPageSkeleton } from '../../components/admin/AdminSkeletons';
import { EmptyState, ErrorState } from '../../components/ui/States';

export function AdminValidationsPage() {
  const { data, isPending, isError, refetch } = useModerationQueue();
  const moderate = useModerateEvent();
  const [serverError, setServerError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');
  /** Lignes visibles après filtres du tableau (KPI synchronisés). */
  const [visibleRows, setVisibleRows] = useState<PendingEventRow[] | null>(null);

  const kpiSource = visibleRows ?? data ?? [];
  const isFiltered = visibleRows !== null && visibleRows.length !== (data?.length ?? 0);
  const suffix = isFiltered ? ' (filtre)' : '';

  const groups = useMemo(() => {
    const list = kpiSource;
    return {
      pending: list.filter((e) => e.status === 'pending_review'),
      changes: list.filter((e) => e.status === 'changes_requested'),
      suspended: list.filter((e) => e.status === 'suspended'),
      published: list.filter((e) => e.status === 'published'),
    };
  }, [kpiSource]);

  const act = async (id: string, decision: ModerationDecision, noteText?: string) => {
    setServerError(null);
    setActingId(id);
    try {
      await moderate.mutateAsync({ id, decision, note: noteText || undefined });
      setNoteFor(null);
      setNote('');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Validations</h1>
        <p className="text-sm text-zinc-500">
          Approuvez, refusez ou suspendez les événements partenaires.
        </p>
      </div>

      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      {isPending ? (
        <ValidationsPageSkeleton />
      ) : isError ? (
        <ErrorState description="Impossible de charger la file de modération." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Aucun événement à modérer." />
      ) : (
        <>
          {/* KPI pro, responsive — synchronisés avec les filtres du tableau */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <KpiCard
              label={`En attente${suffix}`}
              value={String(groups.pending.length)}
              hint="à approuver ou refuser"
              icon={Clock3}
              tone="warning"
            />
            <KpiCard
              label={`Modifs demandées${suffix}`}
              value={String(groups.changes.length)}
              hint="retours envoyés aux partenaires"
              icon={Pencil}
              tone="info"
            />
            <KpiCard
              label={`Suspendus${suffix}`}
              value={String(groups.suspended.length)}
              hint="retirés de la vente"
              icon={Ban}
              tone="neutral"
            />
            <KpiCard
              label={`Publiés${suffix}`}
              value={String(groups.published.length)}
              hint="visibles sur le site"
              icon={BadgeCheck}
              tone="success"
            />
          </div>
          <ValidationsTable
            data={data}
            actingId={actingId}
            noteFor={noteFor}
            note={note}
            onNoteChange={setNote}
            onNoteOpen={(id) => {
              setNoteFor(id);
              setNote('');
            }}
            onNoteClose={() => {
              setNoteFor(null);
              setNote('');
            }}
            onDecide={act}
            onFilteredChange={setVisibleRows}
          />
        </>
      )}
    </div>
  );
}
