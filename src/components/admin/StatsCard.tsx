import type { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: 'brand' | 'success' | 'warning' | 'info' | 'neutral';
}

const tiles: Record<NonNullable<Props['tone']>, string> = {
  brand: 'bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-sm shadow-brand-600/30',
  success: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-600/30',
  warning: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30',
  info: 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm shadow-sky-600/30',
  neutral: 'bg-zinc-900 text-white shadow-sm',
};

/** Carte KPI du backoffice, style shadcn : compacte sur mobile, tronquée sans débordement. */
export function StatsCard({ label, value, hint, icon: Icon, tone = 'neutral' }: Props) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-zinc-500 sm:text-sm">{label}</p>
          <p
            className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight sm:text-2xl"
            title={value}
          >
            {value}
          </p>
          {hint && <p className="mt-1 truncate text-xs text-zinc-400" title={hint}>{hint}</p>}
        </div>
        <span
          aria-hidden
          className={cn('grid size-10 shrink-0 place-items-center rounded-xl sm:size-11', tiles[tone])}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
    </Card>
  );
}
