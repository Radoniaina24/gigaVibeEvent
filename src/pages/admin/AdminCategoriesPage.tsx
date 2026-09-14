import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../../features/admin/hooks';
import { CategoryModal } from '../../features/admin/components/CategoryModal';
import type { CategoryInput } from '../../schemas';
import type { Category } from '../../types/database';
import { Button } from '../../components/ui/Button';
import { CategoriesTable } from '../../features/admin/components/CategoriesTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toaster';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';

export function AdminCategoriesPage() {
  const { data, isPending, isError, refetch } = useAdminCategories();
  const { toast } = useToast();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (createCategory.isPending || updateCategory.isPending) return;
    setModalOpen(false);
    setFormError(null);
  };

  const onSubmit = async (values: CategoryInput) => {
    setFormError(null);
    try {
      if (editing) {
        await updateCategory.mutateAsync({ id: editing.id, input: values });
        toast.updated('Catégorie', `« ${values.name} » a été mise à jour.`);
      } else {
        await createCategory.mutateAsync(values);
        toast.created('Catégorie', `« ${values.name} » est en ligne.`);
      }
      setModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Enregistrement impossible.';
      setFormError(message);
      toast.error('Enregistrement impossible', message);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleteError(null);
    try {
      await deleteCategory.mutateAsync(toDelete);
      toast.deleted('Catégorie', `« ${toDelete.name} » a été supprimée.`);
      setToDelete(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Suppression impossible (catégorie utilisée ?).';
      setDeleteError(message);
      toast.error('Suppression impossible', message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            Catégories
            {data && data.length > 0 && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-600">
                {data.length}
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Organisez vos événements : filtres publics, formulaire événement.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" aria-hidden /> Nouvelle catégorie
        </Button>
      </div>

      {deleteError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {deleteError}
        </p>
      )}

      {isPending ? (
        <LoadingState label="Chargement des catégories…" />
      ) : isError ? (
        <ErrorState description="Impossible de charger les catégories." onRetry={() => refetch()} />
      ) : !data.length ? (
        <EmptyState
          title="Aucune catégorie."
          description="Créez votre première catégorie pour organiser vos événements."
          action={<Button size="sm" onClick={openCreate}><Plus className="size-4" aria-hidden /> Nouvelle catégorie</Button>}
        />
      ) : (
        <CategoriesTable data={data} onEdit={openEdit} onDelete={setToDelete} />
      )}

      <CategoryModal
        open={modalOpen}
        category={editing}
        saving={createCategory.isPending || updateCategory.isPending}
        serverError={formError}
        onSubmit={onSubmit}
        onClose={closeModal}
      />

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
          setDeleteError(null);
        }}
      />
    </div>
  );
}
