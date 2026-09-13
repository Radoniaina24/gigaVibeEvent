import { Badge } from '../ui/Card';

const EVENT_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  sold_out: 'Complet',
  cancelled: 'Annulé',
  completed: 'Terminé',
};

function eventTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  switch (status) {
    case 'published':
      return 'success';
    case 'draft':
      return 'neutral';
    case 'sold_out':
      return 'warning';
    case 'cancelled':
      return 'danger';
    case 'completed':
      return 'info';
    default:
      return 'neutral';
  }
}

export function EventStatusBadge({ status }: { status: string }) {
  return <Badge tone={eventTone(status)}>{EVENT_LABELS[status] ?? status}</Badge>;
}

const TICKET_STATUS_LABELS: Record<string, string> = {
  valid: 'Valide',
  used: 'Utilisé',
  cancelled: 'Annulé',
  expired: 'Expiré',
};

export function TicketStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={status === 'valid' ? 'success' : status === 'used' ? 'neutral' : 'danger'}>
      {TICKET_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
