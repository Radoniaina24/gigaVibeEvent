import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useAdminOrders } from '../../features/admin/hooks';
import { DataTable } from '../../components/admin/DataTable';
import { Pagination } from '../../components/admin/Pagination';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Fields';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { formatAr, formatDateTime } from '../../lib/utils';

const PAGE_SIZE = 15;
const STATUSES = ['', 'pending', 'processing', 'paid', 'failed', 'cancelled', 'expired'];

export function AdminOrdersPage() {
  const { data, isPending, isError, refetch } = useAdminOrders();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((o) => {
      if (status && o.payment_status !== status) return false;
      if (
        q &&
        !`${o.order_number} ${o.user?.email ?? ''} ${o.event?.title ?? ''}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [data, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Commandes</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Recherche"
          type="search"
          placeholder="N°, email client, événement…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          label="Statut"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tous</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {isPending ? (
        <LoadingState label="Chargement des commandes…" />
      ) : isError ? (
        <ErrorState description="Impossible de charger les commandes." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Aucune commande trouvée." />
      ) : (
        <>
          <DataTable
            caption="Liste des commandes"
            keyOf={(o) => o.id}
            rows={rows}
            columns={[
              {
                key: 'number',
                header: 'N°',
                render: (o) => (
                  <span className="font-mono text-xs font-semibold">{o.order_number}</span>
                ),
              },
              {
                key: 'client',
                header: 'Client',
                render: (o) => (
                  <span className="text-xs">
                    {o.user
                      ? `${[o.user.first_name, o.user.last_name].filter(Boolean).join(' ') || '—'} · ${o.user.email}`
                      : '—'}
                  </span>
                ),
              },
              {
                key: 'event',
                header: 'Événement',
                render: (o) => <span className="text-xs">{o.event?.title ?? '—'}</span>,
              },
              {
                key: 'total',
                header: 'Montant',
                render: (o) => (
                  <span className="font-semibold tabular-nums">{formatAr(o.total)}</span>
                ),
              },
              {
                key: 'status',
                header: 'Statut',
                render: (o) => <OrderStatusBadge status={o.payment_status} />,
              },
              {
                key: 'date',
                header: 'Date',
                render: (o) => (
                  <span className="whitespace-nowrap text-xs">{formatDateTime(o.created_at)}</span>
                ),
              },
              {
                key: 'actions',
                header: 'Détail',
                render: (o) => (
                  <Link
                    to={`/admin/orders/${o.id}`}
                    title="Voir le détail"
                    className="rounded-md p-2 hover:bg-zinc-100"
                  >
                    <Eye className="size-4" aria-hidden />
                  </Link>
                ),
              },
            ]}
          />
          <Pagination
            page={safePage}
            totalPages={totalPages}
            onChange={setPage}
            label="Pagination des commandes"
          />
        </>
      )}
    </div>
  );
}
