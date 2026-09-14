import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  BadgePlus,
  Info,
  Loader2,
  PencilLine,
  Trash2,
  TriangleAlert,
  X,
  XCircle,
  type LucideIcon,
  CircleCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading';
export type ToastKind = 'created' | 'updated' | 'deleted';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** Icône CRUD : surcharge l'icône du variant (created/updated/deleted). */
  kind?: ToastKind;
  /** Icône personnalisée (prioritaire sur variant + kind). */
  icon?: LucideIcon;
  /** ms avant disparition. `Infinity` = persistant (ex. loading). */
  duration?: number;
  action?: ToastAction;
}

interface PushArgs {
  title: string;
  description?: string;
  variant?: ToastVariant;
  kind?: ToastKind;
  icon?: LucideIcon;
  duration?: number;
  action?: ToastAction;
}

interface PromiseMessages<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((err: unknown) => string);
  successDescription?: string | ((data: T) => string | undefined);
  errorDescription?: (err: unknown) => string | undefined;
}

interface ToastApi {
  (args: PushArgs): number;
  success: (title: string, description?: string, opts?: Partial<PushArgs>) => number;
  info: (title: string, description?: string, opts?: Partial<PushArgs>) => number;
  warning: (title: string, description?: string, opts?: Partial<PushArgs>) => number;
  error: (title: string, description?: string, opts?: Partial<PushArgs>) => number;
  loading: (title: string, description?: string) => number;
  /** Raccourcis CRUD — messages FR + icônes dédiées. */
  created: (entity?: string, description?: string, opts?: Partial<PushArgs>) => number;
  updated: (entity?: string, description?: string, opts?: Partial<PushArgs>) => number;
  deleted: (entity?: string, description?: string, opts?: Partial<PushArgs>) => number;
  promise: <T>(promise: Promise<T>, messages: PromiseMessages<T>) => Promise<T>;
  update: (id: number, patch: Partial<Omit<ToastItem, 'id'>>) => void;
  dismiss: (id?: number) => void;
}

interface ToastContextValue {
  toast: ToastApi;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 4500,
  info: 5000,
  warning: 5500,
  error: 7000,
  loading: Number.POSITIVE_INFINITY,
};

const MAX_TOASTS = 4;
const EXIT_MS = 200;

let nextToastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  const exitTimers = useRef(new Map<number, number>());

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    setLeaving((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    exitTimers.current.delete(id);
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      let already = false;
      setLeaving((prev) => {
        if (prev.has(id)) {
          already = true;
          return prev;
        }
        return new Set(prev).add(id);
      });
      if (already) return;
      // Laisse le temps à l'animation de sortie avant de retirer du DOM.
      if (exitTimers.current.has(id)) return;
      exitTimers.current.set(
        id,
        window.setTimeout(() => remove(id), EXIT_MS),
      );
    },
    [remove],
  );

  const dismissAll = useCallback(() => {
    setToasts((prev) => {
      prev.forEach((t) => dismiss(t.id));
      return prev;
    });
  }, [dismiss]);

  const push = useCallback((args: PushArgs): number => {
    nextToastId += 1;
    const id = nextToastId;
    const variant = args.variant ?? 'info';
    const item: ToastItem = {
      id,
      title: args.title,
      description: args.description,
      variant,
      kind: args.kind,
      icon: args.icon,
      duration: args.duration ?? DEFAULT_DURATION[variant],
      action: args.action,
    };
    setToasts((prev) => [...prev, item].slice(-MAX_TOASTS));
    return id;
  }, []);

  const update = useCallback((id: number, patch: Partial<Omit<ToastItem, 'id'>>) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const promise = useCallback(
    async <T,>(task: Promise<T>, messages: PromiseMessages<T>): Promise<T> => {
      const id = push({ title: messages.loading, variant: 'loading' });
      try {
        const data = await task;
        const title =
          typeof messages.success === 'function' ? messages.success(data) : messages.success;
        const description =
          typeof messages.successDescription === 'function'
            ? messages.successDescription(data)
            : messages.successDescription;
        update(id, { title, description, variant: 'success', duration: DEFAULT_DURATION.success });
        // Referme le loading transformé après son délai normal.
        window.setTimeout(() => dismiss(id), DEFAULT_DURATION.success);
        return data;
      } catch (err) {
        const title = typeof messages.error === 'function' ? messages.error(err) : messages.error;
        const description = messages.errorDescription?.(err);
        update(id, { title, description, variant: 'error', duration: DEFAULT_DURATION.error });
        window.setTimeout(() => dismiss(id), DEFAULT_DURATION.error);
        throw err;
      }
    },
    [push, update, dismiss],
  );

  const api = useMemo<ToastApi>(() => {
    const fn = ((args: PushArgs) => push(args)) as ToastApi;
    fn.success = (title, description, opts) => push({ ...opts, title, description, variant: 'success' });
    fn.info = (title, description, opts) => push({ ...opts, title, description, variant: 'info' });
    fn.warning = (title, description, opts) => push({ ...opts, title, description, variant: 'warning' });
    fn.error = (title, description, opts) => push({ ...opts, title, description, variant: 'error' });
    fn.loading = (title, description) => push({ title, description, variant: 'loading' });
    fn.created = (entity = 'Élément', description, opts) =>
      push({
        ...opts,
        title: `${entity} créé`,
        description: description ?? `${entity} a été créé avec succès.`,
        variant: 'success',
        kind: 'created',
      });
    fn.updated = (entity = 'Élément', description, opts) =>
      push({
        ...opts,
        title: `${entity} mis à jour`,
        description: description ?? 'Modifications enregistrées avec succès.',
        variant: 'success',
        kind: 'updated',
      });
    fn.deleted = (entity = 'Élément', description, opts) =>
      push({
        ...opts,
        title: `${entity} supprimé`,
        description: description ?? 'Suppression effectuée avec succès.',
        variant: 'success',
        kind: 'deleted',
      });
    fn.promise = promise;
    fn.update = update;
    fn.dismiss = (id?: number) => {
      if (id === undefined) dismissAll();
      else dismiss(id);
    };
    return fn;
  }, [push, update, promise, dismiss, dismissAll]);

  const value = useMemo<ToastContextValue>(() => ({ toast: api, dismiss }), [api, dismiss]);

  useEffect(
    () => () => {
      exitTimers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToasterViewport toasts={toasts} leaving={leaving} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>');
  return ctx;
}

/* ---------- Styles par variant ---------- */

const VARIANT_META: Record<
  ToastVariant,
  { icon: LucideIcon; box: string; bar: string; progress: string; ring: string }
> = {
  success: {
    icon: CircleCheck,
    box: 'bg-emerald-500 text-white shadow-[0_6px_16px_-6px_rgb(16_185_129/0.7)]',
    bar: 'bg-emerald-500',
    progress: 'bg-emerald-500',
    ring: 'focus-visible:ring-emerald-500/40',
  },
  error: {
    icon: XCircle,
    box: 'bg-red-500 text-white shadow-[0_6px_16px_-6px_rgb(239_68_68/0.7)]',
    bar: 'bg-red-500',
    progress: 'bg-red-500',
    ring: 'focus-visible:ring-red-500/40',
  },
  warning: {
    icon: TriangleAlert,
    box: 'bg-amber-500 text-white shadow-[0_6px_16px_-6px_rgb(245_158_11/0.7)]',
    bar: 'bg-amber-500',
    progress: 'bg-amber-500',
    ring: 'focus-visible:ring-amber-500/40',
  },
  info: {
    icon: Info,
    box: 'bg-blue-600 text-white shadow-[0_6px_16px_-6px_rgb(37_99_235/0.7)]',
    bar: 'bg-blue-600',
    progress: 'bg-blue-600',
    ring: 'focus-visible:ring-blue-500/40',
  },
  loading: {
    icon: Loader2,
    box: 'bg-zinc-900 text-white',
    bar: 'bg-zinc-400',
    progress: 'bg-zinc-400',
    ring: 'focus-visible:ring-zinc-500/40',
  },
};

const KIND_ICON: Record<ToastKind, LucideIcon> = {
  created: BadgePlus,
  updated: PencilLine,
  deleted: Trash2,
};

function resolveIcon(t: ToastItem): { Icon: LucideIcon; spin: boolean } {
  if (t.icon) return { Icon: t.icon, spin: false };
  if (t.kind) return { Icon: KIND_ICON[t.kind], spin: false };
  const meta = VARIANT_META[t.variant];
  return { Icon: meta.icon, spin: t.variant === 'loading' };
}

/* ---------- Viewport ---------- */

function ToasterViewport({
  toasts,
  leaving,
  onDismiss,
}: {
  toasts: ToastItem[];
  leaving: Set<number>;
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-stretch gap-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px]"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} isLeaving={leaving.has(t.id)} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  isLeaving,
  onDismiss,
}: {
  toast: ToastItem;
  isLeaving: boolean;
  onDismiss: (id: number) => void;
}) {
  const meta = VARIANT_META[toast.variant];
  const { Icon, spin } = resolveIcon(toast);
  const duration = toast.duration ?? DEFAULT_DURATION[toast.variant];
  const persistent = !Number.isFinite(duration);

  const remainingRef = useRef(duration);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);

  const clearTimer = () => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };

  // (Re)démarre le compte à rebours — y compris quand un `loading`
  // est transformé en succès/erreur via `toast.update` / `toast.promise`.
  useEffect(() => {
    remainingRef.current = duration;
    clearTimer();
    if (persistent || isLeaving) return;
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(() => onDismiss(toast.id), remainingRef.current);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.variant, duration, toast.title, isLeaving]);

  const pause = () => {
    if (persistent || timerRef.current === undefined) return;
    clearTimer();
    remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
  };

  const resume = () => {
    if (persistent || isLeaving || remainingRef.current <= 0) return;
    if (timerRef.current !== undefined) return;
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(() => onDismiss(toast.id), remainingRef.current);
  };

  const isError = toast.variant === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      className={cn(
        'toast-in group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/95 py-3 pr-3 pl-3.5 shadow-[0_16px_50px_-12px_rgb(0_0_0/0.25)] ring-1 ring-black/5 backdrop-blur-xl',
        isLeaving && 'toast-out',
      )}
    >
      {/* Barre d'accent latérale */}
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', meta.bar)} />

      <span
        aria-hidden
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl',
          meta.box,
        )}
      >
        <Icon className={cn('size-5', spin && 'animate-spin')} />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold tracking-tight text-zinc-900">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 line-clamp-3 text-[13px] leading-snug text-zinc-500">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className={cn(
              'mt-2 inline-flex items-center rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2',
              meta.ring,
            )}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {!persistent && (
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Fermer la notification"
          className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}

      {/* Barre de progression (pause au survol via groupe) */}
      {!persistent && !isLeaving && (
        <span aria-hidden className="absolute inset-x-3 bottom-1.5 h-[3px] overflow-hidden rounded-full bg-zinc-100">
          <span
            key={`${toast.id}-${toast.variant}-${duration}`}
            className={cn(
              'toast-progress block h-full w-full rounded-full group-hover:[animation-play-state:paused]',
              meta.progress,
            )}
            style={{ animationDuration: `${duration}ms` }}
          />
        </span>
      )}
    </div>
  );
}
