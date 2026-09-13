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
    <div role="status" aria-label="Chargement de l'événement" className="space-y-6">
      {/* Lien retour */}
      <div aria-hidden className="skeleton h-5 w-40" />
      {/* Visuel 21/9 */}
      <div aria-hidden className="skeleton aspect-[21/9] w-full rounded-2xl" />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* En-tête : badges + titre */}
          <div aria-hidden>
            <div className="flex gap-2">
              <div className="skeleton h-6 w-20 rounded-full" />
              <div className="skeleton h-6 w-24 rounded-full" />
            </div>
            <div className="skeleton mt-3 h-8 w-3/4" />
          </div>

          {/* Carte infos (date / heure / lieu / orga) */}
          <div aria-hidden className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="skeleton size-4 shrink-0 rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-16" />
                  <div className="skeleton h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div aria-hidden className="space-y-2">
            <div className="skeleton h-5 w-24" />
            <Bars widths={['w-full', 'w-full', 'w-2/3']} />
          </div>

          {/* Billets */}
          <div aria-hidden className="space-y-3">
            <div className="skeleton h-5 w-40" />
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
                  <div className="skeleton h-4 w-24" />
                </div>
                <div className="skeleton h-9 w-28 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Récapitulatif commande */}
        <aside aria-hidden className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="skeleton h-5 w-32" />
            <div className="mt-3 space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
            </div>
            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-5 w-2/3" />
            </div>
            <div className="skeleton mt-4 h-12 w-full rounded-lg" />
          </div>
        </aside>
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
