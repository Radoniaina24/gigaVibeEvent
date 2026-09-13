import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Flame,
  MapPin,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { useCategories, usePublishedEvents } from '../../hooks/useEvents';
import { usePageMeta } from '../../hooks/usePageMeta';
import { EventCard } from '../../components/events/EventCard';
import { EventGrid } from '../../components/events/EventGrid';
import { EventSearchBar } from '../../components/events/EventSearchBar';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../lib/utils';

const HOW_IT_WORKS = [
  {
    icon: Ticket,
    step: '01',
    title: 'Choisissez',
    text: 'Parcourez les événements et sélectionnez vos billets en quelques clics.',
  },
  {
    icon: Smartphone,
    step: '02',
    title: 'Payez',
    text: 'MVola, Orange Money ou Airtel Money, via un paiement sécurisé côté serveur.',
  },
  {
    icon: QrCode,
    step: '03',
    title: 'Recevez',
    text: 'Billets QR Code uniques, vérifiables et téléchargeables immédiatement.',
  },
];

const PAYMENT_METHODS = ['MVola', 'Orange Money', 'Airtel Money'];

function SectionHeader({
  eyebrow,
  title,
  linkTo,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h2>
      </div>
      {linkTo && linkLabel && (
        <Link
          to={linkTo}
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
        >
          {linkLabel} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function HomePage() {
  usePageMeta(
    'Accueil',
    'Billetterie événementielle à Madagascar — concerts, festivals, sport, conférences. Paiement Mobile Money sécurisé.',
  );
  const eventsQuery = usePublishedEvents();
  const categoriesQuery = useCategories();

  const events = eventsQuery.data ?? [];
  const popular = events.filter((e) => e.is_featured).slice(0, 3);
  const lastChance = events.filter((e) => e.soon_full).slice(0, 8);
  const upcoming = [...events]
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
    .slice(0, 6);
  const totalAvailable = events.reduce((s, e) => s + e.total_available, 0);

  const heroEvent =
    popular.find((e) => e.image_url) ?? upcoming.find((e) => e.image_url);

  const countByCategory = new Map<string, number>();
  for (const e of events) {
    if (e.category)
      countByCategory.set(e.category.slug, (countByCategory.get(e.category.slug) ?? 0) + 1);
  }

  return (
    <div className="space-y-14 md:space-y-20">
      {/* ===== Hero immersif ===== */}
      <section
        aria-label="Présentation"
        className="grain hero-glow relative overflow-hidden rounded-3xl bg-night-950 text-white"
      >
        {heroEvent?.image_url && (
          <>
            <img
              src={heroEvent.image_url}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-night-950 via-night-950/70 to-night-950/30"
            />
          </>
        )}
        <div className="relative px-6 py-16 text-center md:px-12 md:py-24">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur">
            <MapPin className="size-3.5 text-gold-400" aria-hidden />
            Madagascar · Billetterie officielle
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Vivez chaque <span className="text-spotlight">événement</span>.
            <br />
            Réservez en 2 minutes.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm text-zinc-300 md:text-base">
            Concerts, festivals, sport et conférences. Payez en Mobile Money et
            recevez vos billets QR Code immédiatement.
          </p>
          <div className="mt-8">
            <EventSearchBar />
          </div>

          <dl className="mx-auto mt-10 flex max-w-lg justify-center gap-8 text-center md:gap-12">
            {[
              { value: String(events.length), label: 'événements' },
              { value: String(totalAvailable), label: 'places' },
              { value: String(categoriesQuery.data?.length ?? '—'), label: 'catégories' },
            ].map((s) => (
              <div key={s.label}>
                <dd className="font-display text-2xl font-bold tabular-nums text-white md:text-3xl">
                  {s.value}
                </dd>
                <dt className="mt-0.5 text-xs uppercase tracking-widest text-zinc-400">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <ShieldCheck className="size-4 text-gold-400" aria-hidden />
              Paiement sécurisé :
            </span>
            {PAYMENT_METHODS.map((m) => (
              <span
                key={m}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Catégories ===== */}
      <section aria-label="Explorer par catégorie">
        {categoriesQuery.isPending ? (
          <div
            className="flex gap-2 overflow-hidden"
            role="status"
            aria-label="Chargement des catégories"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-10 w-32 shrink-0 rounded-full" />
            ))}
          </div>
        ) : (categoriesQuery.data ?? []).length === 0 ? null : (
          <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {(categoriesQuery.data ?? []).map((c) => (
              <li key={c.id} className="shrink-0">
                <Link
                  to={`/events?category=${encodeURIComponent(c.slug)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:border-brand-600 hover:text-brand-700 hover:shadow-md"
                >
                  {c.name}
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs tabular-nums text-brand-700">
                    {countByCategory.get(c.slug) ?? 0}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ===== À l'affiche ===== */}
      <EventGrid
        title={
          <SectionHeader
            eyebrow="Sélection"
            title="À l'affiche"
            linkTo="/events?sort=popular"
            linkLabel="Tout voir"
          />
        }
        events={popular}
        isPending={eventsQuery.isPending}
        isError={eventsQuery.isError}
        onRetry={() => eventsQuery.refetch()}
        skeletonCount={3}
        emptyTitle="Aucun événement en vedette pour le moment."
      />

      {/* ===== Dernière chance (urgence) ===== */}
      {!eventsQuery.isPending && !eventsQuery.isError && lastChance.length > 0 && (
        <section aria-label="Dernière chance">
          <SectionHeader
            eyebrow="Urgence"
            title="Dernière chance"
            linkTo="/events?soonFullOnly=1"
            linkLabel="Tous les presque complets"
          />
          <div className="no-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
            {lastChance.map((e) => (
              <div key={e.id} className="w-72 shrink-0 snap-start md:w-80">
                <EventCard event={e} />
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
            <Flame className="size-4 text-red-500" aria-hidden />
            Ces événements affichent presque complet — ne tardez pas.
          </p>
        </section>
      )}

      {/* ===== À venir ===== */}
      <EventGrid
        title={
          <SectionHeader
            eyebrow="Agenda"
            title="Événements à venir"
            linkTo="/events"
            linkLabel="Tout voir"
          />
        }
        events={upcoming}
        isPending={eventsQuery.isPending}
        isError={eventsQuery.isError}
        onRetry={() => eventsQuery.refetch()}
        skeletonCount={6}
      />

      {/* ===== Comment ça marche (bandeau nuit) ===== */}
      <section
        aria-label="Comment ça marche"
        className="grain hero-glow relative overflow-hidden rounded-3xl bg-night-950 px-6 py-12 text-white md:px-12 md:py-16"
      >
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-400">
            Simple comme bonjour
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight md:text-3xl">
            Comment ça marche
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3 md:gap-8">
            {HOW_IT_WORKS.map((s) => (
              <li key={s.step} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-600/40">
                    <s.icon className="size-5 text-white" aria-hidden />
                  </span>
                  <span aria-hidden className="font-display text-3xl font-bold text-white/15">
                    {s.step}
                  </span>
                </div>
                <p className="mt-4 font-display text-lg font-bold">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-300">{s.text}</p>
              </li>
            ))}
          </ol>
          {upcoming[0] && (
            <p className="mt-8 text-center text-sm text-zinc-400">
              Prochain rendez-vous :{' '}
              <Link
                to={`/events/${upcoming[0].slug}`}
                className="font-semibold text-gold-300 hover:underline"
              >
                {upcoming[0].title} — {formatDate(upcoming[0].starts_at)}
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* ===== CTA souche de billet ===== */}
      <section
        aria-label="Créer un compte"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-night-900 text-white"
      >
        <div aria-hidden className="perf-y absolute inset-y-0 left-4 w-2 opacity-40" />
        <div aria-hidden className="perf-y absolute inset-y-0 right-4 w-2 opacity-40" />
        <div className="px-10 py-12 text-center md:px-16 md:py-16">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold">
            <Sparkles className="size-3.5 text-gold-300" aria-hidden />
            Compte gratuit · Billets conservés · QR Code inclus
          </p>
          <h2 className="mx-auto mt-4 max-w-xl font-display text-2xl font-bold tracking-tight md:text-4xl">
            Prêt à sortir ce week-end ?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-brand-100 md:text-base">
            Créez votre compte et retrouvez tous vos billets au même endroit,
            à tout moment.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/events">
              <Button
                size="lg"
                className="w-full bg-white text-brand-700 shadow-xl hover:bg-brand-50 sm:w-auto"
              >
                Voir les événements <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Link>
            <Link to="/register">
              <Button
                size="lg"
                className="w-full border border-gold-400/60 bg-gold-400 text-night-950 shadow-xl shadow-gold-500/20 hover:bg-gold-300 sm:w-auto"
              >
                Créer un compte gratuit
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
