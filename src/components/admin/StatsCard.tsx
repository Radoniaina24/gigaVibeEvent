import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}

/** Carte KPI du backoffice, style shadcn. */
export function StatsCard({ label, value, hint, icon: Icon }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="size-4 text-zinc-500" aria-hidden />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      </CardContent>
    </Card>
  );
}
