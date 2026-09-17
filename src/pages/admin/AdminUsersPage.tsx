import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useAdminUsers,
  useUpdateAdminUser,
  type AdminUserRow,
} from '../../features/admin/hooks';
import { useInviteUser } from '../../features/auth/hooks';
import { inviteUserSchema, type InviteUserInput } from '../../schemas/auth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { UsersTable } from '../../features/admin/components/UsersTable';
import { UsersTableSkeleton } from '../../components/admin/AdminSkeletons';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  EmptyState,
  ErrorState,
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
      <div className="flex flex-wrap items-end justify-between gap-3">
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
        <InviteUserCard />
      </div>

      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      {isPending ? (
        <UsersTableSkeleton />
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

/**
 * Invitation admin via Resend (POST /admin/users/invite).
 * Le backend crée le token (7 j) et envoie l'email, jamais Supabase.
 */
function InviteUserCard() {
  const [open, setOpen] = useState(false);
  const invite = useInviteUser();
  const [feedback, setFeedback] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { role: 'user' },
  });

  const onSubmit = async (values: InviteUserInput) => {
    setFeedback(null);
    try {
      await invite.mutateAsync({
        email: values.email,
        role: values.role,
        partner_id: values.partner_id || undefined,
      });
      setFeedback(`Invitation envoyée à ${values.email} (rôle ${values.role}).`);
      reset({ email: '', role: 'user', partner_id: '' });
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Invitation impossible.');
    }
  };

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Inviter un utilisateur
      </Button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Inviter (email Resend)</h2>
        <button
          type="button"
          className="text-xs font-semibold text-zinc-500 hover:underline"
          onClick={() => {
            setOpen(false);
            setFeedback(null);
          }}
        >
          Fermer
        </button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px_auto]" noValidate>
        <Input
          label="Email"
          type="email"
          placeholder="invite@exemple.mg"
          error={errors.email?.message}
          {...register('email')}
        />
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Rôle</span>
          <select
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            {...register('role')}
          >
            <option value="user">user</option>
            <option value="partner">partner</option>
            <option value="controller">controller</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" size="sm" loading={isSubmitting || invite.isPending}>
            Envoyer
          </Button>
        </div>
      </form>
      {feedback && <p className="mt-2 text-xs text-zinc-600">{feedback}</p>}
    </div>
  );
}
