import { useEffect } from 'react';
import { Ticket, UserRound, Wand2 } from 'lucide-react';
import { holderNameSchema, type CheckoutLine } from '../../../schemas/orders';
import { Input } from '../../../components/ui/Input';
import { formatAr } from '../../../lib/utils';

interface Props {
  lines: CheckoutLine[];
  names: Record<string, string[]>;
  showErrors: boolean;
  onNamesChange: (names: Record<string, string[]>) => void;
  onValidityChange: (valid: boolean) => void;
  /** Nom de l'acheteur pour le remplissage rapide (optionnel). */
  buyerName?: string;
}

/** Étape 2 : un nom de participant par billet (contrôlé par le parent). */
export function AttendeeForm({
  lines,
  names,
  showErrors,
  onNamesChange,
  onValidityChange,
  buyerName,
}: Props) {
  const valid = lines.every((l) =>
    (names[l.ticket_type_id] ?? []).every(
      (n, i) => i < l.quantity && holderNameSchema.safeParse(n).success,
    ),
  ) && lines.every((l) => (names[l.ticket_type_id] ?? []).length === l.quantity);

  useEffect(() => {
    onValidityChange(valid);
  }, [valid, onValidityChange]);

  const setName = (ticketTypeId: string, index: number, value: string) => {
    const current = [...(names[ticketTypeId] ?? [])];
    current[index] = value;
    onNamesChange({ ...names, [ticketTypeId]: current });
  };

  const fillAll = () => {
    if (!buyerName) return;
    const next: Record<string, string[]> = { ...names };
    for (const l of lines) {
      next[l.ticket_type_id] = Array.from({ length: l.quantity }, () => buyerName);
    }
    onNamesChange(next);
  };

  const errorFor = (value: string | undefined): string | undefined => {
    if (!showErrors) return undefined;
    const r = holderNameSchema.safeParse(value ?? '');
    return r.success ? undefined : r.error.issues[0]?.message;
  };

  const filledCount = lines.reduce(
    (s, l) =>
      s + (names[l.ticket_type_id] ?? []).filter((n) => holderNameSchema.safeParse(n ?? '').success).length,
    0,
  );
  const totalCount = lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-500">
          <strong className="tabular-nums text-zinc-900">
            {filledCount} / {totalCount}
          </strong>{' '}
          participant{totalCount > 1 ? 's' : ''} renseigné{filledCount > 1 ? 's' : ''}
        </p>
        {buyerName && (
          <button
            type="button"
            onClick={fillAll}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200"
          >
            <Wand2 className="size-3.5" aria-hidden />
            Tout remplir : {buyerName}
          </button>
        )}
      </div>

      {lines.map((l) => (
        <section
          key={l.ticket_type_id}
          aria-label={`Participants — ${l.name}`}
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
        >
          <header className="flex items-center gap-3 bg-zinc-950 px-4 py-3 text-white">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10"
            >
              <Ticket className="size-4 text-amber-300" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{l.name}</p>
              <p className="text-xs tabular-nums text-zinc-400">
                {formatAr(l.unit_price)} × {l.quantity}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold tabular-nums">
              {(names[l.ticket_type_id] ?? []).filter((n) =>
                holderNameSchema.safeParse(n ?? '').success,
              ).length}
              /{l.quantity}
            </span>
          </header>
          <div className="space-y-3 p-4">
            {Array.from({ length: l.quantity }).map((_, i) => {
              const value = (names[l.ticket_type_id] ?? [])[i] ?? '';
              const ok = holderNameSchema.safeParse(value).success;
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className={
                      ok
                        ? 'mt-7 flex size-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-white'
                        : 'mt-7 flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500'
                    }
                  >
                    <UserRound className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Input
                      label={`Participant ${i + 1}`}
                      value={value}
                      error={errorFor(value)}
                      onChange={(e) => setName(l.ticket_type_id, i, e.target.value)}
                      autoComplete="name"
                      maxLength={80}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
