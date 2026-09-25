import { formatAr } from '../../lib/utils';
import type { EventListTicketType } from '../../features/events/eventUtils';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export interface OrderLine {
  ticketType: EventListTicketType;
  quantity: number;
}

interface Props {
  lines: OrderLine[];
  ctaLabel?: string;
  onSubmit?: () => void;
  ctaDisabled?: boolean;
}

/**
 * Récapitulatif de commande (frais fixes par billet depuis platform_settings).
 */
export function OrderSummary({ lines, ctaLabel, onSubmit, ctaDisabled }: Props) {
  const { data: settings } = usePlatformSettings();
  const subtotal = lines.reduce((s, l) => s + l.ticketType.price * l.quantity, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const fees = (settings?.serviceFeeFixed ?? 0) * count;
  const total = subtotal + fees;

  return (
    <Card className="p-5">
      <h2 className="font-bold">Récapitulatif</h2>
      {lines.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          Sélectionnez au moins un billet pour continuer.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {lines.map((l) => (
            <li key={l.ticketType.id} className="flex justify-between gap-2">
              <span className="text-zinc-600">
                {l.ticketType.name} · {formatAr(l.ticketType.price)} × {l.quantity}
              </span>
              <strong className="tabular-nums">
                {formatAr(l.ticketType.price * l.quantity)}
              </strong>
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-4 space-y-1 border-t border-zinc-100 pt-3 text-sm">
        <div className="flex justify-between text-zinc-600">
          <dt>
            Sous-total ({count} billet{count > 1 ? 's' : ''})
          </dt>
          <dd className="tabular-nums">{formatAr(subtotal)}</dd>
        </div>
        <div className="flex justify-between text-zinc-600">
          <dt>Frais</dt>
          <dd className="tabular-nums">{formatAr(fees)}</dd>
        </div>
        <div className="flex justify-between pt-1 text-base font-bold">
          <dt>TOTAL</dt>
          <dd className="tabular-nums">{formatAr(total)}</dd>
        </div>
      </dl>
      {ctaLabel && onSubmit && (
        <Button
          onClick={onSubmit}
          disabled={ctaDisabled ?? lines.length === 0}
          className="mt-4 w-full"
          size="lg"
        >
          {ctaLabel}
        </Button>
      )}
    </Card>
  );
}
