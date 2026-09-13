import { useEffect, useMemo, useState } from 'react';
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

/** Compte à rebours vivant (figé si l'utilisateur réduit les animations). */
function useCountdown(targetIso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(targetIso).getTime() - now);
  return {
    diff,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    mins: Math.floor(diff / 60_000) % 60,
    secs: Math.floor(diff / 1000) % 60,
  };
}

const TRUST_ITEMS = [
  { icon: ShieldCheck, title: 'Paiement sécurisé', text: 'MVola · Orange · Airtel' },
  { icon: QrCode, title: 'QR Code unique', text: 'Vérifié à l’entrée' },
  { icon: RotateCcw, title: 'Remboursé si annulé', text: 'Automatiquement' },
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

  const countdown = useCountdown(event?.starts_at ?? '');

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
  const dayNum = new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(new Date(event.starts_at));
  const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
    .format(new Date(event.starts_at))
    .replace('.', '')
    .toUpperCase();
  const yearLabel = new Intl.DateTimeFormat('fr-FR', { year: 'numeric' }).format(new Date(event.starts_at));
  const soldPct =
    event.total_quantity > 0
      ? Math.min(
          100,
          Math.round(
            ((event.total_quantity - event.total_available) / event.total_quantity) * 100,
          ),
        )
      : 0;
  const priceLabel =
    soldOut || event.min_price === null ? null : formatAr(event.min_price);

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
    <article className="space-y-8 pb-20 md:space-y-10 lg:pb-0">
      {/* ===== Hero affiche ===== */}
      <section aria-label={event.title} className="bleed grain relative overflow-hidden bg-night-950 text-white">
        <div aria-hidden className="hero-glow pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-5 md:px-2 md:pb-20">
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

          <div className="mt-8 grid items-center gap-10 md:mt-10 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Colonne éditoriale */}
            <div>
              <div className="flex items-start gap-4">
                <div aria-label={`Le ${formatDate(event.starts_at)}`} className="flex w-16 shrink-0 flex-col items-center rounded-2xl border border-white/15 bg-white/10 py-2 backdrop-blur md:w-20 md:py-3">
                  <span className="font-display text-2xl font-bold leading-none tabular-nums md:text-4xl">
                    {dayNum}
                  </span>
                  <span className="mt-1 text-[10px] font-bold tracking-[0.2em] text-gold-300 md:text-xs">
                    {monthLabel}
                  </span>
                  <span className="text-[10px] tabular-nums text-zinc-400">{yearLabel}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    {event.category && <Badge tone="info">{event.category.name}</Badge>}
                    {event.is_featured && <Badge tone="warning">Populaire</Badge>}
                    {event.soon_full && !soldOut && (
                      <Badge tone="danger">
                        <Flame className="mr-1 size-3" aria-hidden /> Bientôt complet
                      </Badge>
                    )}
                    {soldOut && <Badge tone="neutral">Complet</Badge>}
                  </div>
                  <h1 className="mt-2 font-display text-4xl font-bold leading-[1.02] tracking-tight md:text-6xl">
                    {event.title}
                  </h1>
                </div>
              </div>

              {event.organizer && (
                <p className="mt-4 flex items-center gap-1.5 text-sm text-zinc-300">
                  <User className="size-4 shrink-0 text-gold-400" aria-hidden />
                  Organisé par <strong className="font-semibold text-white">{event.organizer}</strong>
                </p>
              )}
              <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-300">
                <MapPin className="size-4 shrink-0 text-gold-400" aria-hidden />
                {event.venue} · {event.city} — {timeLabel}
              </p>

              {/* Compte à rebours */}
              {countdown.diff > 0 && (
                <div className="mt-6 flex gap-2" role="timer" aria-label="Temps restant avant l'événement">
                  {[
                    { v: countdown.days, l: countdown.days > 1 ? 'jours' : 'jour' },
                    { v: countdown.hours, l: 'h' },
                    { v: countdown.mins, l: 'min' },
                    { v: countdown.secs, l: 'sec' },
                  ].map((u) => (
                    <div
                      key={u.l}
                      className="min-w-[68px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center backdrop-blur"
                    >
                      <p className="font-display text-2xl font-bold tabular-nums leading-none">
                        {String(u.v).padStart(2, '0')}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                        {u.l}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-7 hidden items-center gap-5 lg:flex">
                {soldOut ? (
                  <span className="inline-flex h-13 items-center rounded-xl bg-white/10 px-7 py-3.5 font-bold text-zinc-400">
                    Événement complet
                  </span>
                ) : (
                  <a
                    href="#billets"
                    className="inline-flex items-center gap-2 rounded-xl bg-gold-400 px-7 py-3.5 font-bold text-night-950 shadow-lg shadow-gold-500/20 transition hover:bg-gold-300"
                  >
                    <Ticket className="size-5" aria-hidden /> Choisir mes billets
                  </a>
                )}
                {priceLabel && (
                  <p className="text-sm text-zinc-300">
                    dès <strong className="font-display text-xl font-bold tabular-nums text-gold-300">{priceLabel}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Poster incliné */}
            <div className="relative mx-auto w-full max-w-sm">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -rotate-3 rounded-3xl bg-gradient-to-br from-brand-600/40 to-gold-500/30 blur-2xl"
              />
              <div className="relative rotate-2 overflow-hidden rounded-3xl bg-night-900 text-white shadow-2xl ring-1 ring-white/15 transition-transform duration-300 hover:rotate-0">
                {event.image_url ? (
                  <img src={event.image_url} alt="" className="h-60 w-full object-cover md:h-72" />
                ) : (
                  <EventImage seed={event.id} imageUrl={null} title="" className="h-60 w-full md:h-72" />
                )}
                {/* Pastille prix */}
                {!soldOut && priceLabel && (
                  <div aria-hidden className="absolute right-4 top-4 flex size-20 rotate-12 flex-col items-center justify-center rounded-full bg-gold-400 text-center text-night-950 shadow-lg">
                    <span className="text-[9px] font-bold uppercase tracking-wider">dès</span>
                    <span className="px-1 font-display text-[11px] font-bold leading-tight tabular-nums">{priceLabel}</span>
                  </div>
                )}
                <div className="p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gold-300">
                    Billet officiel
                  </p>
                  <p className="mt-1.5 line-clamp-1 font-display text-lg font-bold">{event.title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-300">
                    <CalendarDays className="size-4 shrink-0" aria-hidden />
                    {formatDate(event.starts_at)} · {event.venue}
                  </p>
                </div>
                <div className="relative border-t-2 border-dashed border-white/20 px-5 py-4">
                  <span aria-hidden className="absolute -left-3 -top-3 size-6 rounded-full bg-night-950" />
                  <span aria-hidden className="absolute -right-3 -top-3 size-6 rounded-full bg-night-950" />
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-white">
                      <QrCode className="size-6 text-night-950" aria-hidden />
                    </span>
                    <p className={`text-sm font-semibold ${soldOut ? 'text-zinc-400' : event.soon_full ? 'text-red-400' : 'text-zinc-200'}`}>
                      {soldOut
                        ? 'Complet'
                        : `${event.total_available} place${event.total_available > 1 ? 's' : ''} restantes`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Carte billetterie en chevauchement ===== */}
      <div className="relative z-10 -mt-10 md:-mt-12">
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl md:p-6">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="font-bold">Billetterie</p>
            <p className="font-bold tabular-nums text-brand-700">{soldPct} % vendus</p>
          </div>
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-100"
            role="progressbar"
            aria-valuenow={soldPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${soldPct} pourcent des billets vendus`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-gold-500 transition-[width]"
              style={{ width: `${soldPct}%` }}
            />
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: CalendarDays, label: 'Date', value: formatDate(event.starts_at) },
              { icon: Clock, label: 'Horaire', value: timeLabel },
              { icon: MapPin, label: 'Lieu', value: `${event.venue}`, sub: `${event.city}${event.address ? ` · ${event.address}` : ''}` },
              {
                icon: Ticket,
                label: 'Disponibilités',
                value: soldOut ? 'Complet' : `${event.total_available} places`,
                alert: !soldOut && event.soon_full,
              },
            ].map((c) => (
              <div key={c.label} className="flex items-start gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <c.icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{c.label}</dt>
                  <dd className={`truncate text-sm font-semibold ${c.alert ? 'text-red-600' : 'text-zinc-900'}`} title={c.value}>
                    {c.value}
                  </dd>
                  {c.sub && <dd className="truncate text-xs text-zinc-500" title={c.sub}>{c.sub}</dd>}
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* ===== Corps : à propos + billetterie ===== */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-8">
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
          <section
            aria-label="Garanties"
            className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:divide-x sm:divide-zinc-100 sm:gap-0"
          >
            {TRUST_ITEMS.map((g) => (
              <div key={g.title} className="flex flex-1 items-center gap-3 sm:justify-center sm:px-4 sm:first:pl-0 sm:last:pr-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <g.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold">{g.title}</p>
                  <p className="text-xs text-zinc-500">{g.text}</p>
                </div>
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

      {/* ===== Barre d'achat mobile ===== */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold tabular-nums leading-tight">
              {soldOut ? 'Complet' : priceLabel ? `dès ${priceLabel}` : 'Prix à venir'}
            </p>
            {!soldOut && (
              <p className="truncate text-xs text-zinc-500">
                {event.total_available} place{event.total_available > 1 ? 's' : ''} restante{event.total_available > 1 ? 's' : ''}
              </p>
            )}
          </div>
          {soldOut ? (
            <span className="inline-flex h-11 shrink-0 cursor-not-allowed items-center rounded-xl bg-zinc-100 px-5 text-sm font-bold text-zinc-400">
              Complet
            </span>
          ) : (
            <a
              href="#billets"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-bold text-white transition hover:bg-zinc-700"
            >
              <Ticket className="size-4" aria-hidden /> Choisir
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
