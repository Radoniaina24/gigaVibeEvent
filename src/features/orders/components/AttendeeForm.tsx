import { useEffect } from 'react';
import { holderNameSchema, type CheckoutLine } from '../../../schemas/orders';
import { Input } from '../../../components/ui/Input';

interface Props {
  lines: CheckoutLine[];
  names: Record<string, string[]>;
  showErrors: boolean;
  onNamesChange: (names: Record<string, string[]>) => void;
  onValidityChange: (valid: boolean) => void;
}

/** Étape 2 : un nom de participant par billet (contrôlé par le parent). */
export function AttendeeForm({
  lines,
  names,
  showErrors,
  onNamesChange,
  onValidityChange,
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

  const errorFor = (value: string | undefined): string | undefined => {
    if (!showErrors) return undefined;
    const r = holderNameSchema.safeParse(value ?? '');
    return r.success ? undefined : r.error.issues[0]?.message;
  };

  return (
    <div className="space-y-4">
      {lines.map((l) => (
        <fieldset key={l.ticket_type_id} className="rounded-xl border border-zinc-200 p-4">
          <legend className="px-1 text-sm font-semibold">
            {l.name} × {l.quantity}
          </legend>
          <div className="space-y-3">
            {Array.from({ length: l.quantity }).map((_, i) => (
              <Input
                key={i}
                label={`Participant ${i + 1}`}
                value={(names[l.ticket_type_id] ?? [])[i] ?? ''}
                error={errorFor((names[l.ticket_type_id] ?? [])[i])}
                onChange={(e) => setName(l.ticket_type_id, i, e.target.value)}
                autoComplete="name"
                maxLength={80}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
