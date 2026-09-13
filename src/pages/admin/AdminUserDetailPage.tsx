import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  useAdminOrders,
  useAdminTickets,
  useAdminUsers,
} from '../../features/admin/hooks';
import { Badge, Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { formatAr, formatDate, formatDateTime } from '../../lib/utils';

export function AdminUserDetailPage() {
  const { id } = useParams();
  const users = useAdminUsers();
  const orders = useAdminOrders();
  const tickets = useAdminTickets();

  if (users.isPending || orders.isPending || tickets.isPending) {
    return <LoadingState label="Chargement de l'utilisateur…" />;
  }
  if (users.isError || orders.isError || tickets.isError) {
    return (
      <ErrorState
        description="Impossible de charger cet utilisateur."
        onRetry={() => {
          users.refetch();
          orders.refetch();
          tickets.refetch();
        }}
      />
    );
  }

  const user = (users.data ?? []).find((u) => u.id === id);
  if (!user) {
    return (
      <EmptyState
        title="Utilisateur introuvable."
        action={
          <Link to="/admin/users">
            <Button size="sm" variant="secondary">
              Utilisateurs
            </Button>
          </Link>
        }
      />
    );
  }

  const userOrders = (orders.data ?? []).filter((o) => o.user_id === user.id);
  const userTickets = (tickets.data ?? []).filter((t) => t.user_id === user.id);
  const spent = userOrders
    .filter((o) => o.payment_status === 'paid')
    .reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Utilisateurs
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">
          {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
        </h1>
        <Badge tone={user.role === 'admin' ? 'info' : 'neutral'}>{user.role}</Badge>
        <Badge tone={user.is_active ? 'success' : 'danger'}>
          {user.is_active ? 'Actif' : 'Désactivé'}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-zinc-500">Contact</p>
          <p className="mt-1 text-sm font-medium">{user.email}</p>
          <p className="text-sm text-zinc-500">{user.phone ?? '—'}</p>
          <p className="mt-1 text-xs text-zinc-400">
            Inscrit le {formatDate(user.created_at)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-zinc-500">Commandes</p>
          <p className="text-2xl font-bold tabular-nums">{userOrders.length}</p>
          <p className="text-xs text-zinc-400">Total dépensé : {formatAr(spent)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-zinc-500">Billets</p>
          <p className="text-2xl font-bold tabular-nums">{userTickets.length}</p>
        </Card>
      </div>

      <section aria-label="Commandes de l'utilisateur" className="space-y-2">
        <h2 className="font-bold">Commandes ({userOrders.length})</h2>
        {userOrders.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune commande.</p>
        ) : (
          userOrders.map((o) => (
            <Link key={o.id} to={`/admin/orders/${o.id}`}>
              <Card className="flex items-center justify-between p-3 transition hover:shadow-md">
                <div>
                  <p className="font-mono text-sm font-semibold">{o.order_number}</p>
                  <p className="text-xs text-zinc-500">
                    {o.event?.title ?? '—'} · {formatDateTime(o.created_at)} · {formatAr(o.total)}
                  </p>
                </div>
                <OrderStatusBadge status={o.payment_status} />
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
