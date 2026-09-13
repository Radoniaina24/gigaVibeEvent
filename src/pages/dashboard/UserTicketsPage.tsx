import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyTickets } from '../../features/orders/hooks';
import { Button } from '../../components/ui/Button';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';
import { TicketCard } from '../../components/tickets/TicketCard';
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

  if (isPending) return <LoadingState label="Chargement des billets…" />;
  if (isError)
    return (
      <ErrorState
        description="Impossible de charger vos billets."
        onRetry={() => refetch()}
      />
    );
  if (!data.length)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Mes billets</h1>
        <EmptyState
          title="Aucun billet."
          description="Vos billets QR Code apparaîtront ici après paiement confirmé."
          action={
            <Link to="/events">
              <Button size="sm">Voir les événements</Button>
            </Link>
          }
        />
      </div>
    );

  const filtered =
    filter === 'all' ? data : data.filter((t) => t.status === filter);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Mes billets</h1>
      <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              filter === f.value
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-300 bg-white hover:bg-zinc-100',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun billet dans cette catégorie."
          description="Essayez un autre filtre."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  );
}
