import { useMemo } from 'react';
import { BadgeCheck, Banknote, Inbox, Receipt } from 'lucide-react';
import { useAdminOrders } from '../../features/admin/hooks';
import { OrdersTable } from '../../features/admin/components/OrdersTable';
import { OrdersTableSkeleton } from '../../components/admin/AdminSkeletons';
import { StatsCard } from '../../components/admin/StatsCard';
import {
  EmptyState,
  ErrorState,
} from '../../components/ui/States';
import { formatAr } from '../../lib/utils';

export function AdminOrdersPage() {
  const { data, isPending, isError, refetch } = useAdminOrders();

  const stats = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      pending: list.filter((o) => o.payment_status === 'pending' || o.payment_status === 'processing').length,
      paid: list.filter((o) => o.payment_status === 'paid').length,
      revenue: list
        .filter((o) => o.payment_status === 'paid')
        .reduce((s, o) => s + o.total, 0),
    };
  }, [data]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          Commandes
          {data && data.length > 0 && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-600">
              {data.length}
            </span>
          )}
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Suivi des commandes : client, événement, montant et statut.
        </p>
      </div>

      {isPending ? (
        <>
          <div aria-hidden className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
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
          <OrdersTableSkeleton />
        </>
      ) : isError ? (
        <ErrorState description="Impossible de charger les commandes." onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState title="Aucune commande trouvée." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatsCard label="Total commandes" value={String(stats.total)} hint="toutes périodes" icon={Receipt} tone="brand" />
            <StatsCard label="À traiter" value={String(stats.pending)} hint="en attente + vérification" icon={Inbox} tone="warning" />
            <StatsCard label="Payées" value={String(stats.paid)} hint="billets générés" icon={BadgeCheck} tone="success" />
            <StatsCard label="Revenu encaissé" value={formatAr(stats.revenue)} hint="commandes payées" icon={Banknote} tone="info" />
          </div>
          <OrdersTable data={data} />
        </>
      )}
    </div>
  );
}
