/**
 * Skeletons de l'espace organisateur, style shadcn.
 * `aria-hidden` + enveloppe `role="status"`.
 */

export function PartnerHomeSkeleton() {
  return (
    <div role="status" aria-label="Chargement de l'espace organisateur" className="space-y-6">
      <div aria-hidden className="space-y-1.5">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div aria-hidden className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton size-4 rounded" />
            </div>
            <div className="skeleton mt-3 h-8 w-20" />
            <div className="skeleton mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
      <div aria-hidden className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="skeleton h-5 w-48" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-3 w-1/2" />
              </div>
              <div className="skeleton h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PartnerRowsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Chargement des événements" className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-3 w-2/3" />
          </div>
          <div className="skeleton h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ---------- Formulaire événement : miroir de PartnerEventFormPage (édition) ---------- */
export function PartnerEventFormSkeleton() {
  return (
    <div role="status" aria-label="Chargement de l'événement" className="max-w-3xl space-y-6">
      <div aria-hidden className="skeleton h-4 w-36" />
      <div aria-hidden className="flex flex-wrap items-center justify-between gap-2">
        <div className="skeleton h-8 w-72 max-w-full" />
        <div className="skeleton h-5 w-24 rounded-full" />
      </div>
      {Array.from({ length: 3 }).map((_, c) => (
        <div
          key={c}
          aria-hidden
          className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="skeleton h-5 w-48" />
          <div className="skeleton h-10 w-full rounded-lg" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="skeleton h-10 w-full rounded-lg" />
            <div className="skeleton h-10 w-full rounded-lg" />
          </div>
          <div className="skeleton h-24 w-full rounded-lg" />
        </div>
      ))}
      <div aria-hidden className="flex gap-2">
        <div className="skeleton h-10 w-32 rounded-lg" />
        <div className="skeleton h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}
