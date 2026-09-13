import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { env } from '../../app/config/env';
import {
  useCancelOrder,
  useOrderDetail,
  useSimulatePayment,
} from '../../features/orders/hooks';
import { formatAr, formatDateTime } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';

const PROVIDER_LABEL: Record<string, string> = {
  mvola: 'MVola',
  orange_money: 'Orange Money',
  airtel_money: 'Airtel Money',
  card: 'Carte',
  cash: 'Espèces',
};

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: order, isPending, isError, refetch } = useOrderDetail(id);
  const simulate = useSimulatePayment();
  const cancelOrder = useCancelOrder();
  const [serverError, setServerError] = useState<string | null>(null);

  if (isPending) return <LoadingState label="Chargement de la commande…" />;
  if (isError)
    return (
      <ErrorState
        description="Impossible de charger cette commande."
        onRetry={() => refetch()}
      />
    );
  if (!order)
    return (
      <EmptyState
        title="Commande introuvable."
        action={
          <Link to="/dashboard/orders">
            <Button size="sm" variant="secondary">
              Mes commandes
            </Button>
          </Link>
        }
      />
    );

  const canAct =
    order.payment_status === 'pending' || order.payment_status === 'processing';
  const payment = order.payments[0];

  const handleSimulate = async (success: boolean) => {
    setServerError(null);
    try {
      await simulate.mutateAsync({ order_id: order.id, success });
      await refetch();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Opération impossible.');
    }
  };

  const handleCancel = async () => {
    setServerError(null);
    try {
      await cancelOrder.mutateAsync(order.id);
      navigate('/dashboard/orders');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Annulation impossible.');
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Mes commandes
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-mono text-xl font-bold">{order.order_number}</h1>
        <OrderStatusBadge status={order.payment_status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-bold">Événement</h2>
          {order.event ? (
            <div className="mt-2 text-sm">
              <Link
                to={`/events/${order.event.slug}`}
                className="font-semibold hover:underline"
              >
                {order.event.title}
              </Link>
              <p className="mt-1 text-zinc-500">
                {formatDateTime(order.event.starts_at)}
              </p>
              <p className="text-zinc-500">
                {order.event.venue}, {order.event.city}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">—</p>
          )}
          <dl className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Créée le</dt>
              <dd>{formatDateTime(order.created_at)}</dd>
            </div>
            {order.paid_at && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Payée le</dt>
                <dd>{formatDateTime(order.paid_at)}</dd>
              </div>
            )}
            {order.ticket_count > 0 && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Billets</dt>
                <dd>
                  <Link to="/dashboard/tickets" className="font-medium hover:underline">
                    Voir les {order.ticket_count} billets
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="font-bold">Paiement</h2>
          {payment ? (
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Méthode</dt>
                <dd className="font-medium">
                  {PROVIDER_LABEL[payment.provider] ?? payment.provider}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Montant</dt>
                <dd className="font-semibold tabular-nums">{formatAr(payment.amount)}</dd>
              </div>
              {payment.phone_number && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Numéro</dt>
                  <dd>{payment.phone_number}</dd>
                </div>
              )}
              {payment.provider_ref && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Référence</dt>
                  <dd className="font-mono text-xs">{payment.provider_ref}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-zinc-500">Statut</dt>
                <dd>
                  <OrderStatusBadge status={payment.status} />
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Aucun paiement enregistré.</p>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-bold">Billets commandés</h2>
        <ul className="mt-3 divide-y divide-zinc-100 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="py-2">
              <div className="flex justify-between gap-2">
                <span>
                  {item.ticket_type?.name ?? 'Billet'} · {formatAr(item.unit_price)} ×{' '}
                  {item.quantity}
                </span>
                <strong className="tabular-nums">{formatAr(item.total_price)}</strong>
              </div>
              {item.holder_names && item.holder_names.length > 0 && (
                <p className="mt-0.5 text-xs text-zinc-500">
                  Participants : {item.holder_names.join(', ')}
                </p>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t border-zinc-100 pt-3 font-bold">
          <span>TOTAL</span>
          <span className="tabular-nums">{formatAr(order.total)}</span>
        </p>
      </Card>

      {canAct && (
        <Card className="space-y-3 p-5">
          <h2 className="font-bold">Actions</h2>
          {env.enablePaymentSimulation && (
            <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">
                DEV UNIQUEMENT — simulation opérateur
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  loading={simulate.isPending}
                  onClick={() => handleSimulate(true)}
                >
                  Simuler le succès
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={simulate.isPending}
                  onClick={() => handleSimulate(false)}
                >
                  Simuler l'échec
                </Button>
              </div>
            </div>
          )}
          <Button
            variant="danger"
            size="sm"
            loading={cancelOrder.isPending}
            onClick={handleCancel}
          >
            Annuler la commande
          </Button>
          {serverError && (
            <p role="alert" className="text-sm text-red-600">
              {serverError}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
