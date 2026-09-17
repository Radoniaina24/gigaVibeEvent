import { useId, useMemo } from 'react';
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
import { BarChart3, ShoppingCart, TrendingDown, TrendingUp, Trophy, Wallet } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatAr } from '../../lib/utils';
import { cn } from '../../lib/utils';

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

export interface OrderDayPoint {
  label: string;
  fullLabel: string;
  total: number;
  paid: number;
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
    <div className="min-w-40 rounded-xl border border-white/10 bg-zinc-950/95 px-3 py-2 shadow-2xl backdrop-blur">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      <div className="mt-1 space-y-0.5 text-white">{children}</div>
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
      <p className="text-xs text-zinc-400">{p.display}</p>
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
      <span aria-hidden className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200/60 shadow-inner">
        <Icon className="size-5 text-zinc-400" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-semibold text-zinc-700">{title}</p>
      <p className="mt-0.5 max-w-64 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

/** Badge de variation honnête (2ᵉ moitié vs 1ʳᵉ moitié de période). */
export function DeltaBadge({ delta, suffix = '' }: { delta: number | null; suffix?: string }) {
  if (delta === null) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-zinc-500">
        —
      </span>
    );
  }
  const up = delta >= 0;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
        up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
      )}
    >
      {up ? <TrendingUp className="size-3" aria-hidden /> : <TrendingDown className="size-3" aria-hidden />}
      {up ? '+' : ''}
      {delta.toFixed(1).replace('.', ',')} %{suffix}
    </span>
  );
}

/** Habillage premium commun : tuile d'icône, titre display, badge, action. */
export function ChartCard({
  icon: Icon,
  tile,
  title,
  subtitle,
  badge,
  action,
  children,
  className,
}: {
  icon: typeof Wallet;
  tile: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('min-w-0 overflow-hidden rounded-2xl border-zinc-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.05)]', className)}>
      <div className="flex items-start gap-3 p-4 sm:p-5 sm:pb-4">
        <span aria-hidden className={cn('grid size-10 shrink-0 place-items-center rounded-xl shadow-sm', tile)}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[15px] font-bold tracking-tight sm:text-base">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-xs text-zinc-500 sm:text-[13px]">{subtitle}</p>}
        </div>
        {badge && <span className="hidden shrink-0 min-[480px]:block">{badge}</span>}
        {action && <span className="shrink-0">{action}</span>}
      </div>
      {badge && (
        <div className="px-4 pb-2 min-[480px]:hidden">
          {badge}
        </div>
      )}
      {children}
    </Card>
  );
}

/** Mini-courbe pour les KPI : sans axes, dégradé, ids uniques. */
export function Sparkline({
  values,
  stroke,
  height = 40,
}: {
  values: number[];
  stroke: string;
  height?: number;
}) {
  const id = useId();
  const data = useMemo(() => values.map((v, i) => ({ i, v })), [values]);
  if (data.length < 2 || data.every((d) => d.v === 0)) {
    return (
      <div aria-hidden className="flex items-end gap-1" style={{ height }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="w-full rounded-full bg-zinc-100" style={{ height: `${18 + ((i * 37) % 40)}%` }} />
        ))}
      </div>
    );
  }
  return (
    <div aria-hidden className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Revenus par jour : aire dégradée, grille légère, tooltip montant complet. */
export function RevenueChart({
  data,
  title,
  subtitle,
  delta = null,
  action,
}: {
  data: DayPoint[];
  title: string;
  subtitle?: string;
  delta?: number | null;
  action?: React.ReactNode;
}) {
  const { total, hasData } = useMemo(() => {
    const total = data.reduce((s, d) => s + d.value, 0);
    return { total, hasData: total > 0 };
  }, [data]);

  return (
    <ChartCard
      icon={BarChart3}
      tile="bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-brand-600/30"
      title={title}
      subtitle={subtitle}
      action={action}
      badge={
        <span className="flex items-center gap-1.5">
          <DeltaBadge delta={hasData ? delta : null} />
          <span className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold tabular-nums text-white sm:text-sm">
            {formatAr(total)}
          </span>
        </span>
      }
    >
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
                  <stop offset="0%" stopColor={BRAND} stopOpacity={0.38} />
                  <stop offset="100%" stopColor={BRAND} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f4f4f5" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                tickMargin={8}
              />
              <YAxis
                width={56}
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
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
                strokeWidth={3}
                fill="url(#revenueFill)"
                activeDot={{ r: 4.5, fill: BRAND, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/** Top événements : barres horizontales classées, valeur + détail au survol. */
export function TopEventsChart({
  rows,
  title,
  subtitle,
  action,
}: {
  rows: BarRow[];
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
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
    <ChartCard
      icon={Trophy}
      tile="bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/30"
      title={title}
      subtitle={subtitle}
      action={action}
      className="flex flex-col"
      badge={
        chartData.length > 0 ? (
          <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold tabular-nums text-amber-800 sm:text-sm">
            Top {chartData.length}
          </span>
        ) : undefined
      }
    >
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
              <CartesianGrid horizontal={false} stroke="#f4f4f5" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={122}
                tick={{ fontSize: 12, fill: '#3f3f46', fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: '#fafafa' }} />
              <Bar dataKey="value" name="Revenus" radius={[5, 10, 10, 5]} maxBarSize={22}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? BRAND : INK} fillOpacity={i === 0 ? 1 : 0.32 + (0.5 * (chartData.length - i)) / chartData.length} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/** Paiements par méthode : donut + légende, total au centre. */
export function PaymentMethodsChart({
  rows,
  title,
  subtitle,
  action,
}: {
  rows: BarRow[];
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const chartData = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.value - a.value)
        .map((r, i) => ({ ...r, fill: METHOD_COLORS[r.label] ?? DONUT_COLORS[i % DONUT_COLORS.length] })),
    [rows],
  );
  const total = chartData.reduce((s, r) => s + r.value, 0);

  return (
    <ChartCard
      icon={Wallet}
      tile="bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sky-600/30"
      title={title}
      subtitle={subtitle}
      action={action}
      badge={
        total > 0 ? (
          <span className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold tabular-nums text-white sm:text-sm">
            {total} paiement{total > 1 ? 's' : ''}
          </span>
        ) : undefined
      }
    >
      {chartData.length === 0 ? (
        <EmptyChart
          icon={Wallet}
          title="Aucun paiement enregistré."
          hint="La répartition par méthode apparaîtra ici."
        />
      ) : (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
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
                  innerRadius="66%"
                  outerRadius="94%"
                  paddingAngle={4}
                  cornerRadius={8}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {chartData.map((r) => (
                    <Cell key={r.label} fill={r.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <p className="text-center">
                <span className="block font-display text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{total}</span>
                <span className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  paiement{total > 1 ? 's' : ''}
                </span>
              </p>
            </div>
          </div>
          <ul className="mt-2 space-y-1">
            {chartData.map((r) => (
              <li
                key={r.label}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition hover:bg-zinc-50"
              >
                <span aria-hidden className="size-2.5 shrink-0 rounded-full ring-4 ring-zinc-50" style={{ background: r.fill }} />
                <span className="min-w-0 flex-1 truncate font-medium">{r.label}</span>
                <span className="shrink-0 tabular-nums text-zinc-500">{r.display}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}

const ORDERS_TOTAL = '#71717a';
const ORDERS_PAID = '#10b981';

const STATUS_COLORS: Record<string, string> = {
  'Payées': '#10b981',
  'En attente': '#f59e0b',
  'En cours': '#0ea5e9',
  'Échouées': '#dc2626',
  'Annulées': '#71717a',
  'Expirées': '#f97316',
};

/** Couleurs officielles des opérateurs + neutres carte / espèces. */
const METHOD_COLORS: Record<string, string> = {
  'YAS': '#00377D',
  'Orange Money': '#FF7900',
  'Airtel Money': '#E40000',
  'Carte': '#0EA5E9',
  'Espèces': '#10B981',
};

function OrdersTrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: OrderDayPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (!p) return null;
  return (
    <TooltipShell label={p.fullLabel}>
      <p className="flex items-center gap-1.5 text-sm tabular-nums">
        <span aria-hidden className="size-2 rounded-full" style={{ background: ORDERS_PAID }} />
        <span className="font-bold">{p.paid}</span>
        <span className="text-zinc-400">payée{p.paid > 1 ? 's' : ''}</span>
      </p>
      <p className="flex items-center gap-1.5 text-sm tabular-nums">
        <span aria-hidden className="size-2 rounded-full" style={{ background: ORDERS_TOTAL }} />
        <span className="font-bold">{p.total}</span>
        <span className="text-zinc-400">au total</span>
      </p>
    </TooltipShell>
  );
}

/** Commandes par jour : volume total vs payées, double aire, légende intégrée. */
export function OrdersTrendChart({
  data,
  title,
  subtitle,
  delta = null,
  action,
}: {
  data: OrderDayPoint[];
  title: string;
  subtitle?: string;
  delta?: number | null;
  action?: React.ReactNode;
}) {
  const { total, paid, hasData } = useMemo(() => {
    const total = data.reduce((s, d) => s + d.total, 0);
    const paid = data.reduce((s, d) => s + d.paid, 0);
    return { total, paid, hasData: total > 0 };
  }, [data]);
  const conversion = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <ChartCard
      icon={ShoppingCart}
      tile="bg-zinc-900 text-white shadow-sm"
      title={title}
      subtitle={subtitle}
      action={action}
      badge={
        <span className="flex items-center gap-1.5">
          <DeltaBadge delta={hasData ? delta : null} />
          <span className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold tabular-nums text-white sm:text-sm">
            {total} cmd · {conversion} %
          </span>
        </span>
      }
    >
      <div className="flex flex-wrap items-center gap-3 px-4 pb-1 sm:px-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <span aria-hidden className="size-2 rounded-full" style={{ background: ORDERS_PAID }} />
          Payées
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
          <span aria-hidden className="size-2 rounded-full" style={{ background: ORDERS_TOTAL }} />
          Total
        </span>
      </div>
      {!hasData ? (
        <EmptyChart
          icon={ShoppingCart}
          title="Aucune commande sur la période."
          hint="Les commandes créées alimenteront cette courbe."
        />
      ) : (
        <div
          className="h-64 w-full px-1 pb-2 sm:h-72"
          role="img"
          aria-label={`${title} : ${total} commandes dont ${paid} payées`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="ordersPaidFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ORDERS_PAID} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={ORDERS_PAID} stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="ordersTotalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ORDERS_TOTAL} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={ORDERS_TOTAL} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f4f4f5" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                tickMargin={8}
              />
              <YAxis
                width={36}
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<OrdersTrendTooltip />} cursor={{ stroke: '#d4d4d8', strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="total"
                name="Total"
                stroke={ORDERS_TOTAL}
                strokeWidth={2}
                strokeDasharray="5 3"
                fill="url(#ordersTotalFill)"
                activeDot={{ r: 3.5, fill: ORDERS_TOTAL, stroke: '#fff', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="paid"
                name="Payées"
                stroke={ORDERS_PAID}
                strokeWidth={3}
                fill="url(#ordersPaidFill)"
                activeDot={{ r: 4.5, fill: ORDERS_PAID, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/** Commandes par statut : donut coloré par statut + légende avec parts. */
export function OrdersStatusChart({
  rows,
  title,
  subtitle,
  action,
}: {
  rows: BarRow[];
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const chartData = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.value - a.value)
        .map((r, i) => ({
          ...r,
          fill: STATUS_COLORS[r.label] ?? DONUT_COLORS[i % DONUT_COLORS.length],
        })),
    [rows],
  );
  const total = chartData.reduce((s, r) => s + r.value, 0);
  const paid = chartData.find((r) => r.label === 'Payées')?.value ?? 0;
  const conversion = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <ChartCard
      icon={ShoppingCart}
      tile="bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-600/30"
      title={title}
      subtitle={subtitle}
      action={action}
      badge={
        total > 0 ? (
          <span className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold tabular-nums text-white sm:text-sm">
            {conversion} % conv.
          </span>
        ) : undefined
      }
    >
      {chartData.length === 0 ? (
        <EmptyChart
          icon={ShoppingCart}
          title="Aucune commande enregistrée."
          hint="La répartition par statut apparaîtra ici."
        />
      ) : (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div
            className="relative mx-auto h-52 w-full max-w-72 sm:h-56"
            role="img"
            aria-label={`${title} : ${total} commande${total > 1 ? 's' : ''}, ${conversion} % payées`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<DonutTooltip />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="66%"
                  outerRadius="94%"
                  paddingAngle={4}
                  cornerRadius={8}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {chartData.map((r) => (
                    <Cell key={r.label} fill={r.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <p className="text-center">
                <span className="block font-display text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{total}</span>
                <span className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  commande{total > 1 ? 's' : ''}
                </span>
              </p>
            </div>
          </div>
          <ul className="mt-2 space-y-1">
            {chartData.map((r) => (
              <li
                key={r.label}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition hover:bg-zinc-50"
              >
                <span aria-hidden className="size-2.5 shrink-0 rounded-full ring-4 ring-zinc-50" style={{ background: r.fill }} />
                <span className="min-w-0 flex-1 truncate font-medium">{r.label}</span>
                <span className="shrink-0 tabular-nums text-zinc-500">{r.display}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
