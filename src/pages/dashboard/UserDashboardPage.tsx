import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useMyOrders, useMyTickets } from '../../features/orders/hooks';
import { usePublishedEvents } from '../../hooks/useEvents';
import { useAuth } from '../../features/auth/AuthContext';
import { formatAr, formatDate } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';

export function UserDashboardPage() {
  const { profile } = useAuth();
  const orders = useMyOrders();
  const tickets = useMyTickets();
  const events = usePublishedEvents();

  const isPending = orders.isPending || tickets.isPending;
  const isError = orders.isError || tickets.isError;

  const paidOrders = (orders.data ?? []).filter((o) => o.payment_status === 'paid');
  const totalSpent = paidOrders.reduce((s, o) => s + o.total, 0);
  const validTickets = (tickets.data ?? []).filter((t) => t.status === 'valid');
  const recentOrders = (orders.data ?? []).slice(0, 3);

  const now = useMemo(() => Date.now(), []);
  const upcomingTickets = validTickets
    .filter((t) => t.event && new Date(t.event.starts_at).getTime() >= now)
    .sort((a, b) => +new Date(a.event!.starts_at) - +new Date(b.event!.starts_at))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Bonjour{profile?.first_name ? `, ${profile.first_name}` : ''} 👋
      </h1>

      {isPending ? (
        <LoadingState label="Chargement du tableau de bord…" />
      ) : isError ? (
        <ErrorState
          description="Impossible de charger vos données."
          onRetry={() => {
            orders.refetch();
            tickets.refetch();
          }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-sm text-zinc-500">Billets valides</p>
              <p className="text-2xl font-bold tabular-nums">{validTickets.length}</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-zinc-500">Commandes</p>
              <p className="text-2xl font-bold tabular-nums">{orders.data!.length}</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-zinc-500">Total dépensé</p>
              <p className="text-2xl font-bold tabular-nums">{formatAr(totalSpent)}</p>
            </Card>
          </div>

          <section aria-label="Dernières commandes" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Dernières commandes</h2>
              <Link to="/dashboard/orders" className="text-sm font-medium hover:underline">
                Tout voir
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <Card className="p-5 text-center">
                <p className="text-sm text-zinc-500">Aucune commande pour le moment.</p>
                <Link to="/events" className="mt-3 inline-block">
                  <Button size="sm">Découvrir les événements</Button>
                </Link>
              </Card>
            ) : (
              recentOrders.map((o) => (
                <Link key={o.id} to={`/dashboard/orders/${o.id}`}>
                  <Card className="flex items-center justify-between p-4 transition hover:shadow-md">
                    <div>
                      <p className="font-mono text-sm font-semibold">{o.order_number}</p>
                      <p className="text-xs text-zinc-500">
                        {o.event?.title ?? '—'} · {formatDate(o.created_at)} · {formatAr(o.total)}
                      </p>
                    </div>
                    <OrderStatusBadge status={o.payment_status} />
                  </Card>
                </Link>
              ))
            )}
          </section>

          <section aria-label="Prochains événements" className="space-y-3">
            <h2 className="font-bold">Mes prochains événements</h2>
            {upcomingTickets.length === 0 ? (
              <Card className="p-5">
                <p className="text-sm text-zinc-500">
                  {validTickets.length === 0
                    ? 'Vos futurs événements apparaîtront ici après achat.'
                    : 'Aucun événement à venir.'}
                </p>
              </Card>
            ) : (
              upcomingTickets.map((t) => (
                <Link key={t.id} to={t.event ? `/events/${t.event.slug}` : '/dashboard/tickets'}>
                  <Card className="flex items-center justify-between p-4 transition hover:shadow-md">
                    <div>
                      <p className="text-sm font-semibold">{t.event!.title}</p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(t.event!.starts_at)} · {t.event!.venue},{' '}
                        {t.event!.city} · {t.ticket_type?.name ?? ''}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-zinc-400">{t.ticket_number}</span>
                  </Card>
                </Link>
              ))
            )}
          </section>

          {events.data && events.data.length > 0 && orders.data!.length === 0 && (
            <section aria-label="Suggestion">
              <Card className="p-5 text-center">
                <p className="text-sm font-semibold">À l'affiche en ce moment</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {events.data[0].title} — {formatDate(events.data[0].starts_at)}
                </p>
                <Link to="/events" className="mt-3 inline-block">
                  <Button size="sm" variant="secondary">
                    Parcourir
                  </Button>
                </Link>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
