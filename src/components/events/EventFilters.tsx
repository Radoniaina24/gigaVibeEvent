import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { Category } from '../../types/database';
import {
  eventFiltersSchema,
  type EventFiltersInput,
  type EventSortKey,
} from '../../schemas/events';
import { Button } from '../ui/Button';

const SORT_OPTIONS: { value: EventSortKey; label: string }[] = [
  { value: 'date_asc', label: 'Date croissante' },
  { value: 'date_desc', label: 'Date décroissante' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'popular', label: 'Populaires' },
];

interface Props {
  filters: EventFiltersInput;
  categories: Category[];
  onChange: (filters: EventFiltersInput) => void;
  onReset: () => void;
}

const inputClass =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10';

export function EventFilters({ filters, categories, onChange, onReset }: Props) {
  const set = (patch: Partial<EventFiltersInput>) =>
    onChange(eventFiltersSchema.parse({ ...filters, ...patch, page: patch.page ?? 1 }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <SlidersHorizontal className="size-4" aria-hidden /> Filtres
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="f-search" className="mb-1 block text-xs font-medium text-zinc-600">
            Recherche
          </label>
          <input
            id="f-search"
            type="search"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Nom, lieu, organisateur…"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="f-category" className="mb-1 block text-xs font-medium text-zinc-600">
            Catégorie
          </label>
          <select
            id="f-category"
            value={filters.category}
            onChange={(e) => set({ category: e.target.value })}
            className={inputClass}
          >
            <option value="">Toutes</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-sort" className="mb-1 block text-xs font-medium text-zinc-600">
            Tri
          </label>
          <select
            id="f-sort"
            value={filters.sort}
            onChange={(e) => set({ sort: e.target.value as EventSortKey })}
            className={inputClass}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-from" className="mb-1 block text-xs font-medium text-zinc-600">
            À partir du
          </label>
          <input
            id="f-from"
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => set({ from: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="f-to" className="mb-1 block text-xs font-medium text-zinc-600">
            Jusqu'au
          </label>
          <input
            id="f-to"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => set({ to: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="f-maxprice" className="mb-1 block text-xs font-medium text-zinc-600">
            Prix max (Ar)
          </label>
          <input
            id="f-maxprice"
            type="number"
            min={0}
            step={5000}
            placeholder="Ex. 100 000"
            value={filters.maxPrice > 0 ? filters.maxPrice : ''}
            onChange={(e) =>
              set({ maxPrice: e.target.value === '' ? 0 : Number(e.target.value) })
            }
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={filters.soonFullOnly}
            onChange={(e) => set({ soonFullOnly: e.target.checked })}
            className="size-4 accent-zinc-900"
          />
          Bientôt complets uniquement
        </label>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="size-4" aria-hidden /> Réinitialiser
        </Button>
      </div>
    </div>
  );
}
