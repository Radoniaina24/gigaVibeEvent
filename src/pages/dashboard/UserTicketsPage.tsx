import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyTickets } from '../../features/orders/hooks';
import { Button } from '../../components/ui/Button';
import {
  EmptyState,
  ErrorState,
} from '../../components/ui/States';
import { TicketCard } from '../../components/tickets/TicketCard';
import { TicketListSkeleton } from '../../components/dashboard/DashboardSkeletons';
import { cn } from '../../lib/utils';

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'valid', label: 'Valides' },
  { value: 'used', label: 'Utilisés' },
  { value: 'cancelled', label: 'Annulés' },
] as const;

export function UserTicketsPage() {
  const { data, isPending, isError, refetch } = useMyTickets();
  const [filter, setFilter] = useState<string>('all');

  const countFor = (v: string) =>
    !data ? 0 : v === 'all' ? data.length : data.filter((t) => t.status === v).length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billets</h1>
          <p className="text-sm text-zinc-500">
            {isPending
              ? 'Chargement…'
              : `${data?.length ?? 0} billet${(data?.length ?? 0) > 1 ? 's' : ''} au total.`}
          </p>
        </div>
        <Link to="/events">
          <Button size="sm" variant="secondary">
            Acheter des billets
          </Button>
        </Link>
      </div>

      {isPending ? (
        <TicketListSkeleton />
      ) : isError ? (
        <ErrorState
          description="Impossible de charger vos billets."
          onRetry={() => refetch()}
        />
      ) : !data.length ? (
        <EmptyState
          title="Aucun billet."
          description="Vos billets QR Code apparaîtront ici après paiement confirmé."
          action={
            <Link to="/events">
              <Button size="sm">Voir les événements</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Onglets façon shadcn Tabs */}
          <div
            role="tablist"
            aria-label="Filtrer par statut"
            className="inline-flex h-9 max-w-full items-center justify-center gap-1 overflow-x-auto rounded-lg bg-zinc-100 p-1 text-zinc-500"
          >
            {FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all',
                    active
                      ? 'bg-white text-zinc-900 shadow'
                      : 'hover:text-zinc-900',
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-xs tabular-nums',
                      active ? 'bg-zinc-100 text-zinc-700' : 'text-zinc-400',
                    )}
                  >
                    {countFor(f.value)}
                  </span>
                </button>
              );
            })}
          </div>

          {data.filter((t) => filter === 'all' || t.status === filter).length === 0 ? (
            <EmptyState
              title="Aucun billet dans cette catégorie."
              description="Essayez un autre filtre."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {data
                .filter((t) => filter === 'all' || t.status === filter)
                .map((t) => (
                  <TicketCard key={t.id} ticket={t} />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
