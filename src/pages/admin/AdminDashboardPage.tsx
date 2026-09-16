import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Inbox,
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
import { formatAr, formatShortDateTime } from '../../lib/utils';

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
    <div className="space-y-4 sm:space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">Vue d’ensemble</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Activité de la billetterie en temps réel.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <Link to="/admin/statistics" className="min-w-0">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              Statistiques
            </Button>
          </Link>
          <Link to="/admin/events/new" className="min-w-0">
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="size-4" aria-hidden /> Nouvel événement
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatsCard
          label="Chiffre d’affaires"
          value={formatAr(k.revenue)}
          hint={`${k.ordersPaid} commande${k.ordersPaid > 1 ? 's' : ''} payée${k.ordersPaid > 1 ? 's' : ''}`}
          icon={Banknote}
          tone="success"
        />
        <StatsCard
          label="Commandes"
          value={String(k.ordersTotal)}
          hint="toutes périodes"
          icon={Receipt}
          tone="brand"
        />
        <StatsCard
          label="Billets vendus"
          value={String(k.ticketsSold)}
          hint={`${k.ticketsAvailable} encore disponible${k.ticketsAvailable > 1 ? 's' : ''}`}
          icon={Ticket}
          tone="warning"
        />
        <StatsCard
          label="Utilisateurs"
          value={String(k.users)}
          hint={`${k.eventsActive} événement${k.eventsActive > 1 ? 's' : ''} actif${k.eventsActive > 1 ? 's' : ''}`}
          icon={Users}
          tone="info"
        />
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-5">
        {/* Dernières commandes */}
        <Card className="min-w-0 lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 sm:p-6">
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base">Dernières commandes</CardTitle>
              <CardDescription className="mt-0.5 truncate text-xs sm:text-sm">
                Les 5 achats les plus récents.
              </CardDescription>
            </div>
            <Link
              to="/admin/orders"
              className="inline-flex shrink-0 items-center gap-0.5 rounded-md text-[13px] font-medium text-zinc-500 transition hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 sm:text-sm"
            >
              Tout voir <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            {orders.isPending ? (
              <p className="py-6 text-center text-sm text-zinc-500">Chargement…</p>
            ) : recent.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center">
                <Inbox className="mx-auto size-8 text-zinc-300" aria-hidden />
                <p className="mt-2 text-sm font-medium text-zinc-600">Aucune commande pour le moment.</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Les achats apparaîtront ici dès la première vente.
                </p>
                <Link to="/admin/events/new" className="mt-4 inline-block">
                  <Button size="sm">
                    <Plus className="size-4" aria-hidden /> Créer un événement
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[13px] font-medium sm:text-sm">
                          {o.order_number}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">
                          {o.user?.email ?? '—'} · {formatShortDateTime(o.created_at)}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[13px] font-semibold tabular-nums sm:text-sm">
                          {formatAr(o.total)}
                        </span>
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
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
              Attention requise
              {attention.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-800">
                  {attention.length}
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs sm:text-sm">
              Paiements en attente ou en cours.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            {attention.length === 0 ? (
              <p className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-[13px] text-green-800 sm:text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                Rien à signaler. Tous les paiements sont à jour.
              </p>
            ) : (
              <ul className="space-y-2">
                {attention.map((o) => (
                  <li key={o.id}>
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="block rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 transition hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-mono text-[13px] font-medium sm:text-sm">
                          {o.order_number}
                        </span>
                        <span className="shrink-0">
                          <OrderStatusBadge status={o.payment_status} />
                        </span>
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
