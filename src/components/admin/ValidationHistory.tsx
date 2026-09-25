import type { EventValidationHistory } from '../../types/database';
import { formatDate } from '../../lib/utils';

const DECISION_LABELS: Record<string, string> = {
  submit: 'Soumis pour validation',
  approve: 'Approuvé / publié',
  refuse: 'Refusé',
  request_changes: 'Corrections demandées',
  suspend: 'Suspendu / dépublié',
  reactivate: 'Réactivé / republié',
};

export function ValidationHistoryTimeline({ history }: { history: EventValidationHistory[] }) {
  if (history.length === 0) {
    return <p className="text-xs text-zinc-500">Aucun historique pour le moment.</p>;
  }
  return (
    <ol className="space-y-2.5">
      {history.map((h) => (
        <li key={h.id} className="flex gap-2.5 text-xs">
          <span
            aria-hidden
            className="mt-1.5 size-2 shrink-0 rounded-full bg-zinc-300"
          />
          <div className="min-w-0">
            <p className="font-semibold text-zinc-800">
              {DECISION_LABELS[h.decision] ?? h.decision}
              <span className="ml-1.5 font-normal text-zinc-400">
                {h.from_status ? `${h.from_status} → ` : ''}{h.to_status}
              </span>
            </p>
            {h.note && (
              <p className="mt-0.5 rounded-lg bg-amber-50 p-2 leading-relaxed text-amber-900">
                « {h.note} »
              </p>
            )}
            <p className="mt-0.5 text-[11px] tabular-nums text-zinc-400">
              {formatDate(h.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
