import { useState } from 'react';
import { useAdminStats } from '../../features/admin/hooks';
import { HBarList, RevenueBars } from '../../components/admin/Charts';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { cn } from '../../lib/utils';

const RANGES = [
  { days: 7, label: '7 jours' },
  { days: 30, label: '30 jours' },
  { days: 90, label: '90 jours' },
  { days: 365, label: '1 an' },
];

export function AdminStatisticsPage() {
  const [days, setDays] = useState(30);
  const { data, isPending, isError, refetch } = useAdminStats(days);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Statistiques</h1>
        <div role="group" aria-label="Période" className="flex gap-1 rounded-xl border border-zinc-200 bg-white p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              aria-pressed={days === r.days}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                days === r.days ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <LoadingState label="Calcul des statistiques…" />
      ) : isError || !data ? (
        <ErrorState description="Impossible de calculer les statistiques." onRetry={() => refetch()} />
      ) : (
        <>
          <RevenueBars data={data.dailyRevenue} title={`Revenus par jour (${days} derniers jours)`} />
          <div className="grid gap-4 lg:grid-cols-2">
            <HBarList title="Top événements (revenus)" rows={data.ticketsByEvent} />
            <HBarList title="Paiements par méthode" rows={data.paymentsByMethod} />
          </div>
          <p className="text-center text-xs text-zinc-500">
            Calculé sur les commandes payées. Personnalisé : utilisez la plage « 1 an ».
          </p>
        </>
      )}
    </div>
  );
}
