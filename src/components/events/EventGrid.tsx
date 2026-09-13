import type { ReactNode } from 'react';
import type { EventWithStats } from '../../features/events/eventUtils';
import { EventCard, EventCardSkeleton } from './EventCard';
import { EmptyState, ErrorState, LoadingState } from '../ui/States';

interface Props {
  title?: ReactNode;
  events?: EventWithStats[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  skeletonCount?: number;
}

export function EventGrid({
  title,
  events,
  isPending,
  isError,
  onRetry,
  emptyTitle = 'Aucun événement disponible.',
  emptyDescription,
  emptyAction,
  skeletonCount = 6,
}: Props) {
  if (isPending) {
    return (
      <section aria-label={typeof title === 'string' ? title : 'Événements'}>
        {title}
        <div
          role="status"
          aria-label="Chargement des événements"
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
        <LoadingState label="Chargement des événements…" />
      </section>
    );
  }

  if (isError) {
    return (
      <section>
        {title}
        <ErrorState
          description="Impossible de charger les événements."
          onRetry={onRetry}
        />
      </section>
    );
  }

  if (!events || events.length === 0) {
    return (
      <section>
        {title}
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </section>
    );
  }

  return (
    <section>
      {title}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </section>
  );
}
