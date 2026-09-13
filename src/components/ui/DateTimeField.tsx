import type { InputHTMLAttributes } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DateTimeFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  hint?: string;
}

/**
 * Champ date + heure façon shadcn : même hauteur, bordures, focus et
 * erreurs que les `Input`, icône calendrier intégrée, chiffres tabulaires.
 * Le sélecteur natif est conservé (popup OS) mais normalisé en thème clair.
 */
export function DateTimeField({ label, error, hint, id, className, ...rest }: DateTimeFieldProps) {
  const fieldId = id ?? rest.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-medium text-zinc-700">
        {label}
      </label>
      <div className="relative">
        <CalendarDays
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
        />
        <input
          id={fieldId}
          type="datetime-local"
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
          }
          className={cn(
            'h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm tabular-nums outline-none transition [color-scheme:light] focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:transition [&::-webkit-calendar-picker-indicator]:hover:opacity-100',
            error ? 'border-red-500' : 'border-zinc-300',
            className,
          )}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-xs text-zinc-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
