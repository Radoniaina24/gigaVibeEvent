import { useMemo, useState } from 'react';
import { Banknote, Trophy, Wallet } from 'lucide-react';
import { useAdminStats } from '../../features/admin/hooks';
import { PaymentMethodsChart, RevenueChart, TopEventsChart } from '../../components/admin/Charts';
import { StatsCard } from '../../components/admin/StatsCard';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { cn, formatAr } from '../../lib/utils';

const RANGES = [
  { days: 7, label: '7 jours' },
  { days: 30, label: '30 jours' },
  { days: 90, label: '90 jours' },
  { days: 365, label: '1 an' },
];

export function AdminStatisticsPage() {
  const [days, setDays] = useState(30);
  const { data, isPending, isError, refetch } = useAdminStats(days);

  const summary = useMemo(() => {
    if (!data) return null;
    const revenue = data.dailyRevenue.reduce((s, d) => s + d.value, 0);
    const payments = data.paymentsByMethod.reduce((s, r) => s + r.value, 0);
    const top = [...data.ticketsByEvent].sort((a, b) => b.value - a.value)[0];
    return { revenue, payments, top };
  }, [data]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">Statistiques</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Revenus, top événements et méthodes de paiement.
          </p>
        </div>
        <div
          role="group"
          aria-label="Période"
          className="flex max-w-full gap-1 self-start overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 sm:self-auto"
        >
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              aria-pressed={days === r.days}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 sm:px-3 sm:text-sm',
                days === r.days ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <LoadingState label="Calcul des statistiques…" />
      ) : isError || !data || !summary ? (
        <ErrorState description="Impossible de calculer les statistiques." onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3 sm:gap-4">
            <StatsCard
              label={`Revenus (${days} j)`}
              value={formatAr(summary.revenue)}
              hint="commandes payées"
              icon={Banknote}
              tone="success"
            />
            <StatsCard
              label="Paiements"
              value={String(summary.payments)}
              hint="toutes méthodes"
              icon={Wallet}
              tone="brand"
            />
            <StatsCard
              label="Top événement"
              value={summary.top?.label ?? '—'}
              hint={summary.top?.display ?? 'aucune vente'}
              icon={Trophy}
              tone="warning"
            />
          </div>

          <RevenueChart
            data={data.dailyRevenue}
            title="Revenus par jour"
            subtitle={`${days} derniers jours · commandes payées`}
          />
          <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-2">
            <TopEventsChart
              title="Top événements"
              subtitle="Classés par revenus"
              rows={data.ticketsByEvent}
            />
            <PaymentMethodsChart
              title="Paiements par méthode"
              subtitle="Répartition des transactions"
              rows={data.paymentsByMethod}
            />
          </div>
          <p className="text-center text-xs text-zinc-500">
            Calculé sur les commandes payées. Personnalisé : utilisez la plage « 1 an ».
          </p>
        </>
      )}
    </div>
  );
}
