/**
 * Skeletons du backoffice admin, style shadcn.
 * `aria-hidden` + enveloppe `role="status"`.
 */

/* ---------- Accueil admin : KPI + 2 colonnes ---------- */
export function AdminHomeSkeleton() {
  return (
    <div role="status" aria-label="Chargement du tableau de bord" className="space-y-6">
      <div aria-hidden className="space-y-1.5">
        <div className="skeleton h-8 w-56" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div aria-hidden className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton size-4 rounded" />
            </div>
            <div className="skeleton mt-3 h-8 w-24" />
            <div className="skeleton mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
      <div aria-hidden className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-3">
          <div className="skeleton h-5 w-48" />
          <div className="skeleton mt-1.5 h-3 w-64" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="skeleton h-5 w-40" />
          <div className="skeleton mt-1.5 h-3 w-56" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-zinc-100 p-3">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton mt-2 h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Lignes de tableau admin ---------- */
export function AdminRowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div role="status" aria-label="Chargement des données" className="space-y-2">
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
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
