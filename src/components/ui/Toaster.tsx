import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastVariant = 'success' | 'info' | 'error';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface PushArgs {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: {
    (args: PushArgs): void;
    success: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
  };
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 6000;

let nextToastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (args: PushArgs) => {
      nextToastId += 1;
      const id = nextToastId;
      setToasts((prev) => [
        ...prev.slice(-2),
        { id, title: args.title, description: args.description, variant: args.variant ?? 'info' },
      ]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: Object.assign(push, {
        success: (title: string, description?: string) => push({ title, description, variant: 'success' }),
        info: (title: string, description?: string) => push({ title, description, variant: 'info' }),
        error: (title: string, description?: string) => push({ title, description, variant: 'error' }),
      }),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToasterViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>');
  return ctx;
}

const VARIANT_ICON = {
  success: { icon: CheckCircle2, box: 'bg-green-100 text-green-700' },
  info: { icon: Info, box: 'bg-zinc-100 text-zinc-700' },
  error: { icon: AlertTriangle, box: 'bg-red-100 text-red-600' },
} as const;

function ToasterViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px] sm:items-end"
    >
      {toasts.map((t) => {
        const v = VARIANT_ICON[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className="toast-in pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl"
          >
            <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', v.box)}>
              <v.icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-sm leading-snug text-zinc-500">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Fermer la notification"
              className="shrink-0 rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
