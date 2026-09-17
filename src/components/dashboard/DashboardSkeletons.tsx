/**
 * Skeletons du tableau de bord, style shadcn (cartes blanches neutres).
 * `aria-hidden` + enveloppe `role="status"`.
 */

/* ---------- Accueil : stats + 2 colonnes ---------- */
export function DashboardHomeSkeleton() {
  return (
    <div role="status" aria-label="Chargement du tableau de bord" className="space-y-6">
      <div aria-hidden className="space-y-1.5">
        <div className="skeleton h-8 w-56" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div aria-hidden className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
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
      <div aria-hidden className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, c) => (
          <div key={c} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="skeleton h-5 w-44" />
            <div className="skeleton mt-1.5 h-3 w-60" />
            <div className="mt-5 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
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
        ))}
      </div>
    </div>
  );
}

/* ---------- Lignes de commandes ---------- */
export function OrderRowsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Chargement des commandes" className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-3 w-3/4" />
          </div>
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ---------- Grille de billets ---------- */
export function TicketListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Chargement des billets"
      className="flex flex-col gap-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
        >
          <div className="flex items-center gap-2.5 bg-zinc-900 px-4 py-3">
            <div className="skeleton size-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          </div>
          <div className="flex flex-col gap-4 p-4 sm:flex-row">
            <div className="flex-1 space-y-2">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-2/3" />
            </div>
            <div className="skeleton size-[112px] shrink-0 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Détail commande (utilisateur) : miroir de OrderDetailPage ---------- */
export function UserOrderDetailSkeleton() {
  return (
    <div role="status" aria-label="Chargement de la commande" className="space-y-6">
      {/* Retour */}
      <div aria-hidden className="skeleton h-4 w-28" />

      {/* En-tête */}
      <div aria-hidden className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="skeleton h-6 w-52" />
          <div className="skeleton mt-1.5 h-4 w-64 max-w-full" />
        </div>
        <div className="skeleton h-5 w-24 rounded-full" />
      </div>

      {/* Stepper */}
      <div aria-hidden className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1">
            <div className="skeleton h-1.5 rounded-full" />
            <div className="skeleton mt-1 h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Suivi (timeline) */}
      <div aria-hidden className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="p-6 pb-1.5">
          <div className="skeleton h-4 w-40" />
        </div>
        <div className="space-y-0 p-6 pt-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 pb-5 last:pb-0">
              <div className="skeleton size-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="skeleton h-4 w-36" />
                <div className="skeleton mt-1.5 h-3 w-56 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Événement + Paiement */}
      <div aria-hidden className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="p-6 pb-1.5">
            <div className="skeleton h-4 w-28" />
          </div>
          <div className="p-6 pt-0">
            <div className="flex items-start gap-3">
              <div className="skeleton size-14 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton mt-1.5 h-3 w-1/2" />
                <div className="skeleton mt-1.5 h-3 w-2/3" />
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="p-6 pb-1.5">
            <div className="skeleton h-4 w-24" />
          </div>
          <div className="space-y-3 p-6 pt-0">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* Billets commandés */}
      <div aria-hidden className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="p-6 pb-1.5">
          <div className="skeleton h-4 w-40" />
        </div>
        <div className="p-6 pt-0">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-2 py-2.5">
              <div className="skeleton h-4 w-56 max-w-full" />
              <div className="skeleton h-4 w-20" />
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-zinc-100 pt-4">
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Profil : miroir de ProfilePage ---------- */
export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Chargement du profil" className="max-w-2xl space-y-6">
      <div aria-hidden>
        <div className="skeleton h-8 w-32" />
        <div className="skeleton mt-1.5 h-4 w-72 max-w-full" />
      </div>
      <div aria-hidden className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-row items-center gap-4 p-6">
          <div className="skeleton size-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <div className="skeleton h-5 w-44 max-w-full" />
            <div className="skeleton mt-1.5 h-4 w-56 max-w-full" />
          </div>
        </div>
      </div>
      {Array.from({ length: 2 }).map((_, c) => (
        <div key={c} aria-hidden className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="p-6 pb-1.5">
            <div className="skeleton h-5 w-48" />
            <div className="skeleton mt-1.5 h-4 w-72 max-w-full" />
          </div>
          <div className="space-y-4 p-6 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="skeleton h-10 w-full rounded-lg" />
              <div className="skeleton h-10 w-full rounded-lg" />
            </div>
            <div className="skeleton h-10 w-full rounded-lg" />
            <div className="skeleton h-10 w-48 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
