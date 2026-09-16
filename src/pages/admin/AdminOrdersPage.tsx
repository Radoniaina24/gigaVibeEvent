import { useAdminOrders } from '../../features/admin/hooks';
import { OrdersTable } from '../../features/admin/components/OrdersTable';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';

export function AdminOrdersPage() {
  const { data, isPending, isError, refetch } = useAdminOrders();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
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
        <LoadingState label="Chargement des commandes…" />
      ) : isError ? (
        <ErrorState description="Impossible de charger les commandes." onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState title="Aucune commande trouvée." />
      ) : (
        <OrdersTable data={data} />
      )}
    </div>
  );
}
