import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  LayoutGrid,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Wallet,
  X,
} from 'lucide-react';
import type { Category } from '../../types/database';
import {
  eventFiltersSchema,
  type EventFiltersInput,
} from '../../schemas/events';
import { cn, formatAr } from '../../lib/utils';

const PRICE_MAX = 200_000;
const PRICE_STEP = 5_000;

interface SidebarProps {
  filters: EventFiltersInput;
  categories: Category[];
  counts?: Record<string, number>;
  resultCount?: number;
  idPrefix?: string;
  onChange: (filters: EventFiltersInput) => void;
  onReset: () => void;
  onApply?: () => void;
}

/* ---------- helpers dates ---------- */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}
function weekendRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  if (day === 0) return { from: toISODate(now), to: toISODate(now) };
  if (day === 6) return { from: toISODate(now), to: toISODate(addDays(now, 1)) };
  return { from: toISODate(addDays(now, 6 - day)), to: toISODate(addDays(now, 7 - day)) };
}
function monthRange(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toISODate(first), to: toISODate(last) };
}

const sectionTitle = 'flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500';

const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

function parseISODate(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

function formatShortFr(iso: string): string {
  const dt = parseISODate(iso);
  if (!dt) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dt);
}

/* ---------- Select Catégorie façon shadcn (trigger + popover portal) ---------- */
function CategorySelect({
  value,
  categories,
  counts,
  idPrefix,
  onSelect,
}: {
  value: string;
  categories: Category[];
  counts?: Record<string, number>;
  idPrefix: string;
  onSelect: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = `${idPrefix}-cat-list`;

  const selected = categories.find((c) => c.slug === value) ?? null;
  const totalCount = categories.reduce((s, c) => s + (counts?.[c.slug] ?? 0), 0);

  interface CatOption { key: string; slug: string; name: string; count: number }
  const options: CatOption[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cats = q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : categories;
    return [
      { key: '__all', slug: '', name: 'Toutes catégories', count: totalCount },
      ...cats.map((c) => ({ key: c.id, slug: c.slug, name: c.name, count: counts?.[c.slug] ?? 0 })),
    ];
  }, [categories, counts, query, totalCount]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  /* Fait défiler l'option surlignée (clavier) */
  useEffect(() => {
    if (!open) return;
    itemRefs.current[highlight]?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open ]);

  const measure = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const up = spaceBelow < 240 && r.top > spaceBelow;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8));
    setPos(up
      ? { bottom: window.innerHeight - r.top + 8, left, width: r.width }
      : { top: r.bottom + 8, left, width: r.width });
  };

  const closeMenu = (focusTrigger: boolean) => {
    setOpen(false);
    setPos(null);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const openMenu = () => {
    measure();
    setQuery('');
    const i = value === ''
      ? 0
      : 1 + categories.findIndex((c) => c.slug === value);
    setHighlight(i >= 0 ? i : 0);
    setOpen(true);
    window.setTimeout(() => searchRef.current?.focus(), 30);
  };

  const choose = (slug: string) => {
    onSelect(slug);
    setOpen(false);
    setPos(null);
    triggerRef.current?.focus();
  };

  const toggleOption = (slug: string) => {
    choose(slug === value ? '' : slug);
  };

  /* Fermetures : extérieur, Escape, scroll, resize */
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
      const t = e.target as Node;
      if (contentRef.current?.contains(t)) return;
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

  const moveHighlight = (dir: 1 | -1) =>
    setHighlight((h) => (h + dir + options.length) % Math.max(1, options.length));

  return (
    <div className="mt-4">
      {/* Trigger façon shadcn Select */}
      <button
        ref={triggerRef}
        type="button"
        id={`${idPrefix}-cat-button`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Choisir une catégorie"
        onClick={() => (open ? closeMenu(true) : openMenu())}
        onKeyDown={(e) => {
          if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
            e.preventDefault();
            if (!open) openMenu();
          }
        }}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-2.5 text-left shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
          open
            ? 'border-brand-600 ring-4 ring-brand-600/10'
            : selected
              ? 'border-zinc-300 hover:border-zinc-400'
              : 'border-zinc-200 hover:border-zinc-300',
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg transition',
              selected ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500',
            )}
          >
            {selected ? <Tag className="size-3.5" aria-hidden /> : <LayoutGrid className="size-3.5" aria-hidden />}
          </span>
          <span
            className={cn(
              'truncate text-sm',
              selected ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-500',
            )}
          >
            {selected ? selected.name : 'Choisir une catégorie'}
          </span>
          {selected && (
            <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-zinc-500">
              {counts?.[selected.slug] ?? 0}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-0.5">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Effacer la catégorie"
              onClick={(e) => {
                e.stopPropagation();
                choose('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  choose('');
                }
              }}
              className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            >
              <X className="size-4" aria-hidden />
            </span>
          )}
          <ChevronDown
            aria-hidden
            className={cn('size-4 opacity-50 transition-transform duration-200', open && 'rotate-180')}
          />
        </span>
      </button>

      {/* Popover (portal : échappe aux overflow de la sidebar) */}
      {open && pos && createPortal(
        <div
          ref={contentRef}
          style={{
            position: 'fixed',
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            width: Math.max(240, pos.width),
            zIndex: 70,
          }}
          className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_24px_64px_-16px_rgb(0_0_0/0.35)]"
        >
          <div className="border-b border-zinc-100 p-1.5">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); moveHighlight(1); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); moveHighlight(-1); }
                  else if (e.key === 'Enter') {
                    e.preventDefault();
                    const opt = options[highlight];
                    if (opt) toggleOption(opt.slug);
                  } else if (e.key === 'Home') { e.preventDefault(); setHighlight(0); }
                  else if (e.key === 'End') { e.preventDefault(); setHighlight(options.length - 1); }
                }}
                placeholder="Rechercher…"
                aria-label="Rechercher une catégorie"
                aria-controls={listId}
                className="h-9 w-full rounded-lg bg-zinc-50 pl-9 pr-8 text-sm outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-brand-600/20 [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Effacer la recherche de catégorie"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </div>
          </div>

          <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">
            Catégories
          </p>
          <ul
            id={listId}
            role="listbox"
            aria-label="Catégories disponibles"
            className="max-h-60 overflow-y-auto p-1.5 pt-0"
          >
            {options.map((opt, i) => {
              const active = value === opt.slug;
              const isHl = highlight === i;
              return (
                <li key={opt.key} role="option" aria-selected={active}>
                  <button
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    type="button"
                    onClick={() => toggleOption(opt.slug)}
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
                    <span className="min-w-0 flex-1 truncate">{opt.name}</span>
                    <span className={cn(
                      'shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                      active ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500',
                    )}>
                      {opt.count}
                    </span>
                  </button>
                </li>
              );
            })}
            {options.length <= 1 && (
              <li className="px-3 py-6 text-center text-[13px] text-zinc-400">
                Aucune catégorie trouvée pour « {query} ».
              </li>
            )}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ---------- Champ date custom (calendrier pro, non natif) ---------- */
function DateField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const selected = parseISODate(value);
  const base = selected ?? (min ? parseISODate(min) : null) ?? new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });

  /* Suit les presets externes (ex. "Ce week-end") */
  useEffect(() => {
    const dt = parseISODate(value);
    if (dt) setView({ y: dt.getFullYear(), m: dt.getMonth() });
  }, [value]);

  /* Popover façon shadcn : mesure + fermetures */
  const measure = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const W = 300;
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const up = spaceBelow < 360 && r.top > spaceBelow;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - W - 8));
    setPos(up
      ? { bottom: window.innerHeight - r.top + 8, left }
      : { top: r.bottom + 8, left });
  };

  const closeMenu = (focusTrigger: boolean) => {
    setOpen(false);
    setPos(null);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const openMenu = () => {
    measure();
    setOpen(true);
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

  const todayISO = toISODate(new Date());
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // lundi = 0
  const monthLabel = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(view.y, view.m, 1));

  const outOfRange = (iso: string) =>
    (min && iso < min) || (max && iso > max) ? true : false;

  const pick = (day: number) => {
    const iso = toISODate(new Date(view.y, view.m, day));
    if (outOfRange(iso)) return;
    onChange(iso);
    closeMenu(true);
  };

  const goMonth = (dir: 1 | -1) =>
    setView((v) => {
      const m = v.m + dir;
      return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });

  const todayAllowed = !outOfRange(todayISO);

  return (
    <div>
      <span id={`${id}-label`} className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? closeMenu(true) : openMenu())}
        onKeyDown={(e) => {
          if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
            e.preventDefault();
            if (!open) openMenu();
          }
        }}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-1.5 rounded-xl border bg-white px-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
          open
            ? 'border-brand-600 ring-4 ring-brand-600/10'
            : value
              ? 'border-zinc-900 shadow-sm hover:border-zinc-700'
              : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm',
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg transition',
              value ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500',
            )}
          >
            <CalendarDays className="size-4" aria-hidden />
          </span>
          <span
            id={`${id}-value`}
            className={cn(
              'truncate text-[13px] tabular-nums',
              value ? 'font-semibold text-zinc-900' : 'text-zinc-400',
            )}
          >
            {value ? formatShortFr(value) : 'JJ/MM/AAAA'}
          </span>
        </span>
        <span className="flex shrink-0 items-center">
          {value && (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Effacer la date ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange('');
                }
              }}
              className="rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            >
              <X className="size-3.5" aria-hidden />
            </span>
          )}
          <ChevronDown
            aria-hidden
            className={cn('size-3.5 text-zinc-400 transition-transform duration-200', open && 'rotate-180')}
          />
        </span>
      </button>

      {open && pos && createPortal(
        <div
          ref={contentRef}
          role="dialog"
          aria-label={`Choisir la date ${label}`}
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width: 300, zIndex: 70 }}
          className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-[0_24px_64px_-16px_rgb(0_0_0/0.35)]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              aria-label="Mois précédent"
              className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <p className="text-[13px] font-bold capitalize tabular-nums" aria-live="polite">{monthLabel}</p>
            <button
              type="button"
              onClick={() => goMonth(1)}
              aria-label="Mois suivant"
              className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
          <div aria-hidden className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1">{d}</span>
            ))}
          </div>
          <div className="mt-0.5 grid grid-cols-7 gap-0.5">
            {Array.from({ length: offset }).map((_, i) => (
              <span key={`blank-${i}`} aria-hidden />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const iso = toISODate(new Date(view.y, view.m, day));
              const isSelected = value === iso;
              const isToday = todayISO === iso;
              const disabled = outOfRange(iso);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(day)}
                  aria-label={formatShortFr(iso)}
                  aria-pressed={isSelected}
                  aria-current={isToday && !isSelected ? 'date' : undefined}
                  className={cn(
                    'flex h-8 items-center justify-center rounded-lg text-[13px] tabular-nums transition',
                    isSelected
                      ? 'bg-zinc-900 font-bold text-white shadow-sm'
                      : disabled
                        ? 'cursor-not-allowed text-zinc-300'
                        : isToday
                          ? 'font-bold text-brand-700 ring-1 ring-inset ring-brand-600 hover:bg-brand-50'
                          : 'text-zinc-700 hover:bg-zinc-100',
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2">
            <button
              type="button"
              onClick={() => {
                onChange('');
                closeMenu(true);
              }}
              disabled={!value}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={() => {
                if (!todayAllowed) return;
                onChange(todayISO);
                closeMenu(true);
              }}
              disabled={!todayAllowed}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
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

/* ---------- Select Période façon shadcn (presets dates) ---------- */
export interface DatePreset {
  label: string;
  from: string;
  to: string;
}

function DatePresetSelect({
  idPrefix,
  options,
  activeIndex,
  filled,
  customLabel,
  onSelect,
}: {
  idPrefix: string;
  options: DatePreset[];
  activeIndex: number;
  filled: boolean;
  customLabel: string | null;
  onSelect: (p: DatePreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = `${idPrefix}-period-list`;

  const display = activeIndex >= 0
    ? options[activeIndex].label
    : (customLabel ?? options[0].label);

  const measure = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const up = spaceBelow < 300 && r.top > spaceBelow;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8));
    setPos(up
      ? { bottom: window.innerHeight - r.top + 8, left, width: r.width }
      : { top: r.bottom + 8, left, width: r.width });
  };

  const closeMenu = (focusTrigger: boolean) => {
    setOpen(false);
    setPos(null);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const openMenu = () => {
    measure();
    setHighlight(activeIndex >= 0 ? activeIndex : 0);
    setOpen(true);
    window.setTimeout(() => itemRefs.current[activeIndex >= 0 ? activeIndex : 0]?.focus(), 30);
  };

  const choose = (p: DatePreset) => {
    onSelect(p);
    setOpen(false);
    setPos(null);
    triggerRef.current?.focus();
  };

  /* Fermetures : extérieur, Escape, scroll, resize */
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
    <div className="mt-3">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-label="Choisir une période"
        onClick={() => (open ? closeMenu(true) : openMenu())}
        onKeyDown={(e) => {
          if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
            e.preventDefault();
            if (!open) openMenu();
          }
        }}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-2.5 text-left shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
          open
            ? 'border-brand-600 ring-4 ring-brand-600/10'
            : filled
              ? 'border-zinc-300 hover:border-zinc-400'
              : 'border-zinc-200 hover:border-zinc-300',
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg transition',
              filled ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500',
            )}
          >
            <CalendarDays className="size-3.5" aria-hidden />
          </span>
          <span className={cn('truncate text-sm', filled ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-500')}>
            {display}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn('size-4 shrink-0 opacity-50 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && pos && createPortal(
        <div
          ref={contentRef}
          role="listbox"
          aria-label="Périodes disponibles"
          style={{
            position: 'fixed',
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            width: Math.max(220, pos.width),
            zIndex: 70,
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); moveHighlight(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); moveHighlight(-1); }
            else if (e.key === 'Home') { e.preventDefault(); setHighlight(0); itemRefs.current[0]?.focus(); }
            else if (e.key === 'End') {
              e.preventDefault();
              setHighlight(options.length - 1);
              itemRefs.current[options.length - 1]?.focus();
            }
          }}
          className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_24px_64px_-16px_rgb(0_0_0/0.35)]"
        >
          <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">
            Période
          </p>
          <ul id={listId} className="max-h-72 overflow-y-auto p-1.5 pt-0">
            {options.map((p, i) => {
              const active = activeIndex === i;
              const isHl = highlight === i;
              return (
                <li key={p.label} role="option" aria-selected={active}>
                  <button
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    type="button"
                    onClick={() => choose(p)}
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
                    <span className="truncate">{p.label}</span>
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

/**
 * Sidebar de filtres (colonne gauche, desktop).
 * Recherche + tri vivent dans la toolbar de droite (EventsPage).
 */
export function EventFilters({
  filters,
  categories,
  counts,
  resultCount,
  idPrefix = 'f',
  onChange,
  onReset,
  onApply,
}: SidebarProps) {
  const set = (patch: Partial<EventFiltersInput>) =>
    onChange(eventFiltersSchema.parse({ ...filters, ...patch, page: patch.page ?? 1 }));

  const activeCount =
    (filters.category ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0) +
    (filters.maxPrice > 0 ? 1 : 0) +
    (filters.soonFullOnly ? 1 : 0);

  const today = useMemo(() => toISODate(new Date()), []);
  const tomorrow = useMemo(() => toISODate(addDays(new Date(), 1)), []);
  const weekend = useMemo(() => weekendRange(), []);
  const month = useMemo(() => monthRange(), []);

  const DATE_PRESETS: { label: string; from: string; to: string }[] = [
    { label: 'Toutes', from: '', to: '' },
    { label: "Aujourd'hui", from: today, to: today },
    { label: 'Demain', from: tomorrow, to: tomorrow },
    { label: 'Ce week-end', from: weekend.from, to: weekend.to },
    { label: 'Ce mois-ci', from: month.from, to: month.to },
  ];
  const activeDatePreset = DATE_PRESETS.findIndex(
    (p) => p.from === filters.from && p.to === filters.to,
  );

  const sliderValue = filters.maxPrice === 0 ? PRICE_MAX : Math.min(filters.maxPrice, PRICE_MAX);

  return (
    <section
      aria-label="Filtres des événements"
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.18)]"
    >
      {/* En-tête */}
      <div className="flex items-center justify-between gap-2 bg-zinc-900 px-4 py-3.5 text-white">
        <p className="flex items-center gap-2 text-sm font-bold">
          <SlidersHorizontal className="size-4" aria-hidden />
          Filtres
          {activeCount > 0 && (
            <span
              aria-label={`${activeCount} filtre${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}`}
              className="flex size-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold tabular-nums"
            >
              {activeCount}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={onReset}
          disabled={activeCount === 0 && !filters.search}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Réinitialiser
        </button>
      </div>

      <div className="divide-y divide-zinc-100">
        {/* Catégories : select custom pro */}
        <fieldset className="p-4 pt-5">
          <legend className={sectionTitle}>
            <LayoutGrid className="size-3.5" aria-hidden /> Catégorie
          </legend>
          <CategorySelect
            value={filters.category}
            categories={categories}
            counts={counts}
            idPrefix={idPrefix}
            onSelect={(slug) => set({ category: slug })}
          />
        </fieldset>

        {/* Dates */}
        <fieldset className="p-4">
          <legend className={sectionTitle}>
            <CalendarDays className="size-3.5" aria-hidden /> Dates
          </legend>
          <DatePresetSelect
            idPrefix={idPrefix}
            options={DATE_PRESETS}
            activeIndex={activeDatePreset}
            filled={filters.from !== '' || filters.to !== ''}
            customLabel={
              filters.from || filters.to
                ? (filters.from && filters.to && filters.from === filters.to
                  ? formatShortFr(filters.from)
                  : `${filters.from ? formatShortFr(filters.from) : '…'} → ${filters.to ? formatShortFr(filters.to) : '…'}`)
                : null
            }
            onSelect={(p) => set({ from: p.from, to: p.to })}
          />
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <DateField
              id={`${idPrefix}-from`}
              label="Du"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(iso) => set({ from: iso })}
            />
            <DateField
              id={`${idPrefix}-to`}
              label="Au"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(iso) => set({ to: iso })}
            />
          </div>
        </fieldset>

        {/* Budget */}
        <fieldset className="p-4">
          <legend className={sectionTitle}>
            <Wallet className="size-3.5" aria-hidden /> Budget max
          </legend>
          <div className="mt-3 rounded-xl bg-zinc-50 p-3">
            <div className="flex items-center justify-between">
              <label htmlFor={`${idPrefix}-price`} className="text-[13px] font-medium text-zinc-600">Plafond</label>
              <output
                htmlFor={`${idPrefix}-price`}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
                  filters.maxPrice === 0 ? 'bg-zinc-200/70 text-zinc-500' : 'bg-brand-50 text-brand-700',
                )}
              >
                {filters.maxPrice === 0 ? 'Illimité' : formatAr(filters.maxPrice)}
              </output>
            </div>
            <input
              id={`${idPrefix}-price`}
              type="range"
              min={PRICE_STEP}
              max={PRICE_MAX}
              step={PRICE_STEP}
              value={sliderValue}
              onChange={(e) => {
                const v = Number(e.target.value);
                set({ maxPrice: v >= PRICE_MAX ? 0 : v });
              }}
              className="mt-2 w-full accent-brand-600"
              aria-valuetext={filters.maxPrice === 0 ? 'Tous prix' : formatAr(filters.maxPrice)}
            />
            <div className="flex justify-between text-[11px] tabular-nums text-zinc-400">
              <span>{formatAr(PRICE_STEP)}</span>
              <span>{formatAr(PRICE_MAX)}+</span>
            </div>
          </div>
        </fieldset>

        {/* Options */}
        <fieldset className="p-4">
          <legend className={sectionTitle}>
            <Sparkles className="size-3.5" aria-hidden /> Options
          </legend>
          <button
            type="button"
            role="switch"
            aria-checked={filters.soonFullOnly}
            onClick={() => set({ soonFullOnly: !filters.soonFullOnly })}
            className={cn(
              'mt-3 flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition',
              filters.soonFullOnly ? 'border-red-200 bg-red-50/60' : 'border-zinc-200 hover:border-zinc-300',
            )}
          >
            <span className="flex items-center gap-2.5">
              <span className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg transition',
                filters.soonFullOnly ? 'bg-red-600 text-white' : 'bg-zinc-100 text-zinc-500',
              )}>
                <Flame className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold text-zinc-900">Bientôt complets</span>
                <span className="block text-xs text-zinc-500">Presque complets uniquement</span>
              </span>
            </span>
            <span aria-hidden className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors',
              filters.soonFullOnly ? 'bg-red-600' : 'bg-zinc-200',
            )}>
              <span className={cn(
                'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all',
                filters.soonFullOnly ? 'left-[22px]' : 'left-0.5',
              )} />
            </span>
          </button>
        </fieldset>
      </div>

      {/* Pied : CTA résultats */}
      <div className="border-t border-zinc-100 bg-zinc-50/70 p-4">
        <button
          type="button"
          onClick={() => onApply?.()}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-sm shadow-brand-600/30 transition hover:bg-brand-700"
        >
          Voir {typeof resultCount === 'number' ? `${resultCount} résultat${resultCount > 1 ? 's' : ''}` : 'les résultats'}
        </button>
      </div>
    </section>
  );
}

/* ---------- Chips des filtres actifs (colonne droite) ---------- */
export function EventActiveChips({
  filters,
  categories,
  onChange,
  onReset,
}: {
  filters: EventFiltersInput;
  categories: Category[];
  onChange: (f: EventFiltersInput) => void;
  onReset: () => void;
}) {
  const set = (patch: Partial<EventFiltersInput>) =>
    onChange(eventFiltersSchema.parse({ ...filters, ...patch, page: 1 }));
  const activeCategory = categories.find((c) => c.slug === filters.category);

  const chips: { key: string; label: string; onClear: () => void }[] = [];
  if (filters.search)
    chips.push({ key: 'q', label: `« ${filters.search} »`, onClear: () => set({ search: '' }) });
  if (activeCategory)
    chips.push({ key: 'cat', label: activeCategory.name, onClear: () => set({ category: '' }) });
  if (filters.from || filters.to)
    chips.push({
      key: 'date',
      label: filters.from && filters.to && filters.from === filters.to
        ? filters.from
        : `${filters.from || '…'} → ${filters.to || '…'}`,
      onClear: () => set({ from: '', to: '' }),
    });
  if (filters.maxPrice > 0)
    chips.push({ key: 'price', label: `≤ ${formatAr(filters.maxPrice)}`, onClear: () => set({ maxPrice: 0 }) });
  if (filters.soonFullOnly)
    chips.push({ key: 'soon', label: 'Bientôt complet', onClear: () => set({ soonFullOnly: false }) });

  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Filtres actifs" aria-live="polite">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.onClear}
          title="Retirer ce filtre"
          className="group inline-flex h-8 max-w-full items-center gap-1.5 rounded-full bg-zinc-900 py-1 pl-3 pr-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-zinc-700"
        >
          <span className="truncate">{c.label}</span>
          <X className="size-3.5 shrink-0 opacity-70 transition group-hover:opacity-100" aria-hidden />
          <span className="sr-only">Retirer le filtre {c.label}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="inline-flex h-8 items-center rounded-full px-3 text-[13px] font-semibold text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition hover:text-brand-700 hover:decoration-brand-300"
      >
        Tout effacer
      </button>
    </div>
  );
}
