import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowUpRight, CalendarDays, Receipt, Ticket, Wallet } from 'lucide-react';
import { useMyOrders, useMyTickets } from '../../features/orders/hooks';
import { usePublishedEvents } from '../../hooks/useEvents';
import { useAuth } from '../../features/auth/AuthContext';
import { formatAr, formatDate } from '../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/States';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { DashboardHomeSkeleton } from '../../components/dashboard/DashboardSkeletons';

function greeting(): string {
  return new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir';
}

function daysLeftLabel(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Demain';
  return `Dans ${days} j`;
}

function dayParts(iso: string) {
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(d),
    month: new Intl.DateTimeFormat('fr-FR', { month: 'short' })
      .format(d)
      .replace('.', ''),
  };
}

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
  const recentOrders = (orders.data ?? []).slice(0, 5);

  const [now] = useState(() => Date.now());
  const upcomingTickets = validTickets
    .filter((t) => t.event && new Date(t.event.starts_at).getTime() >= now)
    .sort((a, b) => +new Date(a.event!.starts_at) - +new Date(b.event!.starts_at))
    .slice(0, 5);

  const firstName = profile?.first_name?.trim();

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting()}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-sm text-zinc-500">
            Voici l’état de vos billets et de vos commandes.
          </p>
        </div>
        <Link to="/events">
          <Button size="sm">
            Voir les événements <ArrowUpRight className="size-4" aria-hidden />
          </Button>
        </Link>
      </div>

      {isPending ? (
        <DashboardHomeSkeleton />
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
          {/* Statistiques */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Billets valides</CardTitle>
                <Ticket className="size-4 text-zinc-500" aria-hidden />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{validTickets.length}</div>
                <p className="text-xs text-zinc-500">Utilisables à l’entrée</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commandes</CardTitle>
                <Receipt className="size-4 text-zinc-500" aria-hidden />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{orders.data!.length}</div>
                <p className="text-xs text-zinc-500">Passées au total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total dépensé</CardTitle>
                <Wallet className="size-4 text-zinc-500" aria-hidden />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{formatAr(totalSpent)}</div>
                <p className="text-xs text-zinc-500">Commandes payées</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Billets à venir */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>Billets à venir</CardTitle>
                  <CardDescription>Vos prochaines sorties.</CardDescription>
                </div>
                <Link
                  to="/dashboard/tickets"
                  className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
                >
                  Tout voir <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              </CardHeader>
              <CardContent>
                {upcomingTickets.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center">
                    <p className="text-sm text-zinc-500">
                      {validTickets.length === 0
                        ? 'Vos futurs événements apparaîtront ici après achat.'
                        : 'Aucun événement à venir.'}
                    </p>
                  </div>
                ) : (
                  <ul className="-mx-2 space-y-1">
                    {upcomingTickets.map((t) => {
                      const parts = dayParts(t.event!.starts_at);
                      return (
                        <li key={t.id}>
                          <Link
                            to={t.event ? `/events/${t.event.slug}` : '/dashboard/tickets'}
                            className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-zinc-50"
                          >
                            <span className="flex w-12 shrink-0 flex-col items-center rounded-md border border-zinc-200 py-1.5">
                              <span className="text-sm font-bold leading-none tabular-nums">{parts.day}</span>
                              <span className="mt-0.5 text-[10px] font-medium uppercase text-zinc-500">{parts.month}</span>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{t.event!.title}</span>
                              <span className="block truncate text-xs text-zinc-500">
                                {t.event!.venue} · {t.ticket_type?.name ?? ''}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                              {daysLeftLabel(t.event!.starts_at)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Dernières commandes */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>Dernières commandes</CardTitle>
                  <CardDescription>Vos achats les plus récents.</CardDescription>
                </div>
                <Link
                  to="/dashboard/orders"
                  className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
                >
                  Tout voir <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center">
                    <p className="text-sm text-zinc-500">Aucune commande pour le moment.</p>
                    <Link to="/events" className="mt-3 inline-block">
                      <Button size="sm" variant="secondary">
                        Découvrir les événements
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <ul className="-mx-2 space-y-1">
                    {recentOrders.map((o) => (
                      <li key={o.id}>
                        <Link
                          to={`/dashboard/orders/${o.id}`}
                          className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition hover:bg-zinc-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-mono text-sm font-medium">{o.order_number}</span>
                            <span className="block truncate text-xs text-zinc-500">
                              {o.event?.title ?? '—'} · {formatDate(o.created_at)}
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
          </div>

          {/* Suggestion si aucun achat */}
          {orders.data!.length === 0 && events.data && events.data.length > 0 && (
            <Card>
              <CardContent className="flex flex-col items-start gap-1 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <CalendarDays className="size-4 text-zinc-500" aria-hidden />
                    À l’affiche : {events.data[0].title}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {formatDate(events.data[0].starts_at)} — réservez vos places en Mobile Money.
                  </p>
                </div>
                <Link to="/events" className="shrink-0">
                  <Button size="sm" variant="secondary">
                    Parcourir
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
