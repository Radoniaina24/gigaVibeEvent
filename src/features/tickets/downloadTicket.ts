import type { TicketWithRelations } from '../orders/hooks';
import { formatAr, formatDate, formatShortDateTime } from '../../lib/utils';

/** Échappe les valeurs injectées dans le HTML imprimable. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Génère un fichier HTML imprimable du billet (QR embarqué en SVG). */
export function downloadTicketHtml(
  ticket: TicketWithRelations,
  qrSvgMarkup: string,
): void {
  const title = esc(ticket.event?.title ?? 'Billet');
  const typeName = esc(ticket.ticket_type?.name ?? 'Billet');
  const holder = esc(ticket.holder_name);
  const number = esc(ticket.ticket_number);
  const orderNumber = esc(ticket.order?.order_number ?? '—');
  const venue = esc(ticket.event ? `${ticket.event.venue}, ${ticket.event.city}` : '—');
  const eventDate = esc(ticket.event ? formatDate(ticket.event.starts_at) : '—');
  const eventTime = esc(ticket.event ? formatShortDateTime(ticket.event.starts_at) : '—');
  const price = esc(ticket.ticket_type ? formatAr(ticket.ticket_type.price) : '—');
  const status = esc(ticket.status);

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${number}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; padding: 32px 16px; color: #18181b; background: #f4f4f5; }
  .ticket { max-width: 600px; margin: auto; background: #fff; border-radius: 20px; overflow: hidden; border: 1px solid #e4e4e7; }
  .brand { background: #100607; color: #fff; padding: 20px 24px; display: flex; align-items: center; gap: 12px; }
  .brand .dot { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #dc2626, #7f1d1d); display: grid; place-items: center; font-weight: 800; }
  .brand h1 { font-size: 18px; margin: 0; }
  .brand p { margin: 2px 0 0; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #a1a1aa; }
  .body { display: flex; gap: 0; }
  .info { flex: 1; padding: 20px 24px; }
  .info .holder { font-size: 16px; font-weight: 700; margin: 0 0 2px; }
  .info .mono { font-family: ui-monospace, monospace; font-size: 12px; color: #71717a; }
  .price { font-size: 22px; font-weight: 800; margin-top: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; background: #fafafa; border-radius: 12px; padding: 12px; font-size: 13px; }
  .grid small { display: block; color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
  .perf { border-left: 2px dashed #e4e4e7; margin: 20px 0; position: relative; }
  .stub { width: 190px; padding: 20px; text-align: center; }
  .stub .qr { display: inline-block; border: 1px solid #e4e4e7; border-radius: 12px; padding: 8px; }
  .stub p { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #71717a; }
  .rows { padding: 0 24px 20px; font-size: 13px; }
  .row { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; border-top: 1px solid #f4f4f5; }
  .muted { color: #71717a; }
  .foot { padding: 0 24px 20px; font-size: 12px; color: #71717a; }
  button { margin: 0 24px 24px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 10px; border: 0; background: #18181b; color: #fff; }
  @media (max-width: 560px) { .body { flex-direction: column; } .perf { border-left: 0; border-top: 2px dashed #e4e4e7; margin: 0 20px; } .stub { width: auto; } }
  @media print { button { display: none; } body { padding: 0; background: #fff; } .ticket { border: 2px solid #18181b; } }
</style>
</head>
<body>
  <div class="ticket">
    <div class="brand">
      <span class="dot">GV</span>
      <div>
        <h1>${title}</h1>
        <p>${typeName} · Giga Vibe Event — Billetterie officielle</p>
      </div>
    </div>
    <div class="body">
      <div class="info">
        <p class="holder">${holder}</p>
        <p class="mono">${number}</p>
        <p class="price">${price}</p>
        <div class="grid">
          <div><small>Date</small>${eventDate}</div>
          <div><small>Heure</small>${eventTime}</div>
          <div><small>Lieu</small>${venue}</div>
          <div><small>Commande</small>${orderNumber}</div>
        </div>
      </div>
      <div class="perf"></div>
      <div class="stub">
        <span class="qr">${qrSvgMarkup}</span>
        <p>Scan à l’entrée</p>
        <p class="mono">${number}</p>
      </div>
    </div>
    <div class="rows">
      <div class="row"><span class="muted">Statut</span><span>${status}</span></div>
    </div>
    <p class="foot">Présentez ce billet avec une pièce d’identité si demandée. Un billet = une entrée.</p>
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
