import { useState } from 'react';
import Tilt from 'react-parallax-tilt';
import { QRCodeSVG } from 'qrcode.react';
import { CalendarDays, Download, MapPin, ScanLine, User } from 'lucide-react';
import type { TicketWithRelations } from '../../features/orders/hooks';
import { formatAr, formatDate, formatShortDateTime } from '../../lib/utils';
import { Badge, Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ticketQrValue } from '../../lib/ticketQr';
import { cn } from '../../lib/utils';

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

function holderInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][parts[1].length - 1]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * Billet événementiel 3D (react-parallax-tilt) : bandeau marque avec logo,
 * corps d'infos, perforation et souche QR à scanner. La carte pivote vers
 * le curseur avec reflet, en colonne sur mobile. 3D coupée si
 * `prefers-reduced-motion`.
 */
export function TicketCard({ ticket }: { ticket: TicketWithRelations }) {
  const [tiltEnabled] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [downloading, setDownloading] = useState(false);
  const isActive = ticket.status === 'valid';
  const qrValue = ticketQrValue(ticket);

  /** Télécharge le billet directement en PDF (même design que la carte). */
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      // Chargement différé : la librairie PDF ne pèse pas sur le bundle initial.
      const [{ pdf }, { TicketPdfDocument }, QRCode] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../../features/tickets/TicketPdf'),
        import('qrcode'),
      ]);
      const qrDataUrl = await QRCode.toDataURL(qrValue, {
        width: 448,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });
      const blob = await pdf(
        <TicketPdfDocument ticket={ticket} qrDataUrl={qrDataUrl} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ticket.ticket_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Tilt
      tiltEnable={tiltEnabled}
      tiltMaxAngleX={6}
      tiltMaxAngleY={8}
      perspective={1200}
      scale={1.01}
      transitionSpeed={400}
      glareEnable={tiltEnabled}
      glareMaxOpacity={0.18}
      glareColor="#ffffff"
      glarePosition="all"
      glareBorderRadius="12px"
      className="rounded-xl shadow-[0_24px_50px_-20px_rgb(0_0_0/0.35),0_10px_20px_-10px_rgb(0_0_0/0.15)]"
    >
      <Card className="min-w-0 overflow-hidden [transform-style:preserve-3d]">
        {/* Bandeau marque */}
        <div className={cn('relative overflow-hidden px-4 py-3 sm:px-5', isActive ? 'hero-glow bg-night-950' : 'bg-zinc-900')}>
          <div className="relative flex items-center gap-2.5 [transform:translateZ(28px)]">
            <img
              src="/logo.jpeg"
              alt="Logo Giga Vibe Event"
              loading="lazy"
              className="size-10 shrink-0 rounded-lg bg-white object-cover ring-1 ring-white/20"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white" title={ticket.event?.title ?? 'Événement'}>
                {ticket.event?.title ?? 'Événement'}
              </p>
              <p className="truncate text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                {ticket.ticket_type?.name ?? 'Billet'} · Giga Vibe Event
              </p>
            </div>
            <span className="shrink-0">
              <Badge tone={statusTone(ticket.status)}>
                {STATUS_LABEL[ticket.status] ?? ticket.status}
              </Badge>
            </span>
          </div>
        </div>

        {/* Corps + souche */}
        <div className="flex flex-col [transform:translateZ(12px)] sm:flex-row sm:items-stretch">
          {/* Infos */}
          <div className="min-w-0 flex-1 space-y-2.5 p-4 sm:p-5">
            <p className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-xs font-bold text-white"
              >
                {holderInitials(ticket.holder_name || '?')}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold" title={ticket.holder_name}>
                  {ticket.holder_name}
                </span>
                <span className="block truncate font-mono text-[11px] text-zinc-500" title={ticket.ticket_number}>
                  {ticket.ticket_number}
                </span>
              </span>
              {ticket.ticket_type && (
                <span className="ml-auto shrink-0 text-right">
                  <span className="block text-base font-bold tabular-nums sm:text-lg">
                    {formatAr(ticket.ticket_type.price)}
                  </span>
                  <span className="block text-[11px] text-zinc-500">
                    {ticket.order?.order_number ?? ''}
                  </span>
                </span>
              )}
            </p>

            {ticket.event && (
              <dl className="grid gap-1.5 rounded-xl bg-zinc-50 p-3 text-[13px] sm:grid-cols-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <CalendarDays className="size-4 shrink-0 text-brand-600" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate font-medium" title={formatDate(ticket.event.starts_at)}>
                      {formatDate(ticket.event.starts_at)}
                    </span>
                    <span className="block truncate text-xs tabular-nums text-zinc-500">
                      {formatShortDateTime(ticket.event.starts_at)}
                    </span>
                  </span>
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                  <MapPin className="size-4 shrink-0 text-brand-600" aria-hidden />
                  <span className="min-w-0 truncate font-medium" title={`${ticket.event.venue}, ${ticket.event.city}`}>
                    {ticket.event.venue}, {ticket.event.city}
                  </span>
                </div>
              </dl>
            )}

            <p className="flex items-center gap-1.5 text-xs text-zinc-500">
              <User className="size-3.5 shrink-0" aria-hidden />
              Présentez ce billet avec une pièce d’identité si demandée.
            </p>
          </div>

          {/* Perforation */}
          <div aria-hidden className="relative mx-5 border-t-2 border-dashed border-zinc-200 sm:hidden">
            <span className="absolute -left-7 top-1/2 size-5 -translate-y-1/2 rounded-full border-r border-zinc-200 bg-zinc-50" />
            <span className="absolute -right-7 top-1/2 size-5 -translate-y-1/2 rounded-full border-l border-zinc-200 bg-zinc-50" />
          </div>
          <div aria-hidden className="relative my-5 hidden border-l-2 border-dashed border-zinc-200 sm:block">
            <span className="absolute -top-8 left-1/2 size-5 -translate-x-1/2 rounded-full border-b border-zinc-200 bg-zinc-50" />
            <span className="absolute -bottom-8 left-1/2 size-5 -translate-x-1/2 rounded-full border-t border-zinc-200 bg-zinc-50" />
          </div>

          {/* Souche QR */}
          <div className="flex items-center gap-3 p-4 [transform:translateZ(34px)] sm:w-48 sm:flex-col sm:justify-center sm:p-5">
            <div
              role="img"
              aria-label={`QR Code du billet ${ticket.ticket_number}`}
              className={cn(
                'shrink-0 rounded-xl border border-zinc-200 bg-white p-2 shadow-[0_10px_24px_-12px_rgb(0_0_0/0.4)]',
                !isActive && 'opacity-60 grayscale',
              )}
            >
                <QRCodeSVG value={qrValue} size={112} level="M" />
            </div>
            <div className="min-w-0 flex-1 sm:w-full sm:flex-none sm:text-center">
              <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 sm:justify-center">
                <ScanLine className="size-3.5" aria-hidden />
                Scan à l’entrée
              </p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-400" title={ticket.ticket_number}>
                {ticket.ticket_number}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                loading={downloading}
                className="mt-2 w-full sm:w-full"
                aria-label={`Télécharger le billet ${ticket.ticket_number} en PDF`}
              >
                <Download className="size-4" aria-hidden /> Billet PDF
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Tilt>
  );
}
