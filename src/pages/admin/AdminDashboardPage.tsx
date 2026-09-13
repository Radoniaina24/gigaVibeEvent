import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Plus,
  Receipt,
  Ticket,
  Users,
} from 'lucide-react';
import { useAdminKpis, useAdminOrders } from '../../features/admin/hooks';
import { StatsCard } from '../../components/admin/StatsCard';
import { AdminHomeSkeleton } from '../../components/admin/AdminSkeletons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/States';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { formatAr, formatDateTime } from '../../lib/utils';

export function AdminDashboardPage() {
  const kpis = useAdminKpis();
  const orders = useAdminOrders();
  const recent = (orders.data ?? []).slice(0, 5);
  const attention = (orders.data ?? [])
    .filter((o) => o.payment_status === 'pending' || o.payment_status === 'processing')
    .slice(0, 5);

  if (kpis.isPending) return <AdminHomeSkeleton />;
  if (kpis.isError)
    return (
      <ErrorState description="Impossible de charger les indicateurs." onRetry={() => kpis.refetch()} />
    );

  const k = kpis.data;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vue d’ensemble</h1>
          <p className="text-sm text-zinc-500">
            Activité de la billetterie en temps réel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/statistics">
            <Button size="sm" variant="secondary">
              Statistiques
            </Button>
          </Link>
          <Link to="/admin/events/new">
            <Button size="sm">
              <Plus className="size-4" aria-hidden /> Nouvel événement
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Chiffre d’affaires"
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
          hint={`${k.ticketsAvailable} encore disponibles`}
          icon={Ticket}
        />
        <StatsCard
          label="Utilisateurs"
          value={String(k.users)}
          hint={`${k.eventsActive} événements actifs`}
          icon={Users}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Dernières commandes */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Dernières commandes</CardTitle>
              <CardDescription>Les 5 achats les plus récents.</CardDescription>
            </div>
            <Link
              to="/admin/orders"
              className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
            >
              Tout voir <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent>
            {orders.isPending ? (
              <p className="py-6 text-center text-sm text-zinc-500">Chargement…</p>
            ) : recent.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center">
                <p className="text-sm text-zinc-500">Aucune commande pour le moment.</p>
              </div>
            ) : (
              <ul className="-mx-2 space-y-1">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition hover:bg-zinc-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-sm font-medium">
                          {o.order_number}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">
                          {o.user?.email ?? '—'} · {formatDateTime(o.created_at)}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold tabular-nums">{formatAr(o.total)}</span>
                        <OrderStatusBadge status={o.payment_status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Attention requise */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" aria-hidden />
              Attention requise
            </CardTitle>
            <CardDescription>Paiements en attente ou en cours.</CardDescription>
          </CardHeader>
          <CardContent>
            {attention.length === 0 ? (
              <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-800">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                Rien à signaler. Tous les paiements sont à jour.
              </p>
            ) : (
              <ul className="space-y-2">
                {attention.map((o) => (
                  <li key={o.id}>
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="block rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 transition hover:bg-amber-50"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-sm font-medium">{o.order_number}</span>
                        <OrderStatusBadge status={o.payment_status} />
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-500">
                        {o.user?.email ?? '—'} · {formatAr(o.total)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
