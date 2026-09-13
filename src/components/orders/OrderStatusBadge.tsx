import { Badge } from '../ui/Card';

const LABELS: Record<string, string> = {
  pending: 'En attente',
  processing: 'En cours',
  paid: 'Payé',
  failed: 'Échoué',
  cancelled: 'Annulé',
  expired: 'Expiré',
};

function tone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'paid':
      return 'success';
    case 'pending':
    case 'processing':
      return 'warning';
    case 'failed':
    case 'expired':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge tone={tone(status)}>{LABELS[status] ?? status}</Badge>;
}
