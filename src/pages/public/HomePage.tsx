import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
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
import { formatAr, formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';

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

/** Conteneur aéré commun (pleine largeur + marges latérales). */
function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-7xl px-4 md:px-8">{children}</div>;
}

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

  const spotlightList = popular.length > 0 ? popular : upcoming.slice(0, 3);
  const [spotIndex, setSpotIndex] = useState(0);
  const spot = spotlightList[Math.min(spotIndex, Math.max(0, spotlightList.length - 1))];

  const countByCategory = new Map<string, number>();
  for (const e of events) {
    if (e.category)
      countByCategory.set(e.category.slug, (countByCategory.get(e.category.slug) ?? 0) + 1);
  }

  return (
    <div className="space-y-14 md:space-y-20">
      {/* ===== Hero éditorial + souche ticket (pleine largeur) ===== */}
      <section aria-label="Présentation" className="bleed relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 size-96 rounded-full bg-brand-100 blur-3xl" />
          <div className="absolute right-0 top-16 size-80 rounded-full bg-gold-300/40 blur-3xl" />
        </div>

        <Container>
          <div className="relative grid items-center gap-10 py-8 md:py-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-xs font-bold text-brand-700 shadow-sm">
                <MapPin className="size-3.5" aria-hidden />
                Madagascar · Billetterie officielle
              </p>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-zinc-900 md:text-6xl">
                La scène malgache,
                <br />
                <span className="text-brand-600">vos billets</span> en poche.
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-zinc-600 md:text-base">
                Concerts, festivals, sport et conférences. Payez en Mobile Money
                et recevez vos billets QR Code immédiatement.
              </p>
              <div className="mt-7 max-w-xl">
                <EventSearchBar />
              </div>
              <dl className="mt-7 flex gap-8">
                {[
                  { value: String(events.length), label: 'événements' },
                  { value: String(totalAvailable), label: 'places' },
                  { value: String(categoriesQuery.data?.length ?? '—'), label: 'catégories' },
                ].map((s) => (
                  <div key={s.label}>
                    <dd className="font-display text-2xl font-bold tabular-nums md:text-3xl">
                      {s.value}
                    </dd>
                    <dt className="mt-0.5 text-xs uppercase tracking-widest text-zinc-500">
                      {s.label}
                    </dt>
                  </div>
                ))}
              </dl>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                  <ShieldCheck className="size-4 text-brand-600" aria-hidden />
                  Paiement sécurisé :
                </span>
                {PAYMENT_METHODS.map((m) => (
                  <span
                    key={m}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold shadow-sm"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Souche ticket interactive */}
            <div className="relative mx-auto w-full max-w-sm">
              {spot ? (
                <>
                  <div
                    aria-hidden
                    className="absolute inset-0 translate-x-4 translate-y-4 rotate-6 rounded-3xl bg-brand-600/15"
                  />
                  <article
                    aria-label={`À l'affiche : ${spot.title}`}
                    className="relative rotate-2 overflow-hidden rounded-3xl bg-night-950 text-white shadow-2xl shadow-brand-600/20 transition-transform duration-300 hover:rotate-0"
                  >
                    {spot.image_url ? (
                      <img
                        src={spot.image_url}
                        alt=""
                        aria-hidden
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div aria-hidden className="hero-glow h-44 w-full bg-night-900" />
                    )}
                    <div className="p-5">
                      <p className="inline-flex items-center gap-1.5 rounded-full bg-gold-400 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-night-950">
                        <Sparkles className="size-3.5" aria-hidden /> À l'affiche
                      </p>
                      <h2 className="mt-3 font-display text-xl font-bold leading-tight">
                        <Link to={`/events/${spot.slug}`} className="hover:underline">
                          {spot.title}
                        </Link>
                      </h2>
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-zinc-300">
                        <CalendarDays className="size-4 shrink-0" aria-hidden />
                        {formatDate(spot.starts_at)} · {spot.venue}
                      </p>
                    </div>
                    <div className="relative border-t-2 border-dashed border-white/20 px-5 py-4">
                      <span
                        aria-hidden
                        className="absolute -left-3 -top-3 size-6 rounded-full bg-zinc-50"
                      />
                      <span
                        aria-hidden
                        className="absolute -right-3 -top-3 size-6 rounded-full bg-zinc-50"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-12 items-center justify-center rounded-xl bg-white">
                            <QrCode className="size-7 text-night-950" aria-hidden />
                          </span>
                          <div>
                            <p className="text-xs text-zinc-400">Billets dès</p>
                            <p className="font-display text-lg font-bold tabular-nums text-gold-300">
                              {spot.min_price !== null ? formatAr(spot.min_price) : '—'}
                            </p>
                          </div>
                        </div>
                        <Link
                          to={`/events/${spot.slug}`}
                          className="rounded-xl bg-gold-400 px-5 py-2.5 text-sm font-bold text-night-950 transition hover:bg-gold-300"
                        >
                          Réserver
                        </Link>
                      </div>
                    </div>
                  </article>
                  {spotlightList.length > 1 && (
                    <div
                      role="group"
                      aria-label="Choisir l'événement à l'affiche"
                      className="mt-5 flex justify-center gap-2"
                    >
                      {spotlightList.map((e, i) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setSpotIndex(i)}
                          aria-label={`Voir ${e.title}`}
                          aria-pressed={i === Math.min(spotIndex, spotlightList.length - 1)}
                          title={e.title}
                          className={cn(
                            'h-2.5 rounded-full transition-all',
                            i === Math.min(spotIndex, spotlightList.length - 1)
                              ? 'w-8 bg-brand-600'
                              : 'w-2.5 bg-zinc-300 hover:bg-zinc-400',
                          )}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                !eventsQuery.isPending && (
                  <p className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
                    Les événements à l'affiche apparaîtront ici.
                  </p>
                )
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* ===== Catégories ===== */}
      <section aria-label="Explorer par catégorie" className="bleed">
        <Container>
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
            <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:-mx-8 md:flex-wrap md:px-8">
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
        </Container>
      </section>

      {/* ===== À l'affiche ===== */}
      <div className="bleed">
        <Container>
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
        </Container>
      </div>

      {/* ===== Dernière chance (urgence) ===== */}
      {!eventsQuery.isPending && !eventsQuery.isError && lastChance.length > 0 && (
        <section aria-label="Dernière chance" className="bleed">
          <Container>
            <SectionHeader
              eyebrow="Urgence"
              title="Dernière chance"
              linkTo="/events?soonFullOnly=1"
              linkLabel="Tous les presque complets"
            />
            <div className="no-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
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
          </Container>
        </section>
      )}

      {/* ===== À venir ===== */}
      <div className="bleed">
        <Container>
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
        </Container>
      </div>

      {/* ===== Comment ça marche (frise éditoriale) ===== */}
      <div className="bleed">
        <Container>
          <section aria-label="Comment ça marche">
            <SectionHeader
              eyebrow="Simple comme bonjour"
              title="Comment ça marche"
              linkTo="/events"
              linkLabel="Commencer"
            />
            <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
              <div
                aria-hidden
                className="absolute left-6 right-6 top-16 hidden border-t-2 border-dashed border-brand-200 md:block"
              />
              {HOW_IT_WORKS.map((s) => (
                <li
                  key={s.step}
                  className="relative rounded-3xl border border-zinc-200 bg-white p-6 pt-10 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <span
                    aria-hidden
                    className="absolute -top-9 left-5 select-none font-display text-8xl font-bold tracking-tight text-brand-100"
                  >
                    {s.step}
                  </span>
                  <span className="relative flex size-12 items-center justify-center rounded-2xl bg-night-950 text-gold-400 shadow-lg">
                    <s.icon className="size-6" aria-hidden />
                  </span>
                  <p className="mt-4 font-display text-lg font-bold">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">{s.text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex flex-col items-center gap-3 text-center">
              <Link to="/events">
                <Button size="lg">
                  Parcourir les événements <ArrowRight className="size-4" aria-hidden />
                </Button>
              </Link>
              {upcoming[0] && (
                <p className="text-sm text-zinc-500">
                  Prochain rendez-vous :{' '}
                  <Link
                    to={`/events/${upcoming[0].slug}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {upcoming[0].title} — {formatDate(upcoming[0].starts_at)}
                  </Link>
                </p>
              )}
            </div>
          </section>
        </Container>
      </div>

      {/* ===== CTA billet grand format ===== */}
      <div className="bleed">
        <Container>
          <section
            aria-label="Créer un compte"
            className="relative grid overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl md:grid-cols-[1fr_300px]"
          >
            <div className="p-8 md:p-12">
              <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-bold text-brand-700">
                <Sparkles className="size-3.5" aria-hidden />
                Compte gratuit · Billets conservés · QR Code inclus
              </p>
              <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-zinc-900 md:text-4xl">
                Prêt à sortir ce week-end ?
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-600 md:text-base">
                Créez votre compte et retrouvez tous vos billets au même endroit,
                à tout moment.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    Créer un compte gratuit <ArrowRight className="size-4" aria-hidden />
                  </Button>
                </Link>
                <Link to="/events">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    Voir les événements
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grain hero-glow relative flex flex-col items-center justify-center gap-3 overflow-hidden border-t-2 border-dashed border-zinc-200 bg-night-950 px-6 py-10 text-center text-white md:border-l-2 md:border-t-0">
              <span
                aria-hidden
                className="absolute -top-3 left-8 size-6 rounded-full bg-zinc-50 md:-left-3 md:top-8 md:left-auto"
              />
              <span
                aria-hidden
                className="absolute -top-3 right-8 size-6 rounded-full bg-zinc-50 md:-left-3 md:bottom-8 md:right-auto md:top-auto"
              />
              <p className="relative text-[11px] font-bold uppercase tracking-[0.25em] text-gold-300">
                Compte gratuit
              </p>
              <span className="relative flex size-24 items-center justify-center rounded-2xl bg-white shadow-2xl">
                <QrCode className="size-14 text-night-950" aria-hidden />
              </span>
              <p className="relative font-display text-3xl font-bold tabular-nums">
                0 Ar
              </p>
              <p className="relative text-xs text-zinc-400">
                Pour toujours · Sans engagement
              </p>
            </div>
          </section>
        </Container>
      </div>
    </div>
  );
}
