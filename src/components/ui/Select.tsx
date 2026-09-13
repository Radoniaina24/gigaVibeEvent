import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  error?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface MenuPos {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
}

/**
 * Select façon shadcn (trigger + menu déroulant custom, pas de `<select>` natif).
 * Menu rendu en portail, navigation clavier (flèches, Home/End, Escape) et
 * attributs ARIA combobox/listbox inclus. Même style que les `Input`.
 */
export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  error,
  id,
  placeholder = 'Sélectionner…',
  disabled = false,
}: SelectFieldProps<T>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selected = options.find((o) => o.value === value) ?? null;

  const measure = (): MenuPos | null => {
    const el = triggerRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const up = spaceBelow < 280 && r.top > spaceBelow;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8));
    return up
      ? { bottom: window.innerHeight - r.top + 8, left, width: r.width }
      : { top: r.bottom + 8, left, width: r.width };
  };

  const closeMenu = (focusTrigger: boolean) => {
    setOpen(false);
    setPos(null);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const openMenu = () => {
    setPos(measure());
    const i = options.findIndex((o) => o.value === value);
    setHighlight(i >= 0 ? i : 0);
    setOpen(true);
    window.setTimeout(() => itemRefs.current[i >= 0 ? i : 0]?.focus(), 30);
  };

  const choose = (v: T) => {
    onChange(v);
    setOpen(false);
    setPos(null);
    triggerRef.current?.focus();
  };

  /* Fermetures : clic extérieur, Escape, scroll, resize */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || contentRef.current?.contains(t)) return;
      closeMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu(true);
    };
    const onScroll = (e: Event) => {
      if (contentRef.current?.contains(e.target as Node)) return;
      closeMenu(false);
    };
    const onResize = () => closeMenu(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const moveHighlight = (dir: 1 | -1) => {
    setHighlight((h) => {
      const n = (h + dir + options.length) % options.length;
      itemRefs.current[n]?.focus();
      return n;
    });
  };

  return (
    <div className="space-y-1.5">
      <span id={`${fieldId}-label`} className="block text-sm font-medium text-zinc-700">
        {label}
      </span>
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-labelledby={`${fieldId}-label`}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        onClick={() => (open ? closeMenu(true) : openMenu())}
        onKeyDown={(e) => {
          if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
            e.preventDefault();
            if (!open) openMenu();
          }
        }}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-red-500' : open ? 'border-zinc-900 ring-2 ring-zinc-900/10' : 'border-zinc-300',
        )}
      >
        <span className={cn('truncate', selected ? 'text-zinc-900' : 'text-zinc-400')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          aria-hidden
          className={cn('size-4 shrink-0 opacity-50 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      {error && (
        <p id={`${fieldId}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      {open &&
        pos &&
        createPortal(
          <div
            ref={contentRef}
            role="listbox"
            aria-labelledby={`${fieldId}-label`}
            style={{
              position: 'fixed',
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              width: Math.max(220, pos.width),
              zIndex: 70,
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveHighlight(1);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveHighlight(-1);
              } else if (e.key === 'Home') {
                e.preventDefault();
                setHighlight(0);
                itemRefs.current[0]?.focus();
              } else if (e.key === 'End') {
                e.preventDefault();
                setHighlight(options.length - 1);
                itemRefs.current[options.length - 1]?.focus();
              }
            }}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_24px_64px_-16px_rgb(0_0_0/0.35)]"
          >
            <ul className="max-h-72 overflow-y-auto p-1.5">
              {options.map((o, i) => {
                const active = o.value === value;
                const isHl = highlight === i;
                return (
                  <li key={o.value} role="option" aria-selected={active}>
                    <button
                      ref={(el) => {
                        itemRefs.current[i] = el;
                      }}
                      type="button"
                      onClick={() => choose(o.value)}
                      onMouseMove={() => setHighlight(i)}
                      className={cn(
                        'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg py-2 pl-8 pr-2 text-left text-sm outline-none transition',
                        active
                          ? 'bg-zinc-900 font-semibold text-white'
                          : isHl
                            ? 'bg-zinc-100 text-zinc-900'
                            : 'text-zinc-700',
                      )}
                    >
                      <span aria-hidden className="absolute left-2 flex size-4 items-center justify-center">
                        {active && <Check className="size-4" aria-hidden />}
                      </span>
                      {o.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
