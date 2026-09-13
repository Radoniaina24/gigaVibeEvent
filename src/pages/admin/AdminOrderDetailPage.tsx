import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useOrderDetail } from '../../features/orders/hooks';
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

/** Détail commande côté admin : lecture seule (les statuts paiement ne sont
 *  modifiables que par le webhook Phase 5 / triggers audités). */
export function AdminOrderDetailPage() {
  const { id } = useParams();
  const { data: order, isPending, isError, refetch } = useOrderDetail(id);

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
          <Link to="/admin/orders">
            <Button size="sm" variant="secondary">
              Commandes
            </Button>
          </Link>
        }
      />
    );

  const payment = order.payments[0];

  return (
    <div className="space-y-6">
      <Link
        to="/admin/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Commandes
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-mono text-xl font-bold">{order.order_number}</h1>
        <OrderStatusBadge status={order.payment_status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-bold">Client & événement</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Acheteur</dt>
              <dd className="font-mono text-xs">{order.user_id}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Événement</dt>
              <dd className="text-right font-medium">
                {order.event ? (
                  <Link to={`/events/${order.event.slug}`} className="hover:underline">
                    {order.event.title}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
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
            <div className="flex justify-between">
              <dt className="text-zinc-500">Billets générés</dt>
              <dd className="tabular-nums">{order.ticket_count}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="font-bold">Paiement (lecture seule)</h2>
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
                <div className="flex justify-between gap-2">
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
          <p className="mt-3 rounded-lg bg-zinc-50 p-2 text-xs text-zinc-500">
            Un paiement ne peut pas être déclaré « payé » manuellement : seul le
            webhook du fournisseur (Phase 5) fait foi. Toute modification est
            auditée.
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-bold">Lignes ({order.items.length})</h2>
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
    </div>
  );
}
