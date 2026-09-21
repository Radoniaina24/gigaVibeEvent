import { describe, expect, it } from 'vitest';
import {
  binary24FromQrPayload,
  parseGigaQr,
  slugifyEventName,
  ticketCodeFromQrValue,
  ticketQrValue,
} from './ticketQr';

describe('slugifyEventName', () => {
  it('normalise accents, casse et ponctuation', () => {
    expect(slugifyEventName('Concert Giga Été 2026 !')).toBe('concert-giga-ete-2026');
  });
  it("retourne 'event' pour une entrée vide ou sans alphanumériques", () => {
    expect(slugifyEventName('')).toBe('event');
    expect(slugifyEventName('---')).toBe('event');
  });
  it('tronque à 60 caractères', () => {
    expect(slugifyEventName('a'.repeat(100))).toHaveLength(60);
  });
});

describe('binary24FromQrPayload', () => {
  it('dérive 24 bits depuis les 6 premiers hex (doit rester sync avec public.qr_binary24() SQL)', () => {
    expect(binary24FromQrPayload('QR-ff0000abcdef')).toBe('111111110000000000000000');
  });
  it('remplit de zéros quand le payload est vide', () => {
    expect(binary24FromQrPayload('')).toBe('0'.repeat(24));
  });
});

describe('ticketQrValue / parseGigaQr (round-trip)', () => {
  const secret = `QR-${'9f2c'.repeat(8)}`;
  it('construit puis re-parse le format sécurisé', () => {
    const value = ticketQrValue({
      ticket_number: 'GVE-000123',
      qr_payload: secret,
      event: { title: 'Concert Giga' },
    });
    expect(value).toBe(`giga-vibe-event.GVE-000123.${secret}.concert-giga`);
    const parsed = parseGigaQr(value);
    expect(parsed).toMatchObject({
      ticketNumber: 'GVE-000123',
      secret,
      binary24: null,
      eventSlug: 'concert-giga',
      secure: true,
    });
  });
  it('parse le format legacy 24 bits (compat anciens QR imprimés)', () => {
    const bin = '101010101010101010101010';
    const parsed = parseGigaQr(`giga-vibe-event.GVE-000001-${bin}.concert`);
    expect(parsed).toMatchObject({
      ticketNumber: 'GVE-000001',
      secret: null,
      binary24: bin,
      secure: false,
    });
  });
  it('rejette les valeurs invalides', () => {
    expect(parseGigaQr('hello')).toBeNull();
    expect(parseGigaQr('giga-vibe-event.GVE-1.PASUNSECRET.evt')).toBeNull();
    expect(parseGigaQr('giga-vibe-event.GVE-1-QR-abcdef.evt avec espace')).toBeNull();
  });
});

describe('ticketCodeFromQrValue', () => {
  it("extrait ?code= d'une URL de vérification", () => {
    expect(
      ticketCodeFromQrValue('https://giga-vibe-event.vercel.app/tickets/verify?code=QR-abc123'),
    ).toBe('QR-abc123');
  });
  it('retourne tel quel un code brut ou un format sécurisé', () => {
    expect(ticketCodeFromQrValue('QR-abc123')).toBe('QR-abc123');
    const secure = `giga-vibe-event.GVE-1.QR-${'a'.repeat(32)}.evt`;
    expect(ticketCodeFromQrValue(secure)).toBe(secure);
  });
  it("retourne '' pour une entrée vide", () => {
    expect(ticketCodeFromQrValue('   ')).toBe('');
  });
});
