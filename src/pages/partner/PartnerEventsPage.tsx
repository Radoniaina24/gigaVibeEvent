import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Pencil, Plus, Send } from 'lucide-react';
import {
  useMyPartner,
  usePartnerEvents,
  useSubmitEventForReview,
  type PartnerEventRow,
} from '../../features/partner/hooks';
import { PartnerStatusBanner } from '../../components/layout/PartnerLayout';
import { EventStatusBadge } from '../../components/admin/StatusBadges';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { PartnerRowsSkeleton } from './PartnerSkeletons';
import { formatDate } from '../../lib/utils';

const SUBMITTABLE = ['draft', 'changes_requested'];

function stockOf(e: PartnerEventRow): { sold: number; total: number } {
  return {
    sold: e.ticket_types.reduce((s, t) => s + t.sold, 0),
    total: e.ticket_types.reduce((s, t) => s + t.quantity, 0),
  };
}

export function PartnerEventsPage() {
  const partner = useMyPartner();
  const { data, isPending, isError, refetch } = usePartnerEvents();
  const submit = useSubmitEventForReview();
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter(
      (e) => !q || `${e.title} ${e.venue} ${e.city}`.toLowerCase().includes(q),
    );
  }, [data, search]);

  const handleSubmit = async (id: string) => {
    setActionError(null);
    setSubmittingId(id);
    try {
      await submit.mutateAsync(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Soumission impossible.');
    } finally {
      setSubmittingId(null);
    }
  };

  const canCreate = partner.data?.status === 'active';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mes événements</h1>
          <p className="text-sm text-zinc-500">
            Brouillons, validations en cours et événements publiés.
          </p>
        </div>
        {canCreate && (
          <Link to="/partner/events/new">
            <Button size="sm">
              <Plus className="size-4" aria-hidden /> Créer un événement
            </Button>
          </Link>
        )}
      </div>

      {partner.data && <PartnerStatusBanner status={partner.data.status} />}

      <Input
        label="Recherche"
        type="search"
        placeholder="Titre, lieu, ville…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {actionError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {isPending ? (
        <PartnerRowsSkeleton />
      ) : isError ? (
        <ErrorState description="Impossible de charger vos événements." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucun événement."
          description="Créez votre premier événement, ajoutez vos catégories et soumettez-le pour validation."
          action={
            canCreate ? (
              <Link to="/partner/events/new">
                <Button size="sm">Créer un événement</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((e) => {
            const stock = stockOf(e);
            const submittable = SUBMITTABLE.includes(e.status);
            return (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.title}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {e.category?.name ?? '—'} · {e.venue}, {e.city} · {formatDate(e.starts_at)} ·{' '}
                    <span className="tabular-nums">
                      {stock.sold}/{stock.total} vendus
                    </span>
                  </p>
                  <p className="mt-1.5">
                    <EventStatusBadge status={e.status} />
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {e.status === 'published' && (
                    <Link
                      to={`/events/${e.slug}`}
                      title="Voir la page publique"
                      className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                    >
                      <ExternalLink className="size-4" aria-hidden />
                    </Link>
                  )}
                  <Link
                    to={`/partner/events/${e.id}/edit`}
                    title="Modifier"
                    className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Link>
                  {submittable && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={submittingId === e.id}
                      onClick={() => handleSubmit(e.id)}
                      title="Envoyer à Giga Vibe Event pour validation"
                    >
                      <Send className="size-4" aria-hidden /> Soumettre
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
