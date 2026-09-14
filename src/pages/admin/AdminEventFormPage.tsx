import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Image as ImageIcon,
  MapPin,
  Sparkles,
  Tags,
  Upload,
} from 'lucide-react';
import {
  useAdminEvent,
  useCreateEvent,
  useUpdateEvent,
} from '../../features/admin/hooks';
import { TicketTypesManager } from '../../features/admin/components/TicketTypesManager';
import { useCategories } from '../../hooks/useEvents';
import { eventSchema, type EventInput } from '../../schemas';
import { formatDate, slugify } from '../../lib/utils';
import { uploadEventImage } from '../../services/storage';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toaster';
import { Card } from '../../components/ui/Card';
import { EventStatusBadge } from '../../components/admin/StatusBadges';
import { Checkbox, Textarea } from '../../components/ui/Fields';
import { SelectField } from '../../components/ui/Select';
import { DateTimePickerField } from '../../components/ui/DateTimePicker';
import { EventImage } from '../../components/events/EventImage';
import { ErrorState, LoadingState } from '../../components/ui/States';

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
  const { toast } = useToast();

  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
  const imageUrl = watch('image_url') ?? '';
  const categoryId = watch('category_id') ?? null;
  const startsAt = watch('starts_at') ?? '';
  const venue = watch('venue') ?? '';
  const city = watch('city') ?? '';
  const status = watch('status') ?? 'draft';
  const isFeatured = watch('is_featured') ?? false;
  const categoryName = (categories.data ?? []).find((c) => c.id === categoryId)?.name ?? null;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setServerError(null);
    setUploading(true);
    try {
      const url = await uploadEventImage(file);
      setValue('image_url', url, { shouldValidate: true });
      toast.success('Image téléversée', 'Pensez à enregistrer l’événement.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload impossible.';
      setServerError(message);
      toast.error('Upload impossible', message);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: EventInput) => {
    setServerError(null);
    try {
      if (isNew) {
        const created = await createEvent.mutateAsync(values);
        toast.created('Événement', `« ${values.title} » est en brouillon.`);
        navigate(`/admin/events/${created.id}/edit`, { replace: true });
      } else if (id) {
        await updateEvent.mutateAsync({ id, input: values });
        toast.updated('Événement', 'Modifications enregistrées.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Enregistrement impossible.';
      setServerError(message);
      toast.error('Enregistrement impossible', message);
    }
  };

  if (!isNew && isPending) return <LoadingState label="Chargement de l'événement…" />;
  if (!isNew && (isError || !existing))
    return <ErrorState description="Événement introuvable." onRetry={() => refetch()} />;

  const saving = isSubmitting || createEvent.isPending || updateEvent.isPending;

  return (
    <div className="max-w-6xl space-y-6">
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
                ? 'Renseignez les informations, puis gérez la billetterie.'
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
            {imageUrl ? (
              <div className="relative overflow-hidden rounded-2xl border border-zinc-200">
                <img
                  src={imageUrl}
                  alt="Aperçu de l’événement"
                  className="aspect-[21/9] w-full object-cover"
                />
                <span className="absolute left-3 top-3 rounded-full bg-night-950/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                  Aperçu
                </span>
              </div>
            ) : (
              <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center">
                <ImageIcon aria-hidden className="size-8 text-zinc-300" />
                <p className="text-sm font-medium text-zinc-500">Aucune image pour le moment.</p>
                <p className="text-xs text-zinc-400">L’aperçu apparaîtra ici après l’upload.</p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-zinc-100">
                <Upload className="size-4" aria-hidden />
                {uploading ? 'Envoi…' : 'Choisir une image'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </label>
              <span className="text-xs text-zinc-500">JPEG, PNG ou WebP — max 5 Mo.</span>
            </div>
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

          {serverError && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </p>
          )}
          <Button type="submit" loading={saving} size="lg" className="w-full sm:w-auto">
            {isNew ? 'Créer puis gérer les billets' : 'Enregistrer'}
          </Button>
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
                imageUrl={imageUrl || null}
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

          <Button type="submit" form="event-form" loading={saving} className="hidden w-full lg:inline-flex">
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
