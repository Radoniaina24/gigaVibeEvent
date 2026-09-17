import type { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';
import { DeltaBadge, Sparkline } from './Charts';

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

const sparkStroke: Record<NonNullable<Props['tone']>, string> = {
  brand: '#dc2626',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#0ea5e9',
  neutral: '#71717a',
};

const accents: Record<NonNullable<Props['tone']>, string> = {
  brand: 'from-brand-600 to-brand-400',
  success: 'from-emerald-500 to-teal-400',
  warning: 'from-amber-400 to-orange-400',
  info: 'from-sky-500 to-indigo-500',
  neutral: 'from-zinc-700 to-zinc-400',
};

interface KpiProps extends Props {
  delta?: number | null;
  spark?: number[];
}

/** KPI premium : liseré dégradé, badge de variation, mini-courbe, survol relevé. */
export function KpiCard({ label, value, hint, icon: Icon, tone = 'neutral', delta, spark }: KpiProps) {
  return (
    <Card className="group relative min-w-0 overflow-hidden rounded-2xl border-zinc-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <span
        aria-hidden
        className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', accents[tone])}
      />
      <div className="flex items-start justify-between gap-3 p-4 pt-5 sm:p-5 sm:pt-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
          <p
            className="mt-1.5 truncate font-display text-[1.35rem] font-bold tabular-nums leading-none tracking-tight sm:text-[1.6rem]"
            title={value}
          >
            {value}
          </p>
          {hint && (
            <p className="mt-1.5 truncate text-xs text-zinc-400" title={hint}>
              {hint}
            </p>
          )}
        </div>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            aria-hidden
            className={cn('grid size-10 place-items-center rounded-xl transition group-hover:scale-105 sm:size-11', tiles[tone])}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          {delta !== undefined && <DeltaBadge delta={delta} />}
        </span>
      </div>
      {spark && spark.length > 1 && (
        <div className="px-3 pb-2">
          <Sparkline values={spark} stroke={sparkStroke[tone]} height={36} />
        </div>
      )}
    </Card>
  );
}
