/** Suffixe monétaire affiché par `formatAr` (défaut MGA → « Ar »). */

let suffix = 'Ar';

export function setDisplayCurrency(code: string): void {
  const c = (code || 'MGA').trim().toUpperCase();
  suffix = c === 'MGA' ? 'Ar' : c || 'Ar';
}

export function getCurrencySuffix(): string {
  return suffix;
}
