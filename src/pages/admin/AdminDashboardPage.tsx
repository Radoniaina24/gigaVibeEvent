import { Link } from 'react-router-dom';
import {
  Banknote,
  CalendarDays,
  Package,
  Receipt,
  Ticket,
  Users,
} from 'lucide-react';
import { useAdminKpis, useAdminOrders } from '../../features/admin/hooks';
import { StatsCard } from '../../components/admin/StatsCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { formatAr, formatDateTime } from '../../lib/utils';

export function AdminDashboardPage() {
  const kpis = useAdminKpis();
  const orders = useAdminOrders();
  const recent = (orders.data ?? []).slice(0, 5);

  if (kpis.isPending) return <LoadingState label="Chargement du dashboard…" />;
  if (kpis.isError)
    return (
      <ErrorState description="Impossible de charger les indicateurs." onRetry={() => kpis.refetch()} />
    );

  const k = kpis.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Administration</h1>
        <Link to="/admin/statistics">
          <Button size="sm" variant="secondary">
            Statistiques détaillées
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatsCard
          label="Chiffre d'affaires"
          value={formatAr(k.revenue)}
          hint={`${k.ordersPaid} commandes payées`}
          icon={Banknote}
        />
        <StatsCard
          label="Commandes"
          value={String(k.ordersTotal)}
          hint="toutes périodes"
          icon={Receipt}
        />
        <StatsCard
          label="Billets vendus"
          value={String(k.ticketsSold)}
          hint="valides + utilisés"
          icon={Ticket}
        />
        <StatsCard
          label="Billets disponibles"
          value={String(k.ticketsAvailable)}
          hint="stock restant total"
          icon={Package}
        />
        <StatsCard label="Utilisateurs" value={String(k.users)} icon={Users} />
        <StatsCard
          label="Événements actifs"
          value={String(k.eventsActive)}
          hint="statut publié"
          icon={CalendarDays}
        />
      </div>

      <section aria-label="Dernières commandes" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Dernières commandes</h2>
          <Link to="/admin/orders" className="text-sm font-medium hover:underline">
            Tout voir
          </Link>
        </div>
        {orders.isPending ? (
          <LoadingState label="Chargement…" />
        ) : recent.length === 0 ? (
          <Card className="p-5 text-center text-sm text-zinc-500">
            Aucune commande pour le moment.
          </Card>
        ) : (
          recent.map((o) => (
            <Link key={o.id} to={`/admin/orders/${o.id}`}>
              <Card className="flex items-center justify-between p-3 transition hover:shadow-md">
                <div>
                  <p className="font-mono text-sm font-semibold">{o.order_number}</p>
                  <p className="text-xs text-zinc-500">
                    {o.user?.email ?? '—'} · {formatDateTime(o.created_at)} · {formatAr(o.total)}
                  </p>
                </div>
                <OrderStatusBadge status={o.payment_status} />
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
