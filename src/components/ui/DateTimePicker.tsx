import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { MiniSelect } from './MiniSelect';
import { cn } from '../../lib/utils';

interface DateTimePickerFieldProps {
  label: string;
  /** Chaîne locale `YYYY-MM-DDTHH:mm` (comme `datetime-local`) ou `''`. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  /** Même format : les jours antérieurs sont désactivés. */
  min?: string;
  /** Affiche le bouton « Effacer » (utile pour les champs optionnels). */
  allowClear?: boolean;
  id?: string;
  disabled?: boolean;
}

interface Parts {
  y: number;
  mo: number; // 0-11
  d: number;
  h: number;
  mi: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

function parseLocal(v: string): Parts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(v.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const h = m[4] !== undefined ? Number(m[4]) : 9;
  const mi = m[5] !== undefined ? Number(m[5]) : 0;
  if (mo < 0 || mo > 11 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  return { y, mo, d, h, mi };
}

function toLocalString(p: Parts): string {
  return `${p.y}-${pad(p.mo + 1)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

function formatTrigger(v: string): string | null {
  const p = parseLocal(v);
  if (!p) return null;
  const date = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(p.y, p.mo, p.d));
  return `${date} · ${pad(p.h)}:${pad(p.mi)}`;
}

function monthLabel(y: number, mo: number): string {
  const s = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
    new Date(y, mo, 1),
  );
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const WEEKDAYS: string[] = Array.from({ length: 7 }, (_, i) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i)),
);

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: pad(h),
  label: pad(h),
}));

/** Minutes par pas de 5 (programmation événementielle). */
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: pad(i * 5),
  label: pad(i * 5),
}));

function sameDay(a: Parts, y: number, mo: number, d: number): boolean {
  return a.y === y && a.mo === mo && a.d === d;
}

function todayParts(): Parts {
  const n = new Date();
  return { y: n.getFullYear(), mo: n.getMonth(), d: n.getDate(), h: n.getHours(), mi: n.getMinutes() };
}

/**
 * Sélecteur date + heure façon shadcn : bouton trigger + calendrier
 * en popover (portail), navigation mois, heure intégrée, clavier + ARIA.
 */
export function DateTimePickerField({
  label,
  value,
  onChange,
  error,
  hint,
  min,
  allowClear = false,
  id,
  disabled = false,
}: DateTimePickerFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const [view, setView] = useState<{ y: number; mo: number }>(() => {
    const p = parseLocal(value) ?? todayParts();
    return { y: p.y, mo: p.mo };
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => parseLocal(value), [value]);
  const minDate = useMemo(() => {
    if (!min) return null;
    const p = parseLocal(min);
    return p ? new Date(p.y, p.mo, p.d).getTime() : null;
  }, [min]);
  const triggerLabel = formatTrigger(value);

  const measure = () => {
    const el = triggerRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const panelH = 420;
    const up = window.innerHeight - r.bottom - 12 < panelH && r.top > panelH;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - 316));
    return up
      ? { bottom: window.innerHeight - r.top + 8, left }
      : { top: r.bottom + 8, left };
  };

  const openPanel = () => {
    const p = parseLocal(value) ?? todayParts();
    setView({ y: p.y, mo: p.mo });
    setPos(measure());
    setOpen(true);
  };

  const closePanel = (focusTrigger: boolean) => {
    setOpen(false);
    setPos(null);
    if (focusTrigger) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element;
      // Les menus MiniSelect (heures/minutes) sont en portail : ne pas fermer.
      if (typeof t.closest === 'function' && t.closest('[data-miniselect]')) return;
      if (triggerRef.current?.contains(t as Node) || panelRef.current?.contains(t as Node)) return;
      closePanel(false);
    };
    // Capture + stopPropagation : le panneau vit en portail au-dessus des
    // modales — Escape ne doit fermer que lui, pas la modale parente.
    const onKeyCapture = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closePanel(true);
      }
    };
    const onScroll = (e: Event) => {
      const t = e.target as Element;
      if (typeof t.closest === 'function' && t.closest('[data-miniselect]')) return;
      if (panelRef.current?.contains(t as Node)) return;
      closePanel(false);
    };
    const onResize = () => closePanel(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKeyCapture, true);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKeyCapture, true);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  const moveMonth = (dir: 1 | -1) => {
    setView((v) => {
      const mo = v.mo + dir;
      return mo < 0
        ? { y: v.y - 1, mo: 11 }
        : mo > 11
          ? { y: v.y + 1, mo: 0 }
          : { y: v.y, mo };
    });
  };

  const pickDay = (d: number) => {
    const base = selected ?? { ...todayParts(), h: 9, mi: 0 };
    onChange(toLocalString({ ...base, y: view.y, mo: view.mo, d }));
  };

  const pickTime = (h: number, mi: number) => {
    const base = selected ?? { ...todayParts(), d: Math.min(todayParts().d, 28) };
    const day = selected ? { y: selected.y, mo: selected.mo, d: selected.d } : { y: view.y, mo: view.mo, d: base.d };
    onChange(toLocalString({ ...day, h, mi }));
  };

  const pickToday = () => {
    const t = todayParts();
    const base = selected ?? { h: 9, mi: 0 };
    onChange(toLocalString({ y: t.y, mo: t.mo, d: t.d, h: base.h, mi: base.mi }));
    setView({ y: t.y, mo: t.mo });
  };

  const offset = (new Date(view.y, view.mo, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.mo + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const today = todayParts();

  return (
    <div className="space-y-1.5">
      <span id={`${fieldId}-label`} className="block text-sm font-medium text-zinc-700">
        {label}
      </span>
      <div className="relative">
        <button
          ref={triggerRef}
          id={fieldId}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-labelledby={`${fieldId}-label`}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          aria-invalid={Boolean(error)}
          disabled={disabled}
          onClick={() => (open ? closePanel(true) : openPanel())}
          className={cn(
            'flex h-10 w-full items-center gap-2.5 rounded-lg border bg-white px-3 text-left text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-50',
            allowClear && selected && 'pr-9',
            error ? 'border-red-500' : open ? 'border-zinc-900 ring-2 ring-zinc-900/10' : 'border-zinc-300',
          )}
        >
          <CalendarDays aria-hidden className="size-4 shrink-0 text-zinc-400" />
          <span className={cn('flex-1 truncate tabular-nums', triggerLabel ? 'text-zinc-900' : 'text-zinc-400')}>
            {triggerLabel ?? 'Choisir une date…'}
          </span>
        </button>
        {allowClear && selected && !disabled && (
          <button
            type="button"
            title="Effacer la date"
            aria-label="Effacer la date"
            onClick={() => onChange('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
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

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-label={`Choisir ${label.toLowerCase()}`}
            style={{
              position: 'fixed',
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              width: 300,
              zIndex: 70,
            }}
            className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-[0_24px_64px_-16px_rgb(0_0_0/0.35)]"
          >
            {/* En-tête mois */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Mois précédent"
                onClick={() => moveMonth(-1)}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <p aria-live="polite" className="text-sm font-bold">
                {monthLabel(view.y, view.mo)}
              </p>
              <button
                type="button"
                aria-label="Mois suivant"
                onClick={() => moveMonth(1)}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
            {/* Jours semaine */}
            <div aria-hidden className="mt-2 grid grid-cols-7 text-center text-[11px] font-bold uppercase text-zinc-400">
              {WEEKDAYS.map((w, i) => (
                <span key={i} className="py-1">
                  {w}
                </span>
              ))}
            </div>
            {/* Grille */}
            <div role="grid" aria-label={monthLabel(view.y, view.mo)} className="mt-1 grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => {
                if (d === null) return <span key={`e-${i}`} />;
                const isSelected = selected !== null && sameDay(selected, view.y, view.mo, d);
                const isToday = today.y === view.y && today.mo === view.mo && today.d === d;
                const isDisabled =
                  minDate !== null && new Date(view.y, view.mo, d).getTime() < minDate;
                const dayLabel = new Intl.DateTimeFormat('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date(view.y, view.mo, d));
                return (
                  <button
                    key={d}
                    type="button"
                    role="gridcell"
                    aria-selected={isSelected}
                    aria-label={dayLabel}
                    aria-current={isToday ? 'date' : undefined}
                    disabled={isDisabled}
                    onClick={() => pickDay(d)}
                    className={cn(
                      'grid size-9 place-items-center rounded-lg text-sm tabular-nums transition',
                      isSelected
                        ? 'bg-zinc-900 font-bold text-white shadow-sm'
                        : 'text-zinc-700 hover:bg-zinc-100',
                      !isSelected && isToday && 'ring-1 ring-inset ring-brand-600',
                      isDisabled && 'cursor-not-allowed text-zinc-300 hover:bg-transparent',
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            {/* Heure + actions */}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
              <span className="flex flex-1 items-center gap-1.5 text-xs font-medium text-zinc-500">
                Heure
                <MiniSelect
                  ariaLabel="Heures"
                  value={selected ? pad(selected.h) : ''}
                  onChange={(v) => pickTime(Number(v), selected?.mi ?? 0)}
                  options={HOUR_OPTIONS}
                />
                <span aria-hidden className="font-bold text-zinc-400">:</span>
                <MiniSelect
                  ariaLabel="Minutes"
                  value={selected ? pad(selected.mi) : ''}
                  onChange={(v) => pickTime(selected?.h ?? 9, Number(v))}
                  options={MINUTE_OPTIONS}
                />
              </span>
              <button
                type="button"
                onClick={pickToday}
                className="h-9 shrink-0 rounded-lg border border-zinc-300 bg-white px-2.5 text-xs font-semibold transition hover:bg-zinc-100"
              >
                Aujourd'hui
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
