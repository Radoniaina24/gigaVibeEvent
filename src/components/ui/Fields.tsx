import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/utils';

const controlClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10';

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-zinc-600">
      {children}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-600">
      {message}
    </p>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function Textarea({ label, error, id, className, ...rest }: TextareaProps) {
  const fieldId = id ?? rest.name;
  return (
    <div>
      <Label htmlFor={fieldId}>{label}</Label>
      <textarea
        id={fieldId}
        aria-invalid={Boolean(error)}
        className={cn(controlClass, 'min-h-24 py-2', error && 'border-red-500', className)}
        {...rest}
      />
      <FieldError id={`${fieldId}-error`} message={error} />
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export function Select({ label, error, id, className, children, ...rest }: SelectProps) {
  const fieldId = id ?? rest.name;
  return (
    <div>
      <Label htmlFor={fieldId}>{label}</Label>
      <select
        id={fieldId}
        aria-invalid={Boolean(error)}
        className={cn(controlClass, 'h-10', error && 'border-red-500', className)}
        {...rest}
      >
        {children}
      </select>
      <FieldError id={`${fieldId}-error`} message={error} />
    </div>
  );
}

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
      <input
        type="checkbox"
        className={cn('size-4 accent-zinc-900', className)}
        {...rest}
      />
      {label}
    </label>
  );
}
