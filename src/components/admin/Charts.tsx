import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Trophy, Wallet } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatAr } from '../../lib/utils';

export interface DayPoint {
  label: string;
  fullLabel: string;
  value: number;
}

export interface BarRow {
  label: string;
  value: number;
  display: string;
}

const BRAND = '#dc2626';
const INK = '#18181b';

const DONUT_COLORS = [
  '#18181b',
  '#dc2626',
  '#f59e0b',
  '#0ea5e9',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
];

/** Axe Y compact : 1,5 M · 250 k (le tooltip affiche le montant complet). */
function compactAr(v: number): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `${m >= 10 ? Math.round(m) : Math.round(m * 10) / 10} M`;
  }
  if (v >= 1_000) return `${Math.round(v / 1_000)} k`;
  return String(v);
}

function TooltipShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-36 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-xl">
      <p className="truncate text-xs font-semibold text-zinc-500">{label}</p>
      <div className="mt-1 space-y-0.5">{children}</div>
    </div>
  );
}

function RevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value?: number | string; payload?: DayPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (!p) return null;
  return (
    <TooltipShell label={p.fullLabel}>
      <p className="text-sm font-bold tabular-nums">{formatAr(p.value)}</p>
    </TooltipShell>
  );
}

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: { name: string; value: number; display: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (!p) return null;
  return (
    <TooltipShell label={p.name}>
      <p className="text-sm font-bold tabular-nums">{formatAr(p.value)}</p>
      <p className="text-xs text-zinc-500">{p.display}</p>
    </TooltipShell>
  );
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; payload?: BarRow & { fill: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const row = p.payload;
  if (!row) return null;
  return (
    <TooltipShell label={p.name ?? row.label}>
      <p className="flex items-center gap-1.5 text-sm font-bold tabular-nums">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ background: row.fill }}
        />
        {row.display}
      </p>
    </TooltipShell>
  );
}

function EmptyChart({ icon: Icon, title, hint }: { icon: typeof Wallet; title: string; hint: string }) {
  return (
    <div className="grid place-items-center px-4 py-10 text-center sm:py-12">
      <span aria-hidden className="grid size-11 place-items-center rounded-2xl bg-zinc-100">
        <Icon className="size-5 text-zinc-400" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-semibold text-zinc-700">{title}</p>
      <p className="mt-0.5 max-w-64 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

/** Revenus par jour : aire dégradée, grille légère, tooltip montant complet. */
export function RevenueChart({ data, title, subtitle }: { data: DayPoint[]; title: string; subtitle?: string }) {
  const { total, hasData } = useMemo(() => {
    const total = data.reduce((s, d) => s + d.value, 0);
    return { total, hasData: total > 0 };
  }, [data]);

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2 p-4 sm:p-6 sm:pb-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold sm:text-base">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-xs text-zinc-500 sm:text-sm">{subtitle}</p>}
        </div>
        <p className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold tabular-nums text-white sm:text-sm">
          {formatAr(total)}
        </p>
      </div>
      {!hasData ? (
        <EmptyChart
          icon={BarChart3}
          title="Aucun revenu sur la période."
          hint="Les commandes payées alimenteront ce graphique."
        />
      ) : (
        <div
          className="h-64 w-full px-1 pb-2 sm:h-72"
          role="img"
          aria-label={`${title} : total ${formatAr(total)}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={BRAND} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e4e4e7" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#71717a' }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                tickMargin={8}
              />
              <YAxis
                width={52}
                tick={{ fontSize: 11, fill: '#71717a' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={compactAr}
              />
              <Tooltip content={<RevenueTooltip />} cursor={{ stroke: '#d4d4d8', strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="value"
                name="Revenus"
                stroke={BRAND}
                strokeWidth={2.5}
                fill="url(#revenueFill)"
                activeDot={{ r: 4, fill: BRAND, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/** Top événements : barres horizontales classées, valeur + détail au survol. */
export function TopEventsChart({ rows, title, subtitle }: { rows: BarRow[]; title: string; subtitle?: string }) {
  const chartData = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
        .map((r) => ({ name: r.label, value: r.value, display: r.display })),
    [rows],
  );
  const height = Math.max(220, chartData.length * 46 + 16);

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <div className="p-4 sm:p-6 sm:pb-4">
        <h3 className="truncate text-sm font-bold sm:text-base">{title}</h3>
        {subtitle && <p className="mt-0.5 truncate text-xs text-zinc-500 sm:text-sm">{subtitle}</p>}
      </div>
      {chartData.length === 0 ? (
        <EmptyChart
          icon={Trophy}
          title="Aucun événement classé."
          hint="Les revenus par événement apparaîtront ici."
        />
      ) : (
        <div
          className="w-full flex-1 px-1 pb-3"
          style={{ height }}
          role="img"
          aria-label={`${title} : ${chartData[0]?.name} en tête avec ${formatAr(chartData[0]?.value ?? 0)}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap="28%">
              <CartesianGrid horizontal={false} stroke="#e4e4e7" strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={118}
                tick={{ fontSize: 12, fill: '#3f3f46', fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: '#f4f4f5' }} />
              <Bar dataKey="value" name="Revenus" radius={[4, 8, 8, 4]} maxBarSize={22}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? BRAND : INK} fillOpacity={i === 0 ? 1 : 0.28 + (0.5 * (chartData.length - i)) / chartData.length} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/** Paiements par méthode : donut + légende, total au centre. */
export function PaymentMethodsChart({ rows, title, subtitle }: { rows: BarRow[]; title: string; subtitle?: string }) {
  const chartData = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.value - a.value)
        .map((r, i) => ({ ...r, fill: DONUT_COLORS[i % DONUT_COLORS.length] })),
    [rows],
  );
  const total = chartData.reduce((s, r) => s + r.value, 0);

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="p-4 sm:p-6 sm:pb-2">
        <h3 className="truncate text-sm font-bold sm:text-base">{title}</h3>
        {subtitle && <p className="mt-0.5 truncate text-xs text-zinc-500 sm:text-sm">{subtitle}</p>}
      </div>
      {chartData.length === 0 ? (
        <EmptyChart
          icon={Wallet}
          title="Aucun paiement enregistré."
          hint="La répartition par méthode apparaîtra ici."
        />
      ) : (
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div
            className="relative mx-auto h-52 w-full max-w-72 sm:h-56"
            role="img"
            aria-label={`${title} : ${total} paiement${total > 1 ? 's' : ''} au total`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<DonutTooltip />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="64%"
                  outerRadius="92%"
                  paddingAngle={3}
                  cornerRadius={6}
                  strokeWidth={0}
                >
                  {chartData.map((r) => (
                    <Cell key={r.label} fill={r.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <p className="text-center">
                <span className="block text-2xl font-bold tabular-nums sm:text-3xl">{total}</span>
                <span className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  paiement{total > 1 ? 's' : ''}
                </span>
              </p>
            </div>
          </div>
          <ul className="mt-2 space-y-1.5">
            {chartData.map((r) => (
              <li
                key={r.label}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition hover:bg-zinc-50"
              >
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: r.fill }} />
                <span className="min-w-0 flex-1 truncate font-medium">{r.label}</span>
                <span className="shrink-0 tabular-nums text-zinc-500">{r.display}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
