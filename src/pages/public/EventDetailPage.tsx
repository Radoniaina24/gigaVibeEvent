import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock,
  MapPin,
  User,
} from 'lucide-react';
import { useEventDetail } from '../../hooks/useEvents';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useAuth } from '../../features/auth/AuthContext';
import { formatDate } from '../../lib/utils';
import { Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';
import { EventImage } from '../../components/events/EventImage';
import { TicketTypeCard } from '../../components/events/TicketTypeCard';
import { OrderSummary, type OrderLine } from '../../components/orders/OrderSummary';

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function EventDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: event, isPending, isError, refetch } = useEventDetail(slug);
  const [selection, setSelection] = useState<Record<string, number>>({});

  usePageMeta(
    event?.title ?? 'Événement',
    event?.description?.slice(0, 160) ??
      "Détail d'un événement : billets, prix et places disponibles.",
  );

  const lines: OrderLine[] = useMemo(() => {
    if (!event) return [];
    return event.ticket_types
      .filter((t) => (selection[t.id] ?? 0) > 0 && t.onSale)
      .map((t) => ({ ticketType: t, quantity: selection[t.id] ?? 0 }));
  }, [event, selection]);

  if (isPending) return <LoadingState label="Chargement de l'événement…" />;
  if (isError)
    return (
      <ErrorState
        description="Impossible de charger cet événement."
        onRetry={() => refetch()}
      />
    );
  if (!event)
    return (
      <EmptyState
        title="Événement introuvable."
        description="Il a peut-être été annulé, terminé ou déplacé."
        action={
          <Link to="/events">
            <Button variant="secondary" size="sm">
              Voir les événements
            </Button>
          </Link>
        }
      />
    );

  const soldOut = event.total_available <= 0;

  const handleBuy = () => {
    if (lines.length === 0) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/events/${event.slug}`)}`, {
        replace: false,
      });
      return;
    }
    navigate('/checkout', {
      state: {
        eventId: event.id,
        eventSlug: event.slug,
        eventTitle: event.title,
        items: lines.map((l) => ({
          ticket_type_id: l.ticketType.id,
          name: l.ticketType.name,
          unit_price: l.ticketType.price,
          quantity: l.quantity,
        })),
      },
    });
  };

  return (
    <article className="space-y-6">
      <Link
        to="/events"
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Tous les événements
      </Link>

      <EventImage
        seed={event.id}
        imageUrl={event.image_url}
        title={event.title}
        className="aspect-[21/9] w-full rounded-2xl"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <header>
            <div className="flex flex-wrap gap-2">
              {event.category && <Badge tone="info">{event.category.name}</Badge>}
              {event.is_featured && <Badge tone="warning">Populaire</Badge>}
              {event.soon_full && !soldOut && (
                <Badge tone="danger">Bientôt complet</Badge>
              )}
              {soldOut && <Badge tone="neutral">Complet</Badge>}
            </div>
            <h1 className="mt-3 text-2xl font-bold md:text-3xl">{event.title}</h1>
          </header>

          <dl className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden />
              <div>
                <dt className="text-xs text-zinc-500">Date</dt>
                <dd className="font-medium">{formatDate(event.starts_at)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden />
              <div>
                <dt className="text-xs text-zinc-500">Heure</dt>
                <dd className="font-medium">
                  {formatTime(event.starts_at)}
                  {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ''}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden />
              <div>
                <dt className="text-xs text-zinc-500">Lieu</dt>
                <dd className="font-medium">
                  {event.venue} · {event.city}
                </dd>
                {event.address && (
                  <dd className="text-zinc-500">{event.address}</dd>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              {event.organizer ? (
                <>
                  <User className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden />
                  <div>
                    <dt className="text-xs text-zinc-500">Organisateur</dt>
                    <dd className="font-medium">{event.organizer}</dd>
                  </div>
                </>
              ) : (
                <>
                  <Building2 className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden />
                  <div>
                    <dt className="text-xs text-zinc-500">Places restantes</dt>
                    <dd className="font-medium tabular-nums">
                      {event.total_available}
                    </dd>
                  </div>
                </>
              )}
            </div>
          </dl>

          {event.description && (
            <section aria-label="Description">
              <h2 className="font-bold">À propos</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-600">
                {event.description}
              </p>
            </section>
          )}

          <section aria-label="Billets disponibles" className="space-y-3">
            <h2 className="font-bold">
              Billets{' '}
              <span className="text-sm font-normal text-zinc-500">
                ({event.ticket_types.length} catégorie
                {event.ticket_types.length > 1 ? 's' : ''})
              </span>
            </h2>
            {event.ticket_types.length === 0 ? (
              <EmptyState
                title="Billetterie à venir."
                description="Les types de billets seront publiés prochainement."
              />
            ) : (
              event.ticket_types.map((t) => (
                <TicketTypeCard
                  key={t.id}
                  ticketType={t}
                  quantity={selection[t.id] ?? 0}
                  onQuantityChange={(q) =>
                    setSelection((s) => ({ ...s, [t.id]: q }))
                  }
                />
              ))
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Commande">
          <OrderSummary
            lines={lines}
            ctaLabel={user ? 'Acheter maintenant' : 'Se connecter pour acheter'}
            onSubmit={handleBuy}
          />
          {!user && lines.length > 0 && (
            <p className="mt-2 text-center text-xs text-zinc-500">
              Connectez-vous pour passer au paiement Mobile Money.
            </p>
          )}
        </aside>
      </div>
    </article>
  );
}
