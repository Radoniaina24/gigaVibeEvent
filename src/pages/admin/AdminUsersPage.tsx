import { useState } from 'react';
import {
  useAdminUsers,
  useUpdateAdminUser,
  type AdminUserRow,
} from '../../features/admin/hooks';
import { UsersTable } from '../../features/admin/components/UsersTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';
import type { UserRole } from '../../types/database';

export function AdminUsersPage() {
  const { data, isPending, isError, refetch } = useAdminUsers();
  const updateUser = useUpdateAdminUser();

  const [pendingChange, setPendingChange] = useState<{
    user: AdminUserRow;
    role?: UserRole;
    is_active?: boolean;
  } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

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
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          Utilisateurs
          {data && data.length > 0 && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-600">
              {data.length}
            </span>
          )}
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Rôles, statuts et suivi des commandes.
        </p>
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
      ) : !data?.length ? (
        <EmptyState title="Aucun utilisateur trouvé." />
      ) : (
        <UsersTable
          data={data}
          updating={updateUser.isPending}
          onRoleChange={(user, role) => setPendingChange({ user, role })}
          onToggleActive={(user) => setPendingChange({ user, is_active: !user.is_active })}
        />
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
