import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../../features/admin/hooks';
import { categorySchema, type CategoryInput } from '../../schemas';
import type { Category } from '../../types/database';
import { slugify } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Fields';
import { DataTable } from '../../components/admin/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';

export function AdminCategoriesPage() {
  const { data, isPending, isError, refetch } = useAdminCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({ resolver: zodResolver(categorySchema) });

  useEffect(() => {
    if (editing === 'new') {
      reset({ name: '', slug: '', description: '', icon: '' });
    } else if (editing) {
      reset({
        name: editing.name,
        slug: editing.slug,
        description: editing.description ?? '',
        icon: editing.icon ?? '',
      });
    }
  }, [editing, reset]);

  const onSubmit = async (values: CategoryInput) => {
    setServerError(null);
    try {
      if (editing === 'new') {
        await createCategory.mutateAsync(values);
      } else if (editing) {
        await updateCategory.mutateAsync({ id: editing.id, input: values });
      }
      setEditing(null);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setServerError(null);
    try {
      await deleteCategory.mutateAsync(toDelete);
      setToDelete(null);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : 'Suppression impossible (catégorie utilisée ?).',
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Catégories</h1>
        {editing === null && (
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden /> Nouvelle catégorie
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
          className="space-y-3 rounded-xl border border-zinc-300 bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {editing === 'new' ? 'Nouvelle catégorie' : `Modifier ${editing.name}`}
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
            <Input label="Nom" error={errors.name?.message} {...register('name')} />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input label="Slug" error={errors.slug?.message} {...register('slug')} />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mb-0.5 h-10"
                onClick={() =>
                  setValue('slug', slugify(watch('name') ?? ''), { shouldValidate: true })
                }
              >
                Générer
              </Button>
            </div>
            <Input
              label="Icône (lucide)"
              placeholder="music"
              error={errors.icon?.message}
              {...register('icon')}
            />
          </div>
          <Textarea label="Description" error={errors.description?.message} {...register('description')} />
          <Button
            type="submit"
            loading={isSubmitting || createCategory.isPending || updateCategory.isPending}
          >
            Enregistrer
          </Button>
        </form>
      )}

      {isPending ? (
        <LoadingState label="Chargement des catégories…" />
      ) : isError ? (
        <ErrorState description="Impossible de charger les catégories." onRetry={() => refetch()} />
      ) : !data.length ? (
        <EmptyState title="Aucune catégorie." />
      ) : (
        <DataTable
          caption="Liste des catégories"
          keyOf={(c) => c.id}
          rows={data}
          columns={[
            { key: 'name', header: 'Nom', render: (c) => <strong>{c.name}</strong> },
            {
              key: 'slug',
              header: 'Slug',
              render: (c) => <span className="font-mono text-xs">{c.slug}</span>,
            },
            {
              key: 'events',
              header: 'Événements',
              render: (c) => <span className="tabular-nums">{c.events_count}</span>,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (c) => (
                <span className="flex gap-1">
                  <button
                    type="button"
                    title="Modifier"
                    onClick={() => setEditing(c)}
                    className="rounded-md p-2 hover:bg-zinc-100"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    title="Supprimer"
                    onClick={() => setToDelete(c)}
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
        title="Supprimer cette catégorie ?"
        description="Les événements liés garderont une catégorie vide (SET NULL)."
        confirmLabel="Supprimer"
        danger
        loading={deleteCategory.isPending}
        onConfirm={handleDelete}
        onClose={() => {
          setToDelete(null);
          setServerError(null);
        }}
      />
    </div>
  );
}
