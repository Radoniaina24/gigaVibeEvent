import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '../ui/Button';

export function EventSearchBar({
  initialValue = '',
  autoFocus = false,
}: {
  initialValue?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set('search', value.trim());
    navigate(`/events?${params.toString()}`);
  };

  return (
    <form
      role="search"
      aria-label="Rechercher un événement"
      onSubmit={submit}
      className="mx-auto flex w-full max-w-xl gap-2 rounded-xl bg-white p-2 shadow-lg"
    >
      <label htmlFor="hero-search" className="sr-only">
        Rechercher un événement
      </label>
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <input
          id="hero-search"
          type="search"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Concert, festival, match…"
          className="h-11 w-full rounded-lg bg-transparent pl-9 pr-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
        />
      </div>
      <Button type="submit" size="lg" className="shrink-0">
        Rechercher
      </Button>
    </form>
  );
}
