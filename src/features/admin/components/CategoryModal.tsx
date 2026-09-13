import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, Link2, Pencil, Plus, Shapes, Tag, Wand2 } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Fields';
import { categorySchema, type CategoryInput } from '../../../schemas';
import type { Category } from '../../../types/database';
import { slugify } from '../../../lib/utils';

interface CategoryModalProps {
  open: boolean;
  /** `null` = création, sinon édition de cette catégorie. */
  category: Category | null;
  saving: boolean;
  serverError: string | null;
  onSubmit: (values: CategoryInput) => void;
  onClose: () => void;
}

/** Suggestions d'icônes Lucide courantes pour les catégories. */
const ICON_SUGGESTIONS = [
  'music',
  'trophy',
  'mic',
  'graduation-cap',
  'party-popper',
  'ticket',
  'palette',
  'film',
  'gamepad-2',
  'heart',
  'sparkles',
  'star',
] as const;

const MAX_NAME = 80;
const MAX_DESC = 500;

/**
 * Modale création / édition de catégorie : prévisualisation live,
 * slug auto-généré, compteurs, erreurs inline.
 */
export function CategoryModal({
  open,
  category,
  saving,
  serverError,
  onSubmit,
  onClose,
}: CategoryModalProps) {
  const isEdit = category !== null;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryInput>({ resolver: zodResolver(categorySchema) });
  // En création, le slug suit le nom jusqu'à édition manuelle.
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSlugTouched(isEdit);
    reset({
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
      icon: category?.icon ?? '',
    });
  }, [open, category, isEdit, reset]);

  const name = watch('name') ?? '';
  const slug = watch('slug') ?? '';
  const description = watch('description') ?? '';
  const icon = watch('icon') ?? '';

  const handleNameChange = (value: string) => {
    setValue('name', value, { shouldValidate: true });
    if (!slugTouched) {
      setValue('slug', slugify(value), { shouldValidate: true });
    }
  };

  const previewName = name.trim() || 'Nom de la catégorie';
  const previewSlug = slug.trim() || 'slug-categorie';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `Modifier « ${category?.name} »` : 'Nouvelle catégorie'}
      subtitle={
        isEdit
          ? 'Les événements liés conservent automatiquement la catégorie.'
          : 'Elle sera proposée dans les filtres et le formulaire événement.'
      }
      icon={
        isEdit ? <Pencil className="size-5" aria-hidden /> : <Plus className="size-5" aria-hidden />
      }
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" form="category-form" loading={saving}>
            {isEdit ? 'Enregistrer' : 'Créer la catégorie'}
          </Button>
        </>
      }
    >
      {serverError && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      {/* Aperçu live */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-zinc-200">
        <p className="flex items-center gap-1.5 bg-zinc-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <Eye className="size-3.5" aria-hidden /> Aperçu
        </p>
        <div className="flex items-center gap-3 px-4 py-3">
          <span
            aria-hidden
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 font-display text-lg font-bold text-white shadow-sm shadow-brand-600/30"
          >
            {previewName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-zinc-900">{previewName}</p>
            <p className="truncate font-mono text-xs text-zinc-500">/categories/{previewSlug}</p>
            {description.trim() ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{description.trim()}</p>
            ) : (
              <p className="mt-0.5 text-xs italic text-zinc-400">Ajoutez une description…</p>
            )}
          </div>
        </div>
      </div>

      <form id="category-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Input
              label="Nom"
              placeholder="Concert"
              maxLength={MAX_NAME}
              autoFocus
              error={errors.name?.message}
              {...register('name')}
              onChange={(e) => handleNameChange(e.target.value)}
            />
            <p className="mt-1 text-right text-xs tabular-nums text-zinc-400">
              {name.length}/{MAX_NAME}
            </p>
          </div>

          <div>
            <label
              htmlFor="category-icon"
              className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700"
            >
              <Shapes className="size-3.5 text-zinc-400" aria-hidden /> Icône (Lucide)
            </label>
            <input
              id="category-icon"
              list="category-icon-suggestions"
              placeholder="music"
              autoComplete="off"
              aria-invalid={Boolean(errors.icon)}
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-[invalid=true]:border-red-500"
              {...register('icon')}
            />
            <datalist id="category-icon-suggestions">
              {ICON_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {errors.icon?.message ? (
              <p role="alert" className="mt-1.5 text-xs text-red-600">
                {errors.icon.message}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-zinc-500">
                {icon.trim() ? (
                  <>
                    Aperçu : <code className="font-mono text-zinc-700">{icon.trim()}</code>
                  </>
                ) : (
                  'Ex. music, trophy, mic, palette…'
                )}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="category-slug"
            className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700"
          >
            <Link2 className="size-3.5 text-zinc-400" aria-hidden /> Slug
          </label>
          <div className="flex gap-2">
            <input
              id="category-slug"
              placeholder="concert"
              autoComplete="off"
              aria-invalid={Boolean(errors.slug)}
              aria-describedby={errors.slug ? 'category-slug-error' : 'category-slug-hint'}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 font-mono text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-[invalid=true]:border-red-500"
              {...register('slug')}
              onChange={(e) => {
                setSlugTouched(true);
                setValue('slug', slugify(e.target.value), { shouldValidate: true });
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="shrink-0"
              title="Générer depuis le nom"
              onClick={() => {
                setSlugTouched(true);
                setValue('slug', slugify(name), { shouldValidate: true });
              }}
            >
              <Wand2 className="size-4" aria-hidden /> Générer
            </Button>
          </div>
          {errors.slug?.message ? (
            <p id="category-slug-error" role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.slug.message}
            </p>
          ) : (
            <p id="category-slug-hint" className="mt-1.5 text-xs text-zinc-500">
              URL : <span className="font-mono">/categories/{previewSlug}</span> — lettres, chiffres
              et tirets.
            </p>
          )}
        </div>

        <div>
          <Textarea
            label="Description"
            placeholder="Concerts et live music…"
            rows={3}
            maxLength={MAX_DESC}
            error={errors.description?.message}
            {...register('description')}
          />
          <p className="mt-1 text-right text-xs tabular-nums text-zinc-400">
            {description.length}/{MAX_DESC}
          </p>
        </div>

        <p className="flex items-center gap-1.5 rounded-xl bg-zinc-50 px-3 py-2.5 text-xs text-zinc-500">
          <Tag className="size-3.5 shrink-0" aria-hidden />
          {isEdit
            ? 'La modification du slug ne casse pas les liens existants côté app (recherche par id/slug).'
            : 'Astuce : laissez le slug se générer seul depuis le nom.'}
        </p>
      </form>
    </Modal>
  );
}
