import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Check,
  Copy,
  MailPlus,
  RotateCcw,
  ShieldCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import {
  useAdminCreateUser,
  useAdminDeleteUser,
  useAdminInvitations,
  useAdminPartners,
  useAdminUsers,
  useResendInvitation,
  useRevokeInvitation,
  useUpdateAdminUser,
  type AdminUserRow,
} from '../../features/admin/hooks';
import { useAuth } from '../../features/auth/AuthContext';
import { useInviteUser } from '../../features/auth/hooks';
import {
  adminCreateUserSchema,
  inviteUserSchema,
  type AdminCreateUserInput,
  type InviteUserInput,
} from '../../schemas/auth';
import { adminUserUpdateSchema } from '../../schemas';
import { Badge, Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { SelectField, type SelectOption } from '../../components/ui/Select';
import { UsersTable } from '../../features/admin/components/UsersTable';
import { UsersTableSkeleton } from '../../components/admin/AdminSkeletons';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  EmptyState,
  ErrorState,
} from '../../components/ui/States';
import { formatDate } from '../../lib/utils';
import type { UserRole } from '../../types/database';
import { cn } from '../../lib/utils';

export function AdminUsersPage() {
  const { data, isPending, isError, refetch } = useAdminUsers();
  const { user: me } = useAuth();
  const updateUser = useUpdateAdminUser();
  const deleteUser = useAdminDeleteUser();

  const [pendingChange, setPendingChange] = useState<{
    user: AdminUserRow;
    role?: UserRole;
    is_active?: boolean;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminUserRow | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const kpis = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      active: list.filter((u) => u.is_active).length,
      inactive: list.filter((u) => !u.is_active).length,
      admins: list.filter((u) => (u.roles ?? [u.role]).includes('admin')).length,
    };
  }, [data]);

  const applyChange = async () => {
    if (!pendingChange) return;
    // Garde anti auto-blocage : jamais son propre rôle / statut.
    if (me && pendingChange.user.id === me.id) {
      setServerError('Vous ne pouvez pas modifier votre propre rôle ni votre statut.');
      setPendingChange(null);
      return;
    }
    setServerError(null);
    setNotice(null);
    try {
      // Validation Zod branchée (rôle + statut).
      const input = adminUserUpdateSchema.parse({
        role: pendingChange.role ?? pendingChange.user.role,
        is_active: pendingChange.is_active ?? pendingChange.user.is_active,
      });
      await updateUser.mutateAsync({ id: pendingChange.user.id, input });
      setPendingChange(null);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    }
  };

  const applyDelete = async () => {
    if (!pendingDelete) return;
    if (me && pendingDelete.id === me.id) {
      setServerError('Vous ne pouvez pas supprimer votre propre compte.');
      setPendingDelete(null);
      return;
    }
    setServerError(null);
    setNotice(null);
    try {
      const res = await deleteUser.mutateAsync(pendingDelete.id);
      setNotice(
        res.mode === 'deleted'
          ? `Compte ${pendingDelete.email} supprimé définitivement.`
          : `Compte ${pendingDelete.email} anonymisé (commandes conservées).`,
      );
      setPendingDelete(null);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Suppression impossible.');
      setPendingDelete(null);
    }
  };

  const changeLabel = pendingChange
    ? pendingChange.role
      ? `Passer ${pendingChange.user.email} au rôle « ${pendingChange.role} » ?`
      : `${pendingChange.is_active ? 'Réactiver' : 'Désactiver'} le compte ${pendingChange.user.email} ?`
    : '';

  return (
    <div className="mx-auto w-full max-w-none space-y-4">
      {/* Hero pro */}
      <section className="relative overflow-hidden rounded-3xl bg-zinc-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-24 size-72 rounded-full bg-brand-600/30 blur-3xl" />
          <div className="absolute -bottom-28 -left-16 size-72 rounded-full bg-amber-500/20 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Users className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Administration</p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
                Utilisateurs{' '}
                <span className="tabular-nums text-zinc-400">{kpis.total}</span>
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-300">
                Comptes, rôles multi-niveaux, statuts et invitations. Vos propres actions sont verrouillées.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setInviteOpen(true)}>
              <MailPlus className="size-4" aria-hidden /> Inviter
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <UserPlus className="size-4" aria-hidden /> Créer un compte
            </Button>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          {[
            { label: `${kpis.total} comptes`, tone: 'bg-white/10 text-white' },
            { label: `${kpis.active} actifs`, tone: 'bg-emerald-400/20 text-emerald-200' },
            { label: `${kpis.inactive} désactivés`, tone: kpis.inactive > 0 ? 'bg-red-400/20 text-red-200' : 'bg-white/10 text-white' },
            { label: `${kpis.admins} admins`, tone: 'bg-white/10 text-white' },
          ].map((c) => (
            <span key={c.label} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10', c.tone)}>
              {c.label}
            </span>
          ))}
        </div>
      </section>

      {serverError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {serverError}
        </p>
      )}
      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">
          <Check className="size-4 shrink-0" aria-hidden />
          {notice}
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
          updating={updateUser.isPending || deleteUser.isPending}
          currentUserId={me?.id}
          onRoleChange={(user, role) => setPendingChange({ user, role })}
          onToggleActive={(user) => setPendingChange({ user, is_active: !user.is_active })}
          onDelete={(user) => setPendingDelete(user)}
        />
      )}

      <InvitationsCard />

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

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Supprimer ce compte ?"
        description={
          pendingDelete
            ? `${pendingDelete.email} — sans commandes : suppression définitive. Avec commandes : anonymisation (email effacé, compte désactivé, historique conservé). Irréversible.`
            : ''
        }
        confirmLabel="Supprimer"
        danger
        loading={deleteUser.isPending}
        onConfirm={applyDelete}
        onClose={() => {
          setPendingDelete(null);
          setServerError(null);
        }}
      />

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Création directe (compte actif + mot de passe temporaire)          */
/* ------------------------------------------------------------------ */

function randomPassword(length = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(length);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

const ROLE_OPTIONS: SelectOption<UserRole>[] = [
  { value: 'user', label: 'Client' },
  { value: 'partner', label: 'Partenaire' },
  { value: 'controller', label: 'Contrôleur' },
  { value: 'admin', label: 'Admin' },
];

function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useAdminCreateUser();
  const partners = useAdminPartners();
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AdminCreateUserInput>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: { role: 'user', partner_id: '' },
  });
  const role = watch('role');
  const partnerId = watch('partner_id');

  const close = () => {
    onClose();
    setCreated(null);
    setCopied(false);
    setServerError(null);
    reset({ email: '', password: '', first_name: '', last_name: '', phone: '', role: 'user', partner_id: '' });
  };

  const onSubmit = async (values: AdminCreateUserInput) => {
    setServerError(null);
    try {
      await create.mutateAsync({
        email: values.email,
        password: values.password,
        first_name: values.first_name || undefined,
        last_name: values.last_name || undefined,
        phone: values.phone || undefined,
        role: values.role,
        partner_id: values.partner_id || undefined,
      });
      setCreated({ email: values.email, password: values.password });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Création impossible.');
    }
  };

  const copyPassword = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(`Email : ${created.email}\nMot de passe temporaire : ${created.password}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Créer un compte"
      subtitle="Actif immédiatement. Communiquez le mot de passe temporaire à l'utilisateur."
      icon={<UserPlus className="size-5" aria-hidden />}
    >
      {created ? (
        <div className="space-y-3">
          <p role="status" className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">
            <Check className="size-4 shrink-0" aria-hidden />
            Compte {created.email} créé.
          </p>
          <div className="rounded-2xl bg-zinc-950 p-4 font-mono text-sm text-white">
            <p className="truncate">{created.email}</p>
            <p className="mt-1 text-lg font-bold tracking-wide">{created.password}</p>
          </div>
          <p className="text-xs leading-relaxed text-amber-700">
            Ne sera plus affiché après fermeture. L'utilisateur devra changer ce mot de passe depuis son profil.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={copyPassword}>
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? 'Copié !' : 'Copier les accès'}
            </Button>
            <Button size="sm" onClick={close}>
              Terminer
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Email" type="email" placeholder="compte@exemple.mg" error={errors.email?.message} {...register('email')} />
            <div>
              <Input
                label="Mot de passe temporaire"
                placeholder="Min. 8 caractères"
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setValue('password', randomPassword(), { shouldValidate: true })}
                className="mt-1 text-xs font-semibold text-brand-700 hover:underline"
              >
                Générer un mot de passe
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Prénom (optionnel)" error={errors.first_name?.message} {...register('first_name')} />
            <Input label="Nom (optionnel)" error={errors.last_name?.message} {...register('last_name')} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Téléphone (optionnel)" placeholder="+261 …" error={errors.phone?.message} {...register('phone')} />
            <SelectField
              label="Rôle"
              value={role}
              onChange={(v) => setValue('role', v, { shouldValidate: true, shouldDirty: true })}
              options={ROLE_OPTIONS}
              error={errors.role?.message}
            />
          </div>
          {role === 'partner' && (
            <SelectField
              label="Organisateur (requis pour partenaire)"
              value={partnerId ?? ''}
              onChange={(v) => setValue('partner_id', v, { shouldValidate: true, shouldDirty: true })}
              options={[
                { value: '', label: '— Choisir —' },
                ...(partners.data ?? []).map((p) => ({ value: p.id, label: p.name })),
              ]}
              error={errors.partner_id?.message}
              placeholder="— Choisir —"
              disabled={partners.isPending}
            />
          )}
          {serverError && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {serverError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={close}>
              Annuler
            </Button>
            <Button type="submit" size="sm" loading={isSubmitting || create.isPending}>
              Créer le compte
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Invitation (email Resend, scope partenaire si besoin)              */
/* ------------------------------------------------------------------ */

function InviteUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const invite = useInviteUser();
  const partners = useAdminPartners();
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'ko'; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { role: 'user', partner_id: '' },
  });
  const role = watch('role');
  const partnerId = watch('partner_id');

  const close = () => {
    onClose();
    setFeedback(null);
    reset({ email: '', role: 'user', partner_id: '' });
  };

  const onSubmit = async (values: InviteUserInput) => {
    setFeedback(null);
    try {
      await invite.mutateAsync({
        email: values.email,
        role: values.role,
        partner_id: values.partner_id || undefined,
      });
      setFeedback({ tone: 'ok', message: `Invitation envoyée à ${values.email} (rôle ${values.role}, 7 jours).` });
      reset({ email: '', role: 'user', partner_id: '' });
    } catch (err) {
      setFeedback({ tone: 'ko', message: err instanceof Error ? err.message : 'Invitation impossible.' });
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Inviter un utilisateur"
      subtitle="Email Resend avec lien d'activation (7 jours). Le compte est créé à l'acceptation."
      icon={<MailPlus className="size-5" aria-hidden />}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <Input label="Email" type="email" placeholder="invite@exemple.mg" error={errors.email?.message} {...register('email')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Rôle"
            value={role}
            onChange={(v) => setValue('role', v, { shouldValidate: true, shouldDirty: true })}
            options={ROLE_OPTIONS}
            error={errors.role?.message}
          />
          {role === 'partner' && (
            <SelectField
              label="Organisateur (requis)"
              value={partnerId ?? ''}
              onChange={(v) => setValue('partner_id', v, { shouldValidate: true, shouldDirty: true })}
              options={[
                { value: '', label: '— Choisir —' },
                ...(partners.data ?? []).map((p) => ({ value: p.id, label: p.name })),
              ]}
              error={errors.partner_id?.message}
              placeholder="— Choisir —"
              disabled={partners.isPending}
            />
          )}
        </div>
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
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={close}>
            Fermer
          </Button>
          <Button type="submit" size="sm" loading={isSubmitting || invite.isPending}>
            Envoyer l'invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Invitations en attente (renvoi / révocation)                       */
/* ------------------------------------------------------------------ */

function InvitationsCard() {
  const { data, isPending, isError, refetch } = useAdminInvitations();
  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (isPending) return null;
  if (isError) return null;

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    setFeedback(null);
    try {
      await fn();
      setFeedback(okMsg);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
            <MailPlus className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-bold leading-tight">
              Invitations en attente{' '}
              <span className="tabular-nums text-zinc-400">{data.length}</span>
            </h2>
            <p className="text-xs text-zinc-500">Lien valable 7 jours · renvoi ou révocation.</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RotateCcw className="size-4" aria-hidden /> Actualiser
        </Button>
      </div>

      {feedback && (
        <p role="status" className="mt-3 rounded-xl bg-zinc-100 p-2.5 text-xs font-medium text-zinc-700">
          {feedback}
        </p>
      )}

      {data.length === 0 ? (
        <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-4 text-center text-sm text-zinc-500">
          Aucune invitation en attente.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200">
          {data.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center gap-2 bg-white px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{inv.email}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                  <Badge tone="neutral">{inv.role}</Badge>
                  {inv.partner_name && <span title={inv.partner_id ?? ''}>· {inv.partner_name}</span>}
                  <span>· expire le {formatDate(inv.expires_at)}</span>
                  {inv.expired ? (
                    <Badge tone="danger">Expirée</Badge>
                  ) : (
                    <Badge tone="warning">En attente</Badge>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  title="Renvoyer l'invitation"
                  aria-label={`Renvoyer à ${inv.email}`}
                  disabled={resend.isPending}
                  onClick={() => act(() => resend.mutateAsync(inv.id), `Invitation renvoyée à ${inv.email}.`)}
                  className="grid size-8 place-items-center rounded-full border border-zinc-300 text-zinc-500 transition hover:border-zinc-900 hover:bg-zinc-900 hover:text-white disabled:opacity-40"
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  title="Révoquer l'invitation"
                  aria-label={`Révoquer ${inv.email}`}
                  disabled={revoke.isPending}
                  onClick={() => setConfirmRevoke(inv.id)}
                  className="grid size-8 place-items-center rounded-full border border-red-200 text-red-500 transition hover:border-red-600 hover:bg-red-600 hover:text-white disabled:opacity-40"
                >
                  <XCircle className="size-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmRevoke !== null}
        title="Révoquer cette invitation ?"
        description="Le lien d'activation ne fonctionnera plus."
        confirmLabel="Révoquer"
        danger
        loading={revoke.isPending}
        onConfirm={() =>
          confirmRevoke &&
          act(() => revoke.mutateAsync(confirmRevoke), 'Invitation révoquée.').finally(() =>
            setConfirmRevoke(null),
          )
        }
        onClose={() => setConfirmRevoke(null)}
      />
    </Card>
  );
}

/** Garde visuelle : rappel anti auto-blocage dans l'en-tête. */
export function UserSelfGuardHint() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-zinc-400">
      <ShieldCheck className="size-3.5" aria-hidden />
      Vos propres rôle / statut / suppression sont verrouillés.
    </p>
  );
}
