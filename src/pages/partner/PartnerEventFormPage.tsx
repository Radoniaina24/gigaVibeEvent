import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Send, Upload } from 'lucide-react';
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
import { eventSchema, type EventInput } from '../../schemas';
import { slugify } from '../../lib/utils';
import { uploadPartnerAsset } from '../../services/storage';
import { EventStatusBadge } from '../../components/admin/StatusBadges';
import { PartnerStatusBanner } from '../../components/layout/PartnerLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toaster';
import { Card } from '../../components/ui/Card';
import { Select, Textarea } from '../../components/ui/Fields';
import { ErrorState, LoadingState } from '../../components/ui/States';

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
        organizer: existing.organizer ?? partner.data?.name ?? '',
        status: existing.status,
        is_featured: false,
      });
    } else if (partner.data && isNew) {
      setValue('organizer', partner.data.name);
    }
  }, [existing, partner.data, isNew, reset, setValue]);

  const imageUrl = watch('image_url');
  const partnerId = partner.data?.id;
  const readOnly = Boolean(!isNew && existing && !EDITABLE.includes(existing.status));
  const submittable = Boolean(!isNew && existing && SUBMITTABLE.includes(existing.status));

  const handleFile = async (file: File | undefined) => {
    if (!file || !partnerId) return;
    setServerError(null);
    setUploading(true);
    try {
      const url = await uploadPartnerAsset(file, partnerId, 'events/cover');
      setValue('image_url', url, { shouldValidate: true });
      toast.success('Affiche téléversée', 'Pensez à enregistrer l’événement.');
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
        toast.created('Événement', `« ${values.title} » est en brouillon. Ajoutez vos billets.`);
        navigate(`/partner/events/${created.id}/edit`, { replace: true });
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

  if (!isNew && isPending) return <LoadingState label="Chargement de l'événement…" />;
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
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Aperçu de l'événement"
                className="aspect-[21/9] w-full rounded-xl object-cover"
              />
            ) : (
              <p className="text-sm text-zinc-500">Aucune affiche pour le moment.</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-100">
                <Upload className="size-4" aria-hidden />
                {uploading ? 'Envoi…' : 'Choisir une affiche'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploading || readOnly}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </label>
              <span className="text-xs text-zinc-500">JPEG, PNG ou WebP — max 5 Mo.</span>
            </div>
            <Input
              label="URL de l’affiche (ou upload ci-dessus)"
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

        {serverError && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {serverError}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {!readOnly && (
            <Button
              type="submit"
              loading={isSubmitting || createEvent.isPending || updateEvent.isPending}
              size="lg"
            >
              {isNew ? 'Créer puis gérer les billets' : 'Enregistrer'}
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
