import type { TicketWithRelations } from '../orders/hooks';
import { formatAr, formatDate, formatShortDateTime } from '../../lib/utils';
// Logo embarqué au build en data-URL : toujours disponible dans le fichier
// téléchargé (même hors-ligne, même en file://), sans fetch réseau.
import logoEmbedded from '../../assets/logo.jpeg?inline';

/** Retourne le logo embarqué (data-URL) pour le billet téléchargeable.
 *  `null` si indisponible (pastille GV de repli affichée). */
export async function loadLogoDataUrl(): Promise<string | null> {
  return typeof logoEmbedded === 'string' && logoEmbedded.startsWith('data:image')
    ? logoEmbedded
    : null;
}

/** Échappe les valeurs injectées dans le HTML imprimable. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function holderInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][parts[1].length - 1]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const STATUS_LABEL: Record<string, string> = {
  valid: 'Valide',
  used: 'Utilisé',
  cancelled: 'Annulé',
  expired: 'Expiré',
};

/** Couleurs du badge statut, identiques au billet affiché. */
function badgeStyle(status: string): string {
  switch (status) {
    case 'valid':
      return 'background:#dcfce7;color:#166534;';
    case 'used':
      return 'background:#f4f4f5;color:#3f3f46;';
    case 'cancelled':
    case 'expired':
      return 'background:#fee2e2;color:#b91c1c;';
    default:
      return 'background:#fef3c7;color:#92400e;';
  }
}

/** Icônes Lucide (mêmes tracés que le billet affiché), en ligne pour le fichier autonome. */
const SVG_OPEN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const ICON_CALENDAR = `${SVG_OPEN}<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M8 13h.01"/><path d="M12 13h.01"/><path d="M16 13h.01"/><path d="M8 17h.01"/><path d="M12 17h.01"/><path d="M16 17h.01"/></svg>`;
const ICON_PIN = `${SVG_OPEN}<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`;
const ICON_SCAN = `${SVG_OPEN}<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>`;
const ICON_USER = `${SVG_OPEN}<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

/**
 * Génère un fichier HTML imprimable du billet (QR + logo embarqués),
 * réplique à 100 % du billet affiché en version desktop (TicketCard) :
 * bandeau marque sombre avec halo, infos porteur, encadré événement,
 * perforation et souche QR verticale. Le CSS d'impression force cette même
 * disposition « longue » horizontale.
 * Ouvrez le fichier puis « Imprimer → Enregistrer au format PDF ».
 */
export function downloadTicketHtml(
  ticket: TicketWithRelations,
  qrSvgMarkup: string,
  logoDataUrl?: string | null,
): void {
  const title = esc(ticket.event?.title ?? 'Événement');
  const typeName = esc(ticket.ticket_type?.name ?? 'Billet');
  const holder = esc(ticket.holder_name);
  const initials = esc(holderInitials(ticket.holder_name || '?'));
  const number = esc(ticket.ticket_number);
  const orderNumber = esc(ticket.order?.order_number ?? '');
  const venue = esc(ticket.event ? `${ticket.event.venue}, ${ticket.event.city}` : '—');
  const eventDate = esc(ticket.event ? formatDate(ticket.event.starts_at) : '—');
  const eventTime = esc(ticket.event ? formatShortDateTime(ticket.event.starts_at) : '—');
  const price = esc(ticket.ticket_type ? formatAr(ticket.ticket_type.price) : '—');
  const statusLabel = esc(STATUS_LABEL[ticket.status] ?? ticket.status);
  const isActive = ticket.status === 'valid';
  const qrStyle = isActive ? '' : 'opacity:.6;filter:grayscale(1);';
  const logoImg =
    logoDataUrl && logoDataUrl.startsWith('data:image')
      ? `<img class="logo" src="${logoDataUrl}" alt="Logo Giga Vibe Event" />`
      : '<span class="logo">GV</span>';

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${number}</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; padding: 32px 16px; color: #09090b; background: #fafafa; margin: 0; }
  .ticket { max-width: 640px; margin: auto; background: #fff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; box-shadow: 0 24px 50px -20px rgb(0 0 0/.35), 0 10px 20px -10px rgb(0 0 0/.15); }
  .brand { position: relative; overflow: hidden; padding: 12px 20px; background-color: ${isActive ? '#100607' : '#18181b'}; background-image: radial-gradient(42rem 22rem at 12% -8%, rgb(220 38 38/.45), transparent 60%), radial-gradient(36rem 20rem at 88% 12%, rgb(245 158 11/.22), transparent 60%), radial-gradient(30rem 26rem at 50% 115%, rgb(220 38 38/.28), transparent 65%); color: #fff; display: flex; align-items: center; gap: 10px; }
  .brand .logo { width: 40px; height: 40px; flex: none; border-radius: 8px; background: linear-gradient(135deg, #dc2626, #7f1d1d); display: grid; place-items: center; font-weight: 800; font-size: 13px; color: #fff; box-shadow: inset 0 0 0 1px rgb(255 255 255/.2); }
  .brand img.logo { display: block; width: 40px; height: 40px; flex: none; border-radius: 8px; object-fit: cover; background: #fff; box-shadow: 0 0 0 1px rgb(255 255 255/.2); }
  .brand .titles { min-width: 0; flex: 1; }
  .brand h1 { font-size: 14px; font-weight: 700; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .brand .sub { margin: 0; font-size: 11px; font-weight: 500; letter-spacing: .05em; text-transform: uppercase; color: #a1a1aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .badge { flex: none; display: inline-block; border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 500; ${badgeStyle(ticket.status)} }
  .body { display: flex; align-items: stretch; }
  .info { min-width: 0; flex: 1; padding: 20px; }
  .holder-row { display: flex; align-items: center; gap: 10px; }
  .avatar { width: 36px; height: 36px; flex: none; border-radius: 999px; background: linear-gradient(135deg, #dc2626, #991b1b); display: grid; place-items: center; font-size: 12px; font-weight: 700; color: #fff; }
  .who { min-width: 0; }
  .who .name { display: block; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .who .num { display: block; font-family: ui-monospace, monospace; font-size: 11px; color: #71717a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .amount { margin-left: auto; flex: none; text-align: right; }
  .amount .p { display: block; font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .amount .o { display: block; font-size: 11px; color: #71717a; }
  .eventbox { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border-radius: 12px; background: #fafafa; padding: 12px; font-size: 13px; margin-top: 10px; }
  .ev { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .ev svg { width: 16px; height: 16px; flex: none; color: #dc2626; }
  .ev .tx { min-width: 0; }
  .ev .d { display: block; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ev .t { display: block; font-size: 12px; color: #71717a; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ev .v { display: block; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .note { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #71717a; margin: 10px 0 0; }
  .note svg { width: 14px; height: 14px; flex: none; }
  .perf-v { position: relative; flex: none; margin: 20px 0; border-left: 2px dashed #e4e4e7; }
  .perf-v::before, .perf-v::after { content: ''; position: absolute; left: 50%; width: 20px; height: 20px; border-radius: 999px; background: #fafafa; transform: translateX(-50%); }
  .perf-v::before { top: -32px; border-bottom: 1px solid #e4e4e7; }
  .perf-v::after { bottom: -32px; border-top: 1px solid #e4e4e7; }
  .perf-h { display: none; position: relative; margin: 0 20px; border-top: 2px dashed #e4e4e7; }
  .stub { width: 192px; flex: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 20px; }
  .stub .qr { flex: none; border: 1px solid #e4e4e7; border-radius: 12px; background: #fff; padding: 8px; box-shadow: 0 10px 24px -12px rgb(0 0 0/.4); ${qrStyle} }
  .stub .qr svg { display: block; width: 112px; height: 112px; }
  .stub .cap { min-width: 0; width: 100%; text-align: center; }
  .stub .lbl { display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #71717a; margin: 0; }
  .stub .lbl svg { width: 14px; height: 14px; flex: none; }
  .stub .n { margin: 2px 0 0; font-family: ui-monospace, monospace; font-size: 11px; color: #a1a1aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .actions { padding: 0 20px 20px; }
  .actions button { padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 10px; border: 0; background: #18181b; color: #fff; }
  @media (max-width: 560px) {
    .body { flex-direction: column; }
    .perf-v { display: none; }
    .perf-h { display: block; }
    .stub { width: auto; flex-direction: row; }
    .stub .cap { flex: 1; text-align: left; }
    .stub .lbl { justify-content: flex-start; }
    .eventbox { grid-template-columns: 1fr; }
  }
  @media print {
    .actions { display: none; }
    body { padding: 0; background: #fff; }
    .ticket { box-shadow: none; border: 2px solid #18181b; max-width: 100%; break-inside: avoid; }
    /* Design LONG (horizontal) forcé à l'impression, comme à l'écran */
    .body { flex-direction: row !important; }
    .perf-v { display: block !important; }
    .perf-h { display: none !important; }
    .stub { width: 192px !important; flex-direction: column !important; }
    .stub .cap { text-align: center !important; }
    .stub .lbl { justify-content: center !important; }
    .eventbox { grid-template-columns: 1fr 1fr !important; }
    .perf-v::before, .perf-v::after { background: #fff !important; }
  }
</style>
</head>
<body>
  <div class="ticket">
    <div class="brand">
      ${logoImg}
      <div class="titles">
        <h1>${title}</h1>
        <p class="sub">${typeName} · Giga Vibe Event</p>
      </div>
      <span class="badge">${statusLabel}</span>
    </div>
    <div class="body">
      <div class="info">
        <div class="holder-row">
          <span class="avatar">${initials}</span>
          <span class="who">
            <span class="name">${holder}</span>
            <span class="num">${number}</span>
          </span>
          <span class="amount">
            <span class="p">${price}</span>
            <span class="o">${orderNumber}</span>
          </span>
        </div>
        <div class="eventbox">
          <div class="ev">${ICON_CALENDAR}<span class="tx"><span class="d">${eventDate}</span><span class="t">${eventTime}</span></span></div>
          <div class="ev">${ICON_PIN}<span class="tx"><span class="v">${venue}</span></span></div>
        </div>
        <p class="note">${ICON_USER}<span>Présentez ce billet avec une pièce d’identité si demandée.</span></p>
      </div>
      <div class="perf-v"></div>
      <div class="perf-h"></div>
      <div class="stub">
        <span class="qr">${qrSvgMarkup}</span>
        <div class="cap">
          <p class="lbl">${ICON_SCAN}<span>Scan à l’entrée</span></p>
          <p class="n">${number}</p>
        </div>
      </div>
    </div>
    <div class="actions"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button></div>
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
