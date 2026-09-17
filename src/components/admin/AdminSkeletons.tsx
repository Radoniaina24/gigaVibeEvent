/**
 * Skeletons du backoffice admin, style shadcn.
 * `aria-hidden` + enveloppe `role="status"`.
 */
import type { ReactNode } from 'react';

/* ---------- Accueil admin : miroir de AdminDashboardPage ---------- */
export function AdminHomeSkeleton() {
  return (
    <div role="status" aria-label="Chargement du tableau de bord" className="space-y-4 sm:space-y-6">
      {/* En-tête */}
      <div aria-hidden className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="skeleton h-7 w-48 max-w-full" />
          <div className="skeleton mt-1 h-4 w-72 max-w-full" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <div className="skeleton h-8 w-full rounded-lg sm:w-28" />
          <div className="skeleton h-8 w-full rounded-lg sm:w-40" />
        </div>
      </div>

      {/* KPI */}
      <div aria-hidden className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <div className="skeleton h-4 w-28" />
                <div className="skeleton mt-2 h-7 w-28 sm:h-8" />
                <div className="skeleton mt-2 h-3 w-32 max-w-full" />
              </div>
              <div className="skeleton size-10 shrink-0 rounded-xl sm:size-11" />
            </div>
          </div>
        ))}
      </div>

      <div aria-hidden className="grid gap-3 sm:gap-4 lg:grid-cols-5">
        {/* Dernières commandes */}
        <div className="min-w-0 rounded-xl border border-zinc-200 bg-white shadow-sm lg:col-span-3">
          <div className="flex flex-row items-start justify-between gap-2 p-4 sm:p-6">
            <div className="min-w-0">
              <div className="skeleton h-5 w-44" />
              <div className="skeleton mt-1 h-4 w-56 max-w-full" />
            </div>
            <div className="skeleton h-4 w-16 shrink-0" />
          </div>
          <div className="space-y-0 p-4 pt-0 sm:p-6 sm:pt-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="skeleton h-4 w-40 max-w-full" />
                  <div className="skeleton mt-1.5 h-3 w-56 max-w-full" />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div className="skeleton h-4 w-16" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attention requise */}
        <div className="min-w-0 rounded-xl border border-zinc-200 bg-white shadow-sm lg:col-span-2">
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <div className="skeleton size-4 shrink-0 rounded" />
              <div className="skeleton h-5 w-36" />
              <div className="skeleton h-5 w-8 rounded-full" />
            </div>
            <div className="skeleton mt-1.5 h-4 w-48 max-w-full" />
          </div>
          <div className="space-y-2 p-4 pt-0 sm:p-6 sm:pt-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-5 w-16 shrink-0 rounded-full" />
                </div>
                <div className="skeleton mt-1.5 h-3 w-48 max-w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Statistiques admin : miroir de AdminStatisticsPage ---------- */
export function AdminStatisticsSkeleton() {
  return (
    <div role="status" aria-label="Chargement des statistiques" className="space-y-4 sm:space-y-6">
      {/* En-tête clair */}
      <div aria-hidden className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton mt-2 h-8 w-52 max-w-full" />
          <div className="skeleton mt-2 h-4 w-80 max-w-full" />
          <div className="skeleton mt-2 h-3 w-36" />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-2">
            <div className="skeleton h-8 w-28 rounded-xl" />
            <div className="skeleton h-8 w-28 rounded-xl" />
          </div>
          <div className="flex gap-1 self-start rounded-xl border border-zinc-200 bg-white p-1 shadow-sm sm:self-auto">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-7 w-14 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Onglets soulignés */}
      <div aria-hidden className="flex gap-5 border-b border-zinc-200 px-1">
        {['Vue d’ensemble', 'Commandes', 'Événements & paiements'].map((t) => (
          <div key={t} className="flex flex-col items-stretch gap-1.5 py-2.5">
            <div className="skeleton h-4 w-28 rounded" />
            <div className="skeleton h-0.5 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Titre de section + KPI premium : 4 cartes avec liseré + sparkline */}
      <div aria-hidden>
        <div className="skeleton h-3 w-32" />
        <div className="skeleton mt-2 h-6 w-64 max-w-full" />
        <div className="skeleton mt-1.5 h-4 w-80 max-w-full" />
      </div>
      <div aria-hidden className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="relative min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="skeleton h-1 w-full rounded-none" />
            <div className="flex items-start justify-between gap-3 p-4 pt-5 sm:p-5 sm:pt-6">
              <div className="min-w-0 flex-1">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton mt-2 h-8 w-32" />
                <div className="skeleton mt-2 h-3 w-36 max-w-full" />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <div className="skeleton size-10 rounded-xl sm:size-11" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
            </div>
            <div className="px-3 pb-2">
              <div className="skeleton h-9 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Revenus par jour */}
      <div aria-hidden className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 p-4 sm:p-5 sm:pb-4">
          <div className="skeleton size-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <div className="skeleton h-5 w-44" />
            <div className="skeleton mt-1.5 h-4 w-64 max-w-full" />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton h-6 w-28 rounded-full" />
          </div>
        </div>
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="relative h-64 w-full overflow-hidden rounded-lg bg-zinc-50 sm:h-72">
            {/* grille horizontale */}
            <div className="absolute inset-x-8 inset-y-4 flex flex-col justify-between">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border-t border-dashed border-zinc-200" />
              ))}
            </div>
            {/* aire simulée */}
            <div className="absolute inset-x-8 bottom-6 top-8 flex items-end gap-1.5 sm:gap-2">
              {[38, 55, 42, 68, 50, 78, 62, 88, 70, 58, 74, 92, 66, 80, 72].map((h, i) => (
                <div
                  key={i}
                  className="skeleton w-full rounded-t-md"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            {/* axe X */}
            <div className="absolute inset-x-8 bottom-0 flex justify-between gap-2 pt-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="skeleton h-3 w-8" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Section Commandes : miroir de la section Volume & conversion ---------- */}
      <div aria-hidden className="space-y-3 sm:space-y-4">
        {/* Titre de section */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="skeleton h-3 w-28" />
            <div className="skeleton mt-2 h-6 w-56 max-w-full" />
            <div className="skeleton mt-1.5 h-4 w-72 max-w-full" />
          </div>
          <div className="flex shrink-0 gap-2">
            <div className="skeleton h-8 w-28 rounded-xl" />
            <div className="skeleton h-8 w-24 rounded-xl" />
          </div>
        </div>

        {/* KPI commandes : 4 cartes premium */}
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="relative min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="skeleton h-1 w-full rounded-none" />
              <div className="flex items-start justify-between gap-3 p-4 pt-5 sm:p-5 sm:pt-6">
                <div className="min-w-0 flex-1">
                  <div className="skeleton h-3 w-24" />
                  <div className="skeleton mt-2 h-8 w-24" />
                  <div className="skeleton mt-2 h-3 w-36 max-w-full" />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="skeleton size-10 rounded-xl sm:size-11" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
              </div>
              <div className="px-3 pb-2">
                <div className="skeleton h-9 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Courbe commandes + donut statuts */}
        <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-5">
          {/* Tendance : double aire */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:col-span-3">
            <div className="flex items-start gap-3 p-4 sm:p-5 sm:pb-3">
              <div className="skeleton size-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="skeleton h-5 w-44" />
                <div className="skeleton mt-1.5 h-4 w-60 max-w-full" />
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="skeleton h-5 w-16 rounded-full" />
                <div className="skeleton h-6 w-28 rounded-full" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-4 pb-1 sm:px-6">
              <div className="skeleton h-4 w-20 rounded-full" />
              <div className="skeleton h-4 w-16 rounded-full" />
            </div>
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="relative h-64 w-full overflow-hidden rounded-lg bg-zinc-50 sm:h-72">
                <div className="absolute inset-x-8 inset-y-4 flex flex-col justify-between">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="border-t border-dashed border-zinc-200" />
                  ))}
                </div>
                <div className="absolute inset-x-8 bottom-6 top-8 flex items-end gap-1.5 sm:gap-2">
                  {[30, 48, 36, 58, 44, 66, 52, 74, 60, 50, 64, 78, 56, 68, 62].map((h, i) => (
                    <div key={i} className="w-full space-y-1">
                      <div className="skeleton w-full rounded-t-md bg-emerald-100" style={{ height: `${h}%` }} />
                      <div className="skeleton h-6 w-full rounded-t-sm opacity-60" />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-x-8 bottom-0 flex justify-between gap-2 pt-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="skeleton h-3 w-8" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Donut statuts */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:col-span-2">
            <div className="flex items-start gap-3 p-4 sm:p-5 sm:pb-2">
              <div className="skeleton size-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="skeleton h-5 w-44" />
                <div className="skeleton mt-1.5 h-4 w-48 max-w-full" />
              </div>
              <div className="skeleton h-6 w-24 shrink-0 rounded-full" />
            </div>
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="mx-auto grid h-52 w-full max-w-72 place-items-center sm:h-56">
                <div className="skeleton size-44 rounded-full sm:size-48" />
              </div>
              <div className="mt-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
                    <div className="skeleton size-2.5 shrink-0 rounded-full" />
                    <div className="skeleton h-4 min-w-0 flex-1" />
                    <div className="skeleton h-4 w-24 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tunnel de conversion */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-row items-start justify-between gap-2 p-4 sm:p-6 sm:pb-3">
            <div className="min-w-0">
              <div className="skeleton h-5 w-48" />
              <div className="skeleton mt-1.5 h-4 w-72 max-w-full" />
            </div>
            <div className="skeleton h-4 w-20 shrink-0" />
          </div>
          <div className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 sm:p-4">
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton mt-2 h-8 w-16" />
                  <div className="skeleton mt-2 h-2 w-full rounded-full" />
                  <div className="skeleton mt-1.5 h-3 w-12" />
                </div>
              ))}
            </div>
            <div className="skeleton mt-3 h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* Top événements + Paiements */}
      <div aria-hidden className="grid items-start gap-3 sm:gap-4 lg:grid-cols-2">
        {/* Top événements */}
        <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-start gap-3 p-4 sm:p-5 sm:pb-4">
            <div className="skeleton size-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="skeleton h-5 w-36" />
              <div className="skeleton mt-1.5 h-4 w-48 max-w-full" />
            </div>
            <div className="skeleton h-6 w-16 shrink-0 rounded-full" />
          </div>
          <div className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton size-6 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="skeleton h-4 w-32 max-w-full" />
                    <div className="skeleton h-4 w-16" />
                  </div>
                  <div className="skeleton mt-1.5 h-2 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Donut paiements */}
        <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-start gap-3 p-4 sm:p-5 sm:pb-2">
            <div className="skeleton size-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="skeleton h-5 w-44" />
              <div className="skeleton mt-1.5 h-4 w-52 max-w-full" />
            </div>
            <div className="skeleton h-6 w-24 shrink-0 rounded-full" />
          </div>
          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="mx-auto grid h-52 w-full max-w-72 place-items-center sm:h-56">
              <div className="skeleton size-44 rounded-full sm:size-48" />
            </div>
            <div className="mt-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
                  <div className="skeleton size-2.5 shrink-0 rounded-full" />
                  <div className="skeleton h-4 min-w-0 flex-1" />
                  <div className="skeleton h-4 w-20 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Insights (ambre clair) + détail journalier */}
      <div aria-hidden className="grid items-start gap-3 sm:gap-4 lg:grid-cols-5">
        <div className="min-w-0 rounded-2xl border border-amber-200/70 bg-gradient-to-b from-amber-50/70 to-white shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 p-4 sm:p-5 sm:pb-3">
            <div className="skeleton size-8 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="skeleton h-5 w-32" />
              <div className="skeleton mt-1.5 h-4 w-56 max-w-full" />
            </div>
          </div>
          <div className="space-y-2 p-4 pt-0 sm:p-5 sm:pt-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-100 bg-white px-3 py-2.5 shadow-sm">
                <div className="skeleton size-8 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton mt-1.5 h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white shadow-sm lg:col-span-3">
          <div className="flex items-start justify-between gap-2 p-4 sm:p-6 sm:pb-3">
            <div className="min-w-0">
              <div className="skeleton h-5 w-48" />
              <div className="skeleton mt-1.5 h-4 w-64 max-w-full" />
            </div>
            <div className="skeleton size-9 shrink-0 rounded-full" />
          </div>
          <div className="space-y-0 p-4 pt-0 sm:p-6 sm:pt-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-zinc-100 py-2.5 last:border-0">
                <div className="skeleton h-4 w-16" />
                <div className="skeleton h-2 min-w-0 flex-1 rounded-full" />
                <div className="skeleton h-4 w-20 shrink-0" />
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
export function EventsTableSkeleton({ rows = 10 }: { rows?: number }) {
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
        <table className="w-full min-w-[640px] text-left text-sm">
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

/** Champ de formulaire : libellé + zone de saisie. */
/* ---------- Liste commandes admin : miroir de OrdersTable ---------- */
export function OrdersTableSkeleton({ rows = 15 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Chargement des commandes" className="space-y-3">
      {/* Barre d'outils */}
      <div aria-hidden className="flex flex-wrap items-center gap-2">
        <div className="skeleton h-9 w-full flex-1 rounded-lg sm:min-w-52 sm:max-w-xs" />
        <div className="skeleton h-9 w-full rounded-lg sm:w-auto sm:min-w-44" />
        <div className="skeleton h-9 w-full rounded-lg sm:w-auto sm:min-w-72" />
        <div className="skeleton h-4 w-24" />
      </div>

      {/* Tableau */}
      <div aria-hidden className="max-w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              {['N°', 'Client', 'Événement', 'Montant', 'Statut', 'Date', 'Détail'].map((h) => (
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
                  <span className="skeleton block h-4 w-28" />
                </td>
                <td className="px-4 py-3">
                  <span className="block max-w-80 space-y-1.5">
                    <span className="skeleton block h-4 w-36 max-w-full" />
                    <span className="skeleton block h-3 w-48 max-w-full" />
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="skeleton block h-4 w-44 max-w-72" />
                </td>
                <td className="px-4 py-3">
                  <span className="skeleton block h-4 w-20" />
                </td>
                <td className="px-4 py-3">
                  <span className="skeleton block h-5 w-20 rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <span className="skeleton block h-4 w-24" />
                </td>
                <td className="px-4 py-3">
                  <span className="skeleton block size-8 rounded-md" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div aria-hidden className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

/** Champ de formulaire : libellé + zone de saisie. */
function FormFieldSkeleton({ boxClass = 'h-10' }: { boxClass?: string }) {
  return (
    <div>
      <div className="skeleton h-3 w-20" />
      <div className={`skeleton mt-1.5 ${boxClass} w-full rounded-lg`} />
    </div>
  );
}

/** En-tête de section du formulaire (01…04) : pastille + eyebrow + titre + description. */
function FormSectionHeaderSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <div className="skeleton size-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton mt-1 h-5 w-48 max-w-full" />
        <div className="skeleton mt-1 h-3 w-72 max-w-full" />
      </div>
    </div>
  );
}

function FormSectionCardSkeleton({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
      {children}
    </div>
  );
}

/* ---------- Formulaire événement (édition) : miroir de AdminEventFormPage ---------- */
export function EventFormSkeleton() {
  return (
    <div role="status" aria-label="Chargement de l'événement" className="w-full space-y-6">
      {/* En-tête */}
      <div aria-hidden>
        <div className="skeleton h-4 w-28" />
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton mt-2 h-8 w-72 max-w-full" />
            <div className="skeleton mt-2 h-4 w-96 max-w-full" />
          </div>
          <div className="skeleton h-6 w-24 rounded-full" />
        </div>
      </div>

      <div aria-hidden className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Colonne formulaire */}
        <div className="min-w-0 space-y-5">
          {/* 01 Informations */}
          <FormSectionCardSkeleton>
            <FormSectionHeaderSkeleton />
            <div>
              <FormFieldSkeleton />
              <div className="skeleton ml-auto mt-1 h-3 w-12" />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormFieldSkeleton />
              </div>
              <div className="skeleton h-10 w-24 shrink-0 rounded-lg" />
            </div>
            <div>
              <FormFieldSkeleton boxClass="h-32" />
              <div className="skeleton ml-auto mt-1 h-3 w-12" />
            </div>
          </FormSectionCardSkeleton>

          {/* 02 Visuel */}
          <FormSectionCardSkeleton>
            <FormSectionHeaderSkeleton />
            <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center">
              <div className="skeleton size-8" />
              <div className="skeleton h-4 w-56 max-w-full" />
              <div className="skeleton h-3 w-72 max-w-full" />
              <div className="skeleton h-10 w-44 rounded-lg" />
            </div>
            <div className="skeleton h-3 w-48" />
            <div className="skeleton h-3 w-72 max-w-full" />
            <FormFieldSkeleton />
          </FormSectionCardSkeleton>

          {/* 03 Publication */}
          <FormSectionCardSkeleton>
            <FormSectionHeaderSkeleton />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormFieldSkeleton />
              <FormFieldSkeleton />
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-4">
              <div className="skeleton mt-0.5 size-5 shrink-0 rounded" />
              <div className="min-w-0 flex-1">
                <div className="skeleton h-4 w-48 max-w-full" />
                <div className="skeleton mt-1.5 h-3 w-64 max-w-full" />
              </div>
            </div>
          </FormSectionCardSkeleton>

          {/* 04 Date & lieu */}
          <FormSectionCardSkeleton>
            <FormSectionHeaderSkeleton />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormFieldSkeleton />
              <FormFieldSkeleton />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormFieldSkeleton />
              <FormFieldSkeleton />
            </div>
            <FormFieldSkeleton />
            <FormFieldSkeleton />
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3">
              <div className="skeleton h-4 w-48" />
              <div className="grid gap-4 pt-3 sm:grid-cols-2">
                <FormFieldSkeleton />
                <FormFieldSkeleton />
              </div>
            </div>
          </FormSectionCardSkeleton>
        </div>

        {/* Rail latéral */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-2.5">
              <div className="skeleton h-3 w-32" />
            </div>
            <div className="skeleton aspect-[16/9] w-full" />
            <div className="space-y-1.5 p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="skeleton h-5 w-20 rounded-full" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-3 w-2/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>

          <div className="space-y-0.5 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2">
                <div className="skeleton h-3 w-6" />
                <div className="skeleton h-4 w-28" />
              </div>
            ))}
          </div>

          <div className="skeleton h-12 w-full rounded-lg" />
        </aside>
      </div>

      {/* Billets rattachés */}
      <div
        aria-hidden
        className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="skeleton h-5 w-48" />
          <div className="skeleton h-9 w-28 rounded-lg" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="skeleton h-10 flex-1 rounded-lg" />
            <div className="skeleton h-10 w-24 rounded-lg" />
            <div className="skeleton h-10 w-20 rounded-lg" />
            <div className="skeleton size-10 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Détail commande admin : miroir de AdminOrderDetailPage ---------- */
export function OrderDetailSkeleton() {
  return (
    <div role="status" aria-label="Chargement de la commande" className="space-y-4 sm:space-y-6">
      {/* Retour */}
      <div aria-hidden className="skeleton h-4 w-28" />

      {/* En-tête */}
      <div aria-hidden className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="skeleton h-7 w-56 max-w-full" />
            <div className="skeleton size-6 shrink-0 rounded-md" />
          </div>
          <div className="skeleton mt-0.5 h-4 w-80 max-w-full" />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="skeleton h-6 w-24" />
          <div className="skeleton h-5 w-20 rounded-full" />
        </div>
      </div>

      {/* Stepper */}
      <div aria-hidden className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={i < 2 ? 'flex flex-1 items-center' : 'flex items-center'}>
              <div className="flex items-center gap-2">
                <div className="skeleton size-7 shrink-0 rounded-full" />
                <div className="skeleton h-4 w-20" />
              </div>
              {i < 2 && <div className="skeleton mx-2 h-0.5 min-w-4 flex-1 rounded-full sm:mx-3" />}
            </div>
          ))}
        </div>
      </div>

      <div aria-hidden className="grid items-start gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="skeleton h-5 w-40" />
            <div className="mt-3 divide-y divide-zinc-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="skeleton h-3 w-36 max-w-full" />
                    <div className="skeleton mt-1.5 h-3 w-56 max-w-full" />
                  </div>
                  <div className="skeleton size-6 shrink-0 rounded-md" />
                  <div className="skeleton h-5 w-16 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="skeleton h-5 w-32" />
            <div className="mt-3 divide-y divide-zinc-100">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex justify-between gap-2 py-2">
                  <div className="skeleton h-4 w-48 max-w-full" />
                  <div className="skeleton h-4 w-20" />
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-zinc-100 pt-3">
              <div className="skeleton h-4 w-16" />
              <div className="skeleton h-4 w-24" />
            </div>
          </div>
        </div>

        {/* Rail latéral */}
        <div className="min-w-0 space-y-4 sm:space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="skeleton h-5 w-36" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <div className="skeleton h-4 w-20" />
                  <div className="skeleton h-4 w-28" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="skeleton h-5 w-28" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <div className="skeleton h-4 w-20" />
                  <div className="skeleton h-4 w-24" />
                </div>
              ))}
            </div>
            <div className="skeleton mt-3 h-8 w-full rounded-lg" />
          </div>

          <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 shadow-sm sm:p-5">
            <div className="skeleton h-5 w-36" />
            <div className="mt-3 space-y-2">
              <div className="skeleton h-10 w-full rounded-lg" />
              <div className="skeleton h-10 w-full rounded-lg" />
              <div className="skeleton h-3 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Paiements admin : miroir de AdminPaymentsPage (KPI + TanStack Table) ---------- */
export function PaymentsPageSkeleton() {
  return (
    <div role="status" aria-label="Chargement des paiements" className="space-y-4">
      {/* En-tête */}
      <div aria-hidden>
        <div className="skeleton h-8 w-44 max-w-full" />
        <div className="skeleton mt-1.5 h-4 w-80 max-w-full" />
      </div>

      {/* KPI premium */}
      <div aria-hidden className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="relative min-w-0 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          >
            <div className="skeleton h-1 w-full rounded-none" />
            <div className="flex items-start justify-between gap-3 p-4 pt-5 sm:p-5 sm:pt-6">
              <div className="min-w-0 flex-1">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton mt-2.5 h-7 w-32" />
                <div className="skeleton mt-2 h-3 w-28 max-w-full" />
              </div>
              <div className="skeleton size-10 shrink-0 rounded-xl sm:size-11" />
            </div>
            {i === 0 && (
              <div className="px-3 pb-2">
                <div className="skeleton h-9 w-full" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Barre d'outils : recherche + 4 filtres + compteur */}
      <div aria-hidden className="flex flex-wrap items-center gap-2">
        <div className="skeleton h-9 w-full flex-1 rounded-lg sm:min-w-52 sm:max-w-xs" />
        <div className="skeleton h-9 w-full rounded-lg sm:w-44" />
        <div className="skeleton h-9 w-full rounded-lg sm:w-56" />
        <div className="skeleton h-9 w-full rounded-lg sm:w-72" />
        <div className="skeleton h-9 w-full rounded-lg sm:w-52" />
        <div className="skeleton h-4 w-24" />
      </div>

      {/* Tableau */}
      <div aria-hidden className="max-w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[960px] text-left">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              {['w-20', 'w-24', 'w-32', 'w-40', 'w-20', 'w-16', 'w-16', 'w-24', 'w-20'].map((w, i) => (
                <th key={i} scope="col" className="px-4 py-3">
                  <div className={`skeleton h-3 ${w}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {Array.from({ length: 8 }).map((_, r) => (
              <tr key={r}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="skeleton h-3 w-24" />
                    <div className="skeleton size-7 shrink-0 rounded-md" />
                  </div>
                </td>
                <td className="px-4 py-3"><div className="skeleton h-3 w-28" /></td>
                <td className="px-4 py-3"><div className={`skeleton h-3 ${r % 2 === 0 ? 'w-36' : 'w-28'}`} /></td>
                <td className="px-4 py-3">
                  <div className="skeleton h-3 w-32" />
                  <div className="skeleton mt-1.5 h-3 w-40" />
                </td>
                <td className="px-4 py-3"><div className="skeleton h-5 w-24 rounded-full" /></td>
                <td className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>
                <td className="px-4 py-3"><div className="skeleton h-5 w-16 rounded-full" /></td>
                <td className="px-4 py-3"><div className="skeleton h-3 w-20" /></td>
                <td className="px-4 py-3"><div className="skeleton size-9 rounded-full" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination pro */}
      <div aria-hidden className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="skeleton h-8 w-28 rounded-lg" />
          <div className="skeleton h-4 w-36" />
        </div>
        <div className="flex items-center gap-1">
          <div className="skeleton size-8 rounded-lg" />
          <div className="skeleton size-8 rounded-lg" />
          <div className="skeleton size-8 rounded-lg" />
          <div className="skeleton size-8 rounded-lg" />
          <div className="skeleton size-8 rounded-lg" />
          <div className="skeleton size-8 rounded-lg" />
          <div className="skeleton size-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
