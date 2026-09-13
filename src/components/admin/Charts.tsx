import { Card } from '../ui/Card';
import { formatAr } from '../../lib/utils';

export interface DayPoint {
  label: string;
  fullLabel: string;
  value: number;
}

/** Barres de revenus par jour (SVG pur, sans dépendance). */
export function RevenueBars({ data, title }: { data: DayPoint[]; title: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 640;
  const H = 180;
  const PAD = 8;
  const bw = (W - PAD * 2) / Math.max(1, data.length);
  return (
    <Card className="p-5">
      <h3 className="font-bold">{title}</h3>
      {data.every((d) => d.value === 0) ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          Aucun revenu sur la période.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${title} : maximum ${formatAr(max)}`}
          className="mt-4 w-full"
        >
          {data.map((d, i) => {
            const h = Math.max(2, ((H - 40) * d.value) / max);
            return (
              <g key={d.fullLabel + i}>
                <title>{`${d.fullLabel} : ${formatAr(d.value)}`}</title>
                <rect
                  x={PAD + i * bw + bw * 0.2}
                  y={H - 24 - h}
                  width={Math.max(1, bw * 0.6)}
                  height={h}
                  rx={2}
                  className="fill-zinc-900"
                />
                {i % Math.ceil(data.length / 8) === 0 && (
                  <text
                    x={PAD + i * bw + bw / 2}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize={10}
                    className="fill-zinc-500"
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </Card>
  );
}

export interface BarRow {
  label: string;
  value: number;
  display: string;
}

/** Liste de barres horizontales (top événements, méthodes de paiement…). */
export function HBarList({ title, rows }: { title: string; rows: BarRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="p-5">
      <h3 className="font-bold">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">Aucune donnée.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate font-medium">{r.label}</span>
                <span className="shrink-0 tabular-nums text-zinc-500">{r.display}</span>
              </div>
              <div
                className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100"
                role="img"
                aria-label={`${r.label} : ${r.display}`}
              >
                <div
                  className="h-full rounded-full bg-zinc-900"
                  style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
