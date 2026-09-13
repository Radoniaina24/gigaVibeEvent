import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useMyOrders } from '../../features/orders/hooks';
import { Button } from '../../components/ui/Button';
import {
  EmptyState,
  ErrorState,
} from '../../components/ui/States';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { OrderRowsSkeleton } from '../../components/dashboard/DashboardSkeletons';
import { formatAr, formatDate } from '../../lib/utils';

export function UserOrdersPage() {
  const { data, isPending, isError, refetch } = useMyOrders();

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commandes</h1>
        <p className="text-sm text-zinc-500">
          {isPending
            ? 'Chargement…'
            : 'Historique de vos achats et leur statut de paiement.'}
        </p>
      </div>

      {isPending ? (
        <OrderRowsSkeleton />
      ) : isError ? (
        <ErrorState
          description="Impossible de charger vos commandes."
          onRetry={() => refetch()}
        />
      ) : !data.length ? (
        <EmptyState
          title="Aucune commande."
          description="Vos achats apparaîtront ici après votre première commande."
          action={
            <Link to="/events">
              <Button size="sm">Voir les événements</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {data.map((o) => (
            <li key={o.id}>
              <Link
                to={`/dashboard/orders/${o.id}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:bg-zinc-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-mono text-sm font-medium">
                    {o.order_number}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    {o.event?.title ?? '—'} · {formatDate(o.created_at)} · {formatAr(o.total)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <OrderStatusBadge status={o.payment_status} />
                  <ChevronRight
                    className="size-4 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-500"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
