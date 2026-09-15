import { ShieldCheck, Ticket } from 'lucide-react';
import type { CheckoutLine } from '../../schemas/orders';
import { formatAr } from '../../lib/utils';
import { Button } from '../ui/Button';

interface Props {
  eventTitle: string;
  items: CheckoutLine[];
  total: number;
  methodLabel?: string;
  onCancel?: () => void;
  cancelling?: boolean;
}

/** Récapitulatif sticky du tunnel (colonnes de droite des étapes 2-4). */
export function OrderRecapCard({ eventTitle, items, total, methodLabel, onCancel, cancelling }: Props) {
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white lg:sticky lg:top-24">
      <div className="bg-zinc-950 p-5 text-white">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-300">
            Votre commande
          </h2>
          <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-black tabular-nums text-zinc-950">
            {count} billet{count > 1 ? 's' : ''}
          </span>
        </div>
        <p className="mt-1.5 truncate text-sm font-semibold">{eventTitle}</p>
      </div>
      <ul className="space-y-3 p-5">
        {items.map((i) => (
          <li key={i.ticket_type_id} className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100"
            >
              <Ticket className="size-4 text-zinc-600" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{i.name}</span>
              <span className="block text-xs tabular-nums text-zinc-500">
                {formatAr(i.unit_price)} × {i.quantity}
              </span>
            </span>
            <strong className="shrink-0 text-sm tabular-nums">
              {formatAr(i.unit_price * i.quantity)}
            </strong>
          </li>
        ))}
      </ul>
      <div className="border-t border-dashed border-zinc-200 bg-zinc-50 p-5">
        <p className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-zinc-500">TOTAL</span>
          <span className="font-display text-2xl font-black tabular-nums tracking-tight">
            {formatAr(total)}
          </span>
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheck className="size-3.5 shrink-0 text-green-600" aria-hidden />
          {methodLabel
            ? `Paiement ${methodLabel} — vérifié par notre équipe`
            : 'Paiement manuel vérifié par notre équipe'}
        </p>
        {onCancel && (
          <Button
            size="sm"
            variant="ghost"
            loading={cancelling}
            onClick={onCancel}
            className="mt-3 w-full"
          >
            Annuler la commande
          </Button>
        )}
      </div>
    </div>
  );
}
