import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  useAdminEvent,
  useCreateTicketType,
  useDeleteTicketType,
  useUpdateTicketType,
} from '../hooks';
import { ticketTypeSchema, type TicketTypeInput } from '../../../schemas';
import type { TicketType } from '../../../types/database';
import { formatAr } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select, Textarea } from '../../../components/ui/Fields';
import { Badge } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { LoadingState } from '../../../components/ui/States';

const EMPTY: TicketTypeInput = {
  name: '',
  description: '',
  price: 0,
  quantity: 100,
  sales_start: '',
  sales_end: '',
  status: 'active',
};

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TicketTypesManager({
  eventId,
  fetchHook = useAdminEvent,
  createHook = useCreateTicketType,
  updateHook = useUpdateTicketType,
  deleteHook = useDeleteTicketType,
}: {
  eventId: string;
  /** Injection des hooks (admin par défaut, partenaire en espace organisateur). */
  fetchHook?: (id: string | undefined) => {
    data: { ticket_types: TicketType[] } | null | undefined;
    isPending: boolean;
  };
  createHook?: () => {
    mutateAsync: (v: { event_id: string; input: TicketTypeInput }) => Promise<unknown>;
    isPending: boolean;
  };
  updateHook?: () => {
    mutateAsync: (v: { id: string; input: TicketTypeInput }) => Promise<unknown>;
    isPending: boolean;
  };
  deleteHook?: () => {
    mutateAsync: (row: TicketType) => Promise<unknown>;
    isPending: boolean;
  };
}) {
  const { data: event, isPending } = fetchHook(eventId);
  const createType = createHook();
  const updateType = updateHook();
  const deleteType = deleteHook();

  const [editing, setEditing] = useState<TicketType | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<TicketType | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketTypeInput>({
    resolver: zodResolver(ticketTypeSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (editing === 'new') {
      reset(EMPTY);
    } else if (editing) {
      reset({
        name: editing.name,
        description: editing.description ?? '',
        price: editing.price,
        quantity: editing.quantity,
        sales_start: toLocalInput(editing.sales_start),
        sales_end: toLocalInput(editing.sales_end),
        status: editing.status,
      });
    }
  }, [editing, reset]);

  const onSubmit = async (values: TicketTypeInput) => {
    setServerError(null);
    try {
      if (editing === 'new') {
        await createType.mutateAsync({ event_id: eventId, input: values });
      } else if (editing) {
        await updateType.mutateAsync({ id: editing.id, input: values });
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
      await deleteType.mutateAsync(toDelete);
      setToDelete(null);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  };

  if (isPending) return <LoadingState label="Chargement des billets…" />;

  const types = event?.ticket_types ?? [];

  return (
    <section aria-label="Types de billets" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Types de billets ({types.length})</h2>
        {editing === null && (
          <Button size="sm" variant="secondary" onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden /> Ajouter
          </Button>
        )}
      </div>

      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      {types.length === 0 && editing !== 'new' ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500">
          Aucun type de billet. Ajoutez au moins un type pour vendre.
        </p>
      ) : (
        <ul className="space-y-2">
          {types.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-sm"
            >
              <div>
                <p className="font-semibold">
                  {t.name}{' '}
                  <Badge tone={t.status === 'active' ? 'success' : 'neutral'}>
                    {t.status}
                  </Badge>
                </p>
                <p className="text-zinc-500 tabular-nums">
                  {formatAr(t.price)} · {t.sold}/{t.quantity} vendus
                </p>
              </div>
              <span className="flex gap-1">
                <button
                  type="button"
                  title="Modifier"
                  onClick={() => setEditing(t)}
                  className="rounded-md p-2 hover:bg-zinc-100"
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  title="Supprimer"
                  onClick={() => setToDelete(t)}
                  className="rounded-md p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-3 rounded-xl border border-zinc-300 bg-zinc-50 p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {editing === 'new' ? 'Nouveau type' : `Modifier ${editing.name}`}
            </p>
            <button
              type="button"
              onClick={() => setEditing(null)}
              aria-label="Fermer le formulaire"
              className="rounded-md p-1 hover:bg-zinc-200"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Nom" error={errors.name?.message} {...register('name')} />
            <Select label="Statut" error={errors.status?.message} {...register('status')}>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
              <option value="sold_out">Épuisé</option>
            </Select>
            <Input
              label="Prix (Ar)"
              type="number"
              min={0}
              error={errors.price?.message}
              {...register('price', { valueAsNumber: true })}
            />
            <Input
              label="Quantité"
              type="number"
              min={1}
              error={errors.quantity?.message}
              {...register('quantity', { valueAsNumber: true })}
            />
            <Input
              label="Début des ventes"
              type="datetime-local"
              error={errors.sales_start?.message}
              {...register('sales_start')}
            />
            <Input
              label="Fin des ventes"
              type="datetime-local"
              error={errors.sales_end?.message}
              {...register('sales_end')}
            />
          </div>
          <Textarea
            label="Description"
            error={errors.description?.message}
            {...register('description')}
          />
          <Button
            type="submit"
            loading={isSubmitting || createType.isPending || updateType.isPending}
          >
            Enregistrer
          </Button>
        </form>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer ce type de billet ?"
        description={
          toDelete
            ? `"${toDelete.name}" sera supprimé. Impossible si des billets ont été vendus.`
            : undefined
        }
        confirmLabel="Supprimer"
        danger
        loading={deleteType.isPending}
        onConfirm={handleDelete}
        onClose={() => {
          setToDelete(null);
          setServerError(null);
        }}
      />
    </section>
  );
}
