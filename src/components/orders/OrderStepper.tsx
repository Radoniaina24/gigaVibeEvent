import { AlertCircle, Check, Clock, Ticket } from 'lucide-react';
import { cn } from '../../lib/utils';

const STEPS = ['Commande', 'Paiement', 'Vérification', 'Billet'] as const;

/**
 * Progression d'une commande manuelle (spec §24).
 * pending -> étape 0 · processing -> étape 2 · paid -> terminé.
 * failed/cancelled/expired -> état terminal signalé en rouge.
 */
export function orderStepIndex(status: string): number {
  switch (status) {
    case 'paid':
      return 4;
    case 'processing':
      return 2;
    case 'failed':
    case 'cancelled':
    case 'expired':
      return -1;
    default:
      return 0;
  }
}

const CHECKOUT_STEPS = ['Récapitulatif', 'Participants', 'Paiement', 'Confirmation'] as const;

/**
 * Stepper numéroté du tunnel d'achat : pastilles numérotées reliées,
 * état terminé (coche verte) / courant (noir) / à venir (grisé).
 */
export function CheckoutSteps({ step }: { step: number }) {
  return (
    <ol aria-label="Progression de la commande" className="flex items-start">
      {CHECKOUT_STEPS.map((label, i) => {
        const done = step > i;
        const current = step === i;
        return (
          <li key={label} className={cn('flex items-start', i < CHECKOUT_STEPS.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'flex size-9 items-center justify-center rounded-full text-sm font-black transition',
                  done && 'bg-green-600 text-white',
                  current && 'bg-zinc-950 text-white ring-4 ring-zinc-950/10',
                  !done && !current && 'bg-zinc-200 text-zinc-500',
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : (i + 1)}
              </span>
              <span
                className={cn(
                  'hidden text-center text-[11px] leading-tight sm:block',
                  current ? 'font-bold text-zinc-900' : done ? 'font-semibold text-zinc-700' : 'text-zinc-400',
                )}
              >
                {label}
              </span>
            </div>
            {i < CHECKOUT_STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'mx-1 mt-[18px] h-0.5 min-w-4 flex-1 rounded-full sm:mx-2',
                  step > i ? 'bg-green-600' : 'bg-zinc-200',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export interface OrderTimelineEvent {
  createdAt: string;
  declaredAt?: string | null;
  paidAt?: string | null;
  ticketCount?: number;
  rejectionReason?: string | null;
}

/** Frise verticale détaillée (détail commande) : jalons datés + état. */
export function OrderTimeline({
  status,
  event,
}: {
  status: string;
  event: OrderTimelineEvent;
}) {
  const paid = status === 'paid';
  const reviewing = status === 'processing';
  const failed = status === 'failed' || status === 'cancelled' || status === 'expired';
  const nodes: {
    label: string;
    desc: string;
    date?: string | null;
    state: 'done' | 'current' | 'todo' | 'error';
    icon: typeof Check;
  }[] = [
    {
      label: 'Commande créée',
      desc: 'Billets réservés pour 30 minutes.',
      date: event.createdAt,
      state: 'done',
      icon: Check,
    },
    {
      label: 'Preuve envoyée',
      desc: 'Référence + capture transmises.',
      date: event.declaredAt,
      state: paid || reviewing ? 'done' : failed ? 'done' : 'todo',
      icon: Check,
    },
    {
      label: failed ? 'Paiement refusé' : 'Vérification',
      desc: failed
        ? (event.rejectionReason ?? 'Voir le motif ci-dessous.')
        : 'Notre équipe contrôle le transfert.',
      date: event.paidAt,
      state: paid ? 'done' : failed ? 'error' : reviewing ? 'current' : 'todo',
      icon: failed ? AlertCircle : Clock,
    },
    {
      label: 'Billet disponible',
      desc:
        paid && event.ticketCount
          ? `${event.ticketCount} billet${event.ticketCount > 1 ? 's' : ''} avec QR Code.`
          : 'QR Code généré après validation.',
      date: event.paidAt,
      state: paid ? 'done' : 'todo',
      icon: Ticket,
    },
  ];
  return (
    <ol className="space-y-0">
      {nodes.map((n, i) => (
        <li key={n.label} className="relative flex gap-3 pb-5 last:pb-0">
          {i < nodes.length - 1 && (
            <span
              aria-hidden
              className={cn(
                'absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5',
                n.state === 'done' ? 'bg-green-500' : 'bg-zinc-200',
              )}
            />
          )}
          <span
            aria-hidden
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full',
              n.state === 'done' && 'bg-green-600 text-white',
              n.state === 'current' && 'bg-zinc-900 text-white',
              n.state === 'todo' && 'bg-zinc-100 text-zinc-400',
              n.state === 'error' && 'bg-red-500 text-white',
            )}
          >
            <n.icon className="size-4" />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-bold">
              {n.label}
              {n.state === 'current' && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  En cours
                </span>
              )}
            </p>
            <p className="text-xs text-zinc-500">{n.desc}</p>
            {n.date && (
              <p className="mt-0.5 text-xs tabular-nums text-zinc-400">
                {new Date(n.date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function OrderStepper({ status }: { status: string }) {
  const index = orderStepIndex(status);
  const failed = index === -1;
  return (
    <ol aria-label="Progression de la commande" className="flex gap-1">
      {STEPS.map((label, i) => {
        const done = !failed && (index > i || index === 4);
        const current = !failed && index === i;
        return (
          <li key={label} className="flex-1">
            <div
              aria-current={current ? 'step' : undefined}
              className={cn(
                'h-1.5 rounded-full',
                done && 'bg-green-600',
                current && 'bg-zinc-900',
                failed && (i < 2 ? 'bg-zinc-900' : i === 2 ? 'bg-red-500' : 'bg-zinc-200'),
                !done && !current && !(failed && i >= 2) && 'bg-zinc-200',
              )}
            />
            <p
              className={cn(
                'mt-1 text-[11px]',
                done || current ? 'font-semibold' : 'text-zinc-500',
                failed && i === 2 && 'font-semibold text-red-600',
              )}
            >
              {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
