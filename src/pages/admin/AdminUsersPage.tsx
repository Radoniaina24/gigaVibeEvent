import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import {
  useAdminUsers,
  useUpdateAdminUser,
  type AdminUserRow,
} from '../../features/admin/hooks';
import { DataTable } from '../../components/admin/DataTable';
import { Pagination } from '../../components/admin/Pagination';
import { Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Fields';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';
import { formatDate } from '../../lib/utils';

const PAGE_SIZE = 15;

export function AdminUsersPage() {
  const { data, isPending, isError, refetch } = useAdminUsers();
  const updateUser = useUpdateAdminUser();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pendingChange, setPendingChange] = useState<{
    user: AdminUserRow;
    role?: 'user' | 'admin';
    is_active?: boolean;
  } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (
        q &&
        !`${u.email} ${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [data, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const applyChange = async () => {
    if (!pendingChange) return;
    setServerError(null);
    try {
      await updateUser.mutateAsync({
        id: pendingChange.user.id,
        input: {
          role: pendingChange.role ?? pendingChange.user.role,
          is_active: pendingChange.is_active ?? pendingChange.user.is_active,
        },
      });
      setPendingChange(null);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    }
  };

  const changeLabel = pendingChange
    ? pendingChange.role
      ? `Passer ${pendingChange.user.email} au rôle « ${pendingChange.role} » ?`
      : `${pendingChange.is_active ? 'Réactiver' : 'Désactiver'} le compte ${pendingChange.user.email} ?`
    : '';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Utilisateurs</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Recherche"
          type="search"
          placeholder="Email, nom…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          label="Rôle"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tous</option>
          <option value="user">Utilisateurs</option>
          <option value="admin">Administrateurs</option>
        </Select>
      </div>

      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      {isPending ? (
        <LoadingState label="Chargement des utilisateurs…" />
      ) : isError ? (
        <ErrorState description="Impossible de charger les utilisateurs." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Aucun utilisateur trouvé." />
      ) : (
        <>
          <DataTable
            caption="Liste des utilisateurs"
            keyOf={(u) => u.id}
            rows={rows}
            columns={[
              {
                key: 'user',
                header: 'Utilisateur',
                render: (u) => (
                  <div>
                    <p className="font-semibold">
                      {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                    </p>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Rôle',
                render: (u) => (
                  <select
                    aria-label={`Rôle de ${u.email}`}
                    value={u.role}
                    disabled={updateUser.isPending}
                    onChange={(e) =>
                      setPendingChange({
                        user: u,
                        role: e.target.value as 'user' | 'admin',
                      })
                    }
                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                ),
              },
              {
                key: 'status',
                header: 'Statut',
                render: (u) => (
                  <Badge tone={u.is_active ? 'success' : 'danger'}>
                    {u.is_active ? 'Actif' : 'Désactivé'}
                  </Badge>
                ),
              },
              {
                key: 'orders',
                header: 'Commandes',
                render: (u) => <span className="tabular-nums">{u.orders_count}</span>,
              },
              {
                key: 'since',
                header: 'Inscrit le',
                render: (u) => (
                  <span className="whitespace-nowrap text-xs">{formatDate(u.created_at)}</span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (u) => (
                  <span className="flex gap-1">
                    <Link
                      to={`/admin/users/${u.id}`}
                      title="Voir"
                      className="rounded-md p-2 hover:bg-zinc-100"
                    >
                      <Eye className="size-4" aria-hidden />
                    </Link>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={updateUser.isPending}
                      onClick={() =>
                        setPendingChange({ user: u, is_active: !u.is_active })
                      }
                    >
                      {u.is_active ? 'Désactiver' : 'Réactiver'}
                    </Button>
                  </span>
                ),
              },
            ]}
          />
          <Pagination
            page={safePage}
            totalPages={totalPages}
            onChange={setPage}
            label="Pagination des utilisateurs"
          />
        </>
      )}

      <ConfirmDialog
        open={pendingChange !== null}
        title="Confirmer la modification"
        description={changeLabel}
        loading={updateUser.isPending}
        onConfirm={applyChange}
        onClose={() => {
          setPendingChange(null);
          setServerError(null);
        }}
      />
    </div>
  );
}
