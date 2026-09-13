import { formatAr, formatDate } from '../../lib/utils';
import type { EventListTicketType } from '../../features/events/eventUtils';
import { Badge } from '../ui/Card';
import { QuantitySelector } from './QuantitySelector';

export const MAX_PER_TYPE = 10;

interface Props {
  ticketType: EventListTicketType;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

function saleState(t: EventListTicketType): { label: string; tone: 'success' | 'neutral' | 'danger' | 'warning' } {
  if (t.status !== 'active') return { label: 'Indisponible', tone: 'neutral' };
  if (t.available <= 0) return { label: 'Épuisé', tone: 'danger' };
  if (t.sales_start && new Date(t.sales_start).getTime() > Date.now())
    return { label: `En vente le ${formatDate(t.sales_start)}`, tone: 'warning' };
  if (t.sales_end && new Date(t.sales_end).getTime() < Date.now())
    return { label: 'Vente terminée', tone: 'neutral' };
  return { label: `${t.available} places`, tone: 'success' };
}

export function TicketTypeCard({ ticketType: t, quantity, onQuantityChange }: Props) {
  const state = saleState(t);
  const selectable = t.onSale;
  const max = Math.min(MAX_PER_TYPE, t.available);

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between ${selectable ? 'border-zinc-200' : 'border-zinc-100 opacity-70'}`}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{t.name}</p>
          <Badge tone={state.tone}>{state.label}</Badge>
        </div>
        {t.description && (
          <p className="mt-1 text-sm text-zinc-500">{t.description}</p>
        )}
        <p className="mt-1 text-sm">
          <strong>{formatAr(t.price)}</strong>
          <span className="text-zinc-500"> / billet</span>
        </p>
      </div>
      {selectable ? (
        <QuantitySelector
          label={t.name}
          value={quantity}
          max={max}
          onChange={onQuantityChange}
        />
      ) : (
        <span className="text-xs text-zinc-400">Sélection impossible</span>
      )}
    </div>
  );
}
