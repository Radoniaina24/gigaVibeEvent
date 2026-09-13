import { Badge } from '../ui/Card';

const EVENT_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  pending_review: 'En validation',
  changes_requested: 'Modifs demandées',
  published: 'Publié',
  sold_out: 'Complet',
  suspended: 'Suspendu',
  cancelled: 'Annulé',
  completed: 'Terminé',
};

function eventTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  switch (status) {
    case 'published':
      return 'success';
    case 'draft':
    case 'completed':
      return 'neutral';
    case 'pending_review':
    case 'changes_requested':
      return 'info';
    case 'sold_out':
    case 'suspended':
      return 'warning';
    case 'cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}

const PARTNER_LABELS: Record<string, string> = {
  active: 'Actif',
  pending: 'En attente',
  suspended: 'Suspendu',
  disabled: 'Désactivé',
};

function partnerTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending':
      return 'warning';
    case 'suspended':
    case 'disabled':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function PartnerStatusBadge({ status }: { status: string }) {
  return <Badge tone={partnerTone(status)}>{PARTNER_LABELS[status] ?? status}</Badge>;
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
