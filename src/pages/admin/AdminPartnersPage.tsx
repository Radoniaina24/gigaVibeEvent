import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link2, Pencil, Plus, Trash2, Upload, UserPlus, X } from 'lucide-react';
import {
  useAdminPartners,
  useCreatePartner,
  useDeletePartner,
  useLinkPartnerAccount,
  useUpdatePartner,
  type AdminPartnerRow,
} from '../../features/admin/hooks';
import { partnerSchema, type PartnerInput } from '../../schemas';
import type { Partner } from '../../types/database';
import { getSupabase } from '../../lib/supabase';
import { uploadEventImage } from '../../services/storage';
import { PartnerStatusBadge } from '../../components/admin/StatusBadges';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select, Textarea } from '../../components/ui/Fields';
import { DataTable } from '../../components/admin/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toaster';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';

const EMPTY: PartnerInput = {
  name: '',
  manager_name: '',
  phone: '',
  email: '',
  address: '',
  logo_url: '',
  contract_info: '',
  status: 'pending',
};

export function AdminPartnersPage() {
  const { data, isPending, isError, refetch } = useAdminPartners();
  const { toast } = useToast();
  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();
  const deletePartner = useDeletePartner();
  const linkAccount = useLinkPartnerAccount();

  const [editing, setEditing] = useState<Partner | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<AdminPartnerRow | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [accessEmail, setAccessEmail] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [creatingAccess, setCreatingAccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PartnerInput>({ resolver: zodResolver(partnerSchema) });

  useEffect(() => {
    if (editing === 'new') {
      reset(EMPTY);
      setLinkEmail('');
    } else if (editing) {
      reset({
        name: editing.name,
        manager_name: editing.manager_name ?? '',
        phone: editing.phone ?? '',
        email: editing.email ?? '',
        address: editing.address ?? '',
        logo_url: editing.logo_url ?? '',
        contract_info: editing.contract_info ?? '',
        status: editing.status,
      });
      setLinkEmail('');
    }
  }, [editing, reset]);

  const logoUrl = watch('logo_url');
  const editingRow =
    editing && editing !== 'new'
      ? (data ?? []).find((p) => p.id === editing.id)
      : undefined;

  const handleLogo = async (file: File | undefined) => {
    if (!file) return;
    setServerError(null);
    setUploading(true);
    try {
      const url = await uploadEventImage(file);
      setValue('logo_url', url, { shouldValidate: true });
      toast.success('Logo téléversé', 'Pensez à enregistrer le partenaire.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload impossible.';
      setServerError(message);
      toast.error('Upload impossible', message);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: PartnerInput) => {
    setServerError(null);
    try {
      if (editing === 'new') {
        await createPartner.mutateAsync(values);
        toast.created('Partenaire', `« ${values.name} » a été ajouté.`);
      } else if (editing) {
        await updatePartner.mutateAsync({ id: editing.id, input: values });
        toast.updated('Partenaire', `« ${values.name} » a été mis à jour.`);
      }
      setEditing(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Enregistrement impossible.';
      setServerError(message);
      toast.error('Enregistrement impossible', message);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setServerError(null);
    try {
      await deletePartner.mutateAsync(toDelete);
      toast.deleted('Partenaire', `« ${toDelete.name} » a été supprimé.`);
      setToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Suppression impossible.';
      setServerError(message);
      toast.error('Suppression impossible', message);
    }
  };

  const handleLink = async () => {
    if (!editing || editing === 'new' || !linkEmail.trim()) return;
    setServerError(null);
    try {
      await linkAccount.mutateAsync({ partnerId: editing.id, email: linkEmail });
      toast.success('Compte rattaché', `${linkEmail.trim()} peut désormais gérer ce partenaire.`);
      setLinkEmail('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Liaison impossible.';
      setServerError(message);
      toast.error('Liaison impossible', message);
    }
  };

  /** Crée le compte de connexion via l'Edge Function (service_role). */
  const handleCreateAccess = async () => {
    if (!editing || editing === 'new') return;
    setServerError(null);
    if (!accessEmail.trim() || accessPassword.length < 8) {
      const message = 'Email requis et mot de passe de 8 caractères minimum.';
      setServerError(message);
      toast.warning('Vérifiez le formulaire', message);
      return;
    }
    setCreatingAccess(true);
    try {
      const supabase = getSupabase();
      const { data: res, error } = await supabase.functions.invoke('create-partner-user', {
        body: { email: accessEmail.trim(), password: accessPassword, partner_id: editing.id },
      });
      if (error) throw error;
      if ((res as { error?: string })?.error) throw new Error((res as { error: string }).error);
      setAccessEmail('');
      setAccessPassword('');
      toast.success('Accès créé', 'Le partenaire peut désormais se connecter.');
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Création impossible.';
      const friendly = /not found|404|Failed to fetch/i.test(msg)
        ? "Edge Function « create-partner-user » non déployée. Voir supabase/functions/create-partner-user/README."
        : msg;
      setServerError(friendly);
      toast.error('Création impossible', friendly);
    } finally {
      setCreatingAccess(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partenaires</h1>
          <p className="text-sm text-zinc-500">
            Organisateurs de la plateforme : comptes, statuts et accès.
          </p>
        </div>
        {editing === null && (
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden /> Nouveau partenaire
          </Button>
        )}
      </div>

      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      {editing !== null && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4 rounded-xl border border-zinc-300 bg-white p-4 md:p-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {editing === 'new' ? 'Nouveau partenaire' : `Modifier ${editing.name}`}
            </p>
            <button
              type="button"
              onClick={() => setEditing(null)}
              aria-label="Fermer"
              className="rounded-md p-1 hover:bg-zinc-100"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Raison sociale *" error={errors.name?.message} {...register('name')} />
            <Input label="Responsable" error={errors.manager_name?.message} {...register('manager_name')} />
            <Input label="Téléphone" error={errors.phone?.message} {...register('phone')} />
            <Input label="Email de contact" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="Adresse" error={errors.address?.message} {...register('address')} />
            <Select label="Statut *" error={errors.status?.message} {...register('status')}>
              <option value="pending">En attente</option>
              <option value="active">Actif</option>
              <option value="suspended">Suspendu</option>
              <option value="disabled">Désactivé</option>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700">Logo</p>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo du partenaire" className="size-14 rounded-xl border border-zinc-200 object-cover" />
              ) : (
                <span className="flex size-14 items-center justify-center rounded-xl bg-zinc-100 text-xs text-zinc-400">
                  —
                </span>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-100">
                <Upload className="size-4" aria-hidden />
                {uploading ? 'Envoi…' : 'Choisir un logo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => handleLogo(e.target.files?.[0])}
                />
              </label>
            </div>
            <Input label="URL du logo" error={errors.logo_url?.message} {...register('logo_url')} />
          </div>

          <Textarea
            label="Informations contractuelles"
            rows={3}
            error={errors.contract_info?.message}
            {...register('contract_info')}
          />

          <Button
            type="submit"
            loading={isSubmitting || createPartner.isPending || updatePartner.isPending}
          >
            Enregistrer
          </Button>

          {/* ----- Compte de connexion ----- */}
          {editing !== 'new' && (
            <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-semibold">Compte de connexion</p>
              {editingRow && editingRow.members.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {editingRow.members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {[m.first_name, m.last_name].filter(Boolean).join(' ') || m.email}
                        <span className="text-zinc-500"> · {m.email}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium">
                        {m.role}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">Aucun compte rattaché pour le moment.</p>
              )}

              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <Input
                  label="Lier un compte existant (email)"
                  type="email"
                  placeholder="partenaire@exemple.mg"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-10"
                  loading={linkAccount.isPending}
                  onClick={handleLink}
                >
                  <Link2 className="size-4" aria-hidden /> Lier
                </Button>
              </div>

              <div className="grid gap-2 border-t border-zinc-200 pt-3 sm:grid-cols-3 sm:items-end">
                <Input
                  label="Créer un accès (email)"
                  type="email"
                  placeholder="nouveau@exemple.mg"
                  value={accessEmail}
                  onChange={(e) => setAccessEmail(e.target.value)}
                />
                <Input
                  label="Mot de passe temporaire"
                  type="password"
                  autoComplete="new-password"
                  placeholder="8 caractères min"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-10"
                  loading={creatingAccess}
                  onClick={handleCreateAccess}
                >
                  <UserPlus className="size-4" aria-hidden /> Créer l’accès
                </Button>
              </div>
            </div>
          )}
        </form>
      )}

      {isPending ? (
        <LoadingState label="Chargement des partenaires…" />
      ) : isError ? (
        <ErrorState description="Impossible de charger les partenaires." onRetry={() => refetch()} />
      ) : !data.length ? (
        <EmptyState
          title="Aucun partenaire."
          description="Ajoutez votre premier organisateur pour ouvrir la plateforme."
        />
      ) : (
        <DataTable
          caption="Liste des partenaires"
          keyOf={(p) => p.id}
          rows={data}
          columns={[
            {
              key: 'name',
              header: 'Partenaire',
              render: (p) => (
                <div className="flex items-center gap-3">
                  {p.logo_url ? (
                    <img src={p.logo_url} alt="" className="size-9 shrink-0 rounded-lg border border-zinc-200 object-cover" />
                  ) : (
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-500">
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-zinc-500">
                      {p.manager_name ?? '—'}{p.phone ? ` · ${p.phone}` : ''}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: 'events',
              header: 'Événements',
              render: (p) => <span className="tabular-nums">{p.events_count}</span>,
            },
            {
              key: 'accounts',
              header: 'Comptes',
              render: (p) => <span className="tabular-nums">{p.members.length}</span>,
            },
            {
              key: 'status',
              header: 'Statut',
              render: (p) => <PartnerStatusBadge status={p.status} />,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (p) => (
                <span className="flex gap-1">
                  <button
                    type="button"
                    title="Modifier"
                    onClick={() => setEditing(p)}
                    className="rounded-md p-2 hover:bg-zinc-100"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    title="Supprimer"
                    onClick={() => setToDelete(p)}
                    className="rounded-md p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </span>
              ),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer ce partenaire ?"
        description={
          toDelete
            ? `"${toDelete.name}" sera définitivement supprimé. Impossible s’il possède des événements.`
            : undefined
        }
        confirmLabel="Supprimer"
        danger
        loading={deletePartner.isPending}
        onConfirm={handleDelete}
        onClose={() => {
          setToDelete(null);
          setServerError(null);
        }}
      />
    </div>
  );
}
