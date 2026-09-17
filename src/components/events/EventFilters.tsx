import { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  X,
} from 'lucide-react';
import type { Category } from '../../types/database';
import {
  eventFiltersSchema,
  type EventFiltersInput,
} from '../../schemas/events';
import { DateRangeFilter } from '../ui/DateRangeFilter';
import { cn, formatAr } from '../../lib/utils';

const PRICE_MAX = 200_000;
const PRICE_STEP = 5_000;
const PRICE_OPTIONS = [0, 20_000, 50_000, 100_000];
const MAX_VISIBLE_CATEGORIES = 7;

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

const sectionTitle = 'text-sm font-bold text-zinc-900';

/* ---------- Lignes façon Amazon : checkbox / radio ---------- */
function CheckRow({
  checked,
  onToggle,
  label,
  count,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  count?: number;
}) {
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={onToggle}
        className="group flex w-full items-center gap-2 rounded-md px-1 py-[5px] text-left text-[13px] transition hover:text-brand-700"
      >
        <span
          aria-hidden
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition',
            checked
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-zinc-400 bg-white group-hover:border-zinc-500',
          )}
        >
          {checked && <Check className="size-3" strokeWidth={3.5} aria-hidden />}
        </span>
        <span className={cn(
          'min-w-0 flex-1 truncate',
          checked ? 'font-semibold text-zinc-900 group-hover:text-brand-700' : 'text-zinc-700',
        )}>
          {label}
        </span>
        {typeof count === 'number' && (
          <span className="shrink-0 text-xs tabular-nums text-zinc-400">({count})</span>
        )}
      </button>
    </li>
  );
}

function RadioRow({
  checked,
  onSelect,
  label,
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <li>
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        onClick={onSelect}
        className="group flex w-full items-center gap-2 rounded-md px-1 py-[5px] text-left text-[13px] transition hover:text-brand-700"
      >
        <span
          aria-hidden
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-full border transition',
            checked ? 'border-brand-600' : 'border-zinc-400 bg-white group-hover:border-zinc-500',
          )}
        >
          {checked && <span className="size-1.5 rounded-full bg-brand-600" />}
        </span>
        <span className={cn(
          'min-w-0 flex-1 truncate tabular-nums',
          checked ? 'font-semibold text-zinc-900 group-hover:text-brand-700' : 'text-zinc-700',
        )}>
          {label}
        </span>
      </button>
    </li>
  );
}


/**
 * Sidebar de filtres façon Amazon (colonne gauche).
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
  const [showAllCats, setShowAllCats] = useState(false);

  const set = (patch: Partial<EventFiltersInput>) =>
    onChange(eventFiltersSchema.parse({ ...filters, ...patch, page: patch.page ?? 1 }));

  const activeCount =
    (filters.category ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0) +
    (filters.maxPrice > 0 ? 1 : 0) +
    (filters.soonFullOnly ? 1 : 0);
  const hasActive = activeCount > 0 || filters.search !== '';

  const today = useMemo(() => toISODate(new Date()), []);
  const tomorrow = useMemo(() => toISODate(addDays(new Date(), 1)), []);
  const weekend = useMemo(() => weekendRange(), []);
  const month = useMemo(() => monthRange(), []);

  const DATE_PRESETS = [
    { label: 'Toutes les dates', from: '', to: '' },
    { label: "Aujourd'hui", from: today, to: today },
    { label: 'Demain', from: tomorrow, to: tomorrow },
    { label: 'Ce week-end', from: weekend.from, to: weekend.to },
    { label: 'Ce mois-ci', from: month.from, to: month.to },
  ];
  const activeDatePreset = DATE_PRESETS.findIndex(
    (p) => p.from === filters.from && p.to === filters.to,
  );

  const totalCount = categories.reduce((s, c) => s + (counts?.[c.slug] ?? 0), 0);
  const visibleCats = showAllCats ? categories : categories.slice(0, MAX_VISIBLE_CATEGORIES);

  const sliderValue = filters.maxPrice === 0 ? PRICE_MAX : Math.min(filters.maxPrice, PRICE_MAX);

  return (
    <section
      aria-label="Filtres des événements"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
    >
      {/* En-tête façon Amazon */}
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-zinc-900">
          Filtres
          {activeCount > 0 && (
            <span
              aria-label={`${activeCount} filtre${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}`}
              className="flex size-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold tabular-nums text-white"
            >
              {activeCount}
            </span>
          )}
        </h2>
        {hasActive && (
          <button
            type="button"
            onClick={onReset}
            className="text-[13px] font-medium text-brand-700 transition hover:text-brand-600 hover:underline"
          >
            Tout effacer
          </button>
        )}
      </div>

      <div className="divide-y divide-zinc-200 border-t border-zinc-200">
        {/* Catégories */}
        <fieldset className="px-3 py-4">
          <legend className={sectionTitle}>Catégorie</legend>
          <ul className="mt-1.5" aria-label="Filtrer par catégorie">
            <CheckRow
              checked={filters.category === ''}
              onToggle={() => set({ category: '' })}
              label="Toutes catégories"
              count={totalCount}
            />
            {visibleCats.map((c) => {
              const active = filters.category === c.slug;
              return (
                <CheckRow
                  key={c.id}
                  checked={active}
                  onToggle={() => set({ category: active ? '' : c.slug })}
                  label={c.name}
                  count={counts?.[c.slug] ?? 0}
                />
              );
            })}
          </ul>
          {categories.length > MAX_VISIBLE_CATEGORIES && (
            <button
              type="button"
              onClick={() => setShowAllCats((v) => !v)}
              aria-expanded={showAllCats}
              className="mt-1 flex items-center gap-1 px-1 py-1 text-[13px] font-medium text-brand-700 transition hover:text-brand-600 hover:underline"
            >
              <ChevronDown
                aria-hidden
                className={cn('size-3.5 transition-transform', showAllCats && 'rotate-180')}
              />
              {showAllCats ? 'Voir moins' : `Voir plus (${categories.length - MAX_VISIBLE_CATEGORIES})`}
            </button>
          )}
        </fieldset>

        {/* Dates */}
        <fieldset className="px-3 py-4">
          <legend className={sectionTitle}>Dates</legend>
          <ul className="mt-1.5" aria-label="Filtrer par date">
            {DATE_PRESETS.map((p, i) => (
              <RadioRow
                key={p.label}
                checked={activeDatePreset === i}
                onSelect={() => set({ from: p.from, to: p.to })}
                label={p.label}
              />
            ))}
          </ul>
          <p className="mb-1.5 mt-3 px-1 text-xs font-semibold text-zinc-500">Période personnalisée</p>
          <div className="px-1">
            <DateRangeFilter
              ariaLabel="Filtrer par période personnalisée"
              value={{ from: filters.from || null, to: filters.to || null }}
              onChange={(v) => set({ from: v.from ?? '', to: v.to ?? '' })}
            />
          </div>
        </fieldset>

        {/* Prix */}
        <fieldset className="px-3 py-4">
          <legend className={sectionTitle}>Prix</legend>
          <ul className="mt-1.5" aria-label="Filtrer par prix">
            {PRICE_OPTIONS.map((p) => (
              <RadioRow
                key={p}
                checked={filters.maxPrice === p}
                onSelect={() => set({ maxPrice: p })}
                label={p === 0 ? 'Tous les prix' : `Moins de ${formatAr(p)}`}
              />
            ))}
          </ul>
          <div className="mx-1 mt-3 rounded-lg bg-zinc-50 p-3">
            <div className="flex items-center justify-between">
              <label htmlFor={`${idPrefix}-price`} className="text-[13px] font-medium text-zinc-600">
                Prix max
              </label>
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

        {/* Disponibilité */}
        <fieldset className="px-3 py-4">
          <legend className={sectionTitle}>Disponibilité</legend>
          <ul className="mt-1.5" aria-label="Filtrer par disponibilité">
            <CheckRow
              checked={filters.soonFullOnly}
              onToggle={() => set({ soonFullOnly: !filters.soonFullOnly })}
              label="Bientôt complets uniquement"
            />
          </ul>
        </fieldset>
      </div>

      {/* Pied : drawer mobile uniquement (le desktop filtre en direct) */}
      {onApply && (
        <div className="border-t border-zinc-200 bg-zinc-50/70 p-3">
          <button
            type="button"
            onClick={() => onApply()}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-sm shadow-brand-600/30 transition hover:bg-brand-700"
          >
            Voir {typeof resultCount === 'number' ? `${resultCount} résultat${resultCount > 1 ? 's' : ''}` : 'les résultats'}
          </button>
        </div>
      )}
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
