import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  MapPin,
  Send,
  Tags,
  Trash2,
} from 'lucide-react';
import {
  useCreatePartnerEvent,
  useCreatePartnerTicketType,
  useDeletePartnerTicketType,
  useMyPartner,
  usePartnerEvent,
  useSubmitEventForReview,
  useUpdatePartnerEvent,
  useUpdatePartnerTicketType,
} from '../../features/partner/hooks';
import { TicketTypesManager } from '../../features/admin/components/TicketTypesManager';
import { useCategories } from '../../hooks/useEvents';
import { eventSchema, type EventInput, type TicketTypeInput } from '../../schemas';
import { formatDate, slugify } from '../../lib/utils';
import { uploadPartnerAsset, deletePartnerAssetIfUnused } from '../../services/storage';
import { useImageDraft } from '../../hooks/useImageDraft';
import { EventStatusBadge } from '../../components/admin/StatusBadges';
import { PartnerStatusBanner } from '../../components/layout/PartnerLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toaster';
import { Card } from '../../components/ui/Card';
import { Select, Textarea } from '../../components/ui/Fields';
import { EventImage } from '../../components/events/EventImage';
import { ErrorState } from '../../components/ui/States';
import { PartnerEventFormSkeleton } from './PartnerSkeletons';

const EDITABLE = ['draft', 'pending_review', 'changes_requested', 'cancelled'];
const SUBMITTABLE = ['draft', 'changes_requested'];

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const SECTIONS = [
  { id: 'section-infos', num: '01', label: 'Informations' },
  { id: 'section-image', num: '02', label: 'Visuel' },
  { id: 'section-lieu', num: '03', label: 'Catégorie, date & lieu' },
] as const;

function SectionHeader({
  num,
  icon,
  title,
  description,
}: {
  num: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-sm shadow-brand-600/30"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Étape {num}
        </p>
        <h2 className="font-display text-base font-bold">{title}</h2>
        <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

export function PartnerEventFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const partner = useMyPartner();
  const { data: existing, isPending, isError, refetch } = usePartnerEvent(id);
  const categories = useCategories();
  const createEvent = useCreatePartnerEvent();
  const updateEvent = useUpdatePartnerEvent();
  const submitReview = useSubmitEventForReview();
  const createTicketType = useCreatePartnerTicketType();
  const { toast } = useToast();

  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  /** Billets saisis pendant la création — créés avec l'événement. */
  const [draftTickets, setDraftTickets] = useState<TicketTypeInput[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: { status: 'draft', is_featured: false, city: 'Antananarivo' },
  });

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        slug: existing.slug,
        description: existing.description ?? '',
        image_url: existing.image_url ?? '',
        category_id: existing.category_id,
        starts_at: toLocalInput(existing.starts_at),
        ends_at: toLocalInput(existing.ends_at),
        venue: existing.venue,
        address: existing.address ?? '',
        city: existing.city,
        latitude: existing.latitude?.toString() ?? '',
        longitude: existing.longitude?.toString() ?? '',
        organizer: existing.organizer ?? partner.data?.name ?? '',
        status: existing.status,
        is_featured: false,
      });
    } else if (partner.data && isNew) {
      setValue('organizer', partner.data.name);
    }
  }, [existing, partner.data, isNew, reset, setValue]);

  // Aperçu live
  const title = watch('title') ?? '';
  const description = watch('description') ?? '';
  const formImageUrl = watch('image_url') ?? '';
  const partnerId = partner.data?.id;
  const readOnly = Boolean(!isNew && existing && !EDITABLE.includes(existing.status));
  const submittable = Boolean(!isNew && existing && SUBMITTABLE.includes(existing.status));

  /** Brouillon d'affiche : aperçu local uniquement, upload différé à l'enregistrement. */
  const imageDraft = useImageDraft(existing?.image_url);
  const { hasPending: hasPendingImage, clear: clearImageDraft } = imageDraft;
  const displayImageUrl = imageDraft.previewUrl ?? formImageUrl;

  // Une URL saisie/collée manuellement prend le pas sur le fichier sélectionné.
  useEffect(() => {
    if (hasPendingImage && formImageUrl) clearImageDraft();
  }, [formImageUrl, hasPendingImage, clearImageDraft]);

  const categoryId = watch('category_id') ?? null;
  const startsAt = watch('starts_at') ?? '';
  const venue = watch('venue') ?? '';
  const city = watch('city') ?? '';
  const previewStatus = existing?.status ?? 'draft';
  const categoryName = (categories.data ?? []).find((c) => c.id === categoryId)?.name ?? null;

  /** Sélection locale uniquement : aucun upload tant qu'on n'enregistre pas. */
  const handleSelectFile = (file: File | undefined) => {
    if (!file || readOnly) return;
    setServerError(null);
    const invalid = imageDraft.select(file);
    if (invalid) {
      setServerError(invalid);
      toast.error('Image invalide', invalid);
      return;
    }
    if (formImageUrl) setValue('image_url', '', { shouldValidate: true, shouldDirty: true });
  };

  /** Retire l'affiche du formulaire (suppression réelle dans le stockage à l'enregistrement). */
  const handleRemoveImage = () => {
    if (readOnly) return;
    imageDraft.clear();
    setValue('image_url', '', { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (values: EventInput) => {
    setServerError(null);
    // L'affiche choisie n'est téléversée qu'ici : quitter sans enregistrer
    // ne conserve aucun fichier. L'ancienne est supprimée du stockage
    // si remplacée ou retirée (et si plus aucun événement ne l'utilise).
    if (!partnerId) {
      const message = 'Espace organisateur introuvable.';
      setServerError(message);
      toast.error('Enregistrement impossible', message);
      return;
    }
    setUploading(true);
    let imageUrl = values.image_url ?? '';
    let cleanupFailed = false;
    try {
      const resolved = await imageDraft.resolveOnSave({
        formUrl: imageUrl,
        // Convention 0006 : {partner_id}/events/{event_id}/cover-….jpg
        // (création : pas encore d'id → dossier `events/` du partenaire).
        upload: (f) => uploadPartnerAsset(f, partnerId, id ? `events/${id}/cover` : 'events/cover'),
        destroy: (url) => deletePartnerAssetIfUnused(url, id),
      });
      imageUrl = resolved.url;
      cleanupFailed = resolved.cleanupFailed;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload impossible.';
      setServerError(message);
      toast.error('Image impossible à enregistrer', message);
      setUploading(false);
      return;
    }
    setUploading(false);
    values.image_url = imageUrl;
    try {
      if (isNew) {
        const created = await createEvent.mutateAsync(values);
        let ticketsFailed = 0;
        for (const t of draftTickets) {
          try {
            await createTicketType.mutateAsync({ event_id: created.id, input: t });
          } catch {
            ticketsFailed += 1;
          }
        }
        const createdCount = draftTickets.length - ticketsFailed;
        toast.created(
          'Événement',
          createdCount > 0
            ? `« ${values.title} » est en brouillon avec ${createdCount} type(s) de billet.`
            : `« ${values.title} » est en brouillon. Ajoutez vos billets.`,
          {
            action: {
              label: 'Gérer les billets',
              onClick: () => navigate(`/partner/events/${created.id}/edit`),
            },
          },
        );
        if (ticketsFailed > 0) {
          toast.warning(
            'Billets incomplets',
            `${ticketsFailed} type(s) n’ont pas pu être créés — retrouvez-les dans la fiche.`,
          );
        }
        navigate('/partner/events', { replace: true });
      } else if (id) {
        await updateEvent.mutateAsync({ id, input: values });
        toast.updated('Événement', 'Modifications enregistrées.');
        navigate('/partner/events', { replace: true });
      }
      if (cleanupFailed) {
        toast.warning(
          'Événement enregistré',
          'L’ancienne affiche n’a pas pu être supprimée du stockage.',
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Enregistrement impossible.';
      setServerError(message);
      toast.error('Enregistrement impossible', message);
    }
  };

  const onSubmitReview = async () => {
    if (!id) return;
    setServerError(null);
    try {
      await submitReview.mutateAsync(id);
      toast.success('Soumis pour validation', 'Giga Vibe Event va examiner votre événement.');
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Soumission impossible.';
      setServerError(message);
      toast.error('Soumission impossible', message);
    }
  };

  if (!isNew && isPending) return <PartnerEventFormSkeleton />;
  if (!isNew && (isError || !existing))
    return <ErrorState description="Événement introuvable." onRetry={() => refetch()} />;

  const saving =
    isSubmitting ||
    uploading ||
    createEvent.isPending ||
    updateEvent.isPending ||
    createTicketType.isPending;

  return (
    <div className="w-full space-y-6">
      {/* En-tête */}
      <div>
        <Link
          to="/partner/events"
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> Mes événements
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700">
              {isNew ? 'Création' : 'Édition'}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight md:text-3xl">
              {isNew ? 'Créer un événement' : (existing?.title ?? 'Modifier')}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {isNew
                ? 'Renseignez les informations, l’affiche et les billets.'
                : 'Les modifications sont visibles dès l’enregistrement.'}
            </p>
          </div>
          {!isNew && existing && (
            <div className="flex items-center gap-2">
              <EventStatusBadge status={existing.status} />
            </div>
          )}
        </div>
      </div>

      {partner.data && <PartnerStatusBanner status={partner.data.status} />}

      {readOnly && (
        <p role="status" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Cet événement est <strong>{existing?.status}</strong> : il n’est plus modifiable
          depuis votre espace. Contactez Giga Vibe Event pour tout changement.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Colonne formulaire */}
        <form id="partner-event-form" onSubmit={handleSubmit(onSubmit)} noValidate className="min-w-0 space-y-5">
          <fieldset disabled={readOnly} className="min-w-0 space-y-5 disabled:opacity-70">
            {/* 01 Informations */}
            <section id="section-infos" className="scroll-mt-28"><Card className="space-y-4 p-5 md:p-6">
              <SectionHeader
                num="01"
                icon={<FileText className="size-5" aria-hidden />}
                title="Informations générales"
                description="Titre, lien public et description affichés aux visiteurs."
              />
              <div>
                <Input label="Titre" placeholder="Summer Festival 2026" maxLength={160} error={errors.title?.message} {...register('title')} />
                <p className="mt-1 text-right text-xs tabular-nums text-zinc-400">
                  {title.length}/160
                </p>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input label="Slug" placeholder="summer-festival-2026" error={errors.slug?.message} {...register('slug')} />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mb-0.5 h-10 shrink-0"
                  onClick={() =>
                    setValue('slug', slugify(watch('title') ?? ''), { shouldValidate: true })
                  }
                >
                  Générer
                </Button>
              </div>
              <div>
                <Textarea
                  label="Description"
                  rows={5}
                  placeholder="Ambiance, programmation, infos pratiques…"
                  maxLength={5000}
                  error={errors.description?.message}
                  {...register('description')}
                />
                <p className="mt-1 text-right text-xs tabular-nums text-zinc-400">
                  {description.length}/5000
                </p>
              </div>
              <Input
                label="Organisateur affiché"
                placeholder={partner.data?.name ?? 'Votre structure'}
                error={errors.organizer?.message}
                {...register('organizer')}
              />
            </Card>
            </section>

            {/* 02 Visuel */}
            <section id="section-image" className="scroll-mt-28"><Card className="space-y-4 p-5 md:p-6">
              <SectionHeader
                num="02"
                icon={<ImageIcon className="size-5" aria-hidden />}
                title="Visuel"
                description="Affiche de l’événement (mise en avant sur le site)."
              />
              {displayImageUrl ? (
                <div className="group relative overflow-hidden rounded-2xl border border-zinc-200">
                  <img
                    src={displayImageUrl}
                    alt="Aperçu de l’événement"
                    className="aspect-[21/9] w-full object-cover"
                  />
                  {hasPendingImage ? (
                    <span className="absolute left-3 top-3 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                      Non enregistrée
                    </span>
                  ) : (
                    <span className="absolute left-3 top-3 rounded-full bg-night-950/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                      Aperçu
                    </span>
                  )}
                  <div className="absolute right-3 top-3 flex gap-2 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                    <button
                      type="button"
                      title="Remplacer l’affiche"
                      aria-label="Remplacer l’affiche"
                      disabled={uploading || readOnly}
                      onClick={() => fileInputRef.current?.click()}
                      className="grid size-9 place-items-center rounded-full bg-night-950/70 text-white shadow-lg ring-1 ring-white/20 backdrop-blur transition hover:scale-105 hover:bg-night-950/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
                    >
                      <ImagePlus className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      title="Retirer l’affiche"
                      aria-label="Retirer l’affiche"
                      disabled={uploading || readOnly}
                      onClick={handleRemoveImage}
                      className="grid size-9 place-items-center rounded-full bg-red-500/90 text-white shadow-lg ring-1 ring-white/20 backdrop-blur transition hover:scale-105 hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center">
                  <ImageIcon aria-hidden className="size-8 text-zinc-300" />
                  <div>
                    <p className="text-sm font-medium text-zinc-500">Aucune affiche pour le moment.</p>
                    <p className="text-xs text-zinc-400">L’aperçu apparaîtra ici après la sélection.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || readOnly}
                    className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
                  >
                    <ImagePlus className="size-4" aria-hidden /> Choisir une affiche
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                disabled={uploading || readOnly}
                onChange={(e) => {
                  handleSelectFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              {imageDraft.committed && !displayImageUrl && (
                <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  L’affiche sera supprimée du stockage à l’enregistrement.
                </p>
              )}
              <p className="text-xs text-zinc-500">JPEG, PNG ou WebP — max 5 Mo.</p>
              <p className="text-xs text-zinc-500">
                La sélection n’est téléversée qu’à l’enregistrement — quitter sans
                enregistrer ne conserve rien.
              </p>
              <Input
                label="URL de l’affiche (ou sélection ci-dessus)"
                placeholder="https://…"
                error={errors.image_url?.message}
                {...register('image_url')}
              />
              <p className="text-xs text-zinc-500">
                Le logo Giga Vibe Event sera ajouté automatiquement sur la page de vente
                et vos billets — inutile de l’inclure dans votre visuel.
              </p>
            </Card>
            </section>

            {/* 03 Catégorie, date & lieu */}
            <section id="section-lieu" className="scroll-mt-28"><Card className="space-y-4 p-5 md:p-6">
              <SectionHeader
                num="03"
                icon={<Tags className="size-5" aria-hidden />}
                title="Catégorie, date & lieu"
                description="Classement et déroulé de l’événement."
              />
              <Select label="Catégorie" error={errors.category_id?.message} {...register('category_id')}>
                <option value="">— Aucune —</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Début"
                  type="datetime-local"
                  error={errors.starts_at?.message}
                  {...register('starts_at')}
                />
                <Input
                  label="Fin (optionnel)"
                  type="datetime-local"
                  error={errors.ends_at?.message}
                  {...register('ends_at')}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Lieu" placeholder="Stade Municipal" error={errors.venue?.message} {...register('venue')} />
                <Input label="Ville" error={errors.city?.message} {...register('city')} />
              </div>
              <Input label="Adresse" placeholder="Rue, quartier…" error={errors.address?.message} {...register('address')} />
            </Card>
            </section>

            {/* Billets — uniquement en création (brouillons créés avec l'événement) */}
            {isNew && (
              <Card className="p-5 md:p-6">
                <TicketTypesManager
                  draftTickets={draftTickets}
                  onDraftChange={setDraftTickets}
                  fetchHook={usePartnerEvent}
                  createHook={useCreatePartnerTicketType}
                  updateHook={useUpdatePartnerTicketType}
                  deleteHook={useDeletePartnerTicketType}
                />
              </Card>
            )}

            {serverError && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {serverError}
              </p>
            )}
          </fieldset>
        </form>

        {/* Rail latéral sticky */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Aperçu et navigation">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <p className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500">
              Aperçu en direct
            </p>
            <div>
              <EventImage
                seed={title || 'apercu'}
                imageUrl={displayImageUrl || null}
                title={title || 'Aperçu'}
                className="aspect-[16/9] w-full"
              />
              <div className="space-y-1.5 p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {categoryName && (
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-bold text-white">
                      {categoryName}
                    </span>
                  )}
                  <EventStatusBadge status={previewStatus} />
                </div>
                <p className="truncate font-display text-base font-bold" title={title}>
                  {title.trim() || 'Titre de l’événement'}
                </p>
                <p className="flex items-center gap-1.5 truncate text-xs text-zinc-500">
                  <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                  {startsAt ? formatDate(new Date(startsAt).toISOString()) : 'Date à définir'}
                </p>
                <p className="flex items-center gap-1.5 truncate text-xs text-zinc-500">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  {venue.trim() || 'Lieu à définir'}
                  {city.trim() ? ` · ${city}` : ''}
                </p>
              </div>
            </div>
          </div>

          <nav aria-label="Sections du formulaire" className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-zinc-100"
              >
                <span className="font-display text-xs font-bold tabular-nums text-brand-700">{s.num}</span>
                <span className="font-medium text-zinc-700">{s.label}</span>
              </a>
            ))}
          </nav>

          {!readOnly && (
            <Button type="submit" form="partner-event-form" loading={saving} size="lg" className="w-full">
              {isNew ? 'Créer l’événement' : 'Enregistrer'}
            </Button>
          )}
          {submittable && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              loading={submitReview.isPending}
              onClick={onSubmitReview}
            >
              <Send className="size-4" aria-hidden /> Soumettre pour validation
            </Button>
          )}
        </aside>
      </div>

      {!isNew && id && (
        <Card className="p-5">
          <TicketTypesManager
            eventId={id}
            fetchHook={usePartnerEvent}
            createHook={useCreatePartnerTicketType}
            updateHook={useUpdatePartnerTicketType}
            deleteHook={useDeletePartnerTicketType}
          />
        </Card>
      )}
    </div>
  );
}
