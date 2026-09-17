import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DateRangeValue {
  /** Jour inclus, format AAAA-MM-JJ (heure locale), ou null si borne ouverte. */
  from: string | null;
  /** Jour inclus, format AAAA-MM-JJ (heure locale), ou null si borne ouverte. */
  to: string | null;
}

export const EMPTY_RANGE: DateRangeValue = { from: null, to: null };

/** Jour local AAAA-MM-JJ (pour borner le calendrier, ex. à aujourd'hui). */
export function localTodayKey(): string {
  return todayKey();
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** Libellé accessible du contrôle. */
  ariaLabel: string;
  /** Jour max sélectionnable (AAAA-MM-JJ). Absent = aucune limite (ex. événements futurs). */
  max?: string | null;
  className?: string;
}

interface MenuPos {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
}

const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;

/* ---------- Dates : ISO local <-> jj/mm/aaaa ---------- */

function toKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function todayKey(): string {
  return toKey(new Date());
}

function formatFrDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function parseFrDateStrict(value: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  const year = Number(m[3]);
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return toKey(d);
}

/** Saisie assistée jj/mm/aaaa avec bornes jour/mois à la volée. */
function autoSlashDate(raw: string, prev: string): string {
  const clean = raw.replace(/[^\d/]/g, '');
  if (clean.length < prev.length) return clean;
  const digits = clean.replace(/\//g, '').slice(0, 8);

  let dd = digits.slice(0, 2);
  if (dd.length === 1 && Number(dd) > 3) dd = `0${dd}`;
  if (dd.length === 2) {
    if (dd === '00') dd = '01';
    else if (Number(dd) > 31) dd = '31';
  }

  let mm = digits.slice(2, 4);
  if (mm.length === 1 && Number(mm) > 1) mm = `0${mm}`;
  if (mm.length === 2) {
    if (mm === '00') mm = '01';
    else if (Number(mm) > 12) mm = '12';
  }
  const cut = (digits.slice(0, 2) + mm + digits.slice(4)).slice(0, 8);

  let result = '';
  for (let i = 0; i < cut.length; i++) {
    if (i === 2 || i === 4) result += '/';
    result += cut[i];
  }
  return result;
}

const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

function dayAriaLabel(d: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/** Champ date avec libellé « du » / « au » intégré, bordure rouge si invalide. */
function DateInputBox({
  label,
  value,
  onChange,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (raw: string) => void;
  invalid?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex h-8 min-h-8 flex-1 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2 transition-colors focus-within:border-zinc-900',
        invalid && 'border-red-500 focus-within:border-red-500',
      )}
    >
      <span className="select-none text-[10px] font-bold uppercase text-zinc-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="jj/mm/aaaa"
        maxLength={10}
        inputMode="numeric"
        aria-label={label === 'du' ? 'Date de début' : 'Date de fin'}
        className="w-[5.6rem] bg-transparent text-xs tabular-nums outline-none placeholder:text-zinc-400"
      />
    </label>
  );
}

/**
 * Filtre période, même design que myclic (`FrDateRangeField`) : un seul
 * trigger « 12/01/2026 ~ 24/01/2026 », barre de saisie Du ~ Au
 * (auto `jj/mm/aaaa`, invalide en rouge), double calendrier labellisé
 * Du / Au (empilé sur mobile, côte à côte sur desktop, caption cliquable
 * vers vues mois/années), footer Effacer / OK.
 * Bornes inclusives, jours calendaires AAAA-MM-JJ.
 */
export function DateRangeFilter({ value, onChange, ariaLabel, max = null, className }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<DateRangeValue>(value);
  const [fromInput, setFromInput] = useState(value.from ? formatFrDate(value.from) : '');
  const [toInput, setToInput] = useState(value.to ? formatFrDate(value.to) : '');
  const [leftView, setLeftView] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });
  const [rightView, setRightView] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [pos, setPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const du = value.from ? formatFrDate(value.from) : '';
  const au = value.to ? formatFrDate(value.to) : '';
  const triggerLabel = du && au ? `${du} ~ ${au}` : du ? du : au ? au : 'jj/mm/aaaa ~ jj/mm/aaaa';
  const isEmpty = !du && !au;

  const fromInvalid = fromInput.length === 10 && parseFrDateStrict(fromInput) == null;
  const toInvalid = toInput.length === 10 && parseFrDateStrict(toInput) == null;

  const syncInputs = (next: DateRangeValue) => {
    setFromInput(next.from ? formatFrDate(next.from) : '');
    setToInput(next.to ? formatFrDate(next.to) : '');
  };

  const syncMonths = (next: DateRangeValue) => {
    if (next.from) {
      const [y, m] = next.from.split('-').map(Number);
      setLeftView({ y, m: m - 1 });
    }
    if (next.to) {
      const [y, m] = next.to.split('-').map(Number);
      setRightView({ y, m: m - 1 });
    } else if (next.from) {
      const d = new Date(Number(next.from.slice(0, 4)), Number(next.from.slice(5, 7)), 1);
      setRightView({ y: d.getFullYear(), m: d.getMonth() });
    }
  };

  const measure = (): MenuPos | null => {
    const el = triggerRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const width = Math.min(Math.max(r.width, 580), window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const up = spaceBelow < 480 && r.top > spaceBelow;
    return up
      ? { bottom: window.innerHeight - r.top + 6, left, width }
      : { top: r.bottom + 6, left, width };
  };

  const openMenu = () => {
    setTemp(value);
    setFromInput(du);
    setToInput(au);
    syncMonths(value);
    setPos(measure());
    setOpen(true);
  };

  const closeMenu = (focusTrigger: boolean) => {
    setOpen(false);
    setPos(null);
    if (focusTrigger) triggerRef.current?.focus();
  };

  /** Clic calendrier « du » (efface « au » si elle devient invalide). */
  const pickFrom = (iso: string) => {
    if (max && iso > max) return;
    const next: DateRangeValue =
      temp.to && iso > temp.to ? { from: iso, to: null } : { from: iso, to: temp.to };
    setTemp(next);
    syncInputs(next);
  };

  /** Clic calendrier « au » (échange si antérieure à « du »). */
  const pickTo = (iso: string) => {
    if (max && iso > max) return;
    const next: DateRangeValue =
      temp.from && iso < temp.from ? { from: iso, to: temp.from } : { from: temp.from, to: iso };
    setTemp(next);
    syncInputs(next);
    syncMonths(next);
  };

  const syncFromInput = (raw: string) => {
    const formatted = autoSlashDate(raw, fromInput);
    setFromInput(formatted);
    const iso = parseFrDateStrict(formatted);
    if (iso && (!max || iso <= max)) {
      const next: DateRangeValue =
        temp.to && iso > temp.to ? { from: iso, to: null } : { from: iso, to: temp.to };
      setTemp(next);
      syncMonths(next);
    }
  };

  const syncToInput = (raw: string) => {
    const formatted = autoSlashDate(raw, toInput);
    setToInput(formatted);
    const iso = parseFrDateStrict(formatted);
    if (iso && (!max || iso <= max)) {
      const next: DateRangeValue =
        temp.from && iso < temp.from ? { from: iso, to: temp.from } : { from: temp.from, to: iso };
      setTemp(next);
      syncMonths(next);
    }
  };

  const handleClear = () => {
    setTemp({ ...EMPTY_RANGE });
    setFromInput('');
    setToInput('');
  };

  const handleOk = () => {
    onChange(temp);
    closeMenu(true);
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

  return (
    <div className={cn('relative min-w-0 w-full max-w-full sm:w-auto', className)}>
      <CalendarDays
        aria-hidden
        className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-[13px] -translate-y-1/2 text-red-500"
      />
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={triggerLabel}
        onClick={() => (open ? closeMenu(true) : openMenu())}
        className={cn(
          'h-9 min-h-9 w-full justify-start overflow-hidden rounded-lg border border-zinc-300 bg-white pl-8 pr-2 text-sm font-normal shadow-[0_2px_8px_rgba(0,0,0,0.08)] outline-none transition-shadow placeholder:text-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] focus-visible:ring-2 focus-visible:ring-zinc-900/20',
          open && 'border-zinc-900',
        )}
      >
        <span className={cn('truncate tabular-nums', isEmpty && 'text-zinc-400')}>{triggerLabel}</span>
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={contentRef}
            role="dialog"
            aria-label={ariaLabel}
            style={{
              position: 'fixed',
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              width: pos.width,
              zIndex: 70,
            }}
            className="max-h-[80vh] overflow-y-auto rounded-[10px] border border-zinc-200 bg-white text-zinc-900 shadow-md"
          >
            {/* Barre de saisie Du ~ Au */}
            <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
              <DateInputBox label="du" value={fromInput} onChange={syncFromInput} invalid={fromInvalid} />
              <span aria-hidden className="text-xs text-zinc-400">
                ~
              </span>
              <DateInputBox label="au" value={toInput} onChange={syncToInput} invalid={toInvalid} />
            </div>

            {/* Double calendrier : gauche = du, droite = au */}
            <div className="flex flex-col divide-y divide-zinc-100 sm:flex-row sm:divide-x sm:divide-y-0">
              <MonthPanel caption="Du" view={leftView} onViewChange={setLeftView} temp={temp} max={max} onPick={pickFrom} />
              <MonthPanel caption="Au" view={rightView} onViewChange={setRightView} temp={temp} max={max} onPick={pickTo} />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-3 py-2">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                <RefreshCw className="size-3" aria-hidden />
                Effacer
              </button>
              <button
                type="button"
                onClick={handleOk}
                className="inline-flex h-7 items-center rounded-md bg-brand-600 px-4 text-xs font-bold text-white shadow-sm shadow-brand-600/30 transition hover:bg-brand-700"
              >
                OK
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Un panneau calendrier : caption cliquable (jours > mois > années), plage visualisée. */
function MonthPanel({
  caption,
  view,
  onViewChange,
  temp,
  max,
  onPick,
}: {
  caption: string;
  view: { y: number; m: number };
  onViewChange: (v: { y: number; m: number }) => void;
  temp: DateRangeValue;
  max: string | null;
  onPick: (iso: string) => void;
}) {
  const [mode, setMode] = useState<'days' | 'months' | 'years'>('days');
  const now = new Date();
  const today = todayKey();
  const currentYear = now.getFullYear();
  const startDecade = Math.floor(view.y / 10) * 10;

  const navBtn =
    'grid h-7 w-7 shrink-0 place-items-center rounded-md border border-zinc-200 bg-transparent text-zinc-500 opacity-50 transition hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:opacity-30';

  const atMaxMonth = max !== null && view.y === now.getFullYear() && view.m === now.getMonth();

  const shiftView = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    onViewChange({ y: d.getFullYear(), m: d.getMonth() });
  };

  const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(view.y, view.m, 1 - lead + i);
    const key = toKey(date);
    return { date, key, inView: date.getMonth() === view.m, disabled: max !== null && key > max };
  });

  const isEndpoint = (key: string) => key === temp.from || key === temp.to;
  const inBand = (key: string) =>
    Boolean(!isEndpoint(key) && temp.from && temp.to && key >= temp.from && key <= temp.to);

  return (
    <div className="min-w-0 flex-1 p-3 pt-0">
      <p className="px-0 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
        {caption}
      </p>

      {mode === 'years' ? (
        <div className="pointer-events-auto">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => onViewChange({ ...view, y: view.y - 10 })} aria-label="Décennie précédente" className={navBtn}>
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <span className="text-sm font-medium tabular-nums">
              {startDecade} – {startDecade + 9}
            </span>
            <button type="button" onClick={() => onViewChange({ ...view, y: view.y + 10 })} aria-label="Décennie suivante" className={navBtn}>
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }, (_, i) => startDecade - 1 + i).map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => {
                  onViewChange({ y: year, m: view.m });
                  setMode('months');
                }}
                className={cn(
                  'h-8 rounded-md text-xs font-medium tabular-nums transition-colors hover:bg-zinc-100',
                  year === currentYear && 'bg-emerald-500 text-white hover:bg-emerald-600',
                  year === view.y && 'bg-brand-600 font-semibold text-white hover:bg-brand-700',
                  (year < startDecade || year > startDecade + 9) && 'opacity-40',
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      ) : mode === 'months' ? (
        <div className="pointer-events-auto">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => onViewChange({ ...view, y: view.y - 1 })} aria-label="Année précédente" className={navBtn}>
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setMode('years')}
              className="cursor-pointer text-sm font-medium tabular-nums transition-colors hover:text-brand-700"
            >
              {view.y}
            </button>
            <button type="button" onClick={() => onViewChange({ ...view, y: view.y + 1 })} aria-label="Année suivante" className={navBtn}>
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((month, i) => (
              <button
                key={month}
                type="button"
                onClick={() => {
                  onViewChange({ ...view, m: i });
                  setMode('days');
                }}
                className={cn(
                  'h-8 rounded-md text-xs font-medium transition-colors hover:bg-zinc-100',
                  i === now.getMonth() && view.y === currentYear && 'bg-emerald-500 text-white hover:bg-emerald-600',
                  i === view.m && 'bg-brand-600 font-semibold text-white hover:bg-brand-700',
                )}
              >
                {month.slice(0, 4).trim()}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="pointer-events-auto">
          <div className="relative flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={() => shiftView(-1)}
              aria-label="Mois précédent"
              className={cn(navBtn, 'absolute left-1')}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setMode('months')}
              className="cursor-pointer text-sm font-medium transition-colors hover:text-brand-700"
            >
              {MONTHS[view.m]} {view.y}
            </button>
            <button
              type="button"
              onClick={() => shiftView(1)}
              disabled={atMaxMonth}
              aria-label="Mois suivant"
              className={cn(navBtn, 'absolute right-1')}
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
          <div role="grid" aria-label={`Calendrier ${MONTHS[view.m]} ${view.y}`} className="mt-3 w-full">
            <div role="row" className="flex w-full">
              {WEEKDAYS.map((w) => (
                <span
                  key={w}
                  role="columnheader"
                  aria-hidden
                  className="w-9 rounded-md text-center font-normal text-zinc-400 text-[0.8rem]"
                >
                  {w}
                </span>
              ))}
            </div>
            <div className="mt-2 w-full">
              {Array.from({ length: 6 }, (_, week) => (
                <div key={week} role="row" className="flex w-full">
                  {cells.slice(week * 7, week * 7 + 7).map(({ date, key, inView, disabled }) => {
                    const endpoint = isEndpoint(key);
                    const band = inBand(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        role="gridcell"
                        aria-selected={endpoint || band}
                        aria-label={dayAriaLabel(date)}
                        disabled={disabled}
                        onClick={() => {
                          onPick(key);
                          const [y, m] = key.split('-').map(Number);
                          if (m - 1 !== view.m || y !== view.y) onViewChange({ y, m: m - 1 });
                        }}
                        className={cn(
                          'grid h-9 w-9 place-items-center p-0 text-sm font-normal transition-colors focus-visible:relative focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-brand-600 aria-selected:opacity-100',
                          endpoint
                            ? 'rounded-md border-2 border-brand-600 bg-brand-600/10 font-semibold text-brand-700'
                            : band
                              ? 'rounded-none border-y-2 border-x-0 border-emerald-500 bg-emerald-500/10 text-zinc-900'
                              : 'rounded-full hover:bg-zinc-100',
                          !inView && !endpoint && 'text-zinc-400 opacity-50',
                          inView && !endpoint && !band && 'text-zinc-700',
                          key === today && !endpoint && 'font-medium text-zinc-900 ring-1 ring-inset ring-emerald-500',
                          disabled && 'cursor-not-allowed opacity-30 hover:bg-transparent',
                        )}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
