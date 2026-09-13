import { useMemo, useState } from 'react';
import { useAdminPayments } from '../../features/admin/hooks';
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

const METHOD_LABEL: Record<string, string> = {
  mvola: 'MVola',
  orange_money: 'Orange Money',
  airtel_money: 'Airtel Money',
  card: 'Carte',
  cash: 'Espèces',
};

export function AdminPaymentsPage() {
  const { data, isPending, isError, refetch } = useAdminPayments();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      if (status && p.status !== status) return false;
      if (
        q &&
        !`${p.provider_ref ?? ''} ${p.order?.order_number ?? ''} ${p.user?.email ?? ''}`
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
      <h1 className="text-2xl font-bold">Paiements</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Recherche"
          type="search"
          placeholder="Référence, N° commande, email…"
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
        <LoadingState label="Chargement des paiements…" />
      ) : isError ? (
        <ErrorState description="Impossible de charger les paiements." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Aucun paiement trouvé." />
      ) : (
        <>
          <DataTable
            caption="Liste des paiements"
            keyOf={(p) => p.id}
            rows={rows}
            columns={[
              {
                key: 'ref',
                header: 'Référence',
                render: (p) => (
                  <span className="font-mono text-xs">{p.provider_ref ?? '—'}</span>
                ),
              },
              {
                key: 'order',
                header: 'Commande',
                render: (p) => (
                  <span className="font-mono text-xs">{p.order?.order_number ?? '—'}</span>
                ),
              },
              {
                key: 'user',
                header: 'Client',
                render: (p) => <span className="text-xs">{p.user?.email ?? '—'}</span>,
              },
              {
                key: 'method',
                header: 'Méthode',
                render: (p) => <span>{METHOD_LABEL[p.provider] ?? p.provider}</span>,
              },
              {
                key: 'amount',
                header: 'Montant',
                render: (p) => (
                  <span className="font-semibold tabular-nums">{formatAr(p.amount)}</span>
                ),
              },
              {
                key: 'status',
                header: 'Statut',
                render: (p) => <OrderStatusBadge status={p.status} />,
              },
              {
                key: 'date',
                header: 'Date',
                render: (p) => (
                  <span className="whitespace-nowrap text-xs">{formatDateTime(p.created_at)}</span>
                ),
              },
            ]}
          />
          <Pagination
            page={safePage}
            totalPages={totalPages}
            onChange={setPage}
            label="Pagination des paiements"
          />
          <p className="text-center text-xs text-zinc-500">
            Les changements de statut sont tracés automatiquement (triggers + table audit_logs).
          </p>
        </>
      )}
    </div>
  );
}
