import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Check, ExternalLink, Pencil, RotateCcw, X } from 'lucide-react';
import {
  useModerateEvent,
  useModerationQueue,
  type ModerationDecision,
  type PendingEventRow,
} from '../../features/admin/hooks';
import { EventStatusBadge } from '../../components/admin/StatusBadges';
import { AdminRowsSkeleton } from '../../components/admin/AdminSkeletons';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Fields';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';

function EventLine({ e }: { e: PendingEventRow }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate font-semibold">{e.title}</p>
      <p className="mt-0.5 truncate text-xs text-zinc-500">
        {e.partner?.name ?? 'Giga Vibe Event'} · {e.venue}, {e.city} · {formatDate(e.starts_at)} ·{' '}
        <span className="tabular-nums">{e.tickets_sold} vendus</span>
      </p>
      <p className="mt-1.5">
        <EventStatusBadge status={e.status} />
      </p>
    </div>
  );
}

export function AdminValidationsPage() {
  const { data, isPending, isError, refetch } = useModerationQueue();
  const moderate = useModerateEvent();
  const [serverError, setServerError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const groups = useMemo(() => {
    const list = data ?? [];
    return {
      pending: list.filter((e) => e.status === 'pending_review'),
      changes: list.filter((e) => e.status === 'changes_requested'),
      suspended: list.filter((e) => e.status === 'suspended'),
      published: list.filter((e) => e.status === 'published'),
    };
  }, [data]);

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

  const rowActions = (e: PendingEventRow) => (
    <span className="flex shrink-0 items-center gap-1">
      <Link
        to={`/events/${e.slug}`}
        title="Voir la page publique"
        className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
      >
        <ExternalLink className="size-4" aria-hidden />
      </Link>
      <Link
        to={`/admin/events/${e.id}/edit`}
        title="Modifier"
        className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
      >
        <Pencil className="size-4" aria-hidden />
      </Link>
    </span>
  );

  return (
    <div className="space-y-6">
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
        <AdminRowsSkeleton count={6} />
      ) : isError ? (
        <ErrorState description="Impossible de charger la file de modération." onRetry={() => refetch()} />
      ) : (
        <>
          {/* ----- En attente ----- */}
          <section aria-label="En attente de validation" className="space-y-3">
            <h2 className="font-bold">
              En attente{' '}
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-800">
                {groups.pending.length}
              </span>
            </h2>
            {groups.pending.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500">
                Aucune demande en attente.
              </p>
            ) : (
              <ul className="space-y-3">
                {groups.pending.map((e) => (
                  <li key={e.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <EventLine e={e} />
                      {rowActions(e)}
                    </div>
                    {noteFor === e.id ? (
                      <div className="mt-3 space-y-2 rounded-lg bg-zinc-50 p-3">
                        <Textarea
                          label="Message au partenaire"
                          rows={2}
                          placeholder="Ex. : ajoutez l’heure de fin et une affiche en meilleure résolution…"
                          value={note}
                          onChange={(ev) => setNote(ev.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={actingId === e.id}
                            disabled={!note.trim()}
                            onClick={() => act(e.id, 'request_changes', note.trim())}
                          >
                            Envoyer la demande
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setNoteFor(null); setNote(''); }}>
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" loading={actingId === e.id} onClick={() => act(e.id, 'approve')}>
                          <Check className="size-4" aria-hidden /> Approuver
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => { setNoteFor(e.id); setNote(''); }}>
                          <Pencil className="size-4" aria-hidden /> Demander des modifs
                        </Button>
                        <Button size="sm" variant="danger" loading={actingId === e.id} onClick={() => act(e.id, 'refuse')}>
                          <X className="size-4" aria-hidden /> Refuser
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ----- Modifs demandées ----- */}
          {groups.changes.length > 0 && (
            <section aria-label="Modifications demandées" className="space-y-3">
              <h2 className="font-bold">Modifications demandées</h2>
              <ul className="space-y-2">
                {groups.changes.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                    <EventLine e={e} />
                    {rowActions(e)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ----- Suspendus ----- */}
          <section aria-label="Événements suspendus" className="space-y-3">
            <h2 className="font-bold">Suspendus</h2>
            {groups.suspended.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500">
                Aucun événement suspendu.
              </p>
            ) : (
              <ul className="space-y-2">
                {groups.suspended.map((e) => (
                  <li key={e.id} className={cn('flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4')}>
                    <EventLine e={e} />
                    <span className="flex shrink-0 items-center gap-1">
                      {rowActions(e)}
                      <Button size="sm" variant="secondary" loading={actingId === e.id} onClick={() => act(e.id, 'reactivate')}>
                        <RotateCcw className="size-4" aria-hidden /> Republier
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ----- Publiés ----- */}
          <section aria-label="Événements publiés" className="space-y-3">
            <h2 className="font-bold">Publiés récemment</h2>
            {groups.published.length === 0 ? (
              <EmptyState title="Aucun événement publié." />
            ) : (
              <ul className="space-y-2">
                {groups.published.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <EventLine e={e} />
                    <span className="flex shrink-0 items-center gap-1">
                      {rowActions(e)}
                      <Button size="sm" variant="secondary" loading={actingId === e.id} onClick={() => act(e.id, 'suspend')}>
                        <Ban className="size-4" aria-hidden /> Suspendre
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
