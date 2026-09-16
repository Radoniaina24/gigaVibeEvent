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
  Sparkles,
  Tags,
  Trash2,
} from 'lucide-react';
import {
  useAdminEvent,
  useCreateEvent,
  useCreateTicketType,
  useUpdateEvent,
} from '../../features/admin/hooks';
import { TicketTypesManager } from '../../features/admin/components/TicketTypesManager';
import { useCategories } from '../../hooks/useEvents';
import { eventSchema, type EventInput, type TicketTypeInput } from '../../schemas';
import { formatDate, slugify } from '../../lib/utils';
import { deleteEventImageIfUnused, uploadEventImage } from '../../services/storage';
import { useImageDraft } from '../../hooks/useImageDraft';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toaster';
import { Card } from '../../components/ui/Card';
import { EventStatusBadge } from '../../components/admin/StatusBadges';
import { Checkbox, Textarea } from '../../components/ui/Fields';
import { SelectField } from '../../components/ui/Select';
import { DateTimePickerField } from '../../components/ui/DateTimePicker';
import { EventImage } from '../../components/events/EventImage';
import { ErrorState } from '../../components/ui/States';
import { EventFormSkeleton } from '../../components/admin/AdminSkeletons';

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EVENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'pending_review', label: 'En validation' },
  { value: 'changes_requested', label: 'Modifs demandées' },
  { value: 'published', label: 'Publié' },
  { value: 'sold_out', label: 'Complet' },
  { value: 'suspended', label: 'Suspendu' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'completed', label: 'Terminé' },
] as const;

const SECTIONS = [
  { id: 'section-infos', num: '01', label: 'Informations' },
  { id: 'section-image', num: '02', label: 'Visuel' },
  { id: 'section-publication', num: '03', label: 'Publication' },
  { id: 'section-lieu', num: '04', label: 'Date & lieu' },
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

export function AdminEventFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { data: existing, isPending, isError, refetch } = useAdminEvent(id);
  const categories = useCategories();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const createTicketType = useCreateTicketType();
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
        organizer: existing.organizer ?? '',
        status: existing.status,
        is_featured: existing.is_featured,
      });
    }
  }, [existing, reset]);

  // Aperçu live
  const title = watch('title') ?? '';
  const formImageUrl = watch('image_url') ?? '';

  /** Brouillon d'image : aperçu local uniquement, upload différé à l'enregistrement. */
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
  const status = watch('status') ?? 'draft';
  const isFeatured = watch('is_featured') ?? false;
  const categoryName = (categories.data ?? []).find((c) => c.id === categoryId)?.name ?? null;

  /** Sélection locale uniquement : aucun upload tant qu'on n'enregistre pas. */
  const handleSelectFile = (file: File | undefined) => {
    if (!file) return;
    setServerError(null);
    const invalid = imageDraft.select(file);
    if (invalid) {
      setServerError(invalid);
      toast.error('Image invalide', invalid);
      return;
    }
    // Le fichier sélectionné remplace l'URL du champ (téléversé à l'enregistrement).
    if (formImageUrl) setValue('image_url', '', { shouldValidate: true, shouldDirty: true });
  };

  /** Retire l'image du formulaire (suppression réelle dans le stockage à l'enregistrement). */
  const handleRemoveImage = () => {
    imageDraft.clear();
    setValue('image_url', '', { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (values: EventInput) => {
    setServerError(null);
    // L'image choisie n'est téléversée qu'ici : quitter sans enregistrer
    // ne conserve aucun fichier. L'ancienne est supprimée du stockage
    // si remplacée ou retirée (et si plus aucun événement ne l'utilise).
    setUploading(true);
    let imageUrl = values.image_url ?? '';
    let cleanupFailed = false;
    try {
      const resolved = await imageDraft.resolveOnSave({
        formUrl: imageUrl,
        upload: uploadEventImage,
        destroy: (url) => deleteEventImageIfUnused(url, id),
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
            : `« ${values.title} » est en brouillon.`,
          {
            action: {
              label: 'Gérer les billets',
              onClick: () => navigate(`/admin/events/${created.id}/edit`),
            },
          },
        );
        if (ticketsFailed > 0) {
          toast.warning(
            'Billets incomplets',
            `${ticketsFailed} type(s) n’ont pas pu être créés — retrouvez-les dans la fiche.`,
          );
        }
        navigate('/admin/events', { replace: true });
      } else if (id) {
        await updateEvent.mutateAsync({ id, input: values });
        toast.updated('Événement', 'Modifications enregistrées.');
        navigate('/admin/events', { replace: true });
      }
      if (cleanupFailed) {
        toast.warning(
          'Événement enregistré',
          'L’ancienne image n’a pas pu être supprimée du stockage.',
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Enregistrement impossible.';
      setServerError(message);
      toast.error('Enregistrement impossible', message);
    }
  };

  if (!isNew && isPending) return <EventFormSkeleton />;
  if (!isNew && (isError || !existing))
    return <ErrorState description="Événement introuvable." onRetry={() => refetch()} />;

  const saving =
    isSubmitting || uploading || createEvent.isPending || updateEvent.isPending || createTicketType.isPending;

  return (
    <div className="w-full space-y-6">
      {/* En-tête */}
      <div>
        <Link
          to="/admin/events"
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> Événements
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700">
              {isNew ? 'Création' : 'Édition'}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight md:text-3xl">
              {isNew ? 'Nouvel événement' : (existing?.title ?? 'Modifier')}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {isNew
                ? 'Renseignez les informations, l’affiche et les billets.'
                : 'Les modifications sont visibles dès l’enregistrement.'}
            </p>
          </div>
          {!isNew && existing && (
            <div className="flex items-center gap-2">
              {isFeatured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/15 px-2.5 py-1 text-xs font-bold text-gold-500">
                  <Sparkles className="size-3.5" aria-hidden /> Populaire
                </span>
              )}
              <EventStatusBadge status={existing.status} />
            </div>
          )}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Colonne formulaire */}
        <form id="event-form" onSubmit={handleSubmit(onSubmit)} noValidate className="min-w-0 space-y-5">
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
                {(watch('description') ?? '').length}/5000
              </p>
            </div>
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
                    title="Remplacer l’image"
                    aria-label="Remplacer l’image"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="grid size-9 place-items-center rounded-full bg-night-950/70 text-white shadow-lg ring-1 ring-white/20 backdrop-blur transition hover:scale-105 hover:bg-night-950/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
                  >
                    <ImagePlus className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    title="Retirer l’image"
                    aria-label="Retirer l’image"
                    disabled={uploading}
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
                  <p className="text-sm font-medium text-zinc-500">Aucune image pour le moment.</p>
                  <p className="text-xs text-zinc-400">L’aperçu apparaîtra ici après la sélection.</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
                >
                  <ImagePlus className="size-4" aria-hidden /> Choisir une image
                </button>
              </div>
            )}
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
            {imageDraft.committed && !displayImageUrl && (
              <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                L’image sera supprimée du stockage à l’enregistrement.
              </p>
            )}
            <p className="text-xs text-zinc-500">JPEG, PNG ou WebP — max 5 Mo.</p>
            <p className="text-xs text-zinc-500">
              La sélection n’est téléversée qu’à l’enregistrement — quitter sans
              enregistrer ne conserve rien.
            </p>
            <Input
              label="URL de l’image (ou upload ci-dessus)"
              placeholder="https://…"
              error={errors.image_url?.message}
              {...register('image_url')}
            />
          </Card>
          </section>

          {/* 03 Publication */}
          <section id="section-publication" className="scroll-mt-28"><Card className="space-y-4 p-5 md:p-6">
            <SectionHeader
              num="03"
              icon={<Tags className="size-5" aria-hidden />}
              title="Catégorie & publication"
              description="Classement et visibilité de l’événement."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Catégorie"
                value={categoryId ?? ''}
                onChange={(v) =>
                  setValue('category_id', v === '' ? null : v, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                options={[
                  { value: '', label: '— Aucune —' },
                  ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name })),
                ]}
                error={errors.category_id?.message}
                placeholder="Choisir une catégorie…"
                disabled={categories.isPending}
              />
              <SelectField
                label="Statut"
                value={status}
                onChange={(v) =>
                  setValue('status', v as EventInput['status'], {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                options={EVENT_STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                error={errors.status?.message}
              />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gold-400/40 bg-gold-400/10 p-4 transition hover:bg-gold-400/15">
              <Checkbox label="" aria-label="Mettre en avant" {...register('is_featured')} className="mt-0.5" />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  <Sparkles className="size-4 text-gold-500" aria-hidden />
                  Mettre en avant (Populaire)
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Affiché en tête sur l’accueil et les recommandations.
                </span>
              </span>
            </label>
          </Card>
          </section>

          {/* 04 Date & lieu */}
          <section id="section-lieu" className="scroll-mt-28"><Card className="space-y-4 p-5 md:p-6">
            <SectionHeader
              num="04"
              icon={<MapPin className="size-5" aria-hidden />}
              title="Date & lieu"
              description="Quand et où se déroule l’événement."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <DateTimePickerField
                label="Début"
                value={watch('starts_at') ?? ''}
                allowClear
                onChange={(v) => setValue('starts_at', v, { shouldValidate: true, shouldDirty: true })}
                error={errors.starts_at?.message}
              />
              <DateTimePickerField
                label="Fin (optionnel)"
                hint="Doit être après le début."
                value={watch('ends_at') ?? ''}
                min={watch('starts_at') ?? undefined}
                allowClear
                onChange={(v) => setValue('ends_at', v, { shouldValidate: true, shouldDirty: true })}
                error={errors.ends_at?.message}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Lieu" placeholder="Stade Municipal" error={errors.venue?.message} {...register('venue')} />
              <Input label="Ville" error={errors.city?.message} {...register('city')} />
            </div>
            <Input label="Adresse" placeholder="Rue, quartier…" error={errors.address?.message} {...register('address')} />
            <Input label="Organisateur" placeholder="ShowPro MG" error={errors.organizer?.message} {...register('organizer')} />
            <details className="group rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-700 transition hover:text-zinc-900">
                Coordonnées GPS (optionnel)
              </summary>
              <div className="grid gap-4 pt-3 sm:grid-cols-2">
                <Input
                  label="Latitude"
                  type="number"
                  step="any"
                  placeholder="-18.8792"
                  error={errors.latitude?.message}
                  {...register('latitude')}
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  placeholder="47.5079"
                  error={errors.longitude?.message}
                  {...register('longitude')}
                />
              </div>
            </details>
          </Card>
          </section>

          {/* 05 Billets — uniquement en création (brouillons créés avec l'événement) */}
          {isNew && (
            <Card className="p-5 md:p-6">
              <TicketTypesManager draftTickets={draftTickets} onDraftChange={setDraftTickets} />
            </Card>
          )}

          {serverError && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </p>
          )}
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
                  <EventStatusBadge status={status} />
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

          <Button type="submit" form="event-form" loading={saving} size="lg" className="w-full">
            {isNew ? 'Créer l’événement' : 'Enregistrer'}
          </Button>
        </aside>
      </div>

      {!isNew && id && (
        <Card className="p-5">
          <TicketTypesManager eventId={id} />
        </Card>
      )}
    </div>
  );
}
