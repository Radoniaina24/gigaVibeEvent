import { Link } from 'react-router-dom';
import { useMyOrders } from '../../features/orders/hooks';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { formatAr, formatDate } from '../../lib/utils';

export function UserOrdersPage() {
  const { data, isPending, isError, refetch } = useMyOrders();

  if (isPending) return <LoadingState label="Chargement des commandes…" />;
  if (isError)
    return (
      <ErrorState
        description="Impossible de charger vos commandes."
        onRetry={() => refetch()}
      />
    );
  if (!data.length)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Mes commandes</h1>
        <EmptyState
          title="Aucune commande."
          description="Vos achats apparaîtront ici après votre première commande."
          action={
            <Link to="/events">
              <Button size="sm">Voir les événements</Button>
            </Link>
          }
        />
      </div>
    );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Mes commandes</h1>
      {data.map((o) => (
        <Link key={o.id} to={`/dashboard/orders/${o.id}`}>
          <Card className="flex items-center justify-between gap-3 p-4 transition hover:shadow-md">
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold">{o.order_number}</p>
              <p className="truncate text-xs text-zinc-500">
                {o.event?.title ?? '—'} · {formatDate(o.created_at)} · {formatAr(o.total)}
              </p>
            </div>
            <OrderStatusBadge status={o.payment_status} />
          </Card>
        </Link>
      ))}
    </div>
  );
}
