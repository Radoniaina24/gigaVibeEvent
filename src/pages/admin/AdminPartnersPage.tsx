import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  useAdminPartners,
  useDeletePartner,
  type AdminPartnerRow,
} from '../../features/admin/hooks';
import { Button } from '../../components/ui/Button';
import { PartnersTable } from '../../features/admin/components/PartnersTable';
import { PartnersTableSkeleton } from '../../components/admin/AdminSkeletons';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toaster';
import {
  EmptyState,
  ErrorState,
} from '../../components/ui/States';

export function AdminPartnersPage() {
  const { data, isPending, isError, refetch } = useAdminPartners();
  const { toast } = useToast();
  const navigate = useNavigate();
  const deletePartner = useDeletePartner();

  const [toDelete, setToDelete] = useState<AdminPartnerRow | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!toDelete) return;
    setServerError(null);
    try {
      await deletePartner.mutateAsync(toDelete);
      toast.deleted('Partenaire', `« ${toDelete.name} » a été supprimé.`);
      setToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Suppression impossible.';
      setServerError(message);
      toast.error('Suppression impossible', message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            Partenaires
            {data && data.length > 0 && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-600">
                {data.length}
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Organisateurs de la plateforme : comptes, statuts et accès.
          </p>
        </div>
        <Link to="/admin/partners/new">
          <Button size="sm">
            <Plus className="size-4" aria-hidden /> Nouveau partenaire
          </Button>
        </Link>
      </div>

      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      {isPending ? (
        <PartnersTableSkeleton />
      ) : isError ? (
        <ErrorState description="Impossible de charger les partenaires." onRetry={() => refetch()} />
      ) : !data.length ? (
        <EmptyState
          title="Aucun partenaire."
          description="Ajoutez votre premier organisateur pour ouvrir la plateforme."
          action={
            <Link to="/admin/partners/new">
              <Button size="sm">Ajouter un partenaire</Button>
            </Link>
          }
        />
      ) : (
        <PartnersTable
          data={data}
          onEdit={(p) => navigate(`/admin/partners/${p.id}/edit`)}
          onDelete={(p) => setToDelete(p)}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer ce partenaire ?"
        description={
          toDelete
            ? `"${toDelete.name}" sera définitivement supprimé. Impossible s’il possède des événements.`
            : undefined
        }
        confirmLabel="Supprimer"
        danger
        loading={deletePartner.isPending}
        onConfirm={handleDelete}
        onClose={() => {
          setToDelete(null);
          setServerError(null);
        }}
      />
    </div>
  );
}
