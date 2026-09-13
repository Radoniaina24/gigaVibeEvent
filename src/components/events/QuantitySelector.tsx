import { Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}

export function QuantitySelector({ value, min = 0, max, onChange, label }: Props) {
  const btn =
    'flex size-8 items-center justify-center rounded-lg border border-zinc-300 bg-white transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Réduire la quantité pour ${label}`}
        className={btn}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span
        role="status"
        aria-live="polite"
        aria-label={`Quantité pour ${label} : ${value}`}
        className={cn('w-8 text-center text-sm font-bold tabular-nums')}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`Augmenter la quantité pour ${label}`}
        className={btn}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
