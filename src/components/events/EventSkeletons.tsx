/**
 * Skeletons "pro" calqués sur le design réel des pages.
 * Chaque skeleton est `aria-hidden` + enveloppé dans un `role="status"`.
 */

function Bars({ widths }: { widths: string[] }) {
  return (
    <>
      {widths.map((w, i) => (
        <div key={i} aria-hidden className={`skeleton h-4 ${w}`} />
      ))}
    </>
  );
}

/* ---------- Détail événement : miroir de EventDetailPage ---------- */
export function EventDetailSkeleton() {
  return (
    <div role="status" aria-label="Chargement de l'événement" className="space-y-8 pb-20 lg:pb-0">
      {/* Hero affiche */}
      <div className="bleed grain relative overflow-hidden bg-night-950">
        <div aria-hidden className="hero-glow pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-5 md:px-2 md:pb-20">
          <div className="flex items-center justify-between">
            <div className="skeleton-shimmer h-9 w-44 rounded-full" />
            <div className="skeleton-shimmer h-9 w-28 rounded-full" />
          </div>
          <div className="mt-8 grid items-center gap-10 md:mt-10 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Colonne éditoriale */}
            <div>
              <div className="flex items-start gap-4">
                <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 py-2 backdrop-blur md:w-20 md:py-3">
                  <div className="skeleton-shimmer h-7 w-8 rounded md:h-9" />
                  <div className="skeleton-shimmer h-2.5 w-10 rounded" />
                  <div className="skeleton-shimmer h-2.5 w-8 rounded" />
                </div>
                <div className="min-w-0 flex-1 space-y-2 pt-1">
                  <div className="flex gap-2">
                    <div className="skeleton-shimmer h-6 w-20 rounded-full" />
                    <div className="skeleton-shimmer h-6 w-24 rounded-full" />
                  </div>
                  <div className="skeleton-shimmer h-10 w-full rounded-md md:h-14" />
                  <div className="skeleton-shimmer h-10 w-2/3 rounded-md md:h-14" />
                </div>
              </div>
              {/* Organisé par + lieu */}
              <div className="mt-4 flex items-center gap-2.5">
                <div className="skeleton-shimmer size-8 shrink-0 rounded-full" />
                <div className="skeleton-shimmer h-4 w-48 rounded" />
              </div>
              <div className="skeleton-shimmer mt-2 h-4 w-72 max-w-full rounded" />
              {/* Compte à rebours */}
              <div className="mt-6 flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex min-w-[68px] flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <div className="skeleton-shimmer h-6 w-8 rounded" />
                    <div className="skeleton-shimmer h-2 w-8 rounded" />
                  </div>
                ))}
              </div>
              {/* CTA desktop */}
              <div className="mt-7 hidden items-center gap-5 lg:flex">
                <div className="skeleton-shimmer h-[52px] w-56 rounded-xl" />
                <div className="skeleton-shimmer h-5 w-24 rounded" />
              </div>
            </div>
            {/* Poster incliné */}
            <div className="relative mx-auto w-full max-w-sm">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -rotate-3 rounded-3xl bg-gradient-to-br from-brand-600/40 to-gold-500/30 blur-2xl"
              />
              <div className="relative rotate-2 overflow-hidden rounded-3xl bg-night-900 shadow-2xl ring-1 ring-white/15">
                <div className="skeleton-shimmer h-60 w-full md:h-72" />
                <div aria-hidden className="absolute right-4 top-4 size-20 rounded-full bg-white/10" />
                <div className="space-y-2.5 p-5">
                  <div className="skeleton-shimmer h-3 w-28 rounded" />
                  <div className="skeleton-shimmer h-5 w-4/5 rounded" />
                  <div className="skeleton-shimmer h-4 w-3/5 rounded" />
                </div>
                <div className="relative border-t-2 border-dashed border-white/20 px-5 py-4">
                  <span aria-hidden className="absolute -left-3 -top-3 size-6 rounded-full bg-night-950" />
                  <span aria-hidden className="absolute -right-3 -top-3 size-6 rounded-full bg-night-950" />
                  <div className="flex items-center justify-between">
                    <div className="skeleton-shimmer size-11 rounded-xl" />
                    <div className="skeleton-shimmer h-4 w-28 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Carte billetterie en chevauchement */}
      <div aria-hidden className="relative z-10 -mt-10 md:-mt-12">
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl md:p-6">
          <div className="flex items-center justify-between">
            <div className="skeleton h-5 w-24" />
            <div className="skeleton h-5 w-20" />
          </div>
          <div className="skeleton mt-2 h-2.5 w-full rounded-full" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="skeleton size-9 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-16" />
                  <div className="skeleton h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-8">
          {/* À propos */}
          <div aria-hidden className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-5 md:p-6">
            <div className="skeleton h-5 w-24" />
            <Bars widths={['w-full', 'w-full', 'w-2/3']} />
          </div>

          {/* Billets */}
          <div aria-hidden className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="skeleton h-6 w-20" />
                <div className="skeleton h-6 w-8 rounded-full" />
              </div>
              <div className="skeleton h-4 w-44" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="skeleton h-5 w-32" />
                    <div className="skeleton h-6 w-20 rounded-full" />
                  </div>
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-4 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="skeleton size-8 rounded-full" />
                  <div className="skeleton h-6 w-8" />
                  <div className="skeleton size-8 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Garanties */}
          <div aria-hidden className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:gap-0 sm:divide-x sm:divide-zinc-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-1 items-center gap-3 sm:justify-center sm:px-4">
                <div className="skeleton size-10 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Récapitulatif commande */}
        <aside aria-hidden className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton mt-3 h-4 w-5/6" />
            <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-3">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-5 w-2/3" />
            </div>
            <div className="skeleton mt-4 h-12 w-full rounded-lg" />
          </div>
          <div className="rounded-2xl bg-night-950 p-5">
            <div className="skeleton-shimmer h-5 w-40 rounded" />
            <div className="skeleton-shimmer mt-2 h-3 w-full rounded" />
            <div className="skeleton-shimmer mt-1.5 h-3 w-4/5 rounded" />
          </div>
        </aside>
      </div>

      {/* Barre d'achat mobile */}
      <div aria-hidden className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-5 w-28" />
            <div className="skeleton h-3 w-36" />
          </div>
          <div className="skeleton h-11 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Accueil : souche ticket du hero ---------- */
export function HeroTicketSkeleton() {
  return (
    <div role="status" aria-label="Chargement de l'événement à l'affiche">
      <div aria-hidden className="relative overflow-hidden rounded-3xl bg-night-950">
        <div className="h-44 w-full bg-white/10" />
        <div className="space-y-3 p-5">
          <div className="h-6 w-28 rounded-full bg-white/10" />
          <div className="h-6 w-4/5 rounded-md bg-white/15" />
          <div className="h-4 w-3/5 rounded-md bg-white/10" />
        </div>
        <div className="relative border-t-2 border-dashed border-white/20 px-5 py-4">
          <span className="absolute -left-3 -top-3 size-6 rounded-full bg-zinc-50" />
          <span className="absolute -right-3 -top-3 size-6 rounded-full bg-zinc-50" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-white/10" />
              <div className="space-y-1.5">
                <div className="h-3 w-16 rounded bg-white/10" />
                <div className="h-5 w-20 rounded bg-white/15" />
              </div>
            </div>
            <div className="h-10 w-24 rounded-xl bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page événements : sidebar des filtres ---------- */
export function FiltersSkeleton() {
  return (
    <div role="status" aria-label="Chargement des filtres">
      <div
        aria-hidden
        className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
      >
        <div className="flex items-center justify-between">
          <div className="skeleton h-5 w-24" />
          <div className="skeleton h-4 w-16" />
        </div>
        {[5, 3, 4].map((rows, s) => (
          <div key={s} className="space-y-2">
            <div className="skeleton h-3 w-20" />
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="skeleton h-9 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
