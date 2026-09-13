import type { TicketWithRelations } from '../orders/hooks';
import { formatAr, formatDate } from '../../lib/utils';

/** Génère un fichier HTML imprimable du billet (QR embarqué en SVG). */
export function downloadTicketHtml(
  ticket: TicketWithRelations,
  qrSvgMarkup: string,
): void {
  const eventDate = ticket.event ? formatDate(ticket.event.starts_at) : '—';
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${ticket.ticket_number}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 32px; color: #111; }
  .ticket { max-width: 560px; margin: auto; border: 2px solid #111; border-radius: 16px; padding: 24px; }
  .qr { text-align: center; margin: 16px 0; }
  .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
  .muted { color: #555; }
  button { margin-top: 16px; padding: 10px 20px; font-size: 14px; cursor: pointer; }
  @media print { button { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="ticket">
    <h1>${ticket.event?.title ?? 'Billet'}</h1>
    <p class="muted">${ticket.ticket_type?.name ?? ''} · ${ticket.holder_name}</p>
    <div class="qr">${qrSvgMarkup}</div>
    <div class="row"><span class="muted">Billet</span><strong>${ticket.ticket_number}</strong></div>
    <div class="row"><span class="muted">Commande</span><span>${ticket.order?.order_number ?? '—'}</span></div>
    <div class="row"><span class="muted">Date</span><span>${eventDate}</span></div>
    <div class="row"><span class="muted">Lieu</span><span>${ticket.event ? `${ticket.event.venue}, ${ticket.event.city}` : '—'}</span></div>
    <div class="row"><span class="muted">Prix</span><span>${ticket.ticket_type ? formatAr(ticket.ticket_type.price) : '—'}</span></div>
    <div class="row"><span class="muted">Statut</span><span>${ticket.status}</span></div>
    <button onclick="window.print()">Imprimer</button>
  </div>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ticket.ticket_number}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
