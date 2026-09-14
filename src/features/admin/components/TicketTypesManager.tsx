import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useAdminEvent,
  useCreateTicketType,
  useDeleteTicketType,
  useUpdateTicketType,
} from '../hooks';
import type { TicketTypeInput } from '../../../schemas';
import type { TicketType } from '../../../types/database';
import { formatAr } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { LoadingState } from '../../../components/ui/States';
import { TicketTypeModal, type TicketTypeInitial } from './TicketTypeModal';

export function TicketTypesManager({
  eventId,
  fetchHook = useAdminEvent,
  createHook = useCreateTicketType,
  updateHook = useUpdateTicketType,
  deleteHook = useDeleteTicketType,
  draftTickets,
  onDraftChange,
}: {
  eventId?: string;
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
  /**
   * Mode brouillon (création d'événement, pas encore d'id) : aucune requête,
   * la liste vit dans le formulaire parent et sera créée avec l'événement.
   */
  draftTickets?: TicketTypeInput[];
  onDraftChange?: (tickets: TicketTypeInput[]) => void;
}) {
  const isDraft = draftTickets !== undefined && onDraftChange !== undefined;
  /** Liste locale en mode brouillon (toujours définie quand `isDraft`). */
  const draftList = draftTickets ?? [];
  const { data: event, isPending } = fetchHook(isDraft ? undefined : eventId);
  const createType = createHook();
  const updateType = updateHook();
  const deleteType = deleteHook();

  const [editing, setEditing] = useState<TicketType | 'new' | null>(null);
  const [draftEditing, setDraftEditing] = useState<number | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<TicketType | null>(null);
  const [toDeleteDraft, setToDeleteDraft] = useState<number | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const openCreate = () => {
    setServerError(null);
    if (isDraft) setDraftEditing('new');
    else setEditing('new');
  };

  const openEdit = (t: TicketType, index: number) => {
    setServerError(null);
    if (isDraft) setDraftEditing(index);
    else setEditing(t);
  };

  const closeModal = () => {
    if (createType.isPending || updateType.isPending) return;
    setEditing(null);
    setDraftEditing(null);
    setServerError(null);
  };

  /** Valeur initiale de la modale : ligne serveur ou brouillon (`null` = création). */
  const modalTicket: TicketTypeInitial =
    editing && editing !== 'new'
      ? editing
      : draftEditing !== null && draftEditing !== 'new'
        ? (draftList[draftEditing] ?? null)
        : null;

  const onSubmit = async (values: TicketTypeInput) => {
    setServerError(null);
    if (isDraft) {
      if (draftEditing === 'new') {
        onDraftChange?.([...draftList, values]);
      } else if (draftEditing !== null) {
        onDraftChange?.(draftList.map((t, i) => (i === draftEditing ? values : t)));
      }
      setDraftEditing(null);
      return;
    }
    try {
      if (editing === 'new') {
        if (!eventId) throw new Error('Événement introuvable.');
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

  if (!isDraft && isPending) return <LoadingState label="Chargement des billets…" />;

  const types = isDraft ? draftList : (event?.ticket_types ?? []);
  const modalOpen = editing !== null || draftEditing !== null;

  return (
    <section aria-label="Types de billets" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Types de billets ({types.length})</h2>
        {!modalOpen && (
          <Button size="sm" variant="secondary" onClick={openCreate}>
            <Plus className="size-4" aria-hidden /> Ajouter
          </Button>
        )}
      </div>

      {isDraft && (
        <p className="text-xs text-zinc-500">
          Ces billets seront créés avec l’événement à l’enregistrement.
        </p>
      )}

      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      {types.length === 0 && !modalOpen ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500">
          Aucun type de billet. Ajoutez au moins un type pour vendre.
        </p>
      ) : (
        <ul className="space-y-2">
          {types.map((t, i) => {
            const key = isDraft ? `draft-${i}` : (t as TicketType).id;
            const sold = isDraft ? null : (t as TicketType).sold;
            return (
              <li
                key={key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    {t.name}{' '}
                    {isDraft ? (
                      <Badge tone="neutral">Brouillon</Badge>
                    ) : (
                      <Badge tone={t.status === 'active' ? 'success' : 'neutral'}>
                        {t.status}
                      </Badge>
                    )}
                  </p>
                  <p className="text-zinc-500 tabular-nums">
                    {formatAr(t.price)} ·{' '}
                    {sold === null ? `${t.quantity} places` : `${sold}/${t.quantity} vendus`}
                  </p>
                </div>
                <span className="flex gap-1">
                  <button
                    type="button"
                    title="Modifier"
                    onClick={() => openEdit(t as TicketType, i)}
                    className="rounded-md p-2 hover:bg-zinc-100"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    title="Supprimer"
                    onClick={() => (isDraft ? setToDeleteDraft(i) : setToDelete(t as TicketType))}
                    className="rounded-md p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <TicketTypeModal
        open={modalOpen}
        ticket={modalTicket}
        saving={createType.isPending || updateType.isPending}
        serverError={serverError}
        onSubmit={onSubmit}
        onClose={closeModal}
      />

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

      <ConfirmDialog
        open={toDeleteDraft !== null}
        title="Retirer ce type de billet ?"
        description={
          toDeleteDraft !== null && draftList[toDeleteDraft]
            ? `"${draftList[toDeleteDraft].name}" sera retiré de la liste (l’événement n’est pas encore créé).`
            : undefined
        }
        confirmLabel="Retirer"
        onConfirm={() => {
          if (toDeleteDraft !== null) onDraftChange?.(draftList.filter((_, i) => i !== toDeleteDraft));
          setToDeleteDraft(null);
        }}
        onClose={() => setToDeleteDraft(null)}
      />
    </section>
  );
}
