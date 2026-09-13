import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MiniSelectOption {
  value: string;
  label: string;
}

interface MiniSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly MiniSelectOption[];
  /** Libellé accessible du contrôle (pas de label visible, format compact). */
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

interface MenuPos {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
}

/**
 * Select compact façon shadcn (trigger + menu custom en portail,
 * pas de `<select>` natif). Pensé pour les barres d'outils / pagination :
 * hauteur h-8, largeur auto, navigation clavier et ARIA listbox inclus.
 */
export function MiniSelect({
  value,
  onChange,
  options,
  ariaLabel,
  disabled = false,
  className,
}: MiniSelectProps) {
  const autoId = useId();
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
    const up = spaceBelow < 200 && r.top > spaceBelow;
    return up
      ? { bottom: window.innerHeight - r.top + 6, left: r.left, width: r.width }
      : { top: r.bottom + 6, left: r.left, width: r.width };
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

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    setPos(null);
    triggerRef.current?.focus();
  };

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
  }, [open ]);

  const moveHighlight = (dir: 1 | -1) => {
    setHighlight((h) => {
      const n = (h + dir + options.length) % options.length;
      itemRefs.current[n]?.focus();
      return n;
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-controls={open ? `${autoId}-listbox` : undefined}
        data-miniselect="trigger"
        disabled={disabled}
        onClick={() => (open ? closeMenu(true) : openMenu())}
        onKeyDown={(e) => {
          if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
            e.preventDefault();
            if (!open) openMenu();
          }
        }}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-lg border bg-white pl-2.5 pr-2 text-sm tabular-nums outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-50',
          open ? 'border-zinc-900 ring-2 ring-zinc-900/10' : 'border-zinc-300 hover:bg-zinc-50',
          className,
        )}
      >
        <span className="font-medium text-zinc-900">{selected?.label ?? value}</span>
        <ChevronDown
          aria-hidden
          className={cn('size-3.5 shrink-0 opacity-50 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={contentRef}
            role="listbox"
            id={`${autoId}-listbox`}
            aria-label={ariaLabel}
            data-miniselect="menu"
            style={{
              position: 'fixed',
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              width: Math.max(96, pos.width),
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
            <ul className="max-h-60 overflow-y-auto p-1.5">
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
                        'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg py-1.5 pl-8 pr-2 text-left text-sm tabular-nums outline-none transition',
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
    </>
  );
}
