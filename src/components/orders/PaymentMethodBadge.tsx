import { cn } from '../../lib/utils';
import { PAYMENT_METHODS } from '../../features/payments/providers';

const LABEL: Record<string, string> = {
  yas: 'YAS',
  orange_money: 'Orange Money',
  airtel_money: 'Airtel Money',
  card: 'Carte',
  cash: 'Espèces',
};

/**
 * Couleur de marque exacte par opérateur (même source que les formulaires :
 * `PAYMENT_METHODS.brandBg`, et logo officiel dans `/public/operators`).
 * - YAS : bleu marine #00377D + accent jaune #FFD105 (logo officiel)
 * - Orange Money : #FF7900
 * - Airtel Money : #E40000
 */
const BRAND_BG: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.id, m.brandBg]),
);

const EXTRA_STYLES: Record<string, { badge: string; dot: string }> = {
  card: {
    badge: 'bg-sky-50 text-sky-700 ring-sky-200',
    dot: 'bg-sky-500',
  },
  cash: {
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
};

const FALLBACK = {
  badge: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  dot: 'bg-zinc-400',
};

/** Badge méthode de paiement aux vraies couleurs de chaque opérateur. */
export function PaymentMethodBadge({ method }: { method: string }) {
  const brand = BRAND_BG[method];
  if (brand) {
    return (
      <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset"
        style={{
          backgroundColor: `color-mix(in srgb, ${brand} 9%, white)`,
          color: brand,
          borderColor: `color-mix(in srgb, ${brand} 25%, white)`,
        }}
      >
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: brand }}
        />
        {LABEL[method] ?? method}
      </span>
    );
  }
  const style = EXTRA_STYLES[method] ?? FALLBACK;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        style.badge,
      )}
    >
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', style.dot)} />
      {LABEL[method] ?? method}
    </span>
  );
}
