import { beforeEach, describe, expect, it } from 'vitest';
import { getCurrencySuffix, setDisplayCurrency } from './currency';
import { cn, formatAr, formatShortDateTime, slugify } from './utils';

/** Espaces insécables (FR) normalisées pour des assertions stables. */
const norm = (s: string) => s.replace(/[   ]/g, ' ');

describe('formatAr', () => {
  beforeEach(() => setDisplayCurrency('MGA'));
  it('formate en Ariary avec suffixe « Ar »', () => {
    expect(norm(formatAr(12500))).toBe('12 500 Ar');
    expect(norm(formatAr(0))).toBe('0 Ar');
  });
  it('suit la devise configurée', () => {
    setDisplayCurrency('EUR');
    expect(getCurrencySuffix()).toBe('EUR');
    expect(norm(formatAr(1000))).toBe('1 000 EUR');
  });
});

describe('slugify', () => {
  it('génère un slug URL-safe', () => {
    expect(slugify('Concert Événement 2026!')).toBe('concert-evenement-2026');
  });
});

describe('cn', () => {
  it('fusionne les classes Tailwind en conflit (dernier gagne)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('a', false, 'b')).toBe('a b');
  });
});

describe('formatShortDateTime', () => {
  it('retourne le motif JJ/MM/AA à HH:mm sans dépendre du fuseau', () => {
    expect(formatShortDateTime('2026-09-21T12:00:00.000Z')).toMatch(
      /^\d{2}\/\d{2}\/\d{2} à \d{2}:\d{2}$/,
    );
  });
});
