import type { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}

/** Carte KPI du dashboard admin. */
export function StatsCard({ label, value, hint, icon: Icon }: Props) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-100">
          <Icon className="size-4.5 text-zinc-700" aria-hidden />
        </span>
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </Card>
  );
}
