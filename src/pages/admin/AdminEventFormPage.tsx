import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload } from 'lucide-react';
import {
  useAdminEvent,
  useCreateEvent,
  useUpdateEvent,
} from '../../features/admin/hooks';
import { TicketTypesManager } from '../../features/admin/components/TicketTypesManager';
import { useCategories } from '../../hooks/useEvents';
import { eventSchema, type EventInput } from '../../schemas';
import { slugify } from '../../lib/utils';
import { uploadEventImage } from '../../services/storage';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Checkbox, Select, Textarea } from '../../components/ui/Fields';
import { ErrorState, LoadingState } from '../../components/ui/States';

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminEventFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { data: existing, isPending, isError, refetch } = useAdminEvent(id);
  const categories = useCategories();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

  const [saved, setSaved] = useState(false);
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

  const imageUrl = watch('image_url');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setServerError(null);
    setUploading(true);
    try {
      const url = await uploadEventImage(file);
      setValue('image_url', url, { shouldValidate: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Upload impossible.');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: EventInput) => {
    setSaved(false);
    setServerError(null);
    try {
      if (isNew) {
        const created = await createEvent.mutateAsync(values);
        navigate(`/admin/events/${created.id}/edit`, { replace: true });
      } else if (id) {
        await updateEvent.mutateAsync({ id, input: values });
        setSaved(true);
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    }
  };

  if (!isNew && isPending) return <LoadingState label="Chargement de l'événement…" />;
  if (!isNew && (isError || !existing))
    return <ErrorState description="Événement introuvable." onRetry={() => refetch()} />;

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        to="/admin/events"
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Événements
      </Link>
      <h1 className="text-2xl font-bold">
        {isNew ? 'Nouvel événement' : `Modifier — ${existing?.title}`}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Card className="space-y-4 p-5">
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
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="font-bold">Image</h2>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Aperçu de l'événement"
              className="aspect-[21/9] w-full rounded-xl object-cover"
            />
          ) : (
            <p className="text-sm text-zinc-500">Aucune image pour le moment.</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-100">
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
            label="URL de l'image (ou upload ci-dessus)"
            error={errors.image_url?.message}
            {...register('image_url')}
          />
        </Card>

        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <Select label="Catégorie" error={errors.category_id?.message} {...register('category_id')}>
            <option value="">— Aucune —</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="Statut" error={errors.status?.message} {...register('status')}>
            <option value="draft">Brouillon</option>
            <option value="pending_review">En validation</option>
            <option value="changes_requested">Modifs demandées</option>
            <option value="published">Publié</option>
            <option value="sold_out">Complet</option>
            <option value="suspended">Suspendu</option>
            <option value="cancelled">Annulé</option>
            <option value="completed">Terminé</option>
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
          <Input label="Organisateur" error={errors.organizer?.message} {...register('organizer')} />
          <Input
            label="Latitude"
            type="number"
            step="any"
            error={errors.latitude?.message}
            {...register('latitude')}
          />
          <Input
            label="Longitude"
            type="number"
            step="any"
            error={errors.longitude?.message}
            {...register('longitude')}
          />
          <div className="sm:col-span-2">
            <Checkbox label="Mettre en avant (populaire)" {...register('is_featured')} />
          </div>
        </Card>

        {serverError && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {serverError}
          </p>
        )}
        {saved && (
          <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            Événement enregistré.
          </p>
        )}
        <Button
          type="submit"
          loading={isSubmitting || createEvent.isPending || updateEvent.isPending}
          size="lg"
        >
          {isNew ? 'Créer puis gérer les billets' : 'Enregistrer'}
        </Button>
      </form>

      {!isNew && id && (
        <Card className="p-5">
          <TicketTypesManager eventId={id} />
        </Card>
      )}
    </div>
  );
}
