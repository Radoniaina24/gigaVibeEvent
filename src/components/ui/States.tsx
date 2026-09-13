import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-3 py-10"
    >
      <span className="size-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-zinc-100">
        <Inbox className="size-6 text-zinc-500" aria-hidden />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-zinc-500">{description}</p>
      )}
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Une erreur est survenue.',
  description = 'Veuillez réessayer.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="size-6 text-red-600" aria-hidden />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-zinc-500">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCcw className="size-4" aria-hidden /> Réessayer
        </Button>
      )}
    </div>
  );
}
