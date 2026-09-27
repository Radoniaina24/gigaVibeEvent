import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Trash2, UserCheck, UserX } from 'lucide-react';
import {
  useAdminDeleteUser,
  useAdminOrders,
  useAdminPartners,
  useAdminTickets,
  useAdminUsers,
  useSetUserRole,
  useUpdateAdminUser,
} from '../../features/admin/hooks';
import { useAuth } from '../../features/auth/AuthContext';
import { adminUserUpdateSchema } from '../../schemas';
import { Badge, Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MiniSelect } from '../../components/ui/MiniSelect';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { UserDetailSkeleton } from '../../components/admin/AdminSkeletons';
import {
  EmptyState,
  ErrorState,
} from '../../components/ui/States';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { formatAr, formatDate, formatDateTime } from '../../lib/utils';
import { ALL_ROLES, type UserRole } from '../../types/database';
import { cn } from '../../lib/utils';

const ROLE_LABEL: Record<UserRole, string> = {
  user: 'Client',
  partner: 'Partenaire',
  controller: 'Contrôleur',
  admin: 'Admin',
};

export function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const users = useAdminUsers();
  const orders = useAdminOrders();
  const tickets = useAdminTickets();
  const partners = useAdminPartners();
  const updateUser = useUpdateAdminUser();
  const setRole = useSetUserRole();
  const deleteUser = useAdminDeleteUser();

  const [confirmActive, setConfirmActive] = useState<boolean | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [partnerPick, setPartnerPick] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'ko'; message: string } | null>(null);

  if (users.isPending || orders.isPending || tickets.isPending) {
    return <UserDetailSkeleton />;
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

  const isSelf = me != null && user.id === me.id;
  const busy = updateUser.isPending || setRole.isPending || deleteUser.isPending;
  const roles = user.roles ?? [user.role];
  const partnerNames = new Map((partners.data ?? []).map((p) => [p.id, p.name]));

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setFeedback(null);
    try {
      await fn();
      setFeedback({ tone: 'ok', message: okMsg });
    } catch (err) {
      setFeedback({ tone: 'ko', message: err instanceof Error ? err.message : 'Action impossible.' });
    }
  };

  const changePrimaryRole = (role: UserRole) =>
    run(async () => {
      const input = adminUserUpdateSchema.parse({ role, is_active: user.is_active });
      await updateUser.mutateAsync({ id: user.id, input });
    }, `Rôle principal : ${ROLE_LABEL[role]}.`);

  const toggleSecondary = (role: UserRole, enabled: boolean, partner_id?: string) =>
    run(
      () => setRole.mutateAsync({ id: user.id, role, enabled, partner_id }),
      enabled ? `Rôle ${ROLE_LABEL[role]} ajouté.` : `Rôle ${ROLE_LABEL[role]} retiré.`,
    );

  const addPartnerScope = () => {
    if (!partnerPick) return;
    run(
      () => setRole.mutateAsync({ id: user.id, role: 'partner', enabled: true, partner_id: partnerPick }),
      'Organisateur rattaché.',
    ).finally(() => setPartnerPick(''));
  };

  const userOrders = (orders.data ?? []).filter((o) => o.user_id === user.id);
  const userTickets = (tickets.data ?? []).filter((t) => t.user_id === user.id);
  const spent = userOrders
    .filter((o) => o.payment_status === 'paid')
    .reduce((s, o) => s + o.total, 0);

  return (
    <div className="mx-auto w-full max-w-none space-y-4">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Utilisateurs
      </Link>

      {/* En-tête + actions */}
      <section className="relative overflow-hidden rounded-3xl bg-zinc-950 p-5 text-white shadow-lg sm:p-6">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-24 size-72 rounded-full bg-brand-600/30 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-lg font-black">
              {([user.first_name, user.last_name].filter(Boolean).join(' ') || user.email).charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
              </h1>
              <p className="truncate text-sm text-zinc-400">{user.email}</p>
              <p className="mt-1.5 flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <Badge key={r} tone={r === 'admin' ? 'info' : 'neutral'}>{ROLE_LABEL[r] ?? r}</Badge>
                ))}
                <Badge tone={user.is_active ? 'success' : 'danger'}>
                  {user.is_active ? 'Actif' : 'Désactivé'}
                </Badge>
                {isSelf && <Badge tone="info">Vous</Badge>}
              </p>
            </div>
          </div>
          {!isSelf && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => setConfirmActive(!user.is_active)}
              >
                {user.is_active ? <UserX className="size-4" aria-hidden /> : <UserCheck className="size-4" aria-hidden />}
                {user.is_active ? 'Désactiver' : 'Réactiver'}
              </Button>
              <Button size="sm" variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" aria-hidden /> Supprimer
              </Button>
            </div>
          )}
        </div>
        {isSelf && (
          <p className="relative mt-3 flex items-center gap-1.5 text-xs text-zinc-400">
            <ShieldCheck className="size-3.5" aria-hidden />
            Votre propre compte : rôle, statut et suppression verrouillés.
          </p>
        )}
      </section>

      {feedback && (
        <p
          role={feedback.tone === 'ko' ? 'alert' : 'status'}
          className={cn(
            'rounded-xl border p-3 text-sm font-medium',
            feedback.tone === 'ok'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700',
          )}
        >
          {feedback.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-zinc-500">Contact</p>
          <p className="mt-1 break-all text-sm font-medium">{user.email}</p>
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

      {/* Rôles */}
      <Card className="p-4 sm:p-5">
        <h2 className="font-bold">Rôles & accès</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Rôle principal (profil) + rôles secondaires cumulés (user_roles). La réactivation restaure tous les rôles.
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Rôle principal</p>
            <div className="mt-2">
              <MiniSelect
                ariaLabel={`Rôle principal de ${user.email}`}
                value={user.role}
                onChange={(v) => {
                  if (v !== user.role) void changePrimaryRole(v as UserRole);
                }}
                options={ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
                disabled={busy || isSelf}
                className="min-w-44 justify-between"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Rôles secondaires</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_ROLES.filter((r) => r !== user.role).map((r) => {
                const on = roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={busy || isSelf}
                    onClick={() => void toggleSecondary(r, !on)}
                    aria-pressed={on}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40',
                      on
                        ? 'border-zinc-900 bg-zinc-950 text-white shadow'
                        : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400',
                    )}
                  >
                    {on ? '✓ ' : '+ '}{ROLE_LABEL[r]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-2xl border border-zinc-200 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Organisateurs rattachés</p>
          {user.partner_ids.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-500">Aucun rattachement.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {user.partner_ids.map((pid) => (
                <li key={pid} className="flex items-center gap-1.5 rounded-full bg-zinc-100 py-1 pl-3 pr-1.5 text-xs font-semibold">
                  {partnerNames.get(pid) ?? pid.slice(0, 8)}
                  {!isSelf && (
                    <button
                      type="button"
                      aria-label={`Retirer ${partnerNames.get(pid) ?? pid}`}
                      disabled={busy}
                      onClick={() => void toggleSecondary('partner', false, pid)}
                      className="grid size-5 place-items-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-40"
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!isSelf && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                aria-label="Ajouter un organisateur"
                value={partnerPick}
                onChange={(e) => setPartnerPick(e.target.value)}
                disabled={busy}
                className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm"
              >
                <option value="">— Ajouter un organisateur —</option>
                {(partners.data ?? [])
                  .filter((p) => !user.partner_ids.includes(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <Button size="sm" variant="secondary" disabled={busy || !partnerPick} onClick={addPartnerScope}>
                Rattacher
              </Button>
            </div>
          )}
        </div>
      </Card>

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

      <ConfirmDialog
        open={confirmActive !== null}
        title={confirmActive ? 'Réactiver ce compte ?' : 'Désactiver ce compte ?'}
        description={
          confirmActive
            ? `${user.email} — tous ses rôles seront restaurés.`
            : `${user.email} — connexion bloquée, tous ses rôles suspendus (restaurés à la réactivation).`
        }
        loading={updateUser.isPending}
        onConfirm={() => {
          if (confirmActive === null) return;
          const input = { role: user.role, is_active: confirmActive };
          const parsed = adminUserUpdateSchema.safeParse(input);
          if (!parsed.success) {
            setFeedback({ tone: 'ko', message: 'Données invalides.' });
            setConfirmActive(null);
            return;
          }
          void run(
            () => updateUser.mutateAsync({ id: user.id, input: parsed.data }),
            confirmActive ? 'Compte réactivé.' : 'Compte désactivé.',
          ).finally(() => setConfirmActive(null));
        }}
        onClose={() => setConfirmActive(null)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer ce compte ?"
        description={`${user.email} — sans commandes : suppression définitive. Avec commandes : anonymisation (historique conservé). Irréversible.`}
        confirmLabel="Supprimer"
        danger
        loading={deleteUser.isPending}
        onConfirm={() =>
          run(() => deleteUser.mutateAsync(user.id), 'Compte traité.').finally(() => {
            setConfirmDelete(false);
            navigate('/admin/users');
          })
        }
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );

}
