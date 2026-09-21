import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  AtSign,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleAlert,
  FileText,
  Handshake,
  ImagePlus,
  KeyRound,
  Link2,
  MapPin,
  Palette,
  Phone,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  useAdminPartner,
  useCreatePartner,
  useLinkPartnerAccount,
  useUpdatePartner,
} from '../../features/admin/hooks';
import { partnerSchema, type PartnerInput } from '../../schemas';
import { getSupabase } from '../../lib/supabase';
import { deleteEventImageIfUnused, uploadEventImage } from '../../services/storage';
import { useImageDraft } from '../../hooks/useImageDraft';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Fields';
import { useToast } from '../../components/ui/Toaster';
import { Card } from '../../components/ui/Card';
import { PartnerStatusBadge } from '../../components/admin/StatusBadges';
import { ErrorState } from '../../components/ui/States';
import { PartnerFormSkeleton } from '../../components/admin/AdminSkeletons';
import { cn, formatDate } from '../../lib/utils';

type PartnerStatus = PartnerInput['status'];

const STATUS_CARDS: {
  value: PartnerStatus;
  label: string;
  hint: string;
  dot: string;
  ring: string;
}[] = [
  {
    value: 'active',
    label: 'Actif',
    hint: 'Publie et encaisse',
    dot: 'bg-emerald-500',
    ring: 'aria-checked:border-emerald-500 aria-checked:bg-emerald-50/60 aria-checked:ring-emerald-100',
  },
  {
    value: 'pending',
    label: 'En attente',
    hint: 'Dossier à valider',
    dot: 'bg-amber-500',
    ring: 'aria-checked:border-amber-500 aria-checked:bg-amber-50/60 aria-checked:ring-amber-100',
  },
  {
    value: 'suspended',
    label: 'Suspendu',
    hint: 'Accès coupé',
    dot: 'bg-orange-500',
    ring: 'aria-checked:border-orange-500 aria-checked:bg-orange-50/60 aria-checked:ring-orange-100',
  },
  {
    value: 'disabled',
    label: 'Désactivé',
    hint: 'Archivé',
    dot: 'bg-zinc-400',
    ring: 'aria-checked:border-zinc-500 aria-checked:bg-zinc-100/70 aria-checked:ring-zinc-200',
  },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '•';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function CardTitle({
  icon,
  title,
  description,
  tag,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 pb-4 pt-5 md:px-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-2xl bg-night-950 text-gold-400"
        >
          {icon}
        </span>
        <div>
          <h2 className="text-[15px] font-bold text-zinc-900">{title}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        </div>
      </div>
      {tag && (
        <span className="mt-1 hidden shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-500 sm:inline">
          {tag}
        </span>
      )}
    </div>
  );
}

export function AdminPartnerFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { data: existing, isPending, isError, refetch } = useAdminPartner(id);
  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();
  const linkAccount = useLinkPartnerAccount();
  const { toast } = useToast();

  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [accessEmail, setAccessEmail] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [creatingAccess, setCreatingAccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PartnerInput>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: '',
      manager_name: '',
      phone: '',
      email: '',
      address: '',
      logo_url: '',
      contract_info: '',
      status: 'pending',
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        manager_name: existing.manager_name ?? '',
        phone: existing.phone ?? '',
        email: existing.email ?? '',
        address: existing.address ?? '',
        logo_url: existing.logo_url ?? '',
        contract_info: existing.contract_info ?? '',
        status: existing.status,
      });
    }
  }, [existing, reset]);

  const name = watch('name') ?? '';
  const managerName = watch('manager_name') ?? '';
  const phone = watch('phone') ?? '';
  const email = watch('email') ?? '';
  const address = watch('address') ?? '';
  const formLogoUrl = watch('logo_url') ?? '';
  const status = watch('status') ?? 'pending';
  const contractInfo = watch('contract_info') ?? '';

  const imageDraft = useImageDraft(existing?.logo_url);
  const { hasPending: hasPendingImage, clear: clearImageDraft } = imageDraft;
  const displayLogoUrl = imageDraft.previewUrl ?? formLogoUrl;

  useEffect(() => {
    if (hasPendingImage && formLogoUrl) clearImageDraft();
  }, [formLogoUrl, hasPendingImage, clearImageDraft]);

  const handleSelectFile = (file: File | undefined) => {
    if (!file) return;
    setServerError(null);
    const invalid = imageDraft.select(file);
    if (invalid) {
      setServerError(invalid);
      toast.error('Logo invalide', invalid);
      return;
    }
    if (formLogoUrl) setValue('logo_url', '', { shouldValidate: true, shouldDirty: true });
  };

  const handleRemoveImage = () => {
    imageDraft.clear();
    setValue('logo_url', '', { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (values: PartnerInput) => {
    setServerError(null);
    setUploading(true);
    let logoUrl = values.logo_url ?? '';
    let cleanupFailed = false;
    try {
      const resolved = await imageDraft.resolveOnSave({
        formUrl: logoUrl,
        upload: uploadEventImage,
        destroy: (url) => deleteEventImageIfUnused(url, undefined),
      });
      logoUrl = resolved.url;
      cleanupFailed = resolved.cleanupFailed;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload impossible.';
      setServerError(message);
      toast.error('Logo impossible à enregistrer', message);
      setUploading(false);
      return;
    }
    setUploading(false);
    values.logo_url = logoUrl;
    try {
      if (isNew) {
        const created = await createPartner.mutateAsync(values);
        toast.created('Partenaire', `« ${values.name} » a été ajouté.`, {
          action: {
            label: 'Ouvrir la fiche',
            onClick: () => navigate(`/admin/partners/${created.id}/edit`),
          },
        });
        navigate('/admin/partners', { replace: true });
      } else if (id) {
        await updatePartner.mutateAsync({ id, input: values });
        toast.updated('Partenaire', `« ${values.name} » a été mis à jour.`);
        navigate('/admin/partners', { replace: true });
      }
      if (cleanupFailed) {
        toast.warning(
          'Partenaire enregistré',
          'L’ancien logo n’a pas pu être supprimé du stockage.',
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Enregistrement impossible.';
      setServerError(message);
      toast.error('Enregistrement impossible', message);
    }
  };

  const handleLink = async () => {
    if (!id || !linkEmail.trim()) return;
    setServerError(null);
    try {
      await linkAccount.mutateAsync({ partnerId: id, email: linkEmail });
      toast.success('Compte rattaché', `${linkEmail.trim()} peut désormais gérer ce partenaire.`);
      setLinkEmail('');
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Liaison impossible.';
      setServerError(message);
      toast.error('Liaison impossible', message);
    }
  };

  const handleCreateAccess = async () => {
    if (!id) return;
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
        body: { email: accessEmail.trim(), password: accessPassword, partner_id: id },
      });
      if (error) throw error;
      if ((res as { error?: string })?.error) throw new Error((res as { error: string }).error);
      setAccessEmail('');
      setAccessPassword('');
      toast.success('Accès créé', 'Le partenaire peut désormais se connecter.');
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Création impossible.';
      const friendly = /not found|404|Failed to fetch|Failed to send.*request|CORS|preflight/i.test(msg)
        ? 'Edge Function « create-partner-user » inaccessible (non déployée ou CORS). Redéployez avec verify_jwt=false : supabase functions deploy create-partner-user.'
        : msg;
      setServerError(friendly);
      toast.error('Création impossible', friendly);
    } finally {
      setCreatingAccess(false);
    }
  };

  const completion = useMemo(() => {
    const items = [
      { label: 'Raison sociale', done: name.trim().length >= 2 },
      { label: 'Responsable', done: managerName.trim().length >= 2 },
      { label: 'Contact (tél. ou email)', done: phone.trim() !== '' || email.trim() !== '' },
      { label: 'Adresse', done: address.trim().length >= 3 },
      { label: 'Logo', done: Boolean(displayLogoUrl) },
      { label: 'Cadre contractuel', done: contractInfo.trim().length >= 10 },
    ];
    const done = items.filter((i) => i.done).length;
    return { items, done, total: items.length, pct: Math.round((done / items.length) * 100) };
  }, [name, managerName, phone, email, address, displayLogoUrl, contractInfo]);

  if (!isNew && isPending) return <PartnerFormSkeleton />;
  if (!isNew && (isError || !existing))
    return <ErrorState description="Partenaire introuvable." onRetry={() => refetch()} />;

  const saving = isSubmitting || uploading || createPartner.isPending || updatePartner.isPending;
  const members = existing?.members ?? [];
  const eventsCount = existing?.events_count ?? 0;
  const heroName = name.trim() || existing?.name || 'Nouveau partenaire';

  return (
    <div className="w-full space-y-5">
      {/* Fil d'Ariane + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Fil d'Ariane" className="flex min-w-0 items-center gap-1.5 text-sm">
          <Link
            to="/admin/partners"
            className="inline-flex shrink-0 items-center gap-1 font-medium text-zinc-500 transition hover:text-zinc-900"
          >
            <ArrowLeft className="size-4" aria-hidden /> Partenaires
          </Link>
          <span aria-hidden className="text-zinc-300">
            /
          </span>
          <span className="truncate font-semibold text-zinc-900">
            {isNew ? 'Nouveau' : heroName}
          </span>
          {!isNew && existing && (
            <span className="hidden shrink-0 sm:inline">
              <PartnerStatusBadge status={existing.status} />
            </span>
          )}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/admin/partners"
            className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-200/60 hover:text-zinc-900"
          >
            Annuler
          </Link>
          <Button type="submit" form="partner-form" loading={saving} className="h-10 rounded-xl px-5">
            <BadgeCheck className="size-4" aria-hidden />
            {isNew ? 'Créer le partenaire' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {/* Hero dossier — carte d'identité */}
      <section aria-label="Dossier partenaire" className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="relative overflow-hidden bg-night-950 px-5 pb-5 pt-6 sm:px-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'radial-gradient(circle at 85% 20%, rgba(212,175,55,.28), transparent 42%), radial-gradient(circle at 10% 90%, rgba(124,58,237,.25), transparent 40%)',
            }}
          />
          <div className="relative flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-gold-400 ring-1 ring-white/10">
              <Handshake className="size-3.5" aria-hidden />
              {isNew ? 'Nouveau dossier' : 'Dossier partenaire'}
            </span>
            {!isNew && existing && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-zinc-300 ring-1 ring-white/10">
                <CalendarDays className="size-3.5" aria-hidden />
                Client depuis le {formatDate(existing.created_at)}
              </span>
            )}
            {hasPendingImage && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-night-950">
                <CircleAlert className="size-3.5" aria-hidden /> Logo non enregistré
              </span>
            )}
          </div>
          <p className="relative mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            {isNew
              ? 'Créez la fiche officielle de l’organisateur : elle conditionne ses droits de publication, ses accès et son historique.'
              : 'Fiche officielle de l’organisateur : droits de publication, accès et historique.'}
          </p>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5 sm:px-7 md:flex-row md:items-center">
          <div className="-mt-12 shrink-0 md:-mt-14">
            {displayLogoUrl ? (
              <img
                src={displayLogoUrl}
                alt=""
                className="size-20 rounded-3xl border-4 border-white bg-white object-cover shadow-lg md:size-24"
              />
            ) : (
              <span
                aria-hidden
                className="grid size-20 place-items-center rounded-3xl border-4 border-white bg-night-950 text-xl font-bold text-gold-400 shadow-lg md:size-24"
              >
                {heroName ? initials(heroName) : '•'}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-bold tracking-tight text-zinc-950 md:text-2xl" title={heroName}>
              {heroName}
            </h1>
            <p className="mt-0.5 truncate text-sm text-zinc-500">
              {managerName.trim() ? (
                <>
                  Géré par <strong className="font-semibold text-zinc-800">{managerName}</strong>
                  {phone.trim() ? ` · ${phone}` : ''}
                </>
              ) : (
                'Responsable à renseigner'
              )}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="inline-flex max-w-60 items-center gap-1.5 truncate rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-600">
                <AtSign className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{email.trim() || 'Email —'}</span>
              </span>
              <span className="inline-flex max-w-60 items-center gap-1.5 truncate rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-600">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{address.trim() || 'Adresse —'}</span>
              </span>
              {!isNew && (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600/10 px-2.5 py-1 font-bold text-brand-700">
                    {eventsCount} événement{eventsCount > 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-night-950 px-2.5 py-1 font-bold text-white">
                    {members.length} compte{members.length > 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200/70">
            <ShieldCheck aria-hidden className="size-5 text-emerald-600" />
            <div className="text-xs leading-tight">
              <p className="font-bold text-zinc-900">Fiche vérifiée par l’admin</p>
              <p className="text-zinc-500">Modifications tracées (audit)</p>
            </div>
          </div>
        </div>
      </section>

      {serverError && (
        <p role="alert" className="rounded-2xl bg-red-50 p-3.5 text-sm text-red-700 ring-1 ring-red-100">
          {serverError}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Colonne formulaire */}
        <form id="partner-form" onSubmit={handleSubmit(onSubmit)} noValidate className="min-w-0 space-y-5">
          {/* Profil */}
          <Card className="overflow-hidden rounded-3xl">
            <CardTitle
              icon={<Building2 className="size-5" aria-hidden />}
              title="Profil & coordonnées"
              description="Utilisés pour contacter l’organisateur et éditer ses factures."
              tag="Obligatoire"
            />
            <div className="space-y-4 px-5 py-5 md:px-6">
              <div>
                <Input
                  label="Raison sociale *"
                  placeholder="Ex. ShowPro Madagascar"
                  maxLength={160}
                  error={errors.name?.message}
                  {...register('name')}
                />
                <p className="mt-1 text-right text-xs tabular-nums text-zinc-400">{name.length}/160</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Responsable"
                  placeholder="Nom du gérant"
                  error={errors.manager_name?.message}
                  {...register('manager_name')}
                />
                <Input
                  label="Téléphone"
                  placeholder="+261 34 00 000 00"
                  inputMode="tel"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Email de contact"
                  type="email"
                  placeholder="contact@partenaire.mg"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Input
                  label="Adresse"
                  placeholder="Lot, rue, quartier, ville…"
                  error={errors.address?.message}
                  {...register('address')}
                />
              </div>
            </div>
          </Card>

          {/* Logo */}
          <Card className="overflow-hidden rounded-3xl">
            <CardTitle
              icon={<Palette className="size-5" aria-hidden />}
              title="Logo & identité visuelle"
              description="Affiché dans les listes, les e-tickets et les e-mails."
              tag="Facultatif"
            />
            <div className="space-y-4 px-5 py-5 md:px-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 p-4 sm:flex-row sm:items-center">
                {displayLogoUrl ? (
                  <img
                    src={displayLogoUrl}
                    alt="Logo du partenaire"
                    className="size-16 shrink-0 rounded-2xl border border-zinc-200 bg-white object-cover shadow-sm"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid size-16 shrink-0 place-items-center rounded-2xl bg-night-950 text-base font-bold text-gold-400"
                  >
                    {heroName ? initials(heroName) : '•'}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-900">
                    {displayLogoUrl ? 'Logo en place' : 'Aucun logo pour le moment'}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    JPEG, PNG ou WebP — 5 Mo max. L’upload réel a lieu à l’enregistrement.
                  </p>
                  {imageDraft.committed && !displayLogoUrl && (
                    <p role="status" className="mt-2 rounded-xl bg-amber-50 p-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                      Le logo actuel sera supprimé du stockage à l’enregistrement.
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-9 rounded-xl"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="size-4" aria-hidden />
                    {displayLogoUrl ? 'Remplacer' : 'Parcourir'}
                  </Button>
                  {displayLogoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={uploading}
                      title="Retirer le logo"
                      aria-label="Retirer le logo"
                      className="grid size-9 place-items-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                disabled={uploading}
                onChange={(e) => {
                  handleSelectFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <Input
                label="Ou coller une URL de logo"
                placeholder="https://…"
                error={errors.logo_url?.message}
                {...register('logo_url')}
              />
            </div>
          </Card>

          {/* Statut & contrat */}
          <Card className="overflow-hidden rounded-3xl">
            <CardTitle
              icon={<FileText className="size-5" aria-hidden />}
              title="Statut & cadre contractuel"
              description="Le statut pilote les droits de publication du partenaire."
              tag="Pilotage"
            />
            <div className="space-y-4 px-5 py-5 md:px-6">
              <div
                role="radiogroup"
                aria-label="Statut du partenaire"
                className="grid grid-cols-2 gap-2.5"
              >
                {STATUS_CARDS.map((s) => {
                  const checked = status === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      onClick={() =>
                        setValue('status', s.value, { shouldValidate: true, shouldDirty: true })
                      }
                      className={cn(
                        'flex items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white p-3 text-left ring-4 ring-transparent transition hover:border-zinc-300',
                        s.ring,
                        checked && 'border-current shadow-sm',
                      )}
                    >
                      <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', s.dot)} />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-zinc-900">{s.label}</span>
                        <span className="block truncate text-xs text-zinc-500">{s.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.status?.message && (
                <p role="alert" className="text-xs text-red-600">
                  {errors.status.message}
                </p>
              )}
              <div>
                <Textarea
                  label="Informations contractuelles"
                  rows={4}
                  placeholder="Commission, durée, interlocuteurs, clauses particulières…"
                  maxLength={2000}
                  error={errors.contract_info?.message}
                  {...register('contract_info')}
                />
                <p className="mt-1 text-right text-xs tabular-nums text-zinc-400">
                  {contractInfo.length}/2000
                </p>
              </div>
            </div>
          </Card>

          {/* Accès */}
          <Card className="overflow-hidden rounded-3xl">
            <CardTitle
              icon={<KeyRound className="size-5" aria-hidden />}
              title="Comptes & accès"
              description="Les identifiants qui pilotent ce partenaire au quotidien."
              tag={isNew ? 'Après création' : `${members.length} compte(s)`}
            />
            <div className="space-y-4 px-5 py-5 md:px-6">
              {isNew ? (
                <div className="flex items-start gap-3 rounded-2xl bg-night-950 p-4 text-sm text-zinc-300">
                  <KeyRound aria-hidden className="mt-0.5 size-5 shrink-0 text-gold-400" />
                  <p>
                    Créez d’abord la fiche : vous pourrez ensuite lier un compte existant ou
                    générer un accès de connexion depuis cette même page.
                  </p>
                </div>
              ) : (
                <>
                  {members.length > 0 ? (
                    <ul className="overflow-hidden rounded-2xl border border-zinc-200">
                      {members.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-white px-4 py-3 last:border-0"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span
                              aria-hidden
                              className="grid size-9 shrink-0 place-items-center rounded-full bg-night-950 text-xs font-bold text-gold-400"
                            >
                              {initials(
                                [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email,
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-zinc-900">
                                {[m.first_name, m.last_name].filter(Boolean).join(' ') || m.email}
                              </span>
                              <span className="block truncate text-xs text-zinc-500">{m.email}</span>
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                              {m.role}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500 ring-1 ring-zinc-200/60">
                      Aucun compte rattaché — liez un utilisateur existant ou créez son accès
                      ci-dessous.
                    </p>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-200 p-3.5">
                      <p className="flex items-center gap-1.5 text-sm font-bold text-zinc-900">
                        <Link2 className="size-4 text-zinc-500" aria-hidden /> Compte existant
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">Rattache un utilisateur déjà inscrit.</p>
                      <div className="mt-2.5 flex items-end gap-2">
                        <div className="min-w-0 flex-1">
                          <Input
                            label="Email du compte"
                            type="email"
                            placeholder="partenaire@exemple.mg"
                            value={linkEmail}
                            onChange={(e) => setLinkEmail(e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-10 shrink-0 rounded-xl"
                          loading={linkAccount.isPending}
                          onClick={handleLink}
                        >
                          Lier
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-night-950 p-3.5 text-white">
                      <p className="flex items-center gap-1.5 text-sm font-bold">
                        <UserPlus className="size-4 text-gold-400" aria-hidden /> Nouvel accès
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400">Crée le login + mot de passe initial.</p>
                      <div className="mt-2.5 space-y-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-zinc-300">Email</span>
                          <input
                            type="email"
                            placeholder="nouveau@exemple.mg"
                            value={accessEmail}
                            onChange={(e) => setAccessEmail(e.target.value)}
                            className="h-10 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
                          />
                        </label>
                        <div className="flex items-end gap-2">
                          <label className="block min-w-0 flex-1">
                            <span className="mb-1 block text-xs font-medium text-zinc-300">
                              Mot de passe
                            </span>
                            <input
                              type="password"
                              autoComplete="new-password"
                              placeholder="8 caractères min"
                              value={accessPassword}
                              onChange={(e) => setAccessPassword(e.target.value)}
                              className="h-10 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
                            />
                          </label>
                          <Button
                            type="button"
                            size="sm"
                            className="h-10 shrink-0 rounded-xl bg-gold-400 text-night-950 shadow-none hover:bg-gold-300"
                            loading={creatingAccess}
                            onClick={handleCreateAccess}
                          >
                            Créer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Barre d'action mobile */}
          <div className="lg:hidden">
            <Button type="submit" loading={saving} size="lg" className="w-full rounded-2xl">
              {isNew ? 'Créer le partenaire' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </form>

        {/* Rail dossier */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24" aria-label="Suivi du dossier">
          <Card className="overflow-hidden rounded-3xl p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-zinc-900">Complétude du dossier</p>
              <span className="rounded-full bg-night-950 px-2.5 py-1 text-xs font-bold tabular-nums text-gold-400">
                {completion.pct} %
              </span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100"
              role="progressbar"
              aria-valuenow={completion.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Complétude du dossier"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-400 to-emerald-500 transition-all"
                style={{ width: `${completion.pct}%` }}
              />
            </div>
            <ul className="mt-3 space-y-1.5">
              {completion.items.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-[13px]">
                  {item.done ? (
                    <CheckCircle2 aria-hidden className="size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle aria-hidden className="size-4 shrink-0 text-zinc-300" />
                  )}
                  <span className={item.done ? 'font-medium text-zinc-700' : 'text-zinc-500'}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="overflow-hidden rounded-3xl">
            <p className="border-b border-zinc-100 px-5 py-3.5 text-sm font-bold text-zinc-900">
              Résumé
            </p>
            <dl className="space-y-2.5 px-5 py-4 text-[13px]">
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-zinc-500">
                  <ShieldCheck className="size-4" aria-hidden /> Statut
                </dt>
                <dd>
                  <PartnerStatusBadge status={status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-zinc-500">
                  <Phone className="size-4" aria-hidden /> Contact
                </dt>
                <dd className="max-w-40 truncate font-semibold text-zinc-800">
                  {phone.trim() || email.trim() || '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-zinc-500">
                  <MapPin className="size-4" aria-hidden /> Adresse
                </dt>
                <dd className="max-w-40 truncate font-semibold text-zinc-800">
                  {address.trim() || '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-zinc-500">
                  <FileText className="size-4" aria-hidden /> Contrat
                </dt>
                <dd className="font-semibold tabular-nums text-zinc-800">
                  {contractInfo.trim() ? `${contractInfo.trim().length} car.` : '—'}
                </dd>
              </div>
              {!isNew && existing && (
                <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2.5">
                  <dt className="text-zinc-500">Mis à jour</dt>
                  <dd className="font-semibold text-zinc-800">{formatDate(existing.updated_at)}</dd>
                </div>
              )}
            </dl>
          </Card>

          {!isNew && existing && existing.events.length > 0 && (
            <Card className="overflow-hidden rounded-3xl">
              <p className="border-b border-zinc-100 px-5 py-3.5 text-sm font-bold text-zinc-900">
                Événements ({existing.events.length})
              </p>
              <ul className="divide-y divide-zinc-100">
                {existing.events.slice(0, 6).map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/admin/events/${e.id}/edit`}
                      className="flex items-center justify-between gap-2 px-5 py-2.5 text-[13px] transition hover:bg-zinc-50"
                    >
                      <span className="truncate font-medium text-zinc-800">{e.title}</span>
                      <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                        {e.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="hidden lg:block">
            <Button type="submit" form="partner-form" loading={saving} size="lg" className="w-full rounded-2xl">
              {isNew ? 'Créer le partenaire' : 'Enregistrer'}
            </Button>
            <p className="mt-2 text-center text-xs text-zinc-400">
              {completion.done}/{completion.total} blocs renseignés
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
