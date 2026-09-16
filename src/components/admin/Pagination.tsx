import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  label: string;
}

/** Pagination partagée (admin + pages publiques à venir). */
export function Pagination({ page, totalPages, onChange, label }: Props) {
  if (totalPages <= 1) return null;
  const pages: (number | '…')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }
  return (
    <nav aria-label={label} className="flex max-w-full flex-wrap items-center justify-center gap-1.5 sm:gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Page précédente"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </Button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-zinc-400" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
            className={`flex size-8 items-center justify-center rounded-lg text-sm font-medium tabular-nums transition ${
              p === page
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-300 bg-white hover:bg-zinc-100'
            }`}
          >
            {p}
          </button>
        ),
      )}
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Page suivante"
      >
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </nav>
  );
}
