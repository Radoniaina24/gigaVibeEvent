import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, Eye, Pencil, Plus, Ticket, Users, Wallet } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { DateTimePickerField } from '../../../components/ui/DateTimePicker';
import { Textarea } from '../../../components/ui/Fields';
import { SelectField } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Card';
import { ticketTypeSchema, type TicketTypeInput } from '../../../schemas';
import type { TicketType } from '../../../types/database';
import { formatAr } from '../../../lib/utils';

export type TicketTypeInitial = TicketType | TicketTypeInput | null;

interface TicketTypeModalProps {
  open: boolean;
  /** `null` = création, sinon édition (ligne serveur ou brouillon). */
  ticket: TicketTypeInitial;
  saving: boolean;
  serverError: string | null;
  onSubmit: (values: TicketTypeInput) => void;
  onClose: () => void;
}

const EMPTY: TicketTypeInput = {
  name: '',
  description: '',
  price: 0,
  quantity: 100,
  sales_start: '',
  sales_end: '',
  status: 'active',
};

const MAX_NAME = 80;
const MAX_DESC = 500;

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  sold_out: 'Épuisé',
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
  { value: 'sold_out', label: 'Épuisé' },
] as const;

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Modale création / édition de type de billet : aperçu ticket live,
 * presets de prix / quantité, compteurs, erreurs inline.
 */
export function TicketTypeModal({
  open,
  ticket,
  saving,
  serverError,
  onSubmit,
  onClose,
}: TicketTypeModalProps) {
  const isEdit = ticket !== null;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TicketTypeInput>({ resolver: zodResolver(ticketTypeSchema) });

  useEffect(() => {
    if (!open) return;
    reset(
      ticket
        ? {
            name: ticket.name,
            description: ticket.description ?? '',
            price: ticket.price,
            quantity: ticket.quantity,
            sales_start: toLocalInput(ticket.sales_start),
            sales_end: toLocalInput(ticket.sales_end),
            status: ticket.status,
          }
        : EMPTY,
    );
  }, [open, ticket, reset]);

  const name = watch('name') ?? '';
  const price = watch('price') ?? 0;
  const quantity = watch('quantity') ?? 0;
  const status = watch('status') ?? 'active';
  const salesStart = watch('sales_start') ?? '';
  const salesEnd = watch('sales_end') ?? '';
  const description = (watch('description') as string | null | undefined) ?? '';

  const previewName = name.trim() || 'Nom du billet';
  const revenue = Math.max(0, price) * Math.max(0, quantity);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `Modifier « ${(ticket as { name: string }).name} »` : 'Nouveau billet'}
      subtitle={
        isEdit
          ? 'Les modifications s’appliquent aux ventes à venir.'
          : 'Définissez le tarif, le stock et la période de vente.'
      }
      icon={
        isEdit ? <Pencil className="size-5" aria-hidden /> : <Plus className="size-5" aria-hidden />
      }
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" form="ticket-type-form" loading={saving}>
            {isEdit ? 'Enregistrer' : 'Créer le billet'}
          </Button>
        </>
      }
    >
      {serverError && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      {/* Aperçu live façon billet */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-zinc-200">
        <p className="flex items-center gap-1.5 bg-zinc-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <Eye className="size-3.5" aria-hidden /> Aperçu
        </p>
        <div className="flex items-stretch">
          <div className="flex w-32 shrink-0 flex-col items-center justify-center gap-0.5 bg-zinc-900 px-3 py-4 text-white">
            <Ticket className="size-4 text-gold-400" aria-hidden />
            <p className="font-display text-lg font-bold tabular-nums leading-tight">
              {formatAr(Math.max(0, price))}
            </p>
            <p className="text-[11px] text-zinc-300">/ billet</p>
          </div>
          <div className="min-w-0 flex-1 px-4 py-3">
            <p className="flex flex-wrap items-center gap-2 font-semibold text-zinc-900">
              <span className="truncate">{previewName}</span>
              <Badge tone={status === 'active' ? 'success' : status === 'sold_out' ? 'warning' : 'neutral'}>
                {STATUS_LABEL[status] ?? status}
              </Badge>
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
              <Users className="size-3.5 shrink-0" aria-hidden />
              <span className="tabular-nums">{Math.max(0, quantity)} places</span>
              <span aria-hidden>·</span>
              <Wallet className="size-3.5 shrink-0" aria-hidden />
              <span className="tabular-nums">{formatAr(revenue)} potentiels</span>
            </p>
            <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-zinc-500">
              <CalendarClock className="size-3.5 shrink-0" aria-hidden />
              {salesStart ? formatDateShort(salesStart) : 'Début immédiat'}
              {' → '}
              {salesEnd ? formatDateShort(salesEnd) : 'sans fin'}
            </p>
          </div>
        </div>
      </div>

      <form id="ticket-type-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Input
              label="Nom"
              placeholder="Standard, VIP, Early Bird…"
              maxLength={MAX_NAME}
              autoFocus
              error={errors.name?.message}
              {...register('name')}
            />
            <p className="mt-1 text-right text-xs tabular-nums text-zinc-400">
              {name.length}/{MAX_NAME}
            </p>
          </div>
          <SelectField
            label="Statut"
            value={status}
            onChange={(v) => setValue('status', v, { shouldValidate: true, shouldDirty: true })}
            options={STATUS_OPTIONS}
            error={errors.status?.message}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Prix (Ar)"
            type="number"
            min={0}
            step={500}
            className="no-spinner"
            error={errors.price?.message}
            {...register('price', { valueAsNumber: true })}
          />
          <Input
            label="Quantité"
            type="number"
            min={1}
            step={1}
            className="no-spinner"
            error={errors.quantity?.message}
            {...register('quantity', { valueAsNumber: true })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DateTimePickerField
            label="Début des ventes"
            value={salesStart}
            allowClear
            onChange={(v) => setValue('sales_start', v, { shouldValidate: true, shouldDirty: true })}
            error={errors.sales_start?.message}
          />
          <DateTimePickerField
            label="Fin des ventes"
            value={salesEnd}
            allowClear
            min={salesStart || undefined}
            onChange={(v) => setValue('sales_end', v, { shouldValidate: true, shouldDirty: true })}
            error={errors.sales_end?.message}
          />
        </div>

        <div>
          <Textarea
            label="Description"
            placeholder="Accès zone standard, file prioritaire…"
            rows={2}
            maxLength={MAX_DESC}
            error={errors.description?.message}
            {...register('description')}
          />
          <p className="mt-1 text-right text-xs tabular-nums text-zinc-400">
            {description.length}/{MAX_DESC}
          </p>
        </div>
      </form>
    </Modal>
  );
}
