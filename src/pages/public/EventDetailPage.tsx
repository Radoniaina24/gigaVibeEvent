import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Flame,
  MapPin,
  QrCode,
  RotateCcw,
  Share2,
  ShieldCheck,
  Ticket,
  User,
} from 'lucide-react';
import { useEventDetail } from '../../hooks/useEvents';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useAuth } from '../../features/auth/AuthContext';
import { formatAr, formatDate } from '../../lib/utils';
import { Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  EmptyState,
  ErrorState,
} from '../../components/ui/States';
import { EventImage } from '../../components/events/EventImage';
import { EventDetailSkeleton } from '../../components/events/EventSkeletons';
import { TicketTypeCard } from '../../components/events/TicketTypeCard';
import { OrderSummary, type OrderLine } from '../../components/orders/OrderSummary';

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: 'Paiement sécurisé',
    text: 'MVola · Orange Money · Airtel Money',
  },
  {
    icon: QrCode,
    title: 'QR Code unique',
    text: 'Billet nominatif vérifié à l’entrée',
  },
  {
    icon: RotateCcw,
    title: 'Remboursé si annulé',
    text: 'Remboursement automatique',
  },
];

export function EventDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: event, isPending, isError, refetch } = useEventDetail(slug);
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

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

  if (isPending) return <EventDetailSkeleton />;
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
  const timeLabel = event.ends_at
    ? `${formatTime(event.starts_at)} – ${formatTime(event.ends_at)}`
    : formatTime(event.starts_at);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  };

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
    <article className="space-y-8 md:space-y-10">
      {/* ===== Hero immersif ===== */}
      <section aria-label={event.title} className="bleed relative overflow-hidden bg-night-950 text-white">
        <div aria-hidden className="absolute inset-0">
          {event.image_url ? (
            <img src={event.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <EventImage seed={event.id} imageUrl={null} title="" className="h-full w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-night-950 via-night-950/70 to-night-950/30" />
          <div className="hero-glow absolute inset-0" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-5 md:px-2 md:pb-12">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <ArrowLeft className="size-4" aria-hidden /> Tous les événements
            </Link>
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              {copied ? (
                <><Check className="size-4 text-green-400" aria-hidden /> Lien copié !</>
              ) : (
                <><Share2 className="size-4" aria-hidden /> Partager</>
              )}
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 md:mt-12">
            {event.category && <Badge tone="info">{event.category.name}</Badge>}
            {event.is_featured && <Badge tone="warning">Populaire</Badge>}
            {event.soon_full && !soldOut && (
              <Badge tone="danger">
                <Flame className="mr-1 size-3" aria-hidden /> Bientôt complet
              </Badge>
            )}
            {soldOut && <Badge tone="neutral">Complet</Badge>}
          </div>

          <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            {event.title}
          </h1>
          {event.organizer && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-300">
              <User className="size-4 shrink-0 text-gold-400" aria-hidden />
              Organisé par <strong className="font-semibold text-white">{event.organizer}</strong>
            </p>
          )}

          <ul className="mt-5 flex flex-wrap gap-2">
            {[
              { icon: CalendarDays, label: formatDate(event.starts_at) },
              { icon: Clock, label: timeLabel },
              { icon: MapPin, label: `${event.venue} · ${event.city}` },
            ].map((m) => (
              <li
                key={m.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-zinc-100 backdrop-blur"
              >
                <m.icon className="size-4 shrink-0 text-gold-400" aria-hidden />
                {m.label}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                {soldOut ? 'Billetterie' : 'Billets dès'}
              </p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums text-gold-300 md:text-4xl">
                {soldOut
                  ? 'Complet'
                  : event.min_price !== null
                    ? formatAr(event.min_price)
                    : 'Prix à venir'}
              </p>
              {!soldOut && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-300">
                  {event.soon_full && <Flame className="size-4 text-red-400" aria-hidden />}
                  {event.total_available} place{event.total_available > 1 ? 's' : ''} restante{event.total_available > 1 ? 's' : ''}
                </p>
              )}
            </div>
            {soldOut ? (
              <span className="inline-flex h-12 cursor-not-allowed items-center rounded-xl bg-white/10 px-6 font-bold text-zinc-400">
                Événement complet
              </span>
            ) : (
              <a
                href="#billets"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-gold-400 px-6 font-bold text-night-950 shadow-lg shadow-gold-500/20 transition hover:bg-gold-300"
              >
                <Ticket className="size-5" aria-hidden /> Choisir mes billets
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ===== Corps : infos + billetterie ===== */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-8">
          {/* Infos pratiques */}
          <section aria-label="Informations pratiques" className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: CalendarDays, label: 'Date', value: formatDate(event.starts_at) },
              { icon: Clock, label: 'Horaire', value: timeLabel },
              {
                icon: MapPin,
                label: 'Lieu',
                value: `${event.venue} · ${event.city}`,
                sub: event.address,
              },
              {
                icon: Ticket,
                label: 'Places restantes',
                value: soldOut ? 'Complet' : String(event.total_available),
                alert: !soldOut && event.soon_full,
              },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <c.icon className="size-5" aria-hidden />
                </span>
                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {c.label}
                </p>
                <p className={`mt-0.5 text-sm font-semibold ${c.alert ? 'text-red-600' : 'text-zinc-900'}`}>
                  {c.value}
                </p>
                {c.sub && <p className="mt-0.5 text-xs text-zinc-500">{c.sub}</p>}
              </div>
            ))}
          </section>

          {/* À propos */}
          {event.description && (
            <section
              aria-label="À propos de cet événement"
              className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6"
            >
              <h2 className="font-display text-lg font-bold tracking-tight">À propos</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-600">
                {event.description}
              </p>
            </section>
          )}

          {/* Billets */}
          <section id="billets" aria-label="Billets disponibles" className="scroll-mt-28 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
                Billets
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold tabular-nums text-brand-700">
                  {event.ticket_types.length}
                </span>
              </h2>
              <p className="text-xs text-zinc-500">Maximum 10 billets par catégorie.</p>
            </div>
            {soldOut && (
              <p role="status" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                Cet événement affiche complet. Revenez sur la liste pour découvrir d’autres sorties.
              </p>
            )}
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

          {/* Garanties */}
          <section aria-label="Garanties" className="grid gap-3 sm:grid-cols-3">
            {TRUST_ITEMS.map((g) => (
              <div key={g.title} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <g.icon className="size-5" aria-hidden />
                </span>
                <p className="mt-3 text-sm font-bold">{g.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{g.text}</p>
              </div>
            ))}
          </section>
        </div>

        {/* Récapitulatif sticky */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Commande">
          <OrderSummary
            lines={lines}
            ctaLabel={user ? 'Acheter maintenant' : 'Se connecter pour acheter'}
            onSubmit={handleBuy}
          />
          {!user && lines.length > 0 && (
            <p className="text-center text-xs text-zinc-500">
              Connectez-vous pour passer au paiement Mobile Money.
            </p>
          )}
          <div className="rounded-2xl bg-night-950 p-5 text-white">
            <p className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="size-4 text-gold-400" aria-hidden />
              Achat 100 % sécurisé
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
              MVola, Orange Money, Airtel Money. Vos billets QR sont générés
              dès la confirmation du paiement.
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}
