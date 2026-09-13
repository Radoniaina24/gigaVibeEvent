import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CalendarDays, Download, MapPin } from 'lucide-react';
import type { TicketWithRelations } from '../../features/orders/hooks';
import { formatAr, formatDate } from '../../lib/utils';
import { Badge, Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { downloadTicketHtml } from '../../features/tickets/downloadTicket';

function statusTone(status: string): 'success' | 'neutral' | 'danger' | 'warning' {
  switch (status) {
    case 'valid':
      return 'success';
    case 'used':
      return 'neutral';
    case 'cancelled':
    case 'expired':
      return 'danger';
    default:
      return 'warning';
  }
}

const STATUS_LABEL: Record<string, string> = {
  valid: 'Valide',
  used: 'Utilisé',
  cancelled: 'Annulé',
  expired: 'Expiré',
};

export function TicketCard({ ticket }: { ticket: TicketWithRelations }) {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const markup = new XMLSerializer().serializeToString(svg);
    downloadTicketHtml(ticket, markup);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-4 p-4">
        <div
          ref={qrRef}
          className="shrink-0 rounded-lg border border-zinc-200 bg-white p-2"
          role="img"
          aria-label={`QR Code du billet ${ticket.ticket_number}`}
        >
          <QRCodeSVG value={ticket.qr_payload} size={104} level="M" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold">
              {ticket.event?.title ?? 'Événement'}
            </p>
            <Badge tone={statusTone(ticket.status)}>
              {STATUS_LABEL[ticket.status] ?? ticket.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {ticket.ticket_type?.name ?? ''} · {ticket.holder_name}
          </p>
          {ticket.event && (
            <>
              <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                {formatDate(ticket.event.starts_at)}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {ticket.event.venue}, {ticket.event.city}
              </p>
            </>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs text-zinc-500">
              {ticket.ticket_number}
              {ticket.ticket_type && (
                <span className="ml-2 font-sans font-semibold text-zinc-900">
                  {formatAr(ticket.ticket_type.price)}
                </span>
              )}
            </p>
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download className="size-4" aria-hidden /> Billet
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
