import { Link } from 'react-router-dom';
import { CalendarDays, Clock, Flame, MapPin, Sparkles } from 'lucide-react';
import type { EventWithStats } from '../../features/events/eventUtils';
import { formatAr, formatDate } from '../../lib/utils';
import { Badge } from '../ui/Card';
import { EventImage } from './EventImage';

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function EventCard({ event }: { event: EventWithStats }) {
  const soldOut = event.total_available <= 0;
  return (
    <Link
      to={`/events/${event.slug}`}
      aria-label={`Voir ${event.title}`}
      className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
    >
      <div className="relative">
        <EventImage
          seed={event.id}
          imageUrl={event.image_url}
          title={event.title}
          className="aspect-[16/9] w-full transition group-hover:opacity-95"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          {event.category && <Badge tone="info">{event.category.name}</Badge>}
          {event.is_featured && (
            <Badge tone="warning">
              <Sparkles className="mr-1 size-3" aria-hidden /> Populaire
            </Badge>
          )}
        </div>
        {event.soon_full && !soldOut && (
          <div className="absolute right-3 top-3">
            <Badge tone="danger">
              <Flame className="mr-1 size-3" aria-hidden /> Bientôt complet
            </Badge>
          </div>
        )}
        {soldOut && (
          <div className="absolute right-3 top-3">
            <Badge tone="neutral">Complet</Badge>
          </div>
        )}
      </div>

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 font-semibold group-hover:underline">
          {event.title}
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-zinc-500">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          {formatDate(event.starts_at)}
          <Clock className="ml-2 size-4 shrink-0" aria-hidden />
          {formatTime(event.starts_at)}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-zinc-500">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="line-clamp-1">
            {event.venue} · {event.city}
          </span>
        </p>
        <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
          <p className="text-sm">
            {event.min_price !== null ? (
              <>
                <span className="text-xs text-zinc-500">dès </span>
                <strong>{formatAr(event.min_price)}</strong>
              </>
            ) : (
              <span className="text-xs text-zinc-400">Prix à venir</span>
            )}
          </p>
          <p className="text-xs text-zinc-500">
            {soldOut
              ? 'Aucune place'
              : `${event.total_available} place${event.total_available > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function EventCardSkeleton() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
    >
      <div className="skeleton aspect-[16/9] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    </div>
  );
}
