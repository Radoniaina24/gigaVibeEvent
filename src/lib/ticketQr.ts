import { env } from '../app/config/env';

/** Préfixe marque visible au scan du QR. */
export const QR_BRAND_PREFIX = 'giga-vibe-event';

const HEX_TO_BIN: Record<string, string> = {
  '0': '0000',
  '1': '0001',
  '2': '0010',
  '3': '0011',
  '4': '0100',
  '5': '0101',
  '6': '0110',
  '7': '0111',
  '8': '1000',
  '9': '1001',
  'a': '1010',
  'b': '1011',
  'c': '1100',
  'd': '1101',
  'e': '1110',
  'f': '1111',
};

/** Normalise un nom d'événement pour le QR (minuscules, sans accents, `-`). */
export function slugifyEventName(name: string): string {
  const slug = (name || 'event')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'event';
}

/**
 * Dérive les 24 caractères binaires de l'ANCIEN format depuis le secret
 * serveur (`qr_payload`). Conservé pour compatibilité (anciens QR déjà
 * imprimés) — les nouveaux QR embarquent le secret complet (128 bits).
 * Doit rester synchronisé avec `public.qr_binary24()` côté SQL.
 */
export function binary24FromQrPayload(qrPayload: string): string {
  const hex = (qrPayload || '')
    .toLowerCase()
    .replace(/[^0-9a-f]/g, '')
    .slice(0, 6)
    .padStart(6, '0');
  return [...hex].map((ch) => HEX_TO_BIN[ch] ?? '0000').join('');
}

export interface TicketQrInput {
  ticket_number: string;
  qr_payload: string;
  event?: { title?: string | null; slug?: string | null } | null;
}

/**
 * Valeur encodée dans le QR, visible à l'œil nu au scan :
 * `giga-vibe-event.<NUMERO>.<SECRET>.<event-slug>`
 * Ex. `giga-vibe-event.GVE-000123.QR-9f2c4a7b1d3e4f5a6b7c8d9e0f1a2b3c.concert-giga-2026`
 * Le SECRET est le `qr_payload` complet (128 bits, indescriptible) : chaque
 * QR est unique et infalsifiable. La vérification reste 100 % serveur.
 */
export function ticketQrValue(ticket: TicketQrInput): string {
  const num = (ticket.ticket_number || '').trim();
  const secret = (ticket.qr_payload || '').trim();
  const rawName = ticket.event?.title || ticket.event?.slug || 'event';
  return `${QR_BRAND_PREFIX}.${num}.${secret}.${slugifyEventName(rawName)}`;
}

export interface ParsedGigaQr {
  ticketNumber: string;
  /** Secret 128 bits (`QR-...`) du nouveau format sécurisé, sinon `null`. */
  secret: string | null;
  /** 24 binaire de l'ancien format (compat), sinon `null`. */
  binary24: string | null;
  eventSlug: string;
  /** `true` = nouveau format sécurisé (128 bits). */
  secure: boolean;
}

/** Parse les formats humains, `null` si ce n'en est pas un. */
export function parseGigaQr(value: string): ParsedGigaQr | null {
  const v = (value || '').trim();
  if (!v.toLowerCase().startsWith(`${QR_BRAND_PREFIX}.`)) return null;
  const rest = v.slice(QR_BRAND_PREFIX.length + 1);
  const parts = rest.split('.');
  // Nouveau format sécurisé : NUMERO.SECRET.event-slug
  if (parts.length === 3) {
    const [ticketNumber, secret, eventSlug] = parts;
    if (!ticketNumber || ticketNumber.includes(' ') || ticketNumber.includes('.')) return null;
    if (!secret || !/^QR-[0-9a-fA-F]{32}$/.test(secret)) return null;
    if (!eventSlug || /\s/.test(eventSlug) || eventSlug.includes('.')) return null;
    return { ticketNumber, secret, binary24: null, eventSlug, secure: true };
  }
  // Ancien format 24 binaire (compat) : NUMERO-BINAIRE24.event-slug
  if (parts.length === 2) {
    const [mid, eventSlug] = parts;
    if (!eventSlug || /\s/.test(eventSlug)) return null;
    if (mid.length < 26 || mid[mid.length - 25] !== '-') return null;
    const binary24 = mid.slice(-24);
    if (!/^[01]{24}$/.test(binary24)) return null;
    const ticketNumber = mid.slice(0, -25);
    if (!ticketNumber || ticketNumber.includes('.') || ticketNumber.includes(' ')) {
      return null;
    }
    return { ticketNumber, secret: null, binary24, eventSlug, secure: false };
  }
  return null;
}

/**
 * Valeur encodée dans le QR : URL publique de vérification contenant le
 * secret opaque (anciens billets). Conservé pour compatibilité — les
 * nouveaux billets utilisent `ticketQrValue()`.
 */
export function ticketVerifyUrl(qrPayload: string): string {
  const base = env.appUrl.replace(/\/+$/, '');
  return `${base}/tickets/verify?code=${encodeURIComponent(qrPayload)}`;
}

/**
 * Extrait le code à vérifier d'une valeur scannée :
 * - format sécurisé `giga-vibe-event.NUMERO.SECRET.event` (retourné tel quel),
 * - ancien format `giga-vibe-event.NUM-BINAIRE24.event` (compat),
 * - URL complète (`.../tickets/verify?code=...`, ancien ou nouveau format),
 * - ou code brut `QR-...` (anciens billets).
 */
export function ticketCodeFromQrValue(value: string): string {
  const v = (value || '').trim();
  if (!v) return '';
  if (parseGigaQr(v)) return v;
  try {
    const u = new URL(v);
    const c = u.searchParams.get('code');
    if (c && c.trim()) return c.trim();
  } catch {
    /* pas une URL : code brut ou format humain */
  }
  return v;
}
