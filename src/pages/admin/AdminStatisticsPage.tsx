import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Filter,
  Printer,
  Receipt,
  RotateCw,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Trophy,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useAdminOrderStats, useAdminStats } from '../../features/admin/hooks';
import {
  OrdersStatusChart,
  OrdersTrendChart,
  PaymentMethodsChart,
  RevenueChart,
  TopEventsChart,
} from '../../components/admin/Charts';
import { KpiCard } from '../../components/admin/StatsCard';
import { AdminStatisticsSkeleton } from '../../components/admin/AdminSkeletons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/States';
import { cn, formatAr } from '../../lib/utils';

const RANGES = [
  { days: 7, label: '7 j' },
  { days: 30, label: '30 j' },
  { days: 90, label: '90 j' },
  { days: 365, label: '1 an' },
];

const TABS = [
  { id: 'stats-overview', label: "Vue d'ensemble" },
  { id: 'stats-orders', label: 'Commandes' },
  { id: 'stats-events', label: 'Événements & paiements' },
];

/** Télécharge un CSV UTF-8 (compatible Excel) depuis des lignes déjà formatées. */
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = ['\uFEFF' + headers.map(escape).join(';'), ...rows.map((r) => r.map(escape).join(';'))].join(
    '\n',
  );
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatAvgPerDay(total: number, days: number): string {
  if (days <= 0) return '0/j';
  const v = total / days;
  return `${v >= 10 ? Math.round(v) : Math.round(v * 10) / 10}/j`;
}

/** Variation 2ᵉ moitié vs 1ʳᵉ moitié de période (null = pas de base). */
function halfDelta(values: number[]): number | null {
  if (values.length < 4) return null;
  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid).reduce((s, v) => s + v, 0);
  const second = values.slice(mid).reduce((s, v) => s + v, 0);
  if (first === 0) return second > 0 ? 100 : null;
  return ((second - first) / first) * 100;
}

function SectionHead({
  eyebrow,
  title,
  desc,
  actions,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">
          <span aria-hidden className="h-1.5 w-6 rounded-full bg-gradient-to-r from-brand-600 to-gold-400" />
          {eyebrow}
        </p>
        <h2 className="mt-1.5 font-display text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
        <p className="mt-0.5 truncate text-xs text-zinc-500 sm:text-sm">{desc}</p>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

export function AdminStatisticsPage() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('stats-overview');
  const [showAllDays, setShowAllDays] = useState(false);
  const stats = useAdminStats(days);
  const orders = useAdminOrderStats(days);

  const data = stats.data;
  const orderData = orders.data;
  const isPending = stats.isPending || orders.isPending;
  const isError = stats.isError || orders.isError;
  const isFetching = stats.isFetching || orders.isFetching;
  const dataUpdatedAt = Math.max(stats.dataUpdatedAt ?? 0, orders.dataUpdatedAt ?? 0);
  const refetchAll = () => {
    stats.refetch();
    orders.refetch();
  };
  const go = (id: string) => {
    setTab(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const summary = useMemo(() => {
    if (!data) return null;
    const revenue = data.dailyRevenue.reduce((s, d) => s + d.value, 0);
    const payments = data.paymentsByMethod.reduce((s, r) => s + r.value, 0);
    const top = [...data.ticketsByEvent].sort((a, b) => b.value - a.value)[0];
    const bestDay = [...data.dailyRevenue].sort((a, b) => b.value - a.value)[0];
    const activeDays = data.dailyRevenue.filter((d) => d.value > 0).length;
    const avgBasket = payments > 0 ? Math.round(revenue / payments) : 0;
    const avgPerDay = days > 0 ? Math.round(revenue / days) : 0;
    const topShare = revenue > 0 && top ? Math.round((top.value / revenue) * 100) : 0;
    const topMethod = [...data.paymentsByMethod].sort((a, b) => b.value - a.value)[0];
    const topMethodShare = payments > 0 && topMethod ? Math.round((topMethod.value / payments) * 100) : 0;
    const revenueDelta = halfDelta(data.dailyRevenue.map((d) => d.value));
    return {
      revenue,
      payments,
      top,
      bestDay,
      activeDays,
      inactiveDays: days - activeDays,
      avgBasket,
      avgPerDay,
      topShare,
      topMethod,
      topMethodShare,
      revenueDelta,
      revenueSpark: data.dailyRevenue.map((d) => d.value),
    };
  }, [data, days]);

  const orderSummary = useMemo(() => {
    if (!orderData) return null;
    const byLabel = new Map(orderData.ordersByStatus.map((r) => [r.label, r.value]));
    const paid = byLabel.get('Payées') ?? 0;
    const pending = (byLabel.get('En attente') ?? 0) + (byLabel.get('En cours') ?? 0);
    const lost =
      (byLabel.get('Échouées') ?? 0) + (byLabel.get('Annulées') ?? 0) + (byLabel.get('Expirées') ?? 0);
    const total = orderData.ordersByStatus.reduce((s, r) => s + r.value, 0);
    const conversion = total > 0 ? Math.round((paid / total) * 100) : 0;
    const pendingShare = total > 0 ? Math.round((pending / total) * 100) : 0;
    const lostShare = total > 0 ? Math.round((lost / total) * 100) : 0;
    const bestDay = [...orderData.dailyOrders].sort((a, b) => b.total - a.total)[0];
    const ordersDelta = halfDelta(orderData.dailyOrders.map((d) => d.total));
    const paidDelta = halfDelta(orderData.dailyOrders.map((d) => d.paid));
    return {
      total,
      paid,
      pending,
      lost,
      conversion,
      pendingShare,
      lostShare,
      bestDay,
      ordersDelta,
      paidDelta,
      totalSpark: orderData.dailyOrders.map((d) => d.total),
      paidSpark: orderData.dailyOrders.map((d) => d.paid),
    };
  }, [orderData]);

  const topDays = useMemo(() => {
    if (!data) return [];
    return [...data.dailyRevenue].sort((a, b) => b.value - a.value);
  }, [data]);

  const visibleDays = showAllDays ? topDays : topDays.slice(0, 5);

  const ranking = useMemo(() => {
    if (!data || !summary || summary.revenue === 0) return [];
    const max = Math.max(...data.ticketsByEvent.map((r) => r.value), 1);
    return [...data.ticketsByEvent]
      .sort((a, b) => b.value - a.value)
      .map((r, i) => ({
        ...r,
        rank: i + 1,
        share: Math.round((r.value / summary.revenue) * 100),
        width: Math.max(4, Math.round((r.value / max) * 100)),
      }));
  }, [data, summary]);

  const insights = useMemo(() => {
    if (!summary) return [];
    if (summary.revenue === 0) {
      return [
        {
          icon: Sparkles,
          title: 'En attente des premières ventes',
          text: 'Les commandes payées alimenteront revenus, classements et méthodes de paiement.',
        },
      ];
    }
    const list = [];
    if (summary.bestDay) {
      list.push({
        icon: CalendarCheck,
        title: `Meilleur jour : ${summary.bestDay.fullLabel}`,
        text: `${formatAr(summary.bestDay.value)} encaissés · moyenne ${formatAr(summary.avgPerDay)}/jour.`,
      });
    }
    if (summary.top) {
      list.push({
        icon: Trophy,
        title: `${summary.top.label} mène la danse`,
        text: `${summary.topShare} % des revenus sur la période · ${summary.top.display}.`,
      });
    }
    if (summary.topMethod) {
      list.push({
        icon: Wallet,
        title: `${summary.topMethod.label} plébiscité`,
        text: `${summary.topMethodShare} % des paiements · ${summary.topMethod.display}.`,
      });
    }
    list.push({
      icon: TrendingUp,
      title: `${summary.activeDays}/${days} jours actifs`,
      text:
        summary.inactiveDays > 0
          ? `${summary.inactiveDays} jour${summary.inactiveDays > 1 ? 's' : ''} sans vente · panier moyen ${formatAr(summary.avgBasket)}.`
          : `Ventes chaque jour · panier moyen ${formatAr(summary.avgBasket)}.`,
    });
    return list;
  }, [summary, days]);

  if (isPending) return <AdminStatisticsSkeleton />;
  if (isError || !data || !summary || !orderData || !orderSummary) {
    return (
      <ErrorState description="Impossible de calculer les statistiques." onRetry={refetchAll} />
    );
  }

  const updatedAt =
    dataUpdatedAt > 0
      ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : null;

  const handleExportDaily = () =>
    downloadCsv(
      `revenus-journaliers-${days}j.csv`,
      ['Date', 'Revenus_Ar'],
      data.dailyRevenue.map((d) => [d.fullLabel, d.value]),
    );

  const handleExportEvents = () =>
    downloadCsv(
      `top-evenements-${days}j.csv`,
      ['Evenement', 'Revenus_Ar', 'Detail'],
      [...data.ticketsByEvent].sort((a, b) => b.value - a.value).map((r) => [r.label, r.value, r.display]),
    );

  const handleExportMethods = () =>
    downloadCsv(
      `paiements-par-methode-${days}j.csv`,
      ['Methode', 'Paiements', 'Detail'],
      [...data.paymentsByMethod].sort((a, b) => b.value - a.value).map((r) => [r.label, r.value, r.display]),
    );

  const handleExportOrdersDaily = () =>
    downloadCsv(
      `commandes-journalieres-${days}j.csv`,
      ['Date', 'Commandes_Total', 'Commandes_Payees'],
      orderData.dailyOrders.map((d) => [d.fullLabel, d.total, d.paid]),
    );

  const handleExportOrdersStatus = () =>
    downloadCsv(
      `commandes-par-statut-${days}j.csv`,
      ['Statut', 'Commandes', 'Detail'],
      [...orderData.ordersByStatus]
        .sort((a, b) => b.value - a.value)
        .map((r) => [r.label, r.value, r.display]),
    );

  const funnel = [
    {
      label: 'Payées',
      count: orderSummary.paid,
      share: orderSummary.conversion,
      icon: CheckCircle2,
      box: 'border-emerald-200/80 bg-gradient-to-b from-emerald-50/80 to-white',
      tile: 'bg-emerald-500 text-white shadow-emerald-500/30',
      bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    },
    {
      label: 'En attente',
      count: orderSummary.pending,
      share: orderSummary.pendingShare,
      icon: Clock,
      box: 'border-amber-200/80 bg-gradient-to-b from-amber-50/80 to-white',
      tile: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/30',
      bar: 'bg-gradient-to-r from-amber-400 to-orange-400',
    },
    {
      label: 'Non abouties',
      count: orderSummary.lost,
      share: orderSummary.lostShare,
      icon: XCircle,
      box: 'border-red-200/70 bg-gradient-to-b from-red-50/70 to-white',
      tile: 'bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-brand-600/30',
      bar: 'bg-gradient-to-r from-brand-600 to-brand-400',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ---------- En-tête ---------- */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">
            <span aria-hidden className="h-1.5 w-6 rounded-full bg-gradient-to-r from-brand-600 to-gold-400" />
            Pilotage · {days} jours
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight sm:text-[1.7rem]">
            Statistiques
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Revenus, commandes, événements et paiements.
          </p>
          {updatedAt && (
            <p aria-live="polite" className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
              <span
                aria-hidden
                className={cn('size-1.5 rounded-full', isFetching ? 'animate-pulse bg-amber-500' : 'bg-emerald-500')}
              />
              {isFetching ? 'Actualisation…' : `Mis à jour à ${updatedAt}`}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={refetchAll}
              disabled={isFetching}
              className="flex-1 rounded-xl sm:flex-none"
            >
              <RotateCw className={cn('size-4', isFetching && 'animate-spin')} aria-hidden />
              Actualiser
            </Button>
            <Button size="sm" onClick={handleExportDaily} className="flex-1 rounded-xl sm:flex-none">
              <Download className="size-4" aria-hidden /> Exporter
            </Button>
            <button
              type="button"
              onClick={() => window.print()}
              aria-label="Imprimer la page"
              className="hidden size-8 shrink-0 place-items-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:border-zinc-900 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 sm:grid"
            >
              <Printer className="size-4" aria-hidden />
            </button>
          </div>
          <div
            role="group"
            aria-label="Période"
            className="flex max-w-full gap-1 self-start overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-sm sm:self-auto"
          >
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setDays(r.days)}
                aria-pressed={days === r.days}
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900',
                  days === r.days ? 'bg-zinc-900 text-white shadow' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {isFetching && !isPending && (
        <div aria-hidden className="h-1 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-zinc-900" />
        </div>
      )}

      {/* ---------- Navigation par onglets ---------- */}
      <div className="sticky top-16 z-20 -mx-1 bg-zinc-100/85 px-1 backdrop-blur">
        <div
          role="tablist"
          aria-label="Sections des statistiques"
          className="no-scrollbar flex gap-5 overflow-x-auto border-b border-zinc-200 px-1"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              type="button"
              onClick={() => go(t.id)}
              className={cn(
                'relative shrink-0 whitespace-nowrap px-1 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900',
                tab === t.id ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-700',
              )}
            >
              {t.label}
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-brand-600 to-gold-400 transition-opacity',
                  tab === t.id ? 'opacity-100' : 'opacity-0',
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className={cn(isFetching && 'pointer-events-none opacity-70 transition')}>
        {/* ---------- Vue d'ensemble ---------- */}
        <section id="stats-overview" aria-label="Vue d'ensemble" className="rise scroll-mt-36 space-y-3 sm:space-y-4">
          <SectionHead
            eyebrow="Vue d'ensemble"
            title="Le pouls de la billetterie"
            desc={`${summary.payments} commandes payées · ${summary.activeDays}/${days} jours actifs`}
          />
          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            <KpiCard
              label={`Revenus · ${days} j`}
              value={formatAr(summary.revenue)}
              hint={`moy ${formatAr(summary.avgPerDay)}/j · ${summary.payments} cmd`}
              icon={Banknote}
              tone="success"
              delta={summary.revenue > 0 ? summary.revenueDelta : null}
              spark={summary.revenueSpark}
            />
            <KpiCard
              label="Panier moyen"
              value={formatAr(summary.avgBasket)}
              hint={`${summary.payments} paiement${summary.payments > 1 ? 's' : ''} au total`}
              icon={Receipt}
              tone="brand"
            />
            <KpiCard
              label="Top événement"
              value={summary.top?.label ?? '—'}
              hint={summary.top ? `${summary.topShare} % du total · ${summary.top.display}` : 'aucune vente'}
              icon={Trophy}
              tone="warning"
            />
            <KpiCard
              label="Meilleur jour"
              value={summary.bestDay?.fullLabel ?? '—'}
              hint={summary.bestDay ? formatAr(summary.bestDay.value) : 'aucune vente'}
              icon={CalendarCheck}
              tone="info"
            />
          </div>

          <RevenueChart
            data={data.dailyRevenue}
            title="Revenus par jour"
            subtitle={`${days} derniers jours · commandes payées`}
            delta={summary.revenue > 0 ? summary.revenueDelta : null}
            action={
              <button
                type="button"
                onClick={handleExportDaily}
                aria-label="Exporter les revenus journaliers"
                className="grid size-9 place-items-center rounded-full border border-zinc-200 text-zinc-500 transition hover:border-zinc-900 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                <Download className="size-4" aria-hidden />
              </button>
            }
          />

          <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-5">
            <Card className="min-w-0 rounded-2xl border-amber-200/70 bg-gradient-to-b from-amber-50/70 to-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:col-span-2">
              <CardHeader className="p-4 sm:p-5 sm:pb-3">
                <CardTitle className="flex items-center gap-2 font-display text-[15px] sm:text-base">
                  <span aria-hidden className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30">
                    <Sparkles className="size-4" aria-hidden />
                  </span>
                  À retenir
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs sm:text-[13px]">
                  Lecture automatique sur {days} jours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0 sm:p-5 sm:pt-0">
                {insights.map((ins) => (
                  <div
                    key={ins.title}
                    className="flex items-start gap-3 rounded-xl border border-amber-100 bg-white/80 px-3 py-2.5 shadow-sm"
                  >
                    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-100">
                      <ins.icon className="size-4 text-amber-700" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-zinc-900 sm:text-sm" title={ins.title}>
                        {ins.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{ins.text}</span>
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="min-w-0 rounded-2xl border-zinc-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:col-span-3">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 sm:p-5 sm:pb-3">
                <div className="min-w-0">
                  <CardTitle className="truncate font-display text-[15px] sm:text-base">Détail journalier</CardTitle>
                  <CardDescription className="mt-0.5 truncate text-xs sm:text-[13px]">
                    Jours classés par revenus · {summary.activeDays} jour{summary.activeDays > 1 ? 's' : ''} actifs.
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={handleExportDaily}
                  aria-label="Exporter le détail journalier"
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-zinc-200 text-zinc-500 transition hover:border-zinc-900 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                >
                  <Download className="size-4" aria-hidden />
                </button>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                {topDays.length === 0 || summary.revenue === 0 ? (
                  <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
                    Aucune vente sur la période.
                  </p>
                ) : (
                  <>
                    <ul className="divide-y divide-zinc-100">
                      {visibleDays.map((d, i) => {
                        const max = Math.max(...topDays.map((x) => x.value), 1);
                        return (
                          <li key={d.fullLabel + d.label} className="flex items-center gap-3 py-2.5">
                            <span
                              className={cn(
                                'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums',
                                i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-zinc-100 text-zinc-500',
                              )}
                            >
                              {i + 1}
                            </span>
                            <span className="w-16 shrink-0 truncate text-xs font-medium text-zinc-500 sm:text-[13px]">
                              {d.label}
                            </span>
                            <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-100">
                              <span
                                className={cn(
                                  'block h-full rounded-full',
                                  i === 0 ? 'bg-gradient-to-r from-brand-600 to-brand-400' : 'bg-zinc-900',
                                )}
                                style={{ width: `${Math.max(3, Math.round((d.value / max) * 100))}%` }}
                              />
                            </span>
                            <span className="w-24 shrink-0 text-right text-[13px] font-bold tabular-nums sm:text-sm">
                              {formatAr(d.value)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {topDays.length > 5 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowAllDays((v) => !v)}
                        className="mt-3 w-full rounded-xl"
                      >
                        {showAllDays ? 'Voir moins' : `Voir les ${topDays.length} jours`}
                        <ChevronDown className={cn('size-4 transition', showAllDays && 'rotate-180')} aria-hidden />
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ---------- Commandes ---------- */}
        <section id="stats-orders" aria-label="Statistiques des commandes" className="rise mt-6 scroll-mt-36 space-y-3 sm:mt-8 sm:space-y-4">
          <SectionHead
            eyebrow="Commandes"
            title="Volume & conversion"
            desc={`Total vs payées · tunnel sur ${days} jours`}
            actions={
              <>
                <Button size="sm" variant="secondary" onClick={handleExportOrdersDaily} className="rounded-xl">
                  <Download className="size-4" aria-hidden /> Jours (CSV)
                </Button>
                <Button size="sm" variant="ghost" onClick={handleExportOrdersStatus} className="rounded-xl">
                  <Download className="size-4" aria-hidden /> Statuts
                </Button>
              </>
            }
          />

          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            <KpiCard
              label={`Commandes · ${days} j`}
              value={String(orderSummary.total)}
              hint={`moy ${formatAvgPerDay(orderSummary.total, days)} · tous statuts`}
              icon={ShoppingCart}
              tone="neutral"
              delta={orderSummary.total > 0 ? orderSummary.ordersDelta : null}
              spark={orderSummary.totalSpark}
            />
            <KpiCard
              label="Taux de conversion"
              value={`${orderSummary.conversion} %`}
              hint={`${orderSummary.paid} payée${orderSummary.paid > 1 ? 's' : ''} sur ${orderSummary.total}`}
              icon={CheckCircle2}
              tone="success"
              delta={orderSummary.total > 0 ? orderSummary.paidDelta : null}
              spark={orderSummary.paidSpark}
            />
            <KpiCard
              label="En attente"
              value={String(orderSummary.pending)}
              hint={orderSummary.pending > 0 ? `${orderSummary.pendingShare} % à traiter` : 'file traitée, bravo'}
              icon={Clock}
              tone="warning"
            />
            <KpiCard
              label="Non abouties"
              value={String(orderSummary.lost)}
              hint={orderSummary.lost > 0 ? `${orderSummary.lostShare} % perdues` : 'aucune perte sur la période'}
              icon={XCircle}
              tone="brand"
            />
          </div>

          <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-3">
              <OrdersTrendChart
                data={orderData.dailyOrders}
                title="Commandes par jour"
                subtitle={`${days} derniers jours · total vs payées`}
                delta={orderSummary.total > 0 ? orderSummary.ordersDelta : null}
                action={
                  <button
                    type="button"
                    onClick={handleExportOrdersDaily}
                    aria-label="Exporter les commandes journalières"
                    className="grid size-9 place-items-center rounded-full border border-zinc-200 text-zinc-500 transition hover:border-zinc-900 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                  >
                    <Download className="size-4" aria-hidden />
                  </button>
                }
              />
            </div>
            <div className="min-w-0 lg:col-span-2">
              <OrdersStatusChart
                rows={orderData.ordersByStatus}
                title="Commandes par statut"
                subtitle="Payées, en attente, non abouties"
                action={
                  <button
                    type="button"
                    onClick={handleExportOrdersStatus}
                    aria-label="Exporter les commandes par statut"
                    className="grid size-9 place-items-center rounded-full border border-zinc-200 text-zinc-500 transition hover:border-zinc-900 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                  >
                    <Download className="size-4" aria-hidden />
                  </button>
                }
              />
            </div>
          </div>

          <Card className="min-w-0 overflow-hidden rounded-2xl border-zinc-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 sm:p-5 sm:pb-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 truncate font-display text-[15px] sm:text-base">
                  <span aria-hidden className="grid size-8 place-items-center rounded-xl bg-zinc-900 text-white">
                    <Filter className="size-4" aria-hidden />
                  </span>
                  Tunnel de conversion
                </CardTitle>
                <CardDescription className="mt-1 truncate text-xs sm:text-[13px]">
                  {orderSummary.total > 0
                    ? `${orderSummary.paid} payées · ${orderSummary.pending} en attente · ${orderSummary.lost} perdues`
                    : 'Aucune commande sur la période.'}
                </CardDescription>
              </div>
              {orderSummary.pending > 0 && (
                <Link
                  to="/admin/orders"
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-zinc-900 px-3 py-2 text-[13px] font-semibold text-white shadow transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 sm:text-sm"
                >
                  Traiter <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              )}
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
              {orderSummary.total === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
                  Le tunnel apparaîtra dès la première commande.
                </p>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                    {funnel.map((s) => (
                      <div key={s.label} className={cn('rounded-2xl border p-4', s.box)}>
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                          <span aria-hidden className={cn('grid size-7 place-items-center rounded-lg shadow-sm', s.tile)}>
                            <s.icon className="size-4" aria-hidden />
                          </span>
                          {s.label}
                        </p>
                        <p className="mt-2 font-display text-3xl font-bold tabular-nums tracking-tight">
                          {s.count}
                        </p>
                        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white shadow-inner">
                          <div className={cn('h-full rounded-full transition-all', s.bar)} style={{ width: `${s.share}%` }} />
                        </div>
                        <p className="mt-1.5 text-xs font-bold tabular-nums text-zinc-600">{s.share} %</p>
                      </div>
                    ))}
                  </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-500 sm:text-[13px]">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <TrendingUp className="size-4 shrink-0 text-emerald-600" aria-hidden />
                        <span className="truncate">
                          {orderSummary.bestDay
                            ? `Pic : ${orderSummary.bestDay.fullLabel} (${orderSummary.bestDay.total} cmd)`
                            : 'Aucun pic détecté.'}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-zinc-900">
                        {formatAvgPerDay(orderSummary.total, days)} en moyenne
                      </span>
                    </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ---------- Événements & paiements ---------- */}
        <section id="stats-events" aria-label="Événements et paiements" className="rise mt-6 scroll-mt-36 space-y-3 sm:mt-8 sm:space-y-4">
          <SectionHead
            eyebrow="Événements & paiements"
            title="Stars & habitudes de paiement"
            desc="Classés par revenus · méthodes plébiscitées"
            actions={
              <Button size="sm" variant="secondary" onClick={handleExportEvents} className="rounded-xl">
                <Download className="size-4" aria-hidden /> Classement (CSV)
              </Button>
            }
          />
          <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-2">
            <TopEventsChart
              title="Top événements"
              subtitle="Classés par revenus"
              rows={data.ticketsByEvent}
            />
            <PaymentMethodsChart
              title="Paiements par méthode"
              subtitle="Répartition des transactions"
              rows={data.paymentsByMethod}
              action={
                <button
                  type="button"
                  onClick={handleExportMethods}
                  aria-label="Exporter les paiements par méthode"
                  className="grid size-9 place-items-center rounded-full border border-zinc-200 text-zinc-500 transition hover:border-zinc-900 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                >
                  <Download className="size-4" aria-hidden />
                </button>
              }
            />
          </div>

          <Card className="min-w-0 overflow-hidden rounded-2xl border-zinc-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 sm:p-5 sm:pb-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 truncate font-display text-[15px] sm:text-base">
                  <span aria-hidden className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-sm shadow-brand-600/30">
                    <ShoppingBag className="size-4" aria-hidden />
                  </span>
                  Classement détaillé
                </CardTitle>
                <CardDescription className="mt-1 truncate text-xs sm:text-[13px]">
                  Part de chaque événement dans le chiffre d’affaires.
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={handleExportEvents}
                aria-label="Exporter le classement"
                className="grid size-9 shrink-0 place-items-center rounded-full border border-zinc-200 text-zinc-500 transition hover:border-zinc-900 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                <Download className="size-4" aria-hidden />
              </button>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
              {ranking.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
                  Aucun événement classé sur la période.
                </p>
              ) : (
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-wider text-zinc-400">
                        <th scope="col" className="whitespace-nowrap px-2 py-2 font-bold">#</th>
                        <th scope="col" className="px-2 py-2 font-bold">Événement</th>
                        <th scope="col" className="px-2 py-2 font-bold">Revenus</th>
                        <th scope="col" className="hidden px-2 py-2 font-bold sm:table-cell">Détail</th>
                        <th scope="col" className="px-2 py-2 text-right font-bold">Part</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {ranking.map((r) => (
                        <tr key={r.label} className="transition hover:bg-zinc-50/80">
                          <td className="px-2 py-2.5">
                            <span
                              className={cn(
                                'grid size-7 place-items-center rounded-full text-xs font-bold tabular-nums',
                                r.rank === 1
                                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/40'
                                  : r.rank <= 3
                                    ? 'bg-zinc-900 text-white'
                                    : 'bg-zinc-100 text-zinc-500',
                              )}
                            >
                              {r.rank}
                            </span>
                          </td>
                          <td className="max-w-56 px-2 py-2.5">
                            <span className="block truncate font-semibold" title={r.label}>
                              {r.label}
                            </span>
                            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-zinc-100">
                              <span
                                className={cn(
                                  'block h-full rounded-full',
                                  r.rank === 1 ? 'bg-gradient-to-r from-brand-600 to-gold-400' : 'bg-zinc-900',
                                )}
                                style={{ width: `${r.width}%` }}
                              />
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 font-bold tabular-nums">
                            {formatAr(r.value)}
                          </td>
                          <td className="hidden max-w-48 truncate px-2 py-2.5 text-xs text-zinc-500 sm:table-cell" title={r.display}>
                            {r.display}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 text-right">
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                                r.rank === 1 ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600',
                              )}
                            >
                              {r.share} %
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {data.paymentsByMethod.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-500 sm:text-[13px]">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Wallet className="size-4 shrink-0 text-zinc-400" aria-hidden />
                    <span className="truncate">
                      {summary.topMethod?.label} : {summary.topMethodShare} % des paiements
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleExportMethods}
                    className="inline-flex shrink-0 items-center gap-1 font-semibold text-zinc-700 transition hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                  >
                    <Download className="size-3.5" aria-hidden /> Méthodes (CSV)
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="pb-2 text-center text-xs text-zinc-400">
            Revenus calculés sur les commandes payées · commandes sur tous les statuts · CSV compatible
            Excel (séparateur « ; »).
          </p>
        </section>
      </div>
    </div>
  );
}
