/**
 * Skeletons du backoffice admin, style shadcn.
 * `aria-hidden` + enveloppe `role="status"`.
 */

/* ---------- Accueil admin : KPI + 2 colonnes ---------- */
export function AdminHomeSkeleton() {
  return (
    <div role="status" aria-label="Chargement du tableau de bord" className="space-y-4 sm:space-y-6">
      <div aria-hidden className="space-y-1.5">
        <div className="skeleton h-8 w-56 max-w-full" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>
      <div aria-hidden className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton size-10 rounded-xl" />
            </div>
            <div className="skeleton mt-3 h-8 w-24 max-w-full" />
            <div className="skeleton mt-2 h-3 w-32 max-w-full" />
          </div>
        ))}
      </div>
      <div aria-hidden className="grid gap-3 sm:gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-3">
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
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
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

/* ---------- Liste événements admin : miroir de EventsTable ---------- */
export function EventsTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Chargement des événements" className="space-y-3">
      {/* Barre d'outils */}
      <div aria-hidden className="flex flex-wrap items-center gap-2">
        <div className="skeleton h-9 min-w-52 flex-1 rounded-lg sm:max-w-xs" />
        <div className="skeleton h-9 min-w-44 rounded-lg" />
        <div className="skeleton h-4 w-24" />
      </div>

      {/* Tableau */}
      <div aria-hidden className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-200 text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              {['Événement', 'Date', 'Vendues', 'Statut', 'Actions'].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5">
                    <span className="skeleton size-9 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1 space-y-1.5">
                      <span className="skeleton block h-4 w-40 max-w-full" />
                      <span className="skeleton block h-3 w-56 max-w-full" />
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="skeleton block h-4 w-24" />
                </td>
                <td className="px-4 py-3">
                  <span className="block min-w-24 space-y-1.5">
                    <span className="skeleton block h-4 w-16" />
                    <span className="skeleton block h-1 w-full rounded-full" />
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="skeleton block h-6 w-20 rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <span key={j} className="skeleton size-8 rounded-md" />
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div aria-hidden className="flex flex-wrap items-center justify-between gap-2">
        <div className="skeleton h-8 w-36 rounded-lg" />
        <div className="skeleton h-4 w-24" />
        <div className="flex gap-1">
          <div className="skeleton h-8 w-20 rounded-lg" />
          <div className="skeleton h-8 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
