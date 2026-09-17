import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ImagePlus, Send, Trash2 } from 'lucide-react';
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
import { slugify } from '../../lib/utils';
import { uploadPartnerAsset, deletePartnerAssetIfUnused } from '../../services/storage';
import { useImageDraft } from '../../hooks/useImageDraft';
import { EventStatusBadge } from '../../components/admin/StatusBadges';
import { PartnerStatusBanner } from '../../components/layout/PartnerLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toaster';
import { Card } from '../../components/ui/Card';
import { Select, Textarea } from '../../components/ui/Fields';
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

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        to="/partner/events"
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft className="size-4" aria-hidden /> Mes événements
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {isNew ? 'Créer un événement' : `Modifier — ${existing?.title}`}
        </h1>
        {existing && <EventStatusBadge status={existing.status} />}
      </div>

      {partner.data && <PartnerStatusBanner status={partner.data.status} />}

      {readOnly && (
        <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Cet événement est <strong>{existing?.status}</strong> : il n’est plus modifiable
          depuis votre espace. Contactez Giga Vibe Event pour tout changement.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-70">
          <Card className="space-y-4 p-5">
            <h2 className="font-bold">Informations générales</h2>
            <Input label="Titre" error={errors.title?.message} {...register('title')} />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input label="Slug" error={errors.slug?.message} {...register('slug')} />
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
            <Textarea
              label="Description"
              rows={5}
              error={errors.description?.message}
              {...register('description')}
            />
            <Input
              label="Organisateur affiché"
              error={errors.organizer?.message}
              {...register('organizer')}
            />
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="font-bold">Affiche de l’événement</h2>
            {displayImageUrl ? (
              <div className="group relative overflow-hidden rounded-xl">
                <img
                  src={displayImageUrl}
                  alt="Aperçu de l'événement"
                  className="aspect-[21/9] w-full object-cover"
                />
                {hasPendingImage && (
                  <span className="absolute left-3 top-3 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-bold text-white">
                    Non enregistrée
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
              <div className="grid place-items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center">
                <p className="text-sm text-zinc-500">Aucune affiche pour le moment.</p>
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
              error={errors.image_url?.message}
              {...register('image_url')}
            />
            <p className="text-xs text-zinc-500">
              Le logo Giga Vibe Event sera ajouté automatiquement sur la page de vente
              et vos billets — inutile de l’inclure dans votre visuel.
            </p>
          </Card>

          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <h2 className="font-bold sm:col-span-2">Lieu et date</h2>
            <Select label="Catégorie" error={errors.category_id?.message} {...register('category_id')}>
              <option value="">— Aucune —</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
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
            <Input label="Lieu" error={errors.venue?.message} {...register('venue')} />
            <Input label="Ville" error={errors.city?.message} {...register('city')} />
            <Input label="Adresse" error={errors.address?.message} {...register('address')} />
          </Card>
        </fieldset>

        {/* Billets — uniquement en création (brouillons créés avec l'événement) */}
        {isNew && (
          <Card className="p-5">
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
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {serverError}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {!readOnly && (
            <Button
              type="submit"
              loading={
                isSubmitting ||
                uploading ||
                createEvent.isPending ||
                updateEvent.isPending ||
                createTicketType.isPending
              }
              size="lg"
            >
              {isNew ? 'Créer l’événement' : 'Enregistrer'}
            </Button>
          )}
          {submittable && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              loading={submitReview.isPending}
              onClick={onSubmitReview}
            >
              <Send className="size-4" aria-hidden /> Soumettre pour validation
            </Button>
          )}
        </div>
      </form>

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
